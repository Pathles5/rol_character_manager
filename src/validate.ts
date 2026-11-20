/* ============================================================
   FichaSS — client-side `character` validator.
   Mirror of the `POST /characters` contract (model §5, D-17):
   - rejects unknown top-level fields (any "x-*" except x_demoNotes)
   - rejects derived values sent back (model §3 keys)
   - rejects session state mixed into the payload (model §4)
   - rejects required fields that are missing, empty or mistyped
   Deliberately dependency-free (constitution I2, cost €0):
   incremental manual type guards, no zod or similar.

   Field → message map: messages are English (engine logs /
   tests); Spanish copy is a server-response or UI concern.
   ============================================================ */

import type { AttackKind, BlockId, LiteralAbility, PreparedSource } from './types';
import { BLOCK_CONFIG } from './data/blockConfig';

/** Block ids from the frozen matrix (model §6, single source I4). */
const BLOCK_IDS: readonly string[] = BLOCK_CONFIG.map(entry => entry.id);

/** Discriminated result: `{ ok: true }` or a field-path error map. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; fields: Record<string, string> };

const ABILITIES: readonly LiteralAbility[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const ATTACK_KINDS: readonly AttackKind[] = ['melee', 'ranged', 'spell'];

const PREPARED_SOURCES: readonly PreparedSource[] = ['free', 'domain'];

/** Legitimate first-level keys of a `character` (model §2, D-16). */
const KNOWN_TOP_LEVEL_KEYS = new Set([
  'schemaVersion',
  'identity',
  'abilities',
  'combat',
  'defense',
  'skillProficiencies',
  'skillExpertise',
  'attacks',
  'traits',
  'spells',
  'equipment',
  'proficiencies',
  'role',
  'allies',
  // Authored per-character block visibility (amendment D-37 of D-16).
  'hiddenBlocks',
  // Fixture-only tolerance (D-17 asymmetry / D-22).
  'x_demoNotes',
]);

/** Derived-value keys (model §3): never sent by the front (D-17). */
const DERIVED_KEY_HINTS = new Set([
  'mods',
  'modifiers',
  'abilityMods',
  'abilityModifiers',
  'saveTotals',
  'skillTotals',
  'initiative',
  'initiativeBonus',
  'spellDC',
  'spellAttack',
  'preparedCount',
  'initials',
]);

/** Session-state keys (model §4): client-only, never in the payload. */
const SESSION_KEY_HINTS = new Set([
  'sessionState',
  'characterId',
  'hp',
  'tempHp',
  'hitDiceUsed',
  'spellSlotsUsed',
  'channelDivinity',
  'inspiration',
  'deathSaves',
  'conditions',
  'resourcesUsed',
  // session metadata / UI state must never ride along either (§5)
  'sessionDate',
  'ui',
  'meta',
]);

// --- primitive guards -------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

// --- validator ----------------------------------------------------------

