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
