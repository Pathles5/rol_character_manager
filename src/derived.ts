/* ============================================================
   FichaSS — derived stats (model §3).
   Pure functions only: no DOM access, no side effects. All
   derived values are computed client-side at load time and are
   NEVER part of a `character` payload (D-17).
   ============================================================ */

import type { Character, LiteralAbility } from './types';
import { SKILL_ABILITY } from './data/skills';

/** One level-5 control set (spec C2): DES +1, CD 14, spell attack +6,
    9 free-prepared spells, initials "SA". Unit checks live in the
    Phase 07 test suite; the numbers below are the frozen reference. */

/** Modifier of a raw ability score: floor((score - 10) / 2). */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Proficiency bonus from class level: 2 + floor((level - 1) / 4). */
export function getProficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

/** Skill total across the three states (none / proficient / expertise),
    model §3: mod + (expertise ? 2 : proficient ? 1 : 0) × PB. */
export function getSkillTotal(input: {
  abilityMod: number;
  proficiency: boolean;
  expertise: boolean;
  level: number;
}): number {
  const multiplier = input.expertise ? 2 : input.proficiency ? 1 : 0;
  return input.abilityMod + multiplier * getProficiencyBonus(input.level);
}

/** Total save bonus = ability modifier, plus PB when proficient. */
export function getSaveTotal(
  abilityMod: number,
  proficient: boolean,
  level: number,
): number {
  return abilityMod + (proficient ? getProficiencyBonus(level) : 0);
}

/** Spell save DC: 8 + PB + casting ability modifier (14 in the demo). */
export function getSpellDC(castingAbilityMod: number, level: number): number {
  return 8 + getProficiencyBonus(level) + castingAbilityMod;
}

/** Spell attack bonus: PB + casting ability modifier (+6 in the demo). */
export function getSpellAttack(castingAbilityMod: number, level: number): number {
  return getProficiencyBonus(level) + castingAbilityMod;
}

/** Initiative = dexterity modifier (model §3). */
export function getInitiative(dexMod: number): number {
  return dexMod;
}

/** Free-prepared spell count (model §3): domain spells never count. */
export function getPreparedFreeCount(character: Character): number {
  return character.spells.prepared.filter(spell => spell.source === 'free').length;
}

/** Portrait initials: first letter of each word of the name, uppercased
    ("Seren Aldaard" → "SA"). */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();
}

/** Database of the full aggregated derived set for one character. */
export interface DerivedStats {
  mods: Record<LiteralAbility, number>;
  /** Save totals keyed by ability id. */
  saveTotals: Record<LiteralAbility, number>;
  /** Skill totals keyed by skill id (every id of the SKILL_CATALOG). */
  skillTotals: Record<string, number>;
  initiative: number;
  spellDC: number;
  spellAttack: number;
  preparedFreeCount: number;
  initials: string;
}

/** Ability that governs each skill id lives in the skill catalog
    (src/data/skills.ts, D-23): this module consumes it, never
    duplicates it. Unknown ids (not in the catalog) are skipped,
    never guessed. */

const ALL_ABILITIES: readonly LiteralAbility[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

/** Aggregates every §3 derived value for one character in a single pass. */
export function computeDerived(character: Character): DerivedStats {
  const level = character.identity.level;

  const mods = {} as Record<LiteralAbility, number>;
  for (const ability of ALL_ABILITIES) {
    mods[ability] = getModifier(character.abilities[ability]);
  }

  const saveTotals = {} as Record<LiteralAbility, number>;
  for (const ability of ALL_ABILITIES) {
    saveTotals[ability] = getSaveTotal(
      mods[ability],
      character.defense.saveProficiencies.includes(ability),
      level,
    );
  }

  // Skill totals for EVERY catalog skill (18), so the renderer can
  // list the full sheet: non-proficient rows simply carry mod only.
  const skillTotals: Record<string, number> = {};
  for (const skillId of Object.keys(SKILL_ABILITY)) {
    const ability = SKILL_ABILITY[skillId];
    if (!ability) continue; // unknown ids are not guessed
    skillTotals[skillId] = getSkillTotal({
      abilityMod: mods[ability],
      proficiency: character.skillProficiencies.includes(skillId),
      expertise: character.skillExpertise.includes(skillId),
      level,
    });
  }

  return {
    mods,
    saveTotals,
    skillTotals,
    initiative: getInitiative(mods.dexterity),
    spellDC: getSpellDC(mods[character.spells.castingAbility], level),
    spellAttack: getSpellAttack(mods[character.spells.castingAbility], level),
    preparedFreeCount: getPreparedFreeCount(character),
    initials: getInitials(character.identity.name),
  };
}