export function validateCharacter(value: unknown): ValidationResult {
  const fields: Record<string, string> = {};
  const fail = (field: string, message: string): void => {
    if (!(field in fields)) fields[field] = message;
  };

  // The character payload must be a single JSON object.
  if (!isObject(value)) {
    return { ok: false, fields: { '(root)': 'character must be a JSON object' } };
  }
  const c: Record<string, unknown> = value;

  // 1) Top-level field allowlist (D-17): derived, session state and
  //    metadata never pass; other unknown keys are rejected as such.
  for (const key of Object.keys(c)) {
    if (KNOWN_TOP_LEVEL_KEYS.has(key)) continue;
    if (DERIVED_KEY_HINTS.has(key)) {
      fail(key, 'derived values are computed client-side and must never be sent (model §3, D-17)');
    } else if (SESSION_KEY_HINTS.has(key)) {
      fail(key, 'session state is client-only and must never be mixed into the character payload (model §1/§4)');
    } else if (key.startsWith('x_') || key.startsWith('x-')) {
      fail(key, 'unknown reserved field: only "x_demoNotes" is tolerated, and only in demo fixtures (D-17/D-22)');
    } else {
      fail(key, `unknown top-level field (model §2): "${key}"`);
    }
  }

  // 2) schemaVersion: present, exactly 1.
  if (c.schemaVersion === undefined) {
    fail('schemaVersion', 'required: schemaVersion 1 (model §2)');
  } else if (c.schemaVersion !== 1) {
    fail('schemaVersion', 'must be exactly 1 (model §2)');
  }

  // 3) identity: required, all text fields non-empty, level 1–20.
  const identity = c.identity;
  if (!isObject(identity)) {
    fail('identity', 'required object (name, race, class, subclass, level, background, alignment)');
  } else {
    for (const key of ['name', 'race', 'class', 'subclass', 'background', 'alignment'] as const) {
      if (!isNonEmptyString(identity[key])) fail(`identity.${key}`, 'required non-empty string');
    }
    if (!isPositiveInteger(identity.level) || identity.level > 20) {
      fail('identity.level', 'required integer between 1 and 20');
    }
  }

  // 4) abilities: exactly the six scores, integers 1–30.
  const abilities = c.abilities;
  if (!isObject(abilities)) {
    fail('abilities', 'required object with the six ability scores');
  } else {
    for (const ability of ABILITIES) {
      const score = abilities[ability];
      if (!isPositiveInteger(score) || score > 30) {
        fail(`abilities.${ability}`, 'required integer ability score between 1 and 30');
      }
    }
    for (const key of Object.keys(abilities)) {
      if (!ABILITIES.includes(key as LiteralAbility)) {
        fail(`abilities.${key}`, `unknown ability (model §2): "${key}"`);
      }
    }
  }

  // 5) combat: stored statistics + hit dice.
  const combat = c.combat;
  if (!isObject(combat)) {
    fail('combat', 'required object (armorClass, speed, maxHitPoints, hitDice)');
  } else {
    if (!isPositiveInteger(combat.armorClass)) fail('combat.armorClass', 'required positive integer (AC is stored, not derived)');
    if (!isNonNegativeNumber(combat.speed)) fail('combat.speed', 'required non-negative number (ft)');
    if (!isPositiveInteger(combat.maxHitPoints)) fail('combat.maxHitPoints', 'required positive integer');
    const hitDice = combat.hitDice;
    if (!isObject(hitDice)) {
      fail('combat.hitDice', 'required object (die, total)');
    } else {
      if (!isNonEmptyString(hitDice.die)) fail('combat.hitDice.die', 'required non-empty string (e.g. "d8")');
      if (!isPositiveInteger(hitDice.total)) fail('combat.hitDice.total', 'required positive integer');
    }
  }

  // 6) defense: save proficiencies reference ability ids.
  //    Death-save counters belong to sessionState and are refused above.
  const defense = c.defense;
  if (!isObject(defense)) {
    fail('defense', 'required object (saveProficiencies)');
  } else {
    const saves = defense.saveProficiencies;
    if (
      !Array.isArray(saves) ||
      !saves.every(id => typeof id === 'string' && ABILITIES.includes(id as LiteralAbility))
    ) {
      fail('defense.saveProficiencies', 'required array of ability ids (model §2)');
    }
  }

  // 7) skill lists: arrays of skill-catalog ids (empty is legitimate:
  //    the demo cleric carries no expertise).
  if (!isStringArray(c.skillProficiencies)) {
    fail('skillProficiencies', 'required array of skill ids');
  }
  if (!isStringArray(c.skillExpertise)) {
    fail('skillExpertise', 'required array of skill ids');
  }

  // 8) attacks: kind-constrained objects; bonus/damage optional because
  //    "spell" kinds may rely on derived values (model §2/§3).
  const attacks = c.attacks;
  if (!Array.isArray(attacks)) {
    fail('attacks', 'required array of attacks');
  } else {
    attacks.forEach((attack, index) => {
      const path = `attacks[${index}]`;
      if (!isObject(attack)) {
        fail(path, 'each attack must be an object (id, name, kind, ...)');
        return;
      }
      if (!isNonEmptyString(attack.id)) fail(`${path}.id`, 'required non-empty string');
      if (!isNonEmptyString(attack.name)) fail(`${path}.name`, 'required non-empty string');
      if (attack.bonus !== undefined && !isFiniteNumber(attack.bonus)) {
        fail(`${path}.bonus`, 'optional numeric attack bonus');
      }
      if (attack.damage !== undefined && !isNonEmptyString(attack.damage)) {
        fail(`${path}.damage`, 'optional non-empty string (e.g. "1d6+1")');
      }
      if (attack.damageType !== undefined && !isNonEmptyString(attack.damageType)) {
        fail(`${path}.damageType`, 'optional non-empty string');
      }
      if (!ATTACK_KINDS.includes(attack.kind as AttackKind)) {
        fail(`${path}.kind`, 'must be "melee", "ranged" or "spell" (model §2)');
      }
      if (attack.note !== undefined && !isNonEmptyString(attack.note)) {
        fail(`${path}.note`, 'optional non-empty string');
      }
    });
  }

  // 9) traits: fully described, resources link by id to sessionState.
  const traits = c.traits;
  if (!Array.isArray(traits)) {
    fail('traits', 'required array of traits');
  } else {
    traits.forEach((trait, index) => {
      const path = `traits[${index}]`;
      if (!isObject(trait)) {
        fail(path, 'each trait must be an object (id, name, source, description)');
        return;
      }
      for (const key of ['id', 'name', 'source', 'description'] as const) {
        if (!isNonEmptyString(trait[key])) fail(`${path}.${key}`, 'required non-empty string');
      }
    });
  }

  // 10) spells: casting ability, slots 1–3, cantrips and prepared list.
  const spells = c.spells;
  if (!isObject(spells)) {
    fail('spells', 'required object (castingAbility, slotsMax, cantrips, prepared)');
  } else {
    if (!isNonEmptyString(spells.castingAbility) || !ABILITIES.includes(spells.castingAbility as LiteralAbility)) {
      fail('spells.castingAbility', 'required ability id (model §2)');
    }
    const slotsMax = spells.slotsMax;
    if (!isObject(slotsMax)) {
      fail('spells.slotsMax', 'required object with keys "1", "2", "3"');
    } else {
      for (const level of ['1', '2', '3'] as const) {
        if (!isNonNegativeNumber(slotsMax[level]) || !Number.isInteger(slotsMax[level])) {
          fail(`spells.slotsMax.${level}`, 'required non-negative integer');
        }
      }
    }
    const checkSpellRef = (ref: unknown, path: string, allowPreparedFields: boolean): void => {
      if (!isObject(ref)) {
        fail(path, 'each spell must be an object (id, name, ...)');
        return;
      }
      if (!isNonEmptyString(ref.id)) fail(`${path}.id`, 'required non-empty string');
      if (!isNonEmptyString(ref.name)) fail(`${path}.name`, 'required non-empty string');
      if (ref.description !== undefined && !isNonEmptyString(ref.description)) {
        fail(`${path}.description`, 'optional non-empty string');
      }
      if (allowPreparedFields) {
        if (ref.level !== 1 && ref.level !== 2 && ref.level !== 3) {
          fail(`${path}.level`, 'must be 1, 2 or 3 (model §2)');
        }
        if (!PREPARED_SOURCES.includes(ref.source as PreparedSource)) {
          fail(`${path}.source`, 'must be "free" or "domain" (model §2)');
        }
        if (ref.concentration !== undefined && typeof ref.concentration !== 'boolean') {
          fail(`${path}.concentration`, 'optional boolean');
        }
        if (ref.castTime !== undefined && !isNonEmptyString(ref.castTime)) {
          fail(`${path}.castTime`, 'optional non-empty string');
        }
      }
    };
    const cantrips = spells.cantrips;
    if (!Array.isArray(cantrips)) {
      fail('spells.cantrips', 'required array of SpellRef');
    } else {
      cantrips.forEach((ref, index) => checkSpellRef(ref, `spells.cantrips[${index}]`, false));
    }
    const prepared = spells.prepared;
    if (!Array.isArray(prepared)) {
      fail('spells.prepared', 'required array of PreparedSpell');
    } else {
      prepared.forEach((ref, index) => checkSpellRef(ref, `spells.prepared[${index}]`, true));
    }
  }

  // 11) equipment: equipped + inventory items and coins.
  const equipment = c.equipment;
  if (!isObject(equipment)) {
    fail('equipment', 'required object (equipped, inventory, coins)');
  } else {
    const checkItems = (items: unknown, path: string): void => {
      if (!Array.isArray(items)) {
        fail(path, 'required array of items');
        return;
      }
      items.forEach((item, index) => {
        if (!isObject(item)) {
          fail(`${path}[${index}]`, 'each item must be an object (name, qty?, weightLb?)');
          return;
        }
        if (!isNonEmptyString(item.name)) fail(`${path}[${index}].name`, 'required non-empty string');
        if (item.qty !== undefined && (!isPositiveInteger(item.qty))) {
          fail(`${path}[${index}].qty`, 'optional positive integer');
        }
        if (item.weightLb !== undefined && !isNonNegativeNumber(item.weightLb)) {
          fail(`${path}[${index}].weightLb`, 'optional non-negative number');
        }
      });
    };
    checkItems(equipment.equipped, 'equipment.equipped');
    checkItems(equipment.inventory, 'equipment.inventory');
    const coins = equipment.coins;
    if (!isObject(coins)) {
      fail('equipment.coins', 'required object (gp, sp)');
    } else {
      if (!isNonNegativeNumber(coins.gp) || !Number.isInteger(coins.gp)) fail('equipment.coins.gp', 'required non-negative integer');
      if (!isNonNegativeNumber(coins.sp) || !Number.isInteger(coins.sp)) fail('equipment.coins.sp', 'required non-negative integer');
    }
  }

  // 12) proficiencies: the four non-skill catalogs.
  const proficiencies = c.proficiencies;
  if (!isObject(proficiencies)) {
    fail('proficiencies', 'required object (armor, weapons, tools, languages)');
  } else {
    for (const key of ['armor', 'weapons', 'tools', 'languages'] as const) {
      if (!isStringArray(proficiencies[key])) {
        fail(`proficiencies.${key}`, 'required array of strings');
      }
    }
  }

  // 13) role: the Mesa block content.
  const role = c.role;
  if (!isObject(role)) {
    fail('role', 'required object (summary, tableNotes, questions)');
  } else {
    if (!isNonEmptyString(role.summary)) fail('role.summary', 'required non-empty string');
    if (!isStringArray(role.tableNotes)) fail('role.tableNotes', 'required array of strings');
    if (!isStringArray(role.questions)) fail('role.questions', 'required array of strings');
  }

  // 14) allies.
  const allies = c.allies;
  if (!Array.isArray(allies)) {
    fail('allies', 'required array of allies');
  } else {
    allies.forEach((ally, index) => {
      if (!isObject(ally)) {
        fail(`allies[${index}]`, 'each ally must be an object (name, relationship)');
        return;
      }
      if (!isNonEmptyString(ally.name)) fail(`allies[${index}].name`, 'required non-empty string');
      if (!isNonEmptyString(ally.relationship)) fail(`allies[${index}].relationship`, 'required non-empty string');
    });
  }

  // 15) hiddenBlocks (amendment D-37 of D-16): optional authored
  //     visibility — array of known block ids, no duplicates.
  const hiddenBlocks = c.hiddenBlocks;
  if (hiddenBlocks !== undefined) {
    if (!Array.isArray(hiddenBlocks)) {
      fail('hiddenBlocks', 'optional array of block ids (model §6)');
    } else {
      hiddenBlocks.forEach((id, index) => {
        if (typeof id !== 'string' || !BLOCK_IDS.includes(id as BlockId)) {
          fail(`hiddenBlocks[${index}]`, `unknown block id: "${String(id)}" (model §6)`);
        }
      });
      if (new Set(hiddenBlocks).size !== hiddenBlocks.length) {
        fail('hiddenBlocks', 'duplicate block ids');
      }
    }
  }

  // 16) x_demoNotes: tolerated fixture metadata, but still typed as
  //     string[] when present (D-17 asymmetry / D-22).
  const demoNotes = c.x_demoNotes;
  if (demoNotes !== undefined && !isStringArray(demoNotes)) {
    fail('x_demoNotes', 'fixture field: must be an array of strings (D-17/D-22)');
  }

  return Object.keys(fields).length === 0 ? { ok: true } : { ok: false, fields };
}
