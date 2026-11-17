/* ============================================================
   FichaSS — skill catalog (model §8, D-23).
   The 18 skills of D&D 5e (2024) with the standard PHB ability.
   This catalog is THE single source of truth for skill ids and
   their governing ability: derived.ts consumes it (its former
   local SKILL_ABILITY map is gone) and the renderer lists it.

   Ids: the six ids already used by the demo fixture stay as
   they are (lowercase Spanish, no accents: medicina,
   perspicacia, religion, persuasion, arcanos, historia); the
   remaining twelve use lowercase English ids, kebab-case for
   multi-word names (matching the fixture's id style). Labels
   are the Spanish UI names (model §8).
   ============================================================ */

import type { LiteralAbility } from '../types';

export interface Skill {
  id: string;
  /** Spanish display label. */
  label: string;
  ability: LiteralAbility;
}

/** Canonical order = alphabetical by Spanish label (display may re-sort). */
export const SKILL_CATALOG: Skill[] = [
  { id: 'acrobatics', label: 'Acrobacias', ability: 'dexterity' },
  { id: 'performance', label: 'Actuación', ability: 'charisma' },
  { id: 'arcanos', label: 'Arcanos', ability: 'intelligence' },
  { id: 'athletics', label: 'Atletismo', ability: 'strength' },
  { id: 'deception', label: 'Engaño', ability: 'charisma' },
  { id: 'historia', label: 'Historia', ability: 'intelligence' },
  { id: 'intimidation', label: 'Intimidación', ability: 'charisma' },
  { id: 'investigation', label: 'Investigación', ability: 'intelligence' },
  { id: 'sleight-of-hand', label: 'Juego de manos', ability: 'dexterity' },
  { id: 'medicina', label: 'Medicina', ability: 'wisdom' },
  { id: 'nature', label: 'Naturaleza', ability: 'intelligence' },
  { id: 'perception', label: 'Percepción', ability: 'wisdom' },
  { id: 'perspicacia', label: 'Perspicacia', ability: 'wisdom' },
  { id: 'persuasion', label: 'Persuasión', ability: 'charisma' },
  { id: 'religion', label: 'Religión', ability: 'intelligence' },
  { id: 'stealth', label: 'Sigilo', ability: 'dexterity' },
  { id: 'survival', label: 'Supervivencia', ability: 'wisdom' },
  { id: 'animal-handling', label: 'Trato con animales', ability: 'wisdom' },
];

/** Record skillId → governing ability, derived from SKILL_CATALOG. */
export const SKILL_ABILITY: Record<string, LiteralAbility> = Object.fromEntries(
  SKILL_CATALOG.map(skill => [skill.id, skill.ability]),
);
