/* ============================================================
   FichaSS — mode filters with animated reflow (Phase 05).
   Owns the active mode (combate/aventura/descanso/mesa) and
   applies the frozen matrix of BLOCK_CONFIG (D-16) to the
   sections rendered by Phase 04: no content re-render, only
   DOM order (appendChild; grid order = DOM order) and
   visibility. Reflow is animated with a single FLIP pass
   (FIRST -> LAST -> INVERT -> PLAY, D-25) and honours
   prefers-reduced-motion (constitution I5): with the media
   query active the state is applied instantly, without
   transitions.

   Exit blocks fade out (opacity/scale, ~200ms) and are
   switched to display:none right after the fade, so they
   leave the accessibility tree (I5). Hidden sections are
   appended AFTER the visible ones, so the deferred
   display:none never shifts the visible blocks (grid
   placement only depends on preceding siblings).

   Quick clicks cancel pending timers and re-apply from the
   current visual state: no ghost states.
   ============================================================ */

import { BLOCK_CONFIG } from './data/blockConfig';
import type { BlockId } from './data/blockConfig';

export type ModeId = 'combate' | 'aventura' | 'descanso' | 'mesa';

/** Frozen mode ids, matrix order (model §6). */
export const MODE_IDS: readonly ModeId[] = [
  'combate',
  'aventura',
  'descanso',
  'mesa',
];

/** Fade-out duration of exiting blocks; the FLIP move (250ms)
    lives in base.css as a transition on the grid cards. */
const FADE_OUT_MS = 200;
/** display:none kicks in just after the fade-out ends. */
const HIDE_DELAY_MS = FADE_OUT_MS + 20;

/** Active mode; "aventura" is the default full sheet (model §6). */
let currentMode: ModeId = 'aventura';

/** Pending display:none timers, per section (quick-click safety). */
const hideTimers = new Map<HTMLElement, number>();

