// @vitest-environment jsdom
/* ============================================================
   Phase 07 — session-state tests (model §4, spec C2/C5).
   session.ts owns DOM rendering + localStorage, so this suite
   runs in jsdom (per-file environment, D-29): node stays the
   environment of every pure-logic suite.

   Scope:
   - initSession defaults / reset restores them and clears storage.
   - patchSession clamps every rule-bounded counter (spec C5):
     HP 0..maxHP, temp ≤ 20, dice 0..total, slots 0..max,
     channel ≤ 2, death saves ≤ 3, fortuna ≤ 1.
   - Migration on load: version ≠ 1 → defaults, foreign
     characterId → defaults, broken JSON → defaults, unknown
     fields ignored (D-16 §4 forward-only rule).
   - Focus restoration after a partial re-render (Phase 06 major):
     tested with a real stepper button; if jsdom ever proves
     unreliable here, it must be dropped and handed to manual QA,
     NEVER faked.

   sanitizeLoaded() is private: its behavior is exercised through
   the exported initSession() load path.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Character, SessionState } from './types';
import {
  CHANNEL_DIVINITY_MAX,
  DEATH_SAVE_MAX,
  TEMP_HP_MAX,
  applyRemoteState,
  applyStepper,
  defaultSessionState,
  getSession,
  initSession,
  isStepperAction,
  isStepperTarget,
  onSessionChange,
  patchSession,
  resetSession,
  sessionKey,
  toggleCondition,
} from './session';
import { computeDerived } from './derived';

/** Living fixture (Phase 10, D-33): public/characters/
    character-demo.json, read at test time — src/ → repo root →
    public/characters/. The validator and the session sanitize
    guard the shape, so the typed cast only aids field access. */
import { join } from 'node:path';

const fixturePath = join(import.meta.dirname, '../tests/fixtures/character-demo.json');
const demoCharacter = JSON.parse(readFileSync(fixturePath, 'utf8')) as Character;

const derived = computeDerived(demoCharacter);
const MAX_HP = demoCharacter.combat.maxHitPoints; // 38
const SLOT_MAX = demoCharacter.spells.slotsMax[1]; // 4
const HIT_DICE_TOTAL = demoCharacter.combat.hitDice.total; // 5

/** initSession without an explicit id falls back to the
    name-derived id (Phase 06 scheme kept by
    defaultSessionState): "Seren Aldaard" → seren-aldaard. */
const FALLBACK_ID = 'seren-aldaard';
const KEY = sessionKey(FALLBACK_ID);

/** Minimal #sheet skeleton: refreshBlock only rewrites the inner
    content of the five session-consuming cards, keeping headers. */
function mountSheet(): void {
  document.body.innerHTML = `
    <main id="sheet">
      <section data-block="combat"><header class="blockhead"><h2>Combate</h2></header></section>
      <section data-block="defense"><header class="blockhead"><h2>Salvaciones</h2></header></section>
      <section data-block="spells"><header class="blockhead"><h2>Conjuros</h2></header></section>
      <section data-block="rest"><header class="blockhead"><h2>Descanso</h2></header></section>
      <section data-block="traits"><header class="blockhead"><h2>Rasgos</h2></header></section>
    </main>`;
}

/** Reads back the persisted raw JSON (null when absent). */
function storedRaw(): Record<string, unknown> | null {
  const text = window.localStorage.getItem(KEY);
  return text ? (JSON.parse(text) as Record<string, unknown>) : null;
}

beforeEach(() => {
  mountSheet();
  window.localStorage.clear();
});

describe('sessionKey — one storage namespace per character (spec Fase 10, C2/C5)', () => {
  it('maps every character id to its versioned key', () => {
    expect(sessionKey('x')).toBe('fichass-session-v1:x');
    expect(sessionKey('character-demo')).toBe('fichass-session-v1:character-demo');
  });

  it('persists the session under the EXPLICIT character id', () => {
    // The character view passes the URL id (Phase 10, T-04): the
    // storage key must follow it, never another character's.
    initSession(demoCharacter, derived, 'character-demo');
    patchSession({ hp: { current: 10 } });
    expect(window.localStorage.getItem(sessionKey('character-demo'))).not.toBeNull();
    expect(window.localStorage.getItem(sessionKey('seren-aldaard'))).toBeNull();
  });
});

