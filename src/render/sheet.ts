/* ============================================================
   FichaSS — sheet orchestrator (Phase 04, D-24).
   Consumes BLOCK_CONFIG (the single editable filter-matrix
   place, constitution I4): ALL 13 blocks rendered in ascending
   weight order — the frozen matrix (D-16) makes 12 visible in
   adventure; blocks not visible there come pre-marked hidden
   so the Phase 05 filters can reveal them without re-render.
   Each section carries its mode booleans in `data-modes`
   (model §6).

   The `x_demoNotes` fixture field is never part of any block.
   ============================================================ */

import type { Character, SessionState } from '../types';
import type { DerivedStats } from '../derived';
import { BLOCK_CONFIG, type BlockConfigEntry, type BlockId } from '../data/blockConfig';
import {
  BLOCK_CSS_CLASS,
  BLOCK_TITLES,
  defaultSessionState,
  renderAllies,
  renderAttacks,
  renderAttributes,
  renderCombat,
  renderDefense,
  renderEquipment,
  renderIdentity,
  renderProficiencies,
  renderRest,
  renderRole,
  renderSkills,
  renderSpells,
  renderTraits,
} from './blocks';

/** Render registry: one function per block id. */
const RENDERERS: Record<BlockId, (character: Character, derived: DerivedStats, session: SessionState) => string> = {
  identity: renderIdentity,
  combat: renderCombat,
  attributes: renderAttributes,
  defense: renderDefense,
  skills: renderSkills,
  attacks: renderAttacks,
  spells: renderSpells,
  rest: renderRest,
  equipment: renderEquipment,
  traits: renderTraits,
  proficiencies: renderProficiencies,
  role: renderRole,
  allies: renderAllies,
};

/** Mode keys of BlockConfigEntry, in matrix order (model §6). */
const MODE_KEYS = ['combate', 'aventura', 'descanso', 'mesa'] as const;

/** Header chip: "siempre" when the block is in every mode,
    otherwise the compact list of its modes. */
function modeChipLabel(entry: BlockConfigEntry): string {
  const active = MODE_KEYS.filter(mode => entry[mode]);
  return active.length === MODE_KEYS.length ? 'siempre' : active.join(' · ');
}

/** Renders the sheet as one HTML string: ALL 13 blocks in ascending
    weight (so Phase 05 filters can reveal any mode without re-render).
    Blocks not visible in the initial "aventura" mode come pre-marked
    with the hidden class for filters to manage. Session counters show
    their defaults (render-only). */
export function renderSheet(
  character: Character,
  derived: DerivedStats,
  config: BlockConfigEntry[] = BLOCK_CONFIG,
): string {
  const session = defaultSessionState(character);
  return [...config]
    .sort((a, b) => a.weight - b.weight)
    .map(entry => {
      const modes = MODE_KEYS.filter(mode => entry[mode]).join(' ');
      const hidden = entry.aventura ? '' : ' is-hidden';
      const display = entry.aventura ? '' : ' style="display: none;"';
      return `<section class="card ${BLOCK_CSS_CLASS[entry.id]}${hidden}" data-block="${entry.id}" data-modes="${modes}"${display}>
  <header class="blockhead"><h2>${BLOCK_TITLES[entry.id]}</h2><span class="chip">${modeChipLabel(entry)}</span></header>
  ${RENDERERS[entry.id](character, derived, session)}
</section>`;
    })
    .join('\n');
}
