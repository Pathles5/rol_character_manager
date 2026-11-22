/* ============================================================
   FichaSS — session state (Phase 06, model §4 / D-16 §4, D-27).
   Owns the mutable session counters: in-memory state + partial
   re-render + localStorage persistence. The `character` document
   NEVER changes during a session (D-17): every editable value
   lives only in `sessionState`.

   Rendering contract (spec C3): update() re-renders ONLY the
   inner content of the cards whose data changed (header kept),
   never the whole #sheet — the active mode, the DOM order and
   the FLIP state owned by filters.ts must survive untouched.

   Persistence: one key per character, `fichass-session-v1:<id>`
   (Phase 10, C2/C5; the id is the URL/file id), schemaVersion 1;
   load at startup (parse failure or version ≠ 1 → defaults);
   forward-only migration, unknown fields ignored (D-16 §4).
   Rule limits (HP, hit dice, slots, channel, death saves) are
   clamped here so NO caller can push a counter out of range
   (spec C5).
   ============================================================ */

import type { Character, SessionState, SpellLevel } from './types';
import type { DerivedStats } from './derived';
import type { BlockId } from './data/blockConfig';
// Session contract rules (model §4) live in the PURE shared module
// session-schema.ts — the same source the backend Lambda uses for
// PATCH validation (Fase 15, D-55). Re-exported here so the
// existing Phase 06/10 imports keep working unchanged.
import {
  defaultSessionState,
  sanitizeSessionState,
  clampSessionToRules,
  fallbackCharacterId,
  numberOr,
} from './session-schema';
import {
  renderCombat,
  renderDefense,
  renderIdentity,
  renderRest,
  renderSpells,
  renderTraits,
} from './render/blocks';

export const sessionKey = (characterId: string): string => `fichass-session-v1:${characterId}`;

export { defaultSessionState } from './session-schema';
export { TEMP_HP_MAX, DEATH_SAVE_MAX, CHANNEL_DIVINITY_MAX } from './session-schema';

// --- Live context -----------------------------------------------------

interface SessionContext {
  /** Character id this session belongs to (the URL/file id when
      the caller provides one; name-derived fallback otherwise). */
  characterId: string;
  character: Character;
  derived: DerivedStats;
  state: SessionState;
}

let context: SessionContext | null = null;

function requireContext(): SessionContext {
  if (!context) {
    throw new Error('FichaSS session: call initSession() before touching session state.');
  }
  return context;
}

// --- Loading / sanitizing (forward-only, D-16 §4) ---------------------
// The pure logic lives in session-schema.ts (shared with the backend
// Lambda). loadSession only owns the localStorage access.

function loadSession(character: Character, characterId: string): SessionState {
  try {
    const stored = window.localStorage.getItem(sessionKey(characterId));
    if (!stored) return defaultSessionState(character);
    return sanitizeSessionState(JSON.parse(stored), character, characterId);
  } catch {
    // Missing storage, quota error or broken JSON → defaults (spec C2).
    return defaultSessionState(character);
  }
}

function writeSession(): void {
  const { characterId, state } = requireContext();
  try {
    window.localStorage.setItem(sessionKey(characterId), JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode / quota): the session stays in memory.
  }
}

/** Clamps every rule-bounded counter of the state in place (C5):
    delegates to the PURE shared clamps (session-schema.ts) and
    copies the result over the live state. */
function clampToRules(state: SessionState, character: Character): void {
  Object.assign(state, clampSessionToRules(state, character));
}

// --- Partial re-render (C3: never the whole #sheet) -------------------

/** Which cards consume which session fields: only these get their
    inner content re-rendered after a patch. */
const PATCH_BLOCKS: { [K in keyof SessionPatch]: readonly BlockId[] } = {
  hp: ['combat', 'rest'],
  hitDice: ['combat', 'rest'],
  spellSlotsUsed: ['spells', 'rest'],
  channelDivinity: ['rest'],
  inspiration: ['identity'],
  deathSaves: ['defense'],
  conditions: ['combat', 'rest'],
  resourcesUsed: ['traits'],
};

const ALL_SESSION_BLOCKS: readonly BlockId[] = ['identity', 'combat', 'defense', 'spells', 'rest', 'traits'];

/** Render registry for the session-consuming blocks (renderers of
    blocks.ts; identity consumes the session since the inspiration
    dot moved there — user request 2026-11-19). */
const SESSION_RENDERERS: Partial<Record<BlockId, (character: Character, derived: DerivedStats, session: SessionState) => string>> = {
  identity: renderIdentity,
  combat: renderCombat,
  defense: renderDefense,
  spells: renderSpells,
  rest: renderRest,
  traits: renderTraits,
};

