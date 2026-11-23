/* ============================================================
   FichaSS — quick dice picker + shared roll dialog (Phase 17,
   D-61/D-62/D-63). ONE component for the character sheet and the
   master view (no duplicated markup/logic):

   - an appbar die button opens a centered picker (backdrop/card,
     Phase 00 aesthetic); die buttons d4…d100 FEED an editable
     formula input (first press "1dX", repeats bump the count,
     groups ordered by first press); "Lanzar" rolls the formula.
   - the Phase 11 roll dialog, extended with one animated dice
     group per NdX term. The legacy single-notation path (attacks,
     spells, initiative, saves, death) is preserved verbatim.
   - percentile addendum: a d10 shows faces 0–9 (internal 10 reads
     as 0 but counts 10); a d100 is a pair of d10 (tens + units,
     double zero = 100), drawn as two labeled squares.

   Pure table fun: the sessionState is never touched. Icons are
   inline SVG (constitution I2). Document keydown listeners are
   detached on close and self-destruct on a stale mount.
   ============================================================ */

import {
  dieFace,
  formatFormula,
  formulaFlavor,
  parseDamage,
  parseFormula,
  rollFlavor,
  rollFormula,
  rollGroup,
  type ParsedDice,
  type PercentilePair,
} from '../dice';

/** Inline die icon — same 5-pip geometry as the sheet .dice-btn
    (attacks/spells), self-contained stroke SVG (I2). */
const DICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01"/></svg>';

/** The seven quick dice offered by the picker (D-62). */
export const PICKER_FACES = [4, 6, 8, 10, 12, 20, 100];

/** Appbar trigger button (ficha + master). Same .dice-btn geometry
    as the sheet buttons; .appbar-dice drops the inline margin. */
export function dicePickerButtonHtml(): string {
  return `<button type="button" class="dice-btn appbar-dice" id="dice-picker-btn" aria-label="Abrir el lanzador de dados rápidos" aria-haspopup="dialog">${DICE_ICON}</button>`;
}

/** The picker panel: backdrop + centered card (reuses the
    .confirm-dialog positioning). Die buttons feed the input; the
    error is inline (role="alert"), never a browser alert (D-62). */
export function dicePickerHtml(): string {
  const dieButtons = PICKER_FACES
    .map(faces => `<button type="button" class="dice-picker-die" data-faces="${faces}" aria-label="Añadir un d${faces} a la fórmula">d${faces}</button>`)
    .join('');
  return `
  <div class="backdrop" id="dice-picker-backdrop" hidden></div>
  <section class="card confirm-dialog dice-picker" id="dice-picker" role="dialog" aria-modal="true" aria-labelledby="dice-picker-title" hidden>
    <h2 class="confirm-title" id="dice-picker-title">Dados rápidos</h2>
    <div class="dice-picker-dies" role="group" aria-label="Dados disponibles">${dieButtons}</div>
    <label class="dice-picker-label" for="dice-picker-input">Fórmula</label>
    <input type="text" id="dice-picker-input" class="dice-picker-input" placeholder="2d4 + 1d8" autocomplete="off" spellcheck="false" aria-describedby="dice-picker-error">
    <p class="dice-picker-error" id="dice-picker-error" role="alert" hidden></p>
    <div class="confirm-actions">
      <button type="button" class="chip" id="dice-picker-cancel">Cancelar</button>
      <button type="button" class="chip confirm-primary" id="dice-picker-launch">Lanzar</button>
    </div>
  </section>`;
}

/** The roll dialog markup — identical ids to Phase 11 (#roll-dialog,
    #roll-dice, #roll-total, #roll-close, #roll-reroll) so the legacy
    sheet buttons keep working through the shared controller. */
export function rollDialogHtml(): string {
  return `
  <div class="backdrop" id="roll-backdrop" hidden></div>
  <section class="card roll-dialog" id="roll-dialog" role="dialog" aria-modal="true" aria-labelledby="roll-title" hidden>
    <h2 class="confirm-title" id="roll-title">Tirada</h2>
    <div class="dice-row" id="roll-dice"></div>
    <p class="roll-total" id="roll-total"></p>
    <div class="confirm-actions">
      <button type="button" class="chip" id="roll-close">Cerrar</button>
      <button type="button" class="chip confirm-primary" id="roll-reroll">Tirar de nuevo</button>
    </div>
  </section>`;
}