describe('initSession — defaults (model §4)', () => {
  it('starts the counters derived from the character', () => {
    const state = initSession(demoCharacter, derived);
    expect(state).toEqual({
      schemaVersion: 1,
      characterId: 'seren-aldaard',
      hp: { current: MAX_HP, temp: 0 },
      hitDice: { used: 0 },
      spellSlotsUsed: { 1: 0, 2: 0, 3: 0 },
      channelDivinity: { used: 0 },
      inspiration: false,
      deathSaves: { successes: 0, failures: 0 },
      conditions: [],
      resourcesUsed: {},
    });
  });

  it('returns defaults identical to defaultSessionState()', () => {
    initSession(demoCharacter, derived);
    expect(getSession()).toEqual(defaultSessionState(demoCharacter));
  });
});

describe('patchSession — clamps (spec C5)', () => {
  beforeEach(() => {
    initSession(demoCharacter, derived);
  });

  it('never lets current HP drop below 0 or rise above maxHP', () => {
    expect(patchSession({ hp: { current: -10 } }).hp.current).toBe(0);
    expect(patchSession({ hp: { current: 999 } }).hp.current).toBe(MAX_HP);
    expect(patchSession({ hp: { current: 20 } }).hp.current).toBe(20);
  });

  it('caps temporary HP at TEMP_HP_MAX (20)', () => {
    expect(TEMP_HP_MAX).toBe(20); // frozen control (session.ts constant)
    expect(patchSession({ hp: { temp: 50 } }).hp.temp).toBe(TEMP_HP_MAX);
    expect(patchSession({ hp: { temp: -3 } }).hp.temp).toBe(0);
  });

  it('caps hit dice used at the character total', () => {
    expect(patchSession({ hitDice: { used: HIT_DICE_TOTAL + 3 } }).hitDice.used).toBe(HIT_DICE_TOTAL);
    expect(patchSession({ hitDice: { used: -1 } }).hitDice.used).toBe(0);
  });

  it('caps spell slots per level (4/3/2) and floors them at 0', () => {
    expect(SLOT_MAX).toBe(4); // fixture control
    expect(patchSession({ spellSlotsUsed: { 1: 99 } }).spellSlotsUsed[1]).toBe(SLOT_MAX);
    expect(patchSession({ spellSlotsUsed: { 2: 99 } }).spellSlotsUsed[2]).toBe(3);
    expect(patchSession({ spellSlotsUsed: { 3: 99 } }).spellSlotsUsed[3]).toBe(2);
    expect(patchSession({ spellSlotsUsed: { 1: -1 } }).spellSlotsUsed[1]).toBe(0);
  });

  it('caps Channel Divinity at 2 uses (2024, level 5)', () => {
    expect(CHANNEL_DIVINITY_MAX).toBe(2);
    expect(patchSession({ channelDivinity: { used: 7 } }).channelDivinity.used).toBe(CHANNEL_DIVINITY_MAX);
  });

  it('caps death saves at 3 successes / 3 failures', () => {
    expect(DEATH_SAVE_MAX).toBe(3);
    expect(patchSession({ deathSaves: { successes: 9, failures: 9 } }).deathSaves).toEqual({
      successes: DEATH_SAVE_MAX,
      failures: DEATH_SAVE_MAX,
    });
  });

  it('caps activable traits at their authored `uses` (D-38)', () => {
    // The demo cleric's Fortuna del Erudito carries uses: 1 in the JSON.
    const state = patchSession({ resourcesUsed: { 'fortuna-del-erudito': 5 } });
    expect(state.resourcesUsed['fortuna-del-erudito']).toBe(1);
  });

  it('does not cap resources without a matching trait `uses`', () => {
    const state = patchSession({ resourcesUsed: { 'desconocido': 5 } });
    expect(state.resourcesUsed['desconocido']).toBe(5);
  });

  it('persists the clamped state after every patch', () => {
    patchSession({ hp: { current: 10 } });
    expect(storedRaw()).toMatchObject({ hp: { current: 10, temp: 0 } });
  });
});

describe('applyStepper — the only UI-driven mutations (T-02)', () => {
  beforeEach(() => {
    initSession(demoCharacter, derived);
  });

  it('increments and decrements a counter (clamped at maxHP when full)', () => {
    // The counter starts at maxHP: "inc" at full HP is a no-op (clamp).
    expect(applyStepper('inc', 'hp-current').hp.current).toBe(MAX_HP);
    expect(applyStepper('dec', 'hp-current').hp.current).toBe(MAX_HP - 1);
    expect(applyStepper('inc', 'hp-current').hp.current).toBe(MAX_HP);
  });

  it('clamps stepper overshoot through the same rule limits', () => {
    for (let i = 0; i < 6; i += 1) applyStepper('inc', 'channel-divinity');
    expect(getSession().channelDivinity.used).toBe(CHANNEL_DIVINITY_MAX);
    for (let i = 0; i < MAX_HP + 2; i += 1) applyStepper('dec', 'hp-current');
    expect(getSession().hp.current).toBe(0);
  });

  it('validates action and target vocabularies', () => {
    expect(isStepperAction('inc')).toBe(true);
    expect(isStepperAction('dec')).toBe(true);
    expect(isStepperAction('set')).toBe(true);
    expect(isStepperAction('add')).toBe(false);
    expect(isStepperTarget('slot-1')).toBe(true);
    expect(isStepperTarget('death-failures')).toBe(true);
    expect(isStepperTarget('not-a-target')).toBe(false);
  });
});

