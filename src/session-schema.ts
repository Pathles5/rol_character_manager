/* ============================================================
   FichaSS — session-state schema (pure, shared).
   The SINGLE SOURCE of the session contract rules (model §4,
   D-16 §4) — imported by BOTH the browser (session.ts) and the
   backend Lambda (backend/session.ts, Fase 15, D-55). No DOM,
   no storage: only types, defaults, sanitizing and rule clamps.
   ============================================================ */

import type { Character, SessionState } from './types';

export const SESSION_SCHEMA_VERSION = 1;

/** Generic 5e rule constants (not character data). */
/** Reasonable cap for temporary hit points (no strict rule cap). */
export const TEMP_HP_MAX = 20;
/** Death saves: 3 successes or 3 failures end the sequence (2024). */
export const DEATH_SAVE_MAX = 3;
/** 2024 cleric: Channel Divinity tops at 2 uses (level 5). */
export const CHANNEL_DIVINITY_MAX = 2;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Finite number or fallback (unknown/invalid fields ignored). */
export function numberOr(value: unknown, fallback: number): number {
  return finiteNumber(value) ?? fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Name-derived fallback id (the Phase 06 scheme used when the
    caller doesn't pass an explicit character id). */
export function fallbackCharacterId(character: Character): string {
  return character.identity.name.toLowerCase().replace(/\s+/g, '-');
}

/** Default session state (model §4): derived from the character,
    everything unused. */
export function defaultSessionState(character: Character): SessionState {
  return {
    schemaVersion: 1,
    // Name-derived fallback id; the URL id overrides it in
    // initSession/resetSession (Phase 10 coherence, D-16 §4).
    characterId: fallbackCharacterId(character),
    hp: { current: character.combat.maxHitPoints, temp: 0 },
    hitDice: { used: 0 },
    spellSlotsUsed: { 1: 0, 2: 0, 3: 0 },
    channelDivinity: { used: 0 },
    inspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    resourcesUsed: {},
  };
}

/** Rebuilds a valid SessionState from persisted JSON (forward-only,
    D-16 §4): only known fields are read (unknown ones ignored),
    invalid values fall back to defaults, the characterId must
    match (a session belongs to one character) and everything is
    clamped to the rule limits. Used by the localStorage loader
    AND the backend PATCH validation (Fase 15, D-55). */
export function sanitizeSessionState(
  raw: unknown,
  character: Character,
  characterId: string,
): SessionState {
  const defaults = defaultSessionState(character);
  if (typeof raw !== 'object' || raw === null) return defaults;
  const data = raw as Record<string, unknown>;
  // Parse failure is caught by the caller; version ≠ 1 → defaults.
  if (data.schemaVersion !== SESSION_SCHEMA_VERSION) return defaults;
  // A session belongs to one character: mismatch with the id
  // (Phase 10) → fresh defaults. The state's own characterId
  // mirrors that id (D-16 §4 coherence with the storage namespace).
  if (data.characterId !== characterId) return defaults;

  const hp = (typeof data.hp === 'object' && data.hp !== null ? data.hp : {}) as Record<string, unknown>;
  const hitDice = (typeof data.hitDice === 'object' && data.hitDice !== null ? data.hitDice : {}) as Record<string, unknown>;
  const slots = (typeof data.spellSlotsUsed === 'object' && data.spellSlotsUsed !== null ? data.spellSlotsUsed : {}) as Record<string, unknown>;
  const channel = (typeof data.channelDivinity === 'object' && data.channelDivinity !== null ? data.channelDivinity : {}) as Record<string, unknown>;
  const deathSaves = (typeof data.deathSaves === 'object' && data.deathSaves !== null ? data.deathSaves : {}) as Record<string, unknown>;

  const resourcesUsed: Record<string, number> = {};
  if (typeof data.resourcesUsed === 'object' && data.resourcesUsed !== null) {
    for (const [traitId, used] of Object.entries(data.resourcesUsed as Record<string, unknown>)) {
      const value = finiteNumber(used);
      if (value !== null) resourcesUsed[traitId] = value;
    }
  }

  return clampSessionToRules(
    {
      schemaVersion: SESSION_SCHEMA_VERSION,
      characterId,
      hp: {
        current: numberOr(hp.current, defaults.hp.current),
        temp: numberOr(hp.temp, defaults.hp.temp),
      },
      hitDice: { used: numberOr(hitDice.used, 0) },
      spellSlotsUsed: {
        1: numberOr(slots['1'], 0),
        2: numberOr(slots['2'], 0),
        3: numberOr(slots['3'], 0),
      },
      channelDivinity: { used: numberOr(channel.used, 0) },
      inspiration: data.inspiration === true,
      deathSaves: {
        successes: numberOr(deathSaves.successes, 0),
        failures: numberOr(deathSaves.failures, 0),
      },
      conditions: Array.isArray(data.conditions)
        ? data.conditions.filter((condition): condition is string => typeof condition === 'string')
        : [],
      resourcesUsed,
    },
    character,
  );
}

/** Clamps EVERY rule-bounded counter of the state (C5), returning
    a new state: HP 0..maxHP, temp HP 0..TEMP_HP_MAX, dice
    0..total, slots 0..max, channel 0..2, death saves 0..3, and
    each resource counter capped by the trait's authored `uses`
    (amendment D-38; unknown trait ids are left untouched). */
export function clampSessionToRules(state: SessionState, character: Character): SessionState {
  const combat = character.combat;
  const clamped: SessionState = {
    ...state,
    hp: {
      current: clamp(state.hp.current, 0, combat.maxHitPoints),
      temp: clamp(state.hp.temp, 0, TEMP_HP_MAX),
    },
    hitDice: { used: clamp(state.hitDice.used, 0, combat.hitDice.total) },
    spellSlotsUsed: {
      1: clamp(state.spellSlotsUsed[1], 0, character.spells.slotsMax[1]),
      2: clamp(state.spellSlotsUsed[2], 0, character.spells.slotsMax[2]),
      3: clamp(state.spellSlotsUsed[3], 0, character.spells.slotsMax[3]),
    },
    channelDivinity: { used: clamp(state.channelDivinity.used, 0, CHANNEL_DIVINITY_MAX) },
    deathSaves: {
      successes: clamp(state.deathSaves.successes, 0, DEATH_SAVE_MAX),
      failures: clamp(state.deathSaves.failures, 0, DEATH_SAVE_MAX),
    },
    resourcesUsed: { ...state.resourcesUsed },
  };
  for (const [traitId, used] of Object.entries(clamped.resourcesUsed)) {
    const max = character.traits.find(trait => trait.id === traitId)?.uses;
    if (max !== undefined) clamped.resourcesUsed[traitId] = clamp(used, 0, max);
  }
  return clamped;
}
