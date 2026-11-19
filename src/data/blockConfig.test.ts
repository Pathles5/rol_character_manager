/* ============================================================
   Phase 07 — filter-matrix tests (spec C2).
   blockConfig.ts is the frozen transcription of model.md §6
   (13 blocks × 4 modes). The control table below IS that §6
   table, hardcoded here as documented reference data: the test
   asserts that the config never drifts away from the model.
   If this test fails after an intentional model change, model.md
   §6, this table and blockConfig.ts must change together.
   ============================================================ */

import { describe, expect, it } from 'vitest';
import { BLOCK_CONFIG, type BlockId } from './blockConfig';

/** Control table — verbatim transcription of model.md §6
    (order, visibility booleans and weight per row). */
const MATRIX_CONTROL: ReadonlyArray<{
  id: BlockId;
  combate: boolean;
  aventura: boolean;
  descanso: boolean;
  mesa: boolean;
  weight: number;
}> = [
  { id: 'identity', combate: true, aventura: true, descanso: true, mesa: true, weight: 10 },
  { id: 'combat', combate: true, aventura: true, descanso: false, mesa: false, weight: 15 },
  { id: 'attributes', combate: false, aventura: true, descanso: false, mesa: true, weight: 20 },
  { id: 'defense', combate: true, aventura: true, descanso: false, mesa: false, weight: 25 },
  { id: 'skills', combate: false, aventura: true, descanso: false, mesa: false, weight: 30 },
  { id: 'attacks', combate: true, aventura: true, descanso: false, mesa: false, weight: 35 },
  { id: 'spells', combate: true, aventura: true, descanso: true, mesa: false, weight: 40 },
  { id: 'rest', combate: false, aventura: false, descanso: true, mesa: false, weight: 45 },
  { id: 'equipment', combate: false, aventura: true, descanso: false, mesa: true, weight: 50 },
  { id: 'traits', combate: false, aventura: true, descanso: false, mesa: true, weight: 55 },
  { id: 'proficiencies', combate: false, aventura: true, descanso: false, mesa: true, weight: 60 },
  { id: 'role', combate: false, aventura: true, descanso: false, mesa: true, weight: 65 },
  { id: 'allies', combate: false, aventura: true, descanso: false, mesa: true, weight: 70 },
];

describe('BLOCK_CONFIG vs model §6 (filter matrix control)', () => {
  it('has exactly the 13 blocks of the model, in §6 order', () => {
    expect(BLOCK_CONFIG).toHaveLength(13);
    expect(BLOCK_CONFIG.map(entry => entry.id)).toEqual(MATRIX_CONTROL.map(row => row.id));
  });

  it('matches the §6 visibility table row by row', () => {
    BLOCK_CONFIG.forEach((entry, index) => {
      const control = MATRIX_CONTROL[index] as {
        id: BlockId;
        combate: boolean;
        aventura: boolean;
        descanso: boolean;
        mesa: boolean;
        weight: number;
      };
      expect(entry.combate, `combate of "${entry.id}"`).toBe(control.combate);
      expect(entry.aventura, `aventura of "${entry.id}"`).toBe(control.aventura);
      expect(entry.descanso, `descanso of "${entry.id}"`).toBe(control.descanso);
      expect(entry.mesa, `mesa of "${entry.id}"`).toBe(control.mesa);
    });
  });
});

describe('BLOCK_CONFIG structural rules (§6 notes)', () => {
  it('uses unique, strictly ascending weights from 10 to 70', () => {
    const weights = BLOCK_CONFIG.map(entry => entry.weight);
    expect(new Set(weights).size).toBe(weights.length); // unique
    expect([...weights]).toEqual([...weights].sort((a, b) => a - b)); // ascending
    expect(weights[0]).toBe(10);
    expect(weights[weights.length - 1]).toBe(70);
  });

  it('shows aventura as the full sheet: true in 12 rows, false only for "rest"', () => {
    expect(BLOCK_CONFIG.filter(entry => entry.aventura)).toHaveLength(12);
    expect(BLOCK_CONFIG.filter(entry => !entry.aventura).map(entry => entry.id)).toEqual(['rest']);
  });

  it('shows "rest" only in descanso', () => {
    const rest = BLOCK_CONFIG.find(entry => entry.id === 'rest');
    expect(rest?.combate).toBe(false);
    expect(rest?.aventura).toBe(false);
    expect(rest?.descanso).toBe(true);
    expect(rest?.mesa).toBe(false);
  });

  it('shows "spells" in combate, aventura and descanso (user decision §6), not in mesa', () => {
    const spells = BLOCK_CONFIG.find(entry => entry.id === 'spells');
    expect(spells?.combate).toBe(true);
    expect(spells?.aventura).toBe(true);
    expect(spells?.descanso).toBe(true);
    expect(spells?.mesa).toBe(false);
  });

  it('shows "identity" everywhere (anchor block)', () => {
    const identity = BLOCK_CONFIG.find(entry => entry.id === 'identity');
    expect(identity?.combate).toBe(true);
    expect(identity?.aventura).toBe(true);
    expect(identity?.descanso).toBe(true);
    expect(identity?.mesa).toBe(true);
  });
});
