/* ============================================================
   FichaSS — entry point (Phase 04/05/06).
   Renders the complete static sheet: demoCharacter (Fase 03) +
   computeDerived (model §3) + BLOCK_CONFIG (model §6) through
   src/render/sheet.ts, wires the mode tabs to src/filters.ts
   (Phase 05) and, since Phase 06 (D-16 §4 / D-27/D-28):

   - bootstraps the live session (src/session.ts): persisted
     counters are loaded and synced into the rendered cards;
   - delegates ALL card interactions (steppers, condition chips,
     inspiration checkbox, spell detail chips) at #sheet level —
     re-rendered card content needs no per-node listeners;
   - owns the spell detail bottom sheet (open/close, focus trap,
     Esc/overlay/✕) built from the spell's own data.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './assets/fonts/fonts.css';

import { demoCharacter } from './data/character';
import { BLOCK_CONFIG } from './data/blockConfig';
import { computeDerived } from './derived';
import { renderSheet } from './render/sheet';
import { isModeId, setMode } from './filters';
import {
  applyStepper,
  initSession,
  isStepperAction,
  isStepperTarget,
  resetSession,
  toggleCondition,
  type StepperAction,
  type StepperTarget,
} from './session';

const derived = computeDerived(demoCharacter);

const sheet = document.querySelector<HTMLElement>('#sheet');
if (sheet) {
  sheet.innerHTML = renderSheet(demoCharacter, derived, BLOCK_CONFIG);
}

// Appbar subtitle comes from data: no character value hardcoded in HTML.
const subtitle = document.querySelector<HTMLElement>('#appbar-character');
if (subtitle) {
  const identity = demoCharacter.identity;
  subtitle.textContent = ` · ${identity.name} · ${identity.class} ${identity.level}`;
}

// Session (Phase 06): loads persisted counters and re-renders the
// affected cards' inner content, so the sheet starts in sync (C2).
initSession(demoCharacter, derived);

// Mode tabs (Phase 05): accessible buttons drive setMode; the
// chips' active/aria-pressed state is synced inside filters.ts.
const modeButtons = document.querySelectorAll<HTMLButtonElement>('.mode-tabs [data-mode]');
for (const button of modeButtons) {
  button.addEventListener('click', () => {
    const { mode } = button.dataset;
    if (mode !== undefined && isModeId(mode)) setMode(mode);
  });
}

// Reset (Phase 06, C2): defaults + localStorage key removal.
document.querySelector<HTMLButtonElement>('#reset-session')?.addEventListener('click', () => {
  resetSession();
});

// --- Delegated card interactions (Phase 06) --------------------------

/** Handles one stepper button: action/target come from data
    attributes; the absolute value (death-save dots) from
    data-value. Unknown data is ignored (no crash). */
function handleStepper(button: HTMLElement): void {
  const action = button.dataset.action;
  const target = button.dataset.target;
  if (action === undefined || target === undefined) return;
  if (!isStepperAction(action) || !isStepperTarget(target)) return;
  const value = button.dataset.value !== undefined ? Number(button.dataset.value) : undefined;
  applyStepper(action as StepperAction, target as StepperTarget, value);
}

sheet?.addEventListener('click', event => {
  const node = event.target instanceof Element ? event.target : null;
  if (!node) return;

  // Editable counters (T-02): +/- stepper buttons and the
  // absolute death-save dots (class "dot", data-action="set").
  const step = node.closest<HTMLElement>('.step[data-action][data-target]');
  if (step) {
    handleStepper(step);
    return;
  }
  const dot = node.closest<HTMLElement>('.dot[data-action][data-target]');
  if (dot) {
    handleStepper(dot);
    return;
  }

  // Condition chips (T-02): toggle one label in sessionState.
  const condition = node.closest<HTMLElement>('.condition[data-action="toggle-condition"]');
  if (condition && condition.dataset.value !== undefined) {
    toggleCondition(condition.dataset.value);
    return;
  }

  // Spell chips (T-03): open the detail bottom sheet.
  const chip = node.closest<HTMLElement>('button.spell-chip[data-spell-id]');
  if (chip && chip.dataset.spellId !== undefined) {
    openSpellDetail(chip.dataset.spellId, chip);
  }
});

// Inspiration no longer needs a change handler: since the boolean
// moved to a dot (user request 2026-11-19), the generic dot handler
// above drives it via applyStepper('set', 'inspiration', 0|1).

// --- Spell detail bottom sheet (Phase 06, T-03 / D-28) ---------------

const detailSheet = document.querySelector<HTMLElement>('#detail-sheet');
const detailBackdrop = document.querySelector<HTMLElement>('#detail-backdrop');
const detailContent = document.querySelector<HTMLElement>('#detail-content');
const detailClose = detailSheet?.querySelector<HTMLButtonElement>('.sheet-close');
let detailTrigger: HTMLElement | null = null;

/** Looks a spell up by id in the character's own data (cantrips +
    prepared): nothing about the spell is hardcoded here. */
function findSpell(id: string): {
  name: string;
  meta: string;
  description: string;
} | null {
  const cantrip = demoCharacter.spells.cantrips.find(spell => spell.id === id);
  if (cantrip) {
    return {
      name: cantrip.name,
      meta: 'Truco',
      description: cantrip.description ?? 'Sin descripción en la ficha.',
    };
  }
  const prepared = demoCharacter.spells.prepared.find(spell => spell.id === id);
  if (prepared) {
    const origin = prepared.source === 'domain' ? 'dominio' : 'libre';
    const metaParts = [
      `Nivel ${prepared.level}`,
      origin,
      prepared.castTime,
      prepared.concentration ? 'Concentración' : undefined,
    ].filter((part): part is string => part !== undefined);
    return {
      name: prepared.name,
      meta: metaParts.join(' · '),
      description: prepared.description ?? 'Sin descripción en la ficha.',
    };
  }
  return null;
}

function openSpellDetail(id: string, trigger: HTMLElement): void {
  if (!detailSheet || !detailContent) return;
  const spell = findSpell(id);
  if (!spell) return;

  detailContent.innerHTML = `
    <div class="spell-details">
      <span class="lvl">${spell.meta}</span>
      <h3 class="sheet-title">${spell.name}</h3>
      <p class="desc">${spell.description}</p>
    </div>`;
  detailSheet.setAttribute('aria-label', `Detalle del conjuro ${spell.name}`);

  detailTrigger = trigger;
  if (detailBackdrop) detailBackdrop.hidden = false;
  detailSheet.hidden = false;
  document.body.classList.add('sheet-open');
  detailClose?.focus();
}

function closeSpellDetail(): void {
  if (!detailSheet || detailSheet.hidden) return;
  detailSheet.hidden = true;
  if (detailBackdrop) detailBackdrop.hidden = true;
  document.body.classList.remove('sheet-open');
  // Return focus to the chip that opened the sheet (I5).
  detailTrigger?.focus();
  detailTrigger = null;
}

detailClose?.addEventListener('click', () => closeSpellDetail());
detailBackdrop?.addEventListener('click', () => closeSpellDetail());

/** Focus is trapped inside the open dialog (constitution I5):
    Tab cycles within the sheet, Esc closes it. */
function handleDetailKeydown(event: KeyboardEvent): void {
  if (!detailSheet || detailSheet.hidden) return;
  if (event.key === 'Escape') {
    closeSpellDetail();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = detailSheet.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === detailSheet)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

document.addEventListener('keydown', handleDetailKeydown);
