/* ============================================================
   Phase 07 — JSON↔TS coherence test (debt D-21).
   docs/data/character-demo.json is the single origin of truth;
   src/data/character.ts is its hand-written typed transcription.
   This suite reads the JSON at test time and compares both
   DIRECTLY (no copied literals): any divergence in any field
   makes these tests fail, closing the D-21 sync debt mechanically.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { demoCharacter } from './character';

/** docs/data/character-demo.json, resolved relative to this file
    (src/data/ → repo root → docs/data/). Reading the fixture at
    test time is the whole point of the D-21 coherence check, so
    the JSON is never duplicated into a bundle. (@types/node is a
    devDependency since Phase 08, so the import can be static.) */

const fixtureUrl = new URL('../../docs/data/character-demo.json', import.meta.url);
const fixture: unknown = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

/** Narrow cast for field-by-field access (documented: the whole
    object is compared directly too, so the cast cannot hide a
    divergence — it only aids per-section diagnostics). */
const raw = fixture as Record<string, unknown>;

describe('docs/data/character-demo.json ↔ demoCharacter (D-21)', () => {
  it('matches the module as a whole, field by field', () => {
    expect(fixture).toEqual(demoCharacter);
  });

  it('matches schemaVersion 1', () => {
    expect(raw['schemaVersion']).toBe(demoCharacter.schemaVersion);
  });

  it('matches identity (name, race, class, subclass, level, background, alignment)', () => {
    expect(raw['identity']).toEqual(demoCharacter.identity);
  });

  it('matches the six raw ability scores (modifiers stay derived)', () => {
    expect(raw['abilities']).toEqual(demoCharacter.abilities);
  });

  it('matches combat (stored AC 18, speed 30, HP 38, hit dice d8×5)', () => {
    expect(raw['combat']).toEqual(demoCharacter.combat);
  });

  it('matches defense save proficiencies (SAB, CAR)', () => {
    expect(raw['defense']).toEqual(demoCharacter.defense);
  });

  it('matches skill proficiencies (6) and the empty expertise list', () => {
    expect(raw['skillProficiencies']).toEqual(demoCharacter.skillProficiencies);
    expect(raw['skillExpertise']).toEqual(demoCharacter.skillExpertise);
  });

  it('matches attacks (maza +1, llama sagrada)', () => {
    expect(raw['attacks']).toEqual(demoCharacter.attacks);
  });

  it('matches traits (discípulo, preservar la vida, fortuna)', () => {
    expect(raw['traits']).toEqual(demoCharacter.traits);
  });

  it('matches spells: casting ability, slotsMax 4/3/2, 4 cantrips, 9 free + 6 domain prepared', () => {
    const spells = raw['spells'] as Record<string, unknown> | undefined;
    expect(spells).toEqual(demoCharacter.spells);
    expect(demoCharacter.spells.slotsMax).toEqual({ 1: 4, 2: 3, 3: 2 });
    expect(demoCharacter.spells.cantrips).toHaveLength(4);
    expect(demoCharacter.spells.prepared.filter(spell => spell.source === 'free')).toHaveLength(9);
    expect(demoCharacter.spells.prepared.filter(spell => spell.source === 'domain')).toHaveLength(6);
  });

  it('matches equipment (equipped, inventory, coins 34 GP / 12 SP)', () => {
    expect(raw['equipment']).toEqual(demoCharacter.equipment);
  });

  it('matches the non-skill proficiencies (armor, weapons, tools, languages)', () => {
    expect(raw['proficiencies']).toEqual(demoCharacter.proficiencies);
  });

  it('matches role (summary, tableNotes, questions)', () => {
    expect(raw['role']).toEqual(demoCharacter.role);
  });

  it('matches allies (Dahna, Moss)', () => {
    expect(raw['allies']).toEqual(demoCharacter.allies);
  });

  it('matches the fixture metadata x_demoNotes', () => {
    expect(raw['x_demoNotes']).toEqual(demoCharacter.x_demoNotes);
  });
});
