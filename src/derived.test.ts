/* ============================================================
   Phase 07 — derived-formula tests (model §3).
   Control numbers come from docs/specs/01-data-model/model.md §3
   and docs/data/character-demo.json (Seren Aldaard, cleric 5):
   DES +1, CD 14, spell attack +6, 9 free-prepared spells,
   initials "SA", WIS save 6 / CHA 3 / INT −1. Every literal
   below is annotated with its source — none is guessed.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Character } from './types';
import {
  computeDerived,
  getInitials,
  getInitiative,
  getModifier,
  getPreparedFreeCount,
  getProficiencyBonus,
  getSaveTotal,
  getSkillTotal,
  getSpellAttack,
  getSpellDC,
} from './derived';

/** Living fixture (Phase 10, D-33): public/characters/
    character-demo.json, read at test time like the other
    suites; the typed cast only aids field access. */
import { join } from 'node:path';

const fixturePath = join(import.meta.dirname, '../tests/fixtures/character-demo.json');
const demoCharacter = JSON.parse(readFileSync(fixturePath, 'utf8')) as Character;

describe('getModifier (§3: floor((score - 10) / 2))', () => {
  it('matches the fixture ability scores', () => {
    // Fixture: STR 10, DES 12, CON 14, INT 8, SAB 16, CAR 10.
    expect(getModifier(10)).toBe(0);
    expect(getModifier(12)).toBe(1);
    expect(getModifier(16)).toBe(3);
    expect(getModifier(8)).toBe(-1);
    expect(getModifier(14)).toBe(2);
  });
});

describe('getProficiencyBonus (§3: 2 + floor((level - 1) / 4))', () => {
  it('returns 3 at the demo level 5', () => {
    expect(getProficiencyBonus(5)).toBe(3);
  });

  it('walks the full level ladder (2024 table)', () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(13)).toBe(5);
    expect(getProficiencyBonus(17)).toBe(6);
    expect(getProficiencyBonus(20)).toBe(6);
  });
});

describe('getSkillTotal (§3: mod + (2|1|0) × PB)', () => {
  const level = 5; // PB = 3

  it('returns the plain modifier without proficiency', () => {
    expect(getSkillTotal({ abilityMod: 3, proficiency: false, expertise: false, level })).toBe(3);
    expect(getSkillTotal({ abilityMod: -1, proficiency: false, expertise: false, level })).toBe(-1);
  });

  it('adds one proficiency bonus when proficient', () => {
    expect(getSkillTotal({ abilityMod: 3, proficiency: true, expertise: false, level })).toBe(6);
  });

  it('adds two proficiency bonuses with expertise', () => {
    expect(getSkillTotal({ abilityMod: 3, proficiency: true, expertise: true, level })).toBe(9);
    // Expertise without plain proficiency is still double (defensive contract check).
    expect(getSkillTotal({ abilityMod: 1, proficiency: false, expertise: true, level })).toBe(7);
  });
});

describe('getSaveTotal (§3: mod + PB when proficient)', () => {
  it('matches the fixture control values WIS 6 / CHA 3 / INT −1', () => {
    // SAB 16 → mod 3, proficient → 3 + 3 = 6.
    expect(getSaveTotal(3, true, 5)).toBe(6);
    // CAR 10 → mod 0, proficient → 0 + 3 = 3.
    expect(getSaveTotal(0, true, 5)).toBe(3);
    // INT 8 → mod −1, not proficient → −1.
    expect(getSaveTotal(-1, false, 5)).toBe(-1);
  });
});

describe('spell math (§3, casting ability SAB mod 3, level 5, PB 3)', () => {
  it('computes the demo spell save DC of 14', () => {
    expect(getSpellDC(3, 5)).toBe(14);
    expect(getSpellDC(3, 5)).toBe(8 + getProficiencyBonus(5) + 3);
  });

  it('computes the demo spell attack bonus of +6', () => {
    expect(getSpellAttack(3, 5)).toBe(6);
  });
});

describe('getInitiative (§3: dexterity modifier)', () => {
  it('equals DES +1 in the fixture', () => {
    expect(getInitiative(1)).toBe(1);
  });
});

describe('getPreparedFreeCount (§3: only source "free" counts)', () => {
  it('counts 9 free-prepared spells in the fixture (domain excluded)', () => {
    expect(getPreparedFreeCount(demoCharacter)).toBe(9);
    expect(demoCharacter.spells.prepared.filter(spell => spell.source === 'domain')).toHaveLength(6);
  });
});

describe('getInitials (portrait initials)', () => {
  it('reduces the fixture name to "SA"', () => {
    expect(getInitials('Seren Aldaard')).toBe('SA');
  });
});

describe('computeDerived (aggregated §3 set for the fixture)', () => {
  const stats = computeDerived(demoCharacter);

  it('derives every ability modifier from the raw scores', () => {
    expect(stats.mods).toEqual({
      strength: 0,      // STR 10
      dexterity: 1,     // DES 12
      constitution: 2,  // CON 14
      intelligence: -1, // INT 8
      wisdom: 3,        // SAB 16
      charisma: 0,      // CAR 10
    });
  });

  it('derives the save totals (only SAB/CAR proficient)', () => {
    expect(stats.saveTotals).toEqual({
      strength: 0,
      dexterity: 1,
      constitution: 2,
      intelligence: -1,
      wisdom: 6,
      charisma: 3,
    });
  });

  it('derives skill totals for the whole catalog: proficient rows get +PB, the rest carry the mod', () => {
    // Proficient in the fixture: medicina (SAB), perspicacia (SAB),
    // religion (INT), persuasion (CAR), arcanos (INT), historia (INT).
    expect(stats.skillTotals['medicina']).toBe(6); // 3 + 3
    expect(stats.skillTotals['perspicacia']).toBe(6); // 3 + 3
    expect(stats.skillTotals['religion']).toBe(2); // −1 + 3
    expect(stats.skillTotals['persuasion']).toBe(3); // 0 + 3
    expect(stats.skillTotals['arcanos']).toBe(2); // −1 + 3
    expect(stats.skillTotals['historia']).toBe(2); // −1 + 3
    // Non-proficient rows carry the ability modifier only.
    expect(stats.skillTotals['perception']).toBe(3); // SAB mod
    expect(stats.skillTotals['athletics']).toBe(0); // STR mod
    // The catalog lists all 18 skills.
    expect(Object.keys(stats.skillTotals)).toHaveLength(18);
  });

  it('derives initiative, spell DC/attack, prepared count and initials', () => {
    expect(stats.initiative).toBe(1);
    expect(stats.spellDC).toBe(14);
    expect(stats.spellAttack).toBe(6);
    expect(stats.preparedFreeCount).toBe(9);
    expect(stats.initials).toBe('SA');
  });
});