function affectedBlockIds(patch: SessionPatch): BlockId[] {
  const ids = new Set<BlockId>();
  for (const key of Object.keys(patch) as (keyof SessionPatch)[]) {
    if (patch[key] === undefined) continue;
    const blocks = PATCH_BLOCKS[key];
    if (!blocks) continue;
    for (const id of blocks) ids.add(id);
  }
  return [...ids];
}

/** Stable selector for restoring keyboard focus after a partial
    re-render: id-based controls use it; data-carrying controls
    (steppers/dots/condition chips) are matched by their data
    attributes. Returns null when the element has no stable
    identity. */
function focusKey(element: Element): string | null {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const d = (element as HTMLElement).dataset;
  if (d.action && d.target) {
    const value = d.value !== undefined ? `[data-value="${d.value}"]` : '';
    return `${element.tagName.toLowerCase()}[data-action="${d.action}"][data-target="${d.target}"]${value}`;
  }
  if (d.action && d.value !== undefined) {
    return `${element.tagName.toLowerCase()}[data-action="${d.action}"][data-value="${d.value}"]`;
  }
  return null;
}

/** Re-renders the inner content of one card, keeping its header
    (mode chip included): the section element itself is reused, so
    DOM order, visibility and FLIP state are never disturbed.
    Keyboard focus (I5) is restored to the homologous control
    after the swap, so counting with +/- keeps working (review
    major 2026-11-19). */
function refreshBlock(id: BlockId): void {
  const render = SESSION_RENDERERS[id];
  if (!render) return;
  const section = document.querySelector<HTMLElement>(`#sheet section[data-block="${id}"]`);
  if (!section) return;
  const { character, derived, state } = requireContext();
  const header = section.querySelector('header.blockhead');
  const headerHtml = header ? header.outerHTML : '';
  const focused = document.activeElement;
  const key = focused instanceof HTMLElement && section.contains(focused) ? focusKey(focused) : null;
  section.innerHTML = `${headerHtml}\n  ${render(character, derived, state)}`;
  if (key) {
    const again = section.querySelector<HTMLElement>(key);
    again?.focus();
  }
}

/** Public: re-render the inner content of the affected cards (all
    session cards when called without a patch, e.g. after loading
    or resetting). Cheap: four small innerHTML swaps at most. */
export function update(patch?: SessionPatch): void {
  if (!context) return;
  const ids = patch ? affectedBlockIds(patch) : ALL_SESSION_BLOCKS;
  for (const id of ids) refreshBlock(id);
}

// --- Public API -------------------------------------------------------

/** Bootstraps the session: loads persisted counters and syncs them
    into the freshly rendered sheet (renderSheet still shows the
    defaults, Phase 04 signature kept intact). The character id
    (Phase 10) keys the storage namespace AND is the identity the
    D-16 §4 guard compares against: a stored session whose
    characterId differs from the URL id gets fresh defaults.
    When omitted, the name-derived fallback id of Phase 06 is used
    (retrocompatible). */
export function initSession(character: Character, derived: DerivedStats, characterId?: string): SessionState {
  const id = characterId ?? fallbackCharacterId(character);
  context = {
    characterId: id,
    character,
    derived,
    state: loadSession(character, id),
  };
  // D-16 §4 coherence: the state's own characterId mirrors the URL id,
  // so a persisted session under another character is never accepted.
  if (context.state.characterId !== id) context.state.characterId = id;
  update();
  return context.state;
}

export function getSession(): SessionState {
  return requireContext().state;
}

/** Deep-partial patch of the session counters (spec C3): merges,
    clamps to the rule limits, persists and re-renders only the
    affected cards. */
export function patchSession(patch: SessionPatch): SessionState {
  const { character, state } = requireContext();
  if (patch.hp) state.hp = { ...state.hp, ...patch.hp };
  if (patch.hitDice) state.hitDice = { ...state.hitDice, ...patch.hitDice };
  if (patch.spellSlotsUsed) state.spellSlotsUsed = { ...state.spellSlotsUsed, ...patch.spellSlotsUsed };
  if (patch.channelDivinity) state.channelDivinity = { ...state.channelDivinity, ...patch.channelDivinity };
  if (patch.deathSaves) state.deathSaves = { ...state.deathSaves, ...patch.deathSaves };
  if (patch.inspiration !== undefined) state.inspiration = patch.inspiration;
  if (patch.conditions) state.conditions = [...patch.conditions];
  if (patch.resourcesUsed) state.resourcesUsed = { ...state.resourcesUsed, ...patch.resourcesUsed };
  clampToRules(state, character);
  writeSession();
  update(patch);
  return state;
}

/** Reset (spec C2): restores the defaults derived from the
    character and deletes this character's persisted key.
    Review fix (Phase 10 major 1): the state's characterId must
    stay the URL id — the name-derived fallback id inside
    defaultSessionState would make the next persisted write
    rejected by sanitizeLoaded after a reload. */