/** Generic Tab-cycle focus trap for a dialog (constitution I5).
    Shared by the picker, the roll dialog and the character view's
    other dialogs (spell detail, reset, conflict). */
export function trapTab(event: KeyboardEvent, container: HTMLElement): void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** One animated die square. `ariaLabel` is added only when the shown
    face differs from the counted value (percentile), so plain dice
    keep their Phase 11 markup (text read by screen readers). */
function dieHtml(face: number, delay: number, ariaLabel?: string): string {
  const aria = ariaLabel ? ` role="img" aria-label="${ariaLabel}"` : '';
  return `<span class="die"${aria} style="animation-delay: ${delay}ms">${face}</span>`;
}

/** A d100 group draws TWO labeled squares per pair (tens + units),
    both showing faces 0–9; the pair's counted value goes to the
    total line. Shared by the formula and legacy renderers. */
function pairDiceHtml(pairs: PercentilePair[], delay: number): string {
  return pairs
    .map(pair => {
      const tensFace = pair.tens % 10;
      const unitsFace = pair.units % 10;
      return `<span class="dice-pair">
        <span class="dice-pair-cell">${dieHtml(tensFace, delay, `Decenas: ${tensFace}`)}<span class="dice-pair-role">decenas</span></span>
        <span class="dice-pair-cell">${dieHtml(unitsFace, delay, `Unidades: ${unitsFace}`)}<span class="dice-pair-role">unidades</span></span>
      </span>`;
    })
    .join('');
}

export interface DicePickerController {
  /** Opens the quick-dice picker; focus returns to `trigger` on close. */
  openPicker(trigger: HTMLButtonElement): void;
  /** Legacy single-notation roll (Phases 11–13): parseDamage +
      rollGroup + rollFlavor, flat dice row, original total format. */
  openRoll(notation: string, opener: HTMLButtonElement): void;
  /** Phase 17 formula roll: parseFormula + rollFormula +
      formulaFlavor, one labeled dice group per NdX term. */
  openFormulaRoll(notation: string, opener: HTMLButtonElement): void;
  /** Detaches document listeners (view unmount / stale mount). */
  destroy(): void;
}

/** Wires the picker + roll dialog inside one view's root. Returns
    null when the markup is absent (defensive). All click listeners
    live on the view's own DOM and die with it; only the transient
    document keydown handlers need explicit detachment. */
