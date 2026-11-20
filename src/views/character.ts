/* ============================================================
   FichaSS — character detail view (Phase 10, T-04 / D-33).
   The whole Phase 04–07 flow of the former src/main.ts,
   encapsulated behind one route:

   fetch ./characters/<id>.json → validateCharacter (D-35: an
   invalid JSON shows an error card with the field→message map,
   NEVER a partial sheet) → computeDerived → appbar with mode
   chips → renderSheet → initSession (per character id, C2/C5)
   → delegated listeners (steppers / dots / conditions / spell
   chips / mode tabs / reset) → spell detail bottom sheet.

   Every view paints its own DOM into a fresh router container,
   so all listeners below die with the view except the document
   keydown of the bottom sheet, which is detached explicitly.
   ============================================================ */

import { BLOCK_CONFIG } from '../data/blockConfig';
import { computeDerived } from '../derived';
import { isModeId, setMode } from '../filters';
import { escapeHtml } from '../lib/manifest';
import { renderSheet } from '../render/sheet';
import {
  applyStepper,
  initSession,
  isStepperAction,
  isStepperTarget,
  resetSession,
  toggleCondition,
  type StepperAction,
  type StepperTarget,
} from '../session';
import type { Character } from '../types';
import { validateCharacter } from '../validate';

/** Detaches the document-level keydown handler of the PREVIOUS
    character view (the only listener that outlives its DOM). */
let detachDetailKeydown: (() => void) | null = null;

const LOADING_HTML = `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS</strong></div>
  </header>
  <main class="sheet-grid" id="sheet" aria-busy="true">
    <div class="card skeleton" aria-hidden="true">
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
    </div>
  </main>`;

/** Fetch / HTTP failure (404 included): amiable error, no crash. */
function missingHtml(id: string): string {
  return `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS</strong></div>
  </header>
  <main class="sheet-grid" id="sheet">
    <div class="card error-view">
      <h1 class="display">No existe el personaje ${id}</h1>
      <p class="dim">El JSON no está en public/characters/ o el enlace no es válido.</p>
      <a href="#/">← volver a personajes</a>
    </div>
  </main>`;
}

/** Validation failure (D-35): full rejection, field→message map
    verbatim from the validator (English messages are engine
    logs; the Spanish subtitle explains the situation). */
function invalidHtml(fields: Record<string, string>): string {
  const rows = Object.entries(fields)
    .map(([field, message]) => `        <li class="row"><span class="k">${field}</span><span class="v">${message}</span></li>`)
    .join('\n');
  return `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS</strong></div>
  </header>
  <main class="sheet-grid" id="sheet">
    <div class="card error-view">
      <h1 class="display">Ficha inválida</h1>
      <p class="dim">El JSON del personaje no cumple el contrato del modelo de datos (campo → mensaje del validador):</p>
      <ul class="rows">
${rows}
      </ul>
      <a href="#/">← volver a personajes</a>
    </div>
  </main>`;
}

// --- Spell detail bottom sheet (Phase 06, T-03 / D-28) ---------------

let detailSheet: HTMLElement | null = null;
let detailBackdrop: HTMLElement | null = null;
let detailContent: HTMLElement | null = null;
let detailTrigger: HTMLElement | null = null;

/** Looks a spell up by id in the character's own data (cantrips +
    prepared): nothing about the spell is hardcoded here. */