export function resetSession(): SessionState {
  const { character, characterId } = requireContext();
  try {
    window.localStorage.removeItem(sessionKey(characterId));
  } catch {
    // Storage unavailable: nothing to remove.
  }
  if (context) {
    context.state = { ...defaultSessionState(character), characterId };
  }
  update();
  return requireContext().state;
}

/** Toggles one condition label (chips in the rest card). */
export function toggleCondition(condition: string): SessionState {
  const { state } = requireContext();
  const conditions = state.conditions.includes(condition)
    ? state.conditions.filter(active => active !== condition)
    : [...state.conditions, condition];
  return patchSession({ conditions });
}

// --- Steppers (T-02): the only state mutations the UI triggers -------

export type StepperAction = 'inc' | 'dec' | 'set';

export type StepperTarget =
  | 'hp-current'
  | 'hp-temp'
  | 'hit-dice'
  | 'slot-1'
  | 'slot-2'
  | 'slot-3'
  | 'channel-divinity'
  | 'death-successes'
  | 'death-failures'
  /** Any activable trait: `resource-<traitId>` (amendment D-38 of
      D-16). The trait's authored `uses` caps the counter. */
  | `resource-${string}`
  | 'inspiration';

const FIXED_STEPPER_TARGETS: readonly string[] = [
  'hp-current',
  'hp-temp',
  'hit-dice',
  'slot-1',
  'slot-2',
  'slot-3',
  'channel-divinity',
  'death-successes',
  'death-failures',
  'inspiration',
];

export function isStepperAction(value: string): value is StepperAction {
  return value === 'inc' || value === 'dec' || value === 'set';
}

export function isStepperTarget(value: string): value is StepperTarget {
  return FIXED_STEPPER_TARGETS.includes(value)
    || (value.startsWith('resource-') && value.length > 'resource-'.length);
}

/** Activable trait id of a `resource-<traitId>` target (D-38). */
function resourceTraitId(target: StepperTarget): string {
  return target.slice('resource-'.length);
}

function readCounter(state: SessionState, target: StepperTarget): number {
  if (target.startsWith('resource-')) {
    return state.resourcesUsed[resourceTraitId(target)] ?? 0;
  }
  switch (target) {
    case 'hp-current': return state.hp.current;
    case 'hp-temp': return state.hp.temp;
    case 'hit-dice': return state.hitDice.used;
    case 'slot-1': return state.spellSlotsUsed[1];
    case 'slot-2': return state.spellSlotsUsed[2];
    case 'slot-3': return state.spellSlotsUsed[3];
    case 'channel-divinity': return state.channelDivinity.used;
    case 'death-successes': return state.deathSaves.successes;
    case 'death-failures': return state.deathSaves.failures;
    case 'inspiration': return state.inspiration ? 1 : 0;
    // Unreachable in practice: isStepperTarget guards the callers and
    // resource-* targets return early above (TS exhaustiveness guard).
    default: return 0;
  }
}

function writeCounter(target: StepperTarget, value: number): SessionPatch {
  if (target.startsWith('resource-')) {
    return { resourcesUsed: { [resourceTraitId(target)]: value } };
  }
  switch (target) {
    case 'hp-current': return { hp: { current: value } };
    case 'hp-temp': return { hp: { temp: value } };
    case 'hit-dice': return { hitDice: { used: value } };
    case 'slot-1': return { spellSlotsUsed: { 1: value } };
    case 'slot-2': return { spellSlotsUsed: { 2: value } };
    case 'slot-3': return { spellSlotsUsed: { 3: value } };
    case 'channel-divinity': return { channelDivinity: { used: value } };
    case 'death-successes': return { deathSaves: { successes: value } };
    case 'death-failures': return { deathSaves: { failures: value } };
    case 'inspiration': return { inspiration: value >= 1 };
    // Unreachable in practice (see readCounter): no-op patch.
    default: return {};
  }
}

/** Applies one stepper interaction (+1 / −1, ±N via `value`, or an
    absolute value for the death-save dots and the HP fill button).
    Limits are enforced by patchSession. */
export function applyStepper(action: StepperAction, target: StepperTarget, value?: number): SessionState {
  const { state } = requireContext();
  const current = readCounter(state, target);
  const next = action === 'set'
    ? numberOr(value, current)
    : current + (numberOr(value, 1)) * (action === 'inc' ? 1 : -1);
  return patchSession(writeCounter(target, next));
}

/** Shape of a partial session update (deep-partial SessionState,
    minus the schema/characterId bookkeeping fields). */
export interface SessionPatch {
  hp?: { current?: number; temp?: number };
  hitDice?: { used?: number };
  spellSlotsUsed?: Partial<Record<SpellLevel, number>>;
  channelDivinity?: { used?: number };
  inspiration?: boolean;
  deathSaves?: { successes?: number; failures?: number };
  conditions?: string[];
  resourcesUsed?: Record<string, number>;
}
