/* ============================================================
   FichaSS — dice parser + roller (Phase 11, D-44).
   Pure functions: parse the damage notation of attacks
   ("1d8+4", "2d6+3", "1d6") and roll it. No DOM, no state —
   the caller renders. Math.random is injectable for tests.
   ============================================================ */

export interface ParsedDice {
  count: number;
  faces: number;
  mod: number;
}

export interface RollResult {
  rolls: number[];
  mod: number;
  total: number;
  /** Percentile pairs (tens + units d10) — present ONLY for a d100
      group, where `rolls` holds each pair's counted value. Phase 17
      percentile addendum: a d100 is two d10, not a 100-sided die. */
  pairs?: PercentilePair[];
}

/** One percentile (d100) pair: two internal d10 values (1..10) and
    the counted total. Faces are 0–9 (internal 10 reads as face 0);
    double zero (both faces 0) counts as 100, never 0 (5e 2024). */
export interface PercentilePair {
  tens: number;
  units: number;
  value: number;
}

/** Parses "XdY±Z" damage notation. Returns null when the string is
    not clean dice notation (renderers then hide the dice button). */
export function parseDamage(notation: string): ParsedDice | null {
  const match = /^\s*(\d+)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/.exec(notation);
  if (!match) return null;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  if (count < 1 || faces < 1) return null;
  const mod = match[3] ? Number(`${match[3]}${match[4]}`) : 0;
  return { count, faces, mod };
}

/** Rolls the parsed dice: one value in [1..faces] per die, total =
    sum of rolls + modifier. `random` defaults to Math.random
    (injectable for deterministic tests). */
export function rollDice(
  parsed: ParsedDice,
  random: () => number = Math.random,
): RollResult {
  const rolls = Array.from({ length: parsed.count }, () =>
    1 + Math.floor(random() * parsed.faces),
  );
  const sum = rolls.reduce((total, roll) => total + roll, 0);
  return { rolls, mod: parsed.mod, total: sum + parsed.mod };
}

/** Flavor call-out for a finished roll (Phase 13, D-51): a natural
    20 on a d20 gets the crit cry (any notation); a BARE death save
    (notation exactly "1d20") with natural 1 marks the double
    failure of the 2024 rules — a nat 1 on any other roll is just
    a roll, so no call-out. Pure: no DOM, testable. */
export function rollFlavor(notation: string, rolls: number[]): string {
  const parsed = parseDamage(notation);
  if (!parsed) return '';
  if (parsed.faces === 20 && rolls.some(roll => roll === 20)) return '¡CRÍTICO!';
  if (notation === '1d20' && rolls.length === 1 && rolls[0] === 1) {
    return '¡fallo doble!';
  }
  return '';
}

/* ============================================================
   Phase 17 (D-62) — compound formula parser + roller, and the
   percentile addendum (d10 faces 0–9 with 0 = 10; d100 = a pair
   of d10, double zero = 100). Still pure: no DOM, no state,
   Math.random injectable for deterministic tests.
   ============================================================ */

/** Physical face shown on a die square. Percentile dice (d10 and
    the d10 that make up a d100) are numbered 0–9: the internal 10
    reads as face 0 while still counting as 10 toward the total.
    Every other die shows its rolled value unchanged. */
export function dieFace(value: number, faces: number): number {
  return faces === 10 || faces === 100 ? value % 10 : value;
}

/** Counted value of one percentile pair from two internal d10
    values (1..10). Tens face ×10 + units face; double zero (both
    faces 0) is 100, not 0 (5e 2024 percentile rule). */
export function percentileValue(tens: number, units: number): number {
  const tensFace = tens % 10;
  const unitsFace = units % 10;
  return tensFace === 0 && unitsFace === 0 ? 100 : tensFace * 10 + unitsFace;
}

/** Rolls ONE parsed group. A d100 group rolls `count` pairs of d10
    (tens then units, reusing rollDice) and totals them with the
    double-zero rule; every other group is a plain rollDice (a d10
    keeps its internal 1..10 — only its DISPLAY face changes). */
export function rollGroup(
  parsed: ParsedDice,
  random: () => number = Math.random,
): RollResult {
  if (parsed.faces === 100) {
    const d10s = rollDice({ count: parsed.count * 2, faces: 10, mod: 0 }, random).rolls;
    const pairs: PercentilePair[] = [];
    for (let i = 0; i < parsed.count; i++) {
      const tens = d10s[i * 2];
      const units = d10s[i * 2 + 1];
      pairs.push({ tens, units, value: percentileValue(tens, units) });
    }
    const sum = pairs.reduce((total, pair) => total + pair.value, 0);
    return { rolls: pairs.map(pair => pair.value), mod: parsed.mod, total: sum + parsed.mod, pairs };
  }
  return rollDice(parsed, random);
}

/** Parses a compound formula: terms `NdX` or a flat number
    (modifier) joined by "+", tolerant of spaces. Each dice term
    becomes {count, faces, mod: 0}; each flat number becomes
    {count: 0, faces: 0, mod: n}. Returns null when empty, malformed,
    or when there is nothing to roll (no dice group). The Phase 11
    single notation ("1d8+4") still parses via parseDamage unchanged. */
export function parseFormula(notation: string): ParsedDice[] | null {
  const trimmed = notation.trim();
  if (!trimmed) return null;
  const groups: ParsedDice[] = [];
  let hasDice = false;
  for (const term of trimmed.split('+')) {
    const part = term.trim();
    if (!part) return null;
    const dice = /^(\d+)d(\d+)$/.exec(part);
    if (dice) {
      const count = Number(dice[1]);
      const faces = Number(dice[2]);
      if (count < 1 || faces < 1) return null;
      groups.push({ count, faces, mod: 0 });
      hasDice = true;
      continue;
    }
    if (/^\d+$/.test(part)) {
      groups.push({ count: 0, faces: 0, mod: Number(part) });
      continue;
    }
    return null;
  }
  return hasDice ? groups : null;
}

/** Canonical formula string from parsed groups ("2d4 + 1d8"),
    preserving term order. Flat modifiers render as their number. */
export function formatFormula(groups: ParsedDice[]): string {
  return groups
    .map(group => (group.count > 0 ? `${group.count}d${group.faces}` : `${group.mod}`))
    .join(' + ');
}

export interface FormulaRoll {
  /** One RollResult per parsed group, in order. */
  groups: RollResult[];
  /** Sum of every group's total (all dice + modifiers). */
  total: number;
}

/** Rolls a whole formula: one rollGroup per term (reusing rollDice),
    global total = sum of group totals. `random` defaults to
    Math.random (injectable for deterministic tests, D-44). */
export function rollFormula(
  groups: ParsedDice[],
  random: () => number = Math.random,
): FormulaRoll {
  const results = groups.map(group => rollGroup(group, random));
  const total = results.reduce((sum, result) => sum + result.total, 0);
  return { groups: results, total };
}

/** Flavor for a finished formula (Phase 17): a natural 20 on ANY d20
    group gets the crit cry. The "¡fallo doble!" stays reserved for
    the bare death save (rollFlavor, notation exactly "1d20") — a
    formula never emits it, even a hand-typed "1d20". Pure, testable. */
export function formulaFlavor(groups: ParsedDice[], results: RollResult[]): string {
  const crit = groups.some((group, index) =>
    group.faces === 20 && results[index]?.rolls.some(roll => roll === 20));
  return crit ? '¡CRÍTICO!' : '';
}