function findSpell(character: Character, id: string): {
  name: string;
  meta: string;
  description: string;
} | null {
  const cantrip = character.spells.cantrips.find(spell => spell.id === id);
  if (cantrip) {
    return {
      name: cantrip.name,
      meta: 'Truco',
      description: cantrip.description ?? 'Sin descripción en la ficha.',
    };
  }
  const prepared = character.spells.prepared.find(spell => spell.id === id);
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

function openSpellDetail(character: Character, id: string, trigger: HTMLElement): void {
  if (!detailSheet || !detailContent) return;
  const spell = findSpell(character, id);
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
  detailSheet.querySelector<HTMLButtonElement>('.sheet-close')?.focus();
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

// --- Delegated card interactions (Phase 06) ---------------------------

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

// --- The view ----------------------------------------------------------

export async function characterView(root: HTMLElement, id: string): Promise<void> {
  // Lifecycle: the previous character view's document keydown
  // handler must not survive into this mount; a stale dialog
  // body lock must go too.
  detachDetailKeydown?.();
  detachDetailKeydown = null;
  document.body.classList.remove('sheet-open');

  // Async navigation race (review major 2, Phase 10): this view's
  // awaits may resolve AFTER another route took over; the hash is
  // the generation token. Every checkpoint below bails out without
  // touching module state (session context, sheet refs, document
  // listeners) when the user already navigated elsewhere.
  const hashAtStart = window.location.hash;
  const stale = (): boolean => window.location.hash !== hashAtStart;

  root.innerHTML = LOADING_HTML;

  let payload: unknown;
  try {
    const response = await fetch(`./characters/${id}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch {
    if (stale()) return;
    root.innerHTML = missingHtml(id);
    return;
  }
  if (stale()) return;

  const validation = validateCharacter(payload);
  if (!validation.ok) {
    root.innerHTML = invalidHtml(validation.fields);
    return;
  }
  const character = payload as Character;

  // Success: full appbar (modes + reset) + sheet + detail sheet.
  const identity = character.identity;
  // Mode icons: inline SVG (stroke), self-contained — no external
  // resources (constitution I2). Lucide-style geometry, viewBox 24.
  const MODE_ICONS: Record<string, string> = {
    combate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
    aventura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>',
    descanso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    mesa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  };
  const modeButtonsHtml = (['combate', 'aventura', 'descanso', 'mesa'] as const)
    .map(mode => `
      <button type="button" class="mode-btn${mode === 'aventura' ? ' active' : ''}" data-mode="${mode}" aria-pressed="${mode === 'aventura'}" title="Modo ${mode.charAt(0).toUpperCase()}${mode.slice(1)}" aria-label="Modo ${mode}">
        ${MODE_ICONS[mode]}<span class="mode-label">${mode.charAt(0).toUpperCase()}${mode.slice(1)}</span>
      </button>`)
    .join('');

  root.innerHTML = `
  <header class="appbar">
    <div class="appbar-top">
      <div class="appbar-home">
        <a class="appbar-back" href="#/" aria-label="Volver a la vista de personajes">←</a>
        <a class="appbar-home-link" href="#/"><strong>FichaSS</strong></a>
      </div>
      <!-- Phase 06: restores the default session counters and clears localStorage. -->
      <button type="button" class="chip" id="reset-session" aria-label="Restablecer los contadores de la sesión y borrar lo guardado">Reset</button>
    </div>
    <div class="appbar-main">
      <div class="appbar-identity">
        <span class="appbar-name">${escapeHtml(identity.name)}</span>
        <span class="appbar-sub">${escapeHtml(identity.class)} · nivel ${identity.level}</span>
      </div>
      <nav class="mode-tabs" aria-label="Modos de vista">
        ${modeButtonsHtml}
      </nav>
    </div>
  </header>

  <!-- The full sheet is rendered below (renderSheet over the
       loaded character + computeDerived + BLOCK_CONFIG). -->
  <main class="sheet-grid" id="sheet"></main>

  <!-- Phase 06 (T-03): spell detail bottom sheet. Empty container;
       the content is mounted from the spell data. -->
  <div class="backdrop" id="detail-backdrop" hidden></div>
  <!-- Phase 06 amendment (user request 2026-11-20): Reset asks for
       confirmation before wiping the session (no accidental deletes). -->
  <div class="backdrop" id="reset-backdrop" hidden></div>
  <section class="card confirm-dialog" id="reset-confirm" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title" hidden>
    <h2 class="confirm-title" id="reset-confirm-title">¿Restablecer contadores?</h2>
    <p class="confirm-text">Se restauran los valores por defecto de <strong>${escapeHtml(identity.name)}</strong> y se borra la sesión guardada.</p>
    <div class="confirm-actions">
      <button type="button" class="chip" id="reset-cancel">Cancelar</button>
      <button type="button" class="chip confirm-danger" id="reset-accept">Restablecer</button>
    </div>
  </section>
  <section class="sheet spell-sheet" id="detail-sheet" role="dialog" aria-modal="true" aria-label="Detalle de conjuro" hidden>
    <div class="handle" aria-hidden="true"></div>
    <button type="button" class="sheet-close" aria-label="Cerrar el detalle del conjuro">✕</button>
    <div id="detail-content"></div>
  </section>`;

  const sheet = root.querySelector<HTMLElement>('#sheet');
  const derived = computeDerived(character);
  if (sheet) {
    sheet.innerHTML = renderSheet(character, derived, BLOCK_CONFIG);
  }

  // Session (Phase 06): loads THIS character's persisted counters
  // (key fichass-session-v1:<id>) and re-renders the affected
  // cards' inner content, so the sheet starts in sync (C2/C5).
  // Stale-navigation guard: module state (session context, sheet
  // refs) is never touched for a route that already lost the mount.
  if (stale()) return;
  initSession(character, derived, id);

  // Mode module state survives navigation (filters.ts keeps one
  // currentMode): normalize the freshly rendered DOM to the
  // default "aventura" so chips and visibility can never
  // disagree. No-op when the module is already there.
  setMode('aventura');

  // Mode tabs (Phase 05): accessible buttons drive setMode; the
  // chips' active/aria-pressed state is synced inside filters.ts.
  const modeButtons = root.querySelectorAll<HTMLButtonElement>('.mode-tabs [data-mode]');
  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      const { mode } = button.dataset;
      if (mode !== undefined && isModeId(mode)) setMode(mode);
    });
  }

  // Reset (Phase 06, C2): defaults + per-character key removal —
  // behind a confirmation dialog (user request 2026-11-20: avoid
  // accidental wipes). Cancel/backdrop close; accept resets.
  const resetButton = root.querySelector<HTMLButtonElement>('#reset-session');
  const resetDialog = root.querySelector<HTMLElement>('#reset-confirm');
  const resetBackdrop = root.querySelector<HTMLElement>('#reset-backdrop');
  const closeReset = (): void => {
    if (resetDialog) resetDialog.hidden = true;
    if (resetBackdrop) resetBackdrop.hidden = true;
    resetButton?.focus();
  };
  resetButton?.addEventListener('click', () => {
    if (resetDialog) resetDialog.hidden = false;
    if (resetBackdrop) resetBackdrop.hidden = false;
    root.querySelector<HTMLButtonElement>('#reset-cancel')?.focus();
  });
  root.querySelector<HTMLButtonElement>('#reset-cancel')?.addEventListener('click', closeReset);
  resetBackdrop?.addEventListener('click', closeReset);
  root.querySelector<HTMLButtonElement>('#reset-accept')?.addEventListener('click', () => {
    resetSession();
    closeReset();
  });

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
      openSpellDetail(character, chip.dataset.spellId, chip);
    }
  });

  // Inspiration no longer needs a change handler: since the boolean
  // moved to a dot (user request 2026-11-19), the generic dot handler
  // above drives it via applyStepper('set', 'inspiration', 0|1).

  // --- Spell detail bottom sheet wiring (this view's DOM) ------------

  detailSheet = root.querySelector<HTMLElement>('#detail-sheet');
  detailBackdrop = root.querySelector<HTMLElement>('#detail-backdrop');
  detailContent = root.querySelector<HTMLElement>('#detail-content');
  const detailClose = detailSheet?.querySelector<HTMLButtonElement>('.sheet-close');

  detailClose?.addEventListener('click', () => closeSpellDetail());
  detailBackdrop?.addEventListener('click', () => closeSpellDetail());

  document.addEventListener('keydown', handleDetailKeydown);
  detachDetailKeydown = () => {
    document.removeEventListener('keydown', handleDetailKeydown);
    detailSheet = null;
    detailBackdrop = null;
    detailContent = null;
    detailTrigger = null;
  };
}