describe('toggleCondition — condition chips', () => {
  beforeEach(() => {
    initSession(demoCharacter, derived);
  });

  it('adds and removes one condition label', () => {
    expect(toggleCondition('cegado').conditions).toEqual(['cegado']);
    expect(toggleCondition('cegado').conditions).toEqual([]);
  });
});

describe('resetSession — restore defaults and clear storage (spec C2)', () => {
  it('restores every counter and deletes the persisted key', () => {
    initSession(demoCharacter, derived);
    patchSession({ hp: { current: 5 }, deathSaves: { failures: 3 } });
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
    const state = resetSession();
    expect(state).toEqual(defaultSessionState(demoCharacter));
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  /** Regression of the Phase 10 review major 1: after a reset, the
      state's characterId must stay the URL id (the name-derived
      fallback would make the next persisted write rejected by
      sanitizeLoaded after a reload). */
  it('keeps the URL characterId after a reset (Phase 10)', () => {
    initSession(demoCharacter, derived, 'character-demo');
    const state = resetSession();
    expect(state.characterId).toBe('character-demo');
    patchSession({ hp: { current: 10 } });
    const stored = JSON.parse(
      window.localStorage.getItem(sessionKey('character-demo')) as string,
    ) as { characterId: string };
    expect(stored.characterId).toBe('character-demo');
  });
});

describe('load migration — sanitizeLoaded through initSession (D-16 §4)', () => {
  it('falls back to defaults when schemaVersion ≠ 1 (forward-only)', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 2, characterId: 'seren-aldaard', hp: { current: 3, temp: 0 } }),
    );
    expect(initSession(demoCharacter, derived)).toEqual(defaultSessionState(demoCharacter));
  });

  it('falls back to defaults when the session belongs to another character', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 1, characterId: 'someone-else', hp: { current: 3, temp: 0 } }),
    );
    expect(initSession(demoCharacter, derived)).toEqual(defaultSessionState(demoCharacter));
  });

  it('falls back to defaults on broken JSON (corrupt storage)', () => {
    window.localStorage.setItem(KEY, '{"hp":{"current":');
    expect(initSession(demoCharacter, derived)).toEqual(defaultSessionState(demoCharacter));
  });

  it('loads valid counters, clamps them and ignores unknown fields', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        characterId: 'seren-aldaard',
        hp: { current: 10, temp: 5 },
        hitDice: { used: 2 },
        spellSlotsUsed: { 1: 4, 2: 1, 3: 0 },
        channelDivinity: { used: 1 },
        inspiration: true,
        deathSaves: { successes: 1, failures: 2 },
        conditions: ['cegado', 42], // non-string entries are dropped
        resourcesUsed: { 'fortuna-del-erudito': 1 },
        futureField: 'added by a later schema — ignored',
      }),
    );
    const state = initSession(demoCharacter, derived);
    expect(state.hp).toEqual({ current: 10, temp: 5 });
    expect(state.hitDice).toEqual({ used: 2 });
    expect(state.spellSlotsUsed).toEqual({ 1: 4, 2: 1, 3: 0 });
    expect(state.channelDivinity).toEqual({ used: 1 });
    expect(state.inspiration).toBe(true);
    expect(state.deathSaves).toEqual({ successes: 1, failures: 2 });
    expect(state.conditions).toEqual(['cegado']);
    expect(state.resourcesUsed).toEqual({ 'fortuna-del-erudito': 1 });
    expect(Object.keys(state)).not.toContain('futureField');
  });

  it('clamps stored out-of-range counters back into the rule limits', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        characterId: 'seren-aldaard',
        hp: { current: 500, temp: -10 },
        spellSlotsUsed: { 1: 40, 2: -5, 3: 1 },
        channelDivinity: { used: 12 },
        deathSaves: { successes: 99, failures: 99 },
      }),
    );
    const state = initSession(demoCharacter, derived);
    expect(state.hp.current).toBe(MAX_HP);
    expect(state.hp.temp).toBe(0);
    expect(state.spellSlotsUsed).toEqual({ 1: SLOT_MAX, 2: 0, 3: 1 });
    expect(state.channelDivinity.used).toBe(CHANNEL_DIVINITY_MAX);
    expect(state.deathSaves).toEqual({ successes: DEATH_SAVE_MAX, failures: DEATH_SAVE_MAX });
  });
});