export function initDicePicker(root: HTMLElement): DicePickerController | null {
  const picker = root.querySelector<HTMLElement>('#dice-picker');
  const pickerBackdrop = root.querySelector<HTMLElement>('#dice-picker-backdrop');
  const pickerInput = root.querySelector<HTMLInputElement>('#dice-picker-input');
  const pickerError = root.querySelector<HTMLElement>('#dice-picker-error');
  const rollDialog = root.querySelector<HTMLElement>('#roll-dialog');
  const rollBackdrop = root.querySelector<HTMLElement>('#roll-backdrop');
  const rollTitle = root.querySelector<HTMLElement>('#roll-title');
  const rollDiceRow = root.querySelector<HTMLElement>('#roll-dice');
  const rollTotal = root.querySelector<HTMLElement>('#roll-total');
  if (!picker || !pickerBackdrop || !pickerInput || !pickerError ||
      !rollDialog || !rollBackdrop || !rollTitle || !rollDiceRow || !rollTotal) {
    return null;
  }

  let pickerTrigger: HTMLButtonElement | null = null;
  let rollOpener: HTMLButtonElement | null = null;
  let pickerKeyAttached = false;
  let rollKeyAttached = false;

  // --- Roll dialog: two renderers over one shell ---------------------

  /** Legacy single notation — byte-for-byte the Phase 11/13 format,
      with percentile faces applied (d10 square shows 0–9, the total
      line keeps the counted value). */
  function renderSingle(notation: string): void {
    const parsed = parseDamage(notation);
    if (!parsed || !rollTitle || !rollDiceRow || !rollTotal) return;
    const result = rollGroup(parsed);
    rollTitle.textContent = `Tirada · ${notation}`;
    if (result.pairs) {
      rollDiceRow.innerHTML = pairDiceHtml(result.pairs, 0);
    } else {
      rollDiceRow.innerHTML = result.rolls
        .map((value, index) => {
          const face = dieFace(value, parsed.faces);
          const aria = face !== value ? `Cara ${face}, vale ${value}` : undefined;
          return dieHtml(face, index * 80, aria);
        })
        .join('');
    }
    const flavor = rollFlavor(notation, result.rolls);
    const callout = flavor ? ` · ${flavor}` : '';
    const breakdown = result.pairs
      ? result.pairs.map(pair => pair.value).join(' + ')
      : result.rolls.join(' + ');
    rollTotal.textContent = `${notation} → ${breakdown}${parsed.mod ? ` ${parsed.mod > 0 ? '+' : '−'} ${Math.abs(parsed.mod)}` : ''} = ${result.total}${callout}`;
  }

  /** Compound formula — one labeled, co-animated dice group per NdX
      term; flat modifiers add to the total without a square. */
  function renderFormula(notation: string): void {
    const groups = parseFormula(notation);
    if (!groups || !rollTitle || !rollDiceRow || !rollTotal) return;
    const result = rollFormula(groups);
    rollTitle.textContent = `Tirada · ${notation}`;
    const parts: string[] = [];
    let html = '';
    groups.forEach((group, index) => {
      const groupResult = result.groups[index];
      const delay = index * 120; // groups stagger; dice within a group tumble together
      if (group.count === 0) {
        parts.push(`${group.mod}`);
        return;
      }
      if (group.faces === 100 && groupResult.pairs) {
        html += `<span class="dice-group"><span class="dice-group-label">${group.count}d100</span><span class="dice-group-dies">${pairDiceHtml(groupResult.pairs, delay)}</span></span>`;
        const values = groupResult.pairs.map(pair => pair.value);
        parts.push(values.length > 1 ? `(${values.join(' + ')})` : `${values[0]}`);
        return;
      }
      const dies = groupResult.rolls
        .map(value => {
          const face = dieFace(value, group.faces);
          const aria = face !== value ? `Cara ${face}, vale ${value}` : undefined;
          return dieHtml(face, delay, aria);
        })
        .join('');
      html += `<span class="dice-group"><span class="dice-group-label">${group.count}d${group.faces}</span><span class="dice-group-dies">${dies}</span></span>`;
      parts.push(groupResult.rolls.length > 1 ? `(${groupResult.rolls.join(' + ')})` : `${groupResult.rolls[0]}`);
    });
    rollDiceRow.innerHTML = html;
    const flavor = formulaFlavor(groups, result.groups);
    const callout = flavor ? ` · ${flavor}` : '';
    rollTotal.textContent = `${notation} → ${parts.join(' + ')} = ${result.total}${callout}`;
  }

  function renderRoll(): void {
    const notation = rollDialog?.dataset.notation;
    if (!notation) return;
    if (rollDialog?.dataset.mode === 'formula') renderFormula(notation);
    else renderSingle(notation);
  }

  function closeRoll(): void {
    if (rollDialog) rollDialog.hidden = true;
    if (rollBackdrop) rollBackdrop.hidden = true;
    if (rollKeyAttached) {
      document.removeEventListener('keydown', onRollKey);
      rollKeyAttached = false;
    }
    rollOpener?.focus(); // I5: focus back to the button that opened the roll
    rollOpener = null;
  }

  function onRollKey(event: KeyboardEvent): void {
    if (!rollDialog?.isConnected) { destroy(); return; } // stale mount
    if (event.key === 'Escape') { closeRoll(); return; }
    if (event.key !== 'Tab' || !rollDialog) return;
    trapTab(event, rollDialog);
  }

  function openRollDialog(notation: string, mode: 'single' | 'formula', opener: HTMLButtonElement): void {
    if (!rollDialog || !rollBackdrop) return;
    rollOpener = opener;
    rollDialog.dataset.notation = notation;
    rollDialog.dataset.mode = mode;
    renderRoll();
    rollDialog.hidden = false;
    rollBackdrop.hidden = false;
    if (!rollKeyAttached) {
      document.addEventListener('keydown', onRollKey);
      rollKeyAttached = true;
    }
    rollDialog.querySelector<HTMLButtonElement>('#roll-close')?.focus();
  }

  function openRoll(notation: string, opener: HTMLButtonElement): void {
    // Guard (Phase 11): never open for a notation that doesn't parse.
    if (!parseDamage(notation)) return;
    openRollDialog(notation, 'single', opener);
  }

  function openFormulaRoll(notation: string, opener: HTMLButtonElement): void {
    const groups = parseFormula(notation);
    if (!groups) return;
    openRollDialog(formatFormula(groups), 'formula', opener);
  }

  // --- Picker panel --------------------------------------------------

  function showPickerError(message: string): void {
    if (!pickerError) return;
    pickerError.textContent = message;
    pickerError.hidden = false;
  }

  function clearPickerError(): void {
    if (!pickerError) return;
    pickerError.textContent = '';
    pickerError.hidden = true;
  }

  function closePicker(returnFocus: boolean): void {
    if (picker) picker.hidden = true;
    if (pickerBackdrop) pickerBackdrop.hidden = true;
    if (pickerKeyAttached) {
      document.removeEventListener('keydown', onPickerKey);
      pickerKeyAttached = false;
    }
    if (returnFocus) pickerTrigger?.focus();
    pickerTrigger = null;
  }

  function onPickerKey(event: KeyboardEvent): void {
    if (!picker?.isConnected) { destroy(); return; } // stale mount
    if (event.key === 'Escape') { closePicker(true); return; }
    if (event.key !== 'Tab' || !picker) return;
    trapTab(event, picker);
  }

  function openPicker(trigger: HTMLButtonElement): void {
    if (!picker || !pickerBackdrop || !pickerInput) return;
    pickerTrigger = trigger;
    clearPickerError();
    picker.hidden = false;
    pickerBackdrop.hidden = false;
    if (!pickerKeyAttached) {
      document.addEventListener('keydown', onPickerKey);
      pickerKeyAttached = true;
    }
    pickerInput.focus();
  }

  /** A die button FEEDS the editable input: first press adds "1dX",
      repeats bump that group's count; groups keep first-press order.
      Hand-written valid formulas are preserved (canonical spacing);
      invalid hand text starts fresh with the pressed die. */
  function feedDie(faces: number): void {
    if (!pickerInput) return;
    const raw = pickerInput.value.trim();
    const parsed = raw ? parseFormula(raw) : null;
    let groups: ParsedDice[];
    if (!parsed) {
      groups = [{ count: 1, faces, mod: 0 }];
    } else {
      groups = parsed.map(group => ({ ...group }));
      const existing = groups.find(group => group.count > 0 && group.faces === faces);
      if (existing) existing.count += 1;
      else groups.push({ count: 1, faces, mod: 0 });
    }
    pickerInput.value = formatFormula(groups);
    clearPickerError();
  }

  /** Lanzar: empty → no effect; invalid → inline error (no dialog,
      no alert); valid → close the picker and roll the full formula. */
  function launch(): void {
    if (!pickerInput) return;
    const raw = pickerInput.value.trim();
    if (!raw) return;
    const groups = parseFormula(raw);
    if (!groups) {
      showPickerError('Fórmula no válida: usa términos NdX o números unidos por «+» (p. ej. 2d4 + 1d8).');
      pickerInput.focus();
      return;
    }
    const trigger = pickerTrigger;
    closePicker(false);
    if (trigger) openFormulaRoll(formatFormula(groups), trigger);
  }

  function destroy(): void {
    if (rollKeyAttached) {
      document.removeEventListener('keydown', onRollKey);
      rollKeyAttached = false;
    }
    if (pickerKeyAttached) {
      document.removeEventListener('keydown', onPickerKey);
      pickerKeyAttached = false;
    }
    pickerTrigger = null;
    rollOpener = null;
  }

  // --- Wiring (all on the view's own DOM) ----------------------------

  rollDialog.querySelector<HTMLButtonElement>('#roll-close')?.addEventListener('click', closeRoll);
  rollBackdrop.addEventListener('click', closeRoll);
  rollDialog.querySelector<HTMLButtonElement>('#roll-reroll')?.addEventListener('click', renderRoll);

  picker.querySelectorAll<HTMLButtonElement>('.dice-picker-die').forEach(button => {
    button.addEventListener('click', () => {
      const faces = Number(button.dataset.faces);
      if (Number.isFinite(faces) && faces > 0) feedDie(faces);
    });
  });
  pickerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      launch();
    }
  });
  picker.querySelector<HTMLButtonElement>('#dice-picker-launch')?.addEventListener('click', launch);
  picker.querySelector<HTMLButtonElement>('#dice-picker-cancel')?.addEventListener('click', () => closePicker(true));
  pickerBackdrop.addEventListener('click', () => closePicker(true));

  return { openPicker, openRoll, openFormulaRoll, destroy };
}