/** Type guard for mode ids coming from the DOM (data-mode). */
export function isModeId(value: string): value is ModeId {
  return (MODE_IDS as readonly string[]).includes(value);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cancelPendingHides(): void {
  for (const timer of hideTimers.values()) window.clearTimeout(timer);
  hideTimers.clear();
}

/** Clear interrupted inline FLIP styles (quick-click safety). */
function clearInlineFlip(sections: Iterable<HTMLElement>): void {
  for (const section of sections) {
    section.style.transition = '';
    section.style.transform = '';
  }
}

/** Sections of the sheet keyed by their block id (data-block). */
function querySections(sheet: HTMLElement): Map<BlockId, HTMLElement> {
  const sections = new Map<BlockId, HTMLElement>();
  for (const section of sheet.querySelectorAll<HTMLElement>('section[data-block]')) {
    const id = section.dataset.block;
    if (id) sections.set(id as BlockId, section);
  }
  return sections;
}

/** Target order (ascending weight) split into visible/hidden ids
    for the mode; BLOCK_CONFIG is the single source (I4). */
function targetOrder(mode: ModeId): { visible: BlockId[]; hidden: BlockId[] } {
  const byWeight = [...BLOCK_CONFIG].sort((a, b) => a.weight - b.weight);
  const visible: BlockId[] = [];
  const hidden: BlockId[] = [];
  for (const entry of byWeight) {
    (entry[mode] ? visible : hidden).push(entry.id);
  }
  return { visible, hidden };
}

/** Chips: active mode is unique; aria-pressed follows (spec C3). */
function syncChips(mode: ModeId): void {
  for (const chip of document.querySelectorAll<HTMLButtonElement>('.mode-tabs [data-mode]')) {
    const active = chip.dataset.mode === mode;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
}

/** Per-mode block variants (spec C4): identity compact in
    combate/descanso, role highlighted in mesa. */
function syncBlockVariants(mode: ModeId, sections: Map<BlockId, HTMLElement>): void {
  const identity = sections.get('identity');
  if (identity) {
    identity.classList.toggle('is-compact', mode === 'combate' || mode === 'descanso');
  }
  const role = sections.get('role');
  if (role) role.classList.toggle('is-highlight', mode === 'mesa');
}

/** Reduced motion (or any non-animated path): apply the target
    state directly, with no transitions and no timers. */
function applyInstant(sheet: HTMLElement, sections: Map<BlockId, HTMLElement>, mode: ModeId): void {
  cancelPendingHides();
  clearInlineFlip(sections.values());

  const { visible, hidden } = targetOrder(mode);
  for (const id of visible) {
    const section = sections.get(id);
    if (!section) continue;
    sheet.appendChild(section);
    section.style.display = '';
    section.classList.remove('is-hidden');
  }
  for (const id of hidden) {
    const section = sections.get(id);
    if (!section) continue;
    sheet.appendChild(section);
    section.style.display = 'none';
    section.classList.remove('is-hidden');
  }
}

/** Schedule the deferred display:none of one exiting section. */
function scheduleHide(section: HTMLElement): void {
  const previous = hideTimers.get(section);
  if (previous !== undefined) window.clearTimeout(previous);
  hideTimers.set(section, window.setTimeout(() => {
    hideTimers.delete(section);
    section.style.display = 'none';
  }, HIDE_DELAY_MS));
}

/** Animated path: one FLIP pass over the grid cards.
    FIRST: rects of every currently rendered section.
    THEN: DOM reorder (visible first, then hidden), visibility
    classes and per-mode variants; the entering ones keep
    .is-hidden (their fade-in start state).
    LAST: rects of the previously visible sections.
    INVERT: pin each of them to its old spot (transform, no
    transition). PLAY: release the pins and let the stylesheet
    transition move/fade them; entering sections fade in. */
function applyAnimated(sheet: HTMLElement, sections: Map<BlockId, HTMLElement>, mode: ModeId): void {
  cancelPendingHides();
  clearInlineFlip(sections.values());

  const { visible, hidden } = targetOrder(mode);

  // FIRST (rects include any residual transform of an
  // interrupted previous transition: FLIP continues from the
  // current visual position).
  const firstRects = new Map<HTMLElement, DOMRect>();
  for (const section of sections.values()) {
    if (section.style.display !== 'none') {
      firstRects.set(section, section.getBoundingClientRect());
    }
  }

  // Reorder: visible blocks in weight order, hidden ones after.
  for (const id of [...visible, ...hidden]) {
    const section = sections.get(id);
    if (section) sheet.appendChild(section);
  }

  // Visibility toggles; entering sections keep .is-hidden.
  const entering: HTMLElement[] = [];
  for (const id of visible) {
    const section = sections.get(id);
    if (!section) continue;
    section.style.display = '';
    if (section.classList.contains('is-hidden')) entering.push(section);
  }
  for (const id of hidden) {
    const section = sections.get(id);
    if (!section) continue;
    if (section.style.display !== 'none') {
      section.classList.add('is-hidden');
      scheduleHide(section);
    }
  }

  // Variant classes join the same layout pass (LAST sees them).
  syncBlockVariants(mode, sections);

  // LAST.
  const lastRects = new Map<HTMLElement, DOMRect>();
  for (const [section] of firstRects) {
    lastRects.set(section, section.getBoundingClientRect());
  }

  // INVERT.
  let moved = false;
  for (const [section, firstRect] of firstRects) {
    const lastRect = lastRects.get(section);
    if (!lastRect) continue;
    const dx = firstRect.left - lastRect.left;
    const dy = firstRect.top - lastRect.top;
    if (dx === 0 && dy === 0) continue;
    section.style.transition = 'none';
    section.style.transform = `translate(${dx}px, ${dy}px)`;
    moved = true;
  }

  if (moved) {
    // Force one reflow with the inverted transforms applied.
    void sheet.offsetWidth;
    // PLAY: the stylesheet transition (transform 250ms) brings
    // every pinned section back to its natural spot.
    for (const section of firstRects.keys()) {
      section.style.transition = '';
      section.style.transform = '';
    }
  }

  // Fade the entering sections in (layout is final now).
  for (const section of entering) section.classList.remove('is-hidden');
}

/** Public entry point: switch the sheet to `mode`. */
export function setMode(mode: ModeId): void {
  if (mode === currentMode) return;
  const sheet = document.querySelector<HTMLElement>('#sheet');
  if (!sheet) return;
  currentMode = mode;

  const sections = querySections(sheet);
  if (sections.size === 0) return;

  syncChips(mode);

  if (prefersReducedMotion()) {
    applyInstant(sheet, sections, mode);
  } else {
    applyAnimated(sheet, sections, mode);
  }
}
