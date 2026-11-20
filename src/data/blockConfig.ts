/* ============================================================
   FichaSS — block taxonomy and filter matrix (config única).
   Frozen transcription of model.md §6 table (D-16): 13 blocks,
   one boolean per mode + weight + layout. This array is THE one
   editable place for block filter metadata (constitution I4);
   BlockId stays English, mode labels are UI concerns.

   Order = ascending weight: lower weight renders first.
   `layout` is the block's natural size hint; per-mode compact
   variants (identity compact in combate/descanso, role
   highlighted in mesa) are render-time concerns of Phase 04.

   Note (model §6): the death-save counters shown by the
   `defense` block travel in sessionState, not in `character`.
   ============================================================ */

import type { BlockId } from '../types';

/** Block ids live in types.ts (the character type references them
    for hiddenBlocks, amendment D-37); re-exported here so every
    consumer keeps its Phase 04 import path. */
export type { BlockId } from '../types';

export interface BlockConfigEntry {
  id: BlockId;
  /** Combate mode: critical blocks only. */
  combate: boolean;
  /** Aventura mode: the default; always true (full sheet, model §6). */
  aventura: boolean;
  /** Descanso mode: long-rest housekeeping. */
  descanso: boolean;
  /** Mesa mode: catch-all table view (canonical name frozen, D-16). */
  mesa: boolean;
  weight: number;
  layout: 'full' | 'compact';
}

export const BLOCK_CONFIG: BlockConfigEntry[] = [
  { id: 'identity',      combate: true,  aventura: true,  descanso: true,  mesa: true,  weight: 10, layout: 'full' },
  { id: 'combat',        combate: true,  aventura: true,  descanso: false, mesa: false, weight: 15, layout: 'full' },
  { id: 'attributes',    combate: false, aventura: true,  descanso: false, mesa: true,  weight: 20, layout: 'full' },
  { id: 'defense',       combate: true,  aventura: true,  descanso: false, mesa: false, weight: 25, layout: 'full' },
  { id: 'skills',        combate: false, aventura: true,  descanso: false, mesa: false, weight: 30, layout: 'full' },
  { id: 'attacks',       combate: true,  aventura: true,  descanso: false, mesa: false, weight: 35, layout: 'full' },
  { id: 'spells',        combate: true,  aventura: true,  descanso: true,  mesa: false, weight: 40, layout: 'full' },
  { id: 'rest',          combate: false, aventura: false, descanso: true,  mesa: false, weight: 45, layout: 'full' },
  { id: 'equipment',     combate: false, aventura: true,  descanso: false, mesa: true,  weight: 50, layout: 'full' },
  { id: 'traits',        combate: false, aventura: true,  descanso: false, mesa: true,  weight: 55, layout: 'full' },
  { id: 'proficiencies', combate: false, aventura: true,  descanso: false, mesa: true,  weight: 60, layout: 'full' },
  { id: 'role',          combate: false, aventura: true,  descanso: false, mesa: true,  weight: 65, layout: 'full' },
  { id: 'allies',        combate: false, aventura: true,  descanso: false, mesa: true,  weight: 70, layout: 'full' },
];
