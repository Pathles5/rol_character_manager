/* ============================================================
   FichaSS — dice tests (Phase 11, D-44).
   Parser coverage for every attack notation in the fixture;
   roller checked with an injected deterministic random.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest';
import {
  dieFace,
  formatFormula,
  formulaFlavor,
  parseDamage,
  parseFormula,
  percentileValue,
  rollDice,
  rollFlavor,
  rollFormula,
  rollGroup,
} from './dice';
import { PICKER_FACES } from './views/dice-picker';

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

describe('rollFlavor - crit + death-save double failure (Phase 13, D-51)', () => {
  it('a natural 20 on any d20 notation gets the crit call-out', () => {
    expect(rollFlavor('1d20+5', [20])).toBe('¡CRÍTICO!');
    expect(rollFlavor('1d20', [20])).toBe('¡CRÍTICO!');
  });

  it('a bare death save with natural 1 marks the double failure (2024)', () => {
    expect(rollFlavor('1d20', [1])).toBe('¡fallo doble!');
  });

  it('a nat 1 on any other roll is just a roll (no call-out)', () => {
    expect(rollFlavor('1d20+3', [1])).toBe('');
    expect(rollFlavor('2d6+2', [1, 1])).toBe('');
    expect(rollFlavor('1d8', [1])).toBe('');
  });

  it('an unparseable notation gets no flavor', () => {
    expect(rollFlavor('2d8+1d6', [1])).toBe('');
  });
});

describe('parseFormula — compound formulas (Phase 17, D-62)', () => {
  it('parses "2d4 + 1d8" into ordered dice groups', () => {
    expect(parseFormula('2d4 + 1d8')).toEqual([
      { count: 2, faces: 4, mod: 0 },
      { count: 1, faces: 8, mod: 0 },
    ]);
  });

  it('parses the Phase 11 single notation "1d8+4" (dice + flat mod)', () => {
    expect(parseFormula('1d8+4')).toEqual([
      { count: 1, faces: 8, mod: 0 },
      { count: 0, faces: 0, mod: 4 },
    ]);
  });

  it('parses "3d12+2" and a bare d20', () => {
    expect(parseFormula('3d12+2')).toEqual([
      { count: 3, faces: 12, mod: 0 },
      { count: 0, faces: 0, mod: 2 },
    ]);
    expect(parseFormula('1d20')).toEqual([{ count: 1, faces: 20, mod: 0 }]);
  });

  it('is tolerant of spaces around terms and the plus signs', () => {
    expect(parseFormula('  2d4  +  1d8  ')).toEqual([
      { count: 2, faces: 4, mod: 0 },
      { count: 1, faces: 8, mod: 0 },
    ]);
    expect(parseFormula('2d4+3+1d8')).toEqual([
      { count: 2, faces: 4, mod: 0 },
      { count: 0, faces: 0, mod: 3 },
      { count: 1, faces: 8, mod: 0 },
    ]);
  });

  it('parses percentile notation unchanged (1d100 / 2d100)', () => {
    expect(parseFormula('1d100')).toEqual([{ count: 1, faces: 100, mod: 0 }]);
    expect(parseFormula('2d100')).toEqual([{ count: 2, faces: 100, mod: 0 }]);
  });

  it('returns null for empty, malformed or dice-less formulas', () => {
    expect(parseFormula('')).toBeNull();
    expect(parseFormula('   ')).toBeNull();
    expect(parseFormula('d4')).toBeNull();
    expect(parseFormula('2x')).toBeNull();
    expect(parseFormula('1d4++')).toBeNull();
    expect(parseFormula('+1d4')).toBeNull();
    expect(parseFormula('1d4+')).toBeNull();
    expect(parseFormula('1d4 1d8')).toBeNull();
    expect(parseFormula('1d4 + -2')).toBeNull();
    expect(parseFormula('0d6')).toBeNull();
    expect(parseFormula('1d0')).toBeNull();
    expect(parseFormula('arma mágica')).toBeNull();
    // Nothing to roll: a flat modifier alone is not a dice formula.
    expect(parseFormula('4')).toBeNull();
    expect(parseFormula('2+3')).toBeNull();
  });

  it('formatFormula rebuilds the canonical string preserving order', () => {
    const groups = parseFormula('2d4+1d8+3');
    expect(groups && formatFormula(groups)).toBe('2d4 + 1d8 + 3');
  });
});

describe('rollFormula — deterministic with injected random (Phase 17)', () => {
  it('rolls each group and totals "2d4 + 1d8"', () => {
    const random = vi.fn()
      .mockReturnValueOnce(0.1) // d4 #1 → 1
      .mockReturnValueOnce(0.9) // d4 #2 → 4
      .mockReturnValueOnce(0.5); // d8 → 5
    const groups = parseFormula('2d4 + 1d8');
    const result = rollFormula(groups ?? [], random);
    expect(result.groups.map(g => g.rolls)).toEqual([[1, 4], [5]]);
    expect(result.total).toBe(10);
  });

  it('adds flat modifiers to the global total ("1d8+4")', () => {
    const groups = parseFormula('1d8+4');
    const result = rollFormula(groups ?? [], () => 0.5); // d8 → 5
    expect(result.groups.map(g => g.total)).toEqual([5, 4]);
    expect(result.total).toBe(9);
  });

  it('clamps edge random values into [1..faces] per group', () => {
    const groups = parseFormula('1d8 + 1d6');
    expect(rollFormula(groups ?? [], () => 0).groups.map(g => g.rolls)).toEqual([[1], [1]]);
    expect(rollFormula(groups ?? [], () => 0.9999).groups.map(g => g.rolls)).toEqual([[8], [6]]);
  });
});

describe('formulaFlavor — crit on any d20 group, no double failure (Phase 17)', () => {
  it('a natural 20 on any d20 group gets the crit cry', () => {
    const groups = parseFormula('1d20 + 1d4') ?? [];
    const result = rollFormula(groups, () => 0.999); // d20 → 20, d4 → 4
    expect(formulaFlavor(groups, result.groups)).toBe('¡CRÍTICO!');
  });

  it('no natural 20 → no call-out', () => {
    const groups = parseFormula('1d20 + 1d4') ?? [];
    const result = rollFormula(groups, () => 0.1); // d20 → 3
    expect(formulaFlavor(groups, result.groups)).toBe('');
  });

  it('a hand-typed bare "1d20" with nat 1 never emits the double failure', () => {
    const groups = parseFormula('1d20') ?? [];
    const result = rollFormula(groups, () => 0); // d20 → 1
    expect(formulaFlavor(groups, result.groups)).toBe('');
    // The double failure stays reserved for the death save (rollFlavor).
    expect(rollFlavor('1d20', [1])).toBe('¡fallo doble!');
  });

  it('a d100 pair valued 20 is not a d20 crit', () => {
    expect(formulaFlavor([{ count: 1, faces: 100, mod: 0 }], [{ rolls: [20], mod: 0, total: 20 }])).toBe('');
  });
});

describe('percentile addendum — d10 faces and d100 pairs (Phase 17)', () => {
  it('dieFace shows 0–9 on percentile dice, value unchanged elsewhere', () => {
    expect(dieFace(10, 10)).toBe(0); // internal 10 → face 0, still counts 10
    expect(dieFace(3, 10)).toBe(3);
    expect(dieFace(10, 100)).toBe(0);
    expect(dieFace(7, 8)).toBe(7);
    expect(dieFace(20, 20)).toBe(20);
  });

  it('percentileValue: tens×10 + units, double zero = 100', () => {
    expect(percentileValue(7, 10)).toBe(70); // tens face 7, units face 0
    expect(percentileValue(10, 5)).toBe(5); // tens face 0, units face 5
    expect(percentileValue(3, 4)).toBe(34);
    expect(percentileValue(10, 10)).toBe(100); // double zero → 100, not 0
  });

  it('a d10 group keeps internal 1..10 (total counts 10, face shows 0)', () => {
    const random = vi.fn().mockReturnValueOnce(0.999).mockReturnValueOnce(0);
    const result = rollGroup({ count: 2, faces: 10, mod: 3 }, random);
    expect(result.rolls).toEqual([10, 1]);
    expect(result.total).toBe(14); // 10 + 1 + 3
    expect(result.rolls.map(v => dieFace(v, 10))).toEqual([0, 1]);
    expect(result.pairs).toBeUndefined();
  });

  it('1d100 rolls two d10 (tens then units) and totals the pair', () => {
    const random = vi.fn().mockReturnValueOnce(0.6).mockReturnValueOnce(0.999);
    const result = rollGroup({ count: 1, faces: 100, mod: 0 }, random);
    expect(result.pairs).toEqual([{ tens: 7, units: 10, value: 70 }]);
    expect(result.rolls).toEqual([70]);
    expect(result.total).toBe(70);
  });

  it('1d100 double zero counts as 100', () => {
    const result = rollGroup({ count: 1, faces: 100, mod: 0 }, () => 0.999);
    expect(result.pairs).toEqual([{ tens: 10, units: 10, value: 100 }]);
    expect(result.total).toBe(100);
  });

  it('2d100 = two independent pairs of d10', () => {
    const random = vi.fn()
      .mockReturnValueOnce(0.6) // pair 1 tens → 7
      .mockReturnValueOnce(0.999) // pair 1 units → 10 (face 0)
      .mockReturnValueOnce(0.1) // pair 2 tens → 2
      .mockReturnValueOnce(0.5); // pair 2 units → 6
    const result = rollGroup({ count: 2, faces: 100, mod: 0 }, random);
    expect(result.pairs).toEqual([
      { tens: 7, units: 10, value: 70 },
      { tens: 2, units: 6, value: 26 },
    ]);
    expect(result.rolls).toEqual([70, 26]);
    expect(result.total).toBe(96);
  });

  it('rollFormula mixes d100 and d10 deterministically', () => {
    const random = vi.fn()
      .mockReturnValueOnce(0.6) // d100 tens → 7
      .mockReturnValueOnce(0.999) // d100 units → 10 (face 0)
      .mockReturnValueOnce(0.999); // d10 → 10
    const groups = parseFormula('1d100 + 1d10') ?? [];
    const result = rollFormula(groups, random);
    expect(result.groups[0].rolls).toEqual([70]);
    expect(result.groups[1].rolls).toEqual([10]);
    expect(result.total).toBe(80);
  });

  it('parses every picker preset as clean notation (Phase 17, C6)', () => {
    for (const faces of PICKER_FACES) {
      const groups = parseFormula(`1d${faces}`);
      expect(groups).not.toBeNull();
      const result = rollFormula(groups ?? [], () => 0.5);
      expect(result.total).toBeGreaterThan(0);
    }
  });
});
