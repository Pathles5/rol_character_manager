/* ============================================================
   FichaSS — dice tests (Phase 11, D-44).
   Parser coverage for every attack notation in the fixture;
   roller checked with an injected deterministic random.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest';
import { parseDamage, rollDice } from './dice';

describe('parseDamage — fixture notations (Phase 11, C1)', () => {
  it('parses "1d8+4" (espada larga, Dahna)', () => {
    expect(parseDamage('1d8+4')).toEqual({ count: 1, faces: 8, mod: 4 });
  });

  it('parses "2d6+3" (espada a dos manos)', () => {
    expect(parseDamage('2d6+3')).toEqual({ count: 2, faces: 6, mod: 3 });
  });

  it('parses "1d4+4" (daga, Moss)', () => {
    expect(parseDamage('1d4+4')).toEqual({ count: 1, faces: 4, mod: 4 });
  });

  it('parses "1d12+4" (hacha grande, Gorruk)', () => {
    expect(parseDamage('1d12+4')).toEqual({ count: 1, faces: 12, mod: 4 });
  });

  it('parses "1d6" without modifier', () => {
    expect(parseDamage('1d6')).toEqual({ count: 1, faces: 6, mod: 0 });
  });

  it('parses "1d20+7" (attack roll with bonus, Phase 11)', () => {
    expect(parseDamage('1d20+7')).toEqual({ count: 1, faces: 20, mod: 7 });
  });

  it('rejects free text and malformed notation', () => {
    expect(parseDamage('arma mágica')).toBeNull();
    expect(parseDamage('2d')).toBeNull();
    expect(parseDamage('d8+1')).toBeNull();
    expect(parseDamage('0d6+1')).toBeNull();
  });
});

describe('rollDice — deterministic with injected random', () => {
  it('rolls each die within [1..faces] and adds the modifier', () => {
    const result = rollDice({ count: 3, faces: 6, mod: 4 }, () => 0.5);
    expect(result.rolls).toEqual([4, 4, 4]);
    expect(result.total).toBe(16);
  });

  it('clamps edge random values into the range (0 → 1, 0.999… → faces)', () => {
    expect(rollDice({ count: 1, faces: 8, mod: 0 }, () => 0).rolls).toEqual([1]);
    expect(rollDice({ count: 1, faces: 8, mod: 0 }, () => 0.9999).rolls).toEqual([8]);
  });

  it("rolls '2d6+3' per die and totals with the modifier", () => {
    const random = vi.fn()
      .mockReturnValueOnce(0.1) // die 1 → 1
      .mockReturnValueOnce(0.9); // die 2 → 6
    const result = rollDice({ count: 2, faces: 6, mod: 3 }, random);
    expect(result.rolls).toEqual([1, 6]);
    expect(result.total).toBe(10);
  });
});