describe('focus restoration after a partial re-render (Phase 06 major)', () => {
  it('keeps keyboard focus on the homologous stepper after patchSession', () => {
    initSession(demoCharacter, derived);
    const before = document.querySelector<HTMLElement>(
      'button[data-action="inc"][data-target="hp-current"]',
    );
    expect(before).not.toBeNull();
    before?.focus();
    expect(document.activeElement).toBe(before);

    patchSession({ hp: { current: 20 } });

    // Scoped to the combat card: the hp-current stepper also exists in
    // the rest card, and a future DOM reorder must not break this test.
    const after = document.querySelector<HTMLElement>(
      'section[data-block="combat"] button[data-action="inc"][data-target="hp-current"]',
    );
    expect(after).not.toBeNull();
    expect(after).not.toBe(before); // the card content was really re-rendered
    expect(document.activeElement).toBe(after); // focus moved to the new control
  });
});

describe('temp HP quick strip — Phase 12 (D-50)', () => {
  beforeEach(() => {
    initSession(demoCharacter, derived);
  });

  it('the clear button empties temp HP to 0 via the absolute set action', () => {
    patchSession({ hp: { temp: 7 } });
    expect(applyStepper('set', 'hp-temp', 0).hp.temp).toBe(0);
  });

  it('the ±10 steps keep the 0..TEMP_HP_MAX clamp', () => {
    patchSession({ hp: { temp: 12 } });
    expect(applyStepper('inc', 'hp-temp', 10).hp.temp).toBe(TEMP_HP_MAX); // 22 → clamped to 20
    expect(applyStepper('dec', 'hp-temp', 10).hp.temp).toBe(10);
    expect(applyStepper('dec', 'hp-temp', 10).hp.temp).toBe(0); // −12 would go negative: clamped
  });

  it('Reset leaves temp HP at 0, same as the clear button (C3)', () => {
    patchSession({ hp: { temp: 9 } });
    expect(resetSession().hp.temp).toBe(0);
  });
});

describe('sync hooks (Fase 15b/c, D-55) — guardas sin eco', () => {
  const localCalls: SessionState[] = [];
  /** The listeners are module-global and accumulate across tests:
      assertions use DELTAS (calls since the marked point). */
  const mark = (): number => localCalls.length;

  beforeEach(() => {
    initSession(demoCharacter, derived);
  });

  it('onSessionChange fires after patchSession with the CLAMPED state', () => {
    const before = mark();
    patchSession({ hp: { current: 999 } });
    const fired = localCalls.slice(before);
    expect(fired.length).toBe(1);
    expect(fired[0].hp.current).toBe(MAX_HP); // clamped, not the raw 999
  });

  it('applyRemoteState applies a VALID remote state and does NOT echo listeners', () => {
    const remote = { ...defaultSessionState(demoCharacter), hp: { current: 20, temp: 4 } };
    const before = mark();
    const applied = applyRemoteState(remote);
    expect(applied).not.toBeNull();
    expect(applied?.hp.current).toBe(20);
    expect(applied?.hp.temp).toBe(4);
    // NO echo: the remote application must not schedule a PATCH.
    expect(localCalls.length).toBe(before);
    // Persisted locally too (local-first mirror).
    expect(JSON.parse(window.localStorage.getItem(sessionKey('seren-aldaard')) ?? '{}').hp.current).toBe(20);
  });

  it('applyRemoteState REJECTS schemaVersion mismatch (keeps local)', () => {
    const before = getSession();
    const rejected = applyRemoteState({ ...before, schemaVersion: 9 });
    expect(rejected).toBeNull();
    expect(getSession()).toEqual(before);
  });

  it('applyRemoteState REJECTS characterId mismatch (keeps local)', () => {
    const before = getSession();
    const rejected = applyRemoteState({ ...before, characterId: 'otro-personaje' });
    expect(rejected).toBeNull();
    expect(getSession()).toEqual(before);
  });

  it('resetSession fires the listener with the defaults', () => {
    patchSession({ hp: { current: 10 } });
    const before = mark();
    const state = resetSession();
    const fired = localCalls.slice(before);
    expect(fired.length).toBe(1);
    expect(fired[0]).toEqual(state);
    expect(state.hp.current).toBe(MAX_HP);
  });
});
