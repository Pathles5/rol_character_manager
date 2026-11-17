/* ============================================================
   FichaSS — entry point.
   Phase 03 data-in-code smoke test: the attributes card is fed
   from the typed demo character and runtime-derived stats
   (computeDerived), proving the data→UI pipeline. The full
   static sheet rendering arrives in Phase 04; counters and
   persistence in Phase 05/06.

   No render framework: template strings only.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './assets/fonts/fonts.css';

import type { LiteralAbility } from './types';
import { demoCharacter } from './data/character';
import { computeDerived, getSkillTotal, type DerivedStats } from './derived';

// Spanish labels for ability ids (UI only; ids stay English in code).
const ABILITY_LABELS: Record<LiteralAbility, string> = {
  strength: 'FUE',
  dexterity: 'DES',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'SAB',
  charisma: 'CAR',
};

// Smoke-test skill display list (Spanish labels only; the full 18-skill
// catalog with this shape ships in Phase 04 — model §8). Includes
// "atletismo" to show the no-proficiency state.
const SMOKETEST_SKILLS: { id: string; label: string; ability: LiteralAbility }[] = [
  { id: 'atletismo', label: 'Atletismo', ability: 'strength' },
  { id: 'medicina', label: 'Medicina', ability: 'wisdom' },
  { id: 'perspicacia', label: 'Perspicacia', ability: 'wisdom' },
  { id: 'religion', label: 'Religión', ability: 'intelligence' },
  { id: 'persuasion', label: 'Persuasión', ability: 'charisma' },
];

// Formats a modifier for display (+3 / −1).
function formatModifier(mod: number): string {
  return `${mod < 0 ? '\u2212' : '+'}${Math.abs(mod)}`;
}

// Fills the attributes card with runtime-derived data (spec §smoke test).
function renderAttributeStats(derived: DerivedStats): void {
  const grid = document.querySelector<HTMLElement>('[data-block="attributes"] .stat-grid');
  if (!grid) return; // attributes card not present in this page variant
  const markup = (Object.keys(demoCharacter.abilities) as LiteralAbility[])
    .map(ability => {
      const score = demoCharacter.abilities[ability];
      return `<div class="stat"><span class="num">${score}</span><span class="lbl">${ABILITY_LABELS[ability]} · ${formatModifier(derived.mods[ability])}</span></div>`;
    })
    .join('');
  grid.innerHTML = markup;
}

// Fills the skills card with the three states, totals from derived math
// (profancy bonus 3 at level 5; expertise row is a visual-only example).
function renderSkills(derived: DerivedStats): void {
  const list = document.querySelector<HTMLElement>('[data-block="skills"] .skill-list');
  if (!list) return;
  const proficient = new Set(demoCharacter.skillProficiencies);
  const expertise = new Set(demoCharacter.skillExpertise);
  const markup = SMOKETEST_SKILLS.map(skill => {
    const isProficient = proficient.has(skill.id);
    const isExpert = expertise.has(skill.id);
    const total = getSkillTotal({
      abilityMod: derived.mods[skill.ability],
      proficiency: isProficient,
      expertise: isExpert,
      level: demoCharacter.identity.level,
    });
    const stateCls = isExpert ? 'expert' : isProficient ? 'prof' : '';
    return `<li class="row skill ${stateCls}"><span class="k">${skill.label} (${ABILITY_LABELS[skill.ability]})</span><span class="v">${formatModifier(total)}${isExpert ? ' ×2' : ''}</span></li>`;
  }).join('');
  list.innerHTML = markup;
}

const derived = computeDerived(demoCharacter);
renderAttributeStats(derived);
renderSkills(derived);
