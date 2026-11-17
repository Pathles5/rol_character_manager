/* ============================================================
   FichaSS — TypeScript types for the data model.
   1:1 transcription of docs/specs/01-data-model/model.md §2
   (entity `character`, D-16) and §4 (`sessionState`, client
   only). The contract rules of §5 (D-17) are documented here
   but enforced in src/validate.ts.

   Naming: identifiers in English; the JSON/fixture content of
   text fields is Spanish (player-facing UI data, model §8).
   ============================================================ */

/** Ability ids, canonical English literals (model §2). */
export type LiteralAbility =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

/** Spell levels the 2024 cleric demo sheet uses (1–3). */
export type SpellLevel = 1 | 2 | 3;

/** Origin of a prepared spell. Domain spells do NOT count against the free limit (2024 rule). */
export type PreparedSource = 'free' | 'domain';

/** Attack taxonomy; "spell" attacks store derived bonus/damage only when meaningful (model §3). */
export type AttackKind = 'melee' | 'ranged' | 'spell';

/** Skill ids reference the app's static catalog (18 skills, model §2/§8).
    Typed as string until the catalog config lands (Phase 04). */
export type SkillId = string;

// --- Identity block -------------------------------------------------

export interface Identity {
  /** Display name, e.g. "Seren Aldaard". */
  name: string;
  race: string;
  class: string;
  /** Subclass taken at level 3 in the 2024 rules, e.g. "Vía de la Vida". */
  subclass: string;
  /** Level 1–20; drives the proficiency bonus (derived, model §3). */
  level: number;
  background: string;
  /** Free display text, e.g. "Legal Buena". */
  alignment: string;
}

/** Raw ability scores. Modifiers are ALWAYS derived (model §3), never stored. */
export type Abilities = Record<LiteralAbility, number>;

// --- Combat block ---------------------------------------------------

export interface HitDice {
  die: string;
  total: number;
}

export interface CombatInfo {
  /** STORED, not derived: depends on equipment (semiplaca 15 + DEX 1 + shield 2 = 18). */
  armorClass: number;
  /** STORED, feet per turn. */
  speed: number;
  /** STORED; character-creation math is out of contract scope. */
  maxHitPoints: number;
  hitDice: HitDice;
}

// --- Defense block ---------------------------------------------------

export interface DefenseInfo {
  /** Fixed save proficiencies, e.g. ["wisdom","charisma"] for 2024 cleric.
      Death-save counters live in sessionState (model §4), not here. */
  saveProficiencies: LiteralAbility[];
}

// --- Attacks / traits / spells ---------------------------------------

export interface Attack {
  id: string;
  name: string;
  bonus?: number;
  damage?: string;
  damageType?: string;
  kind: AttackKind;
  note?: string;
}

export interface Trait {
  id: string;
  name: string;
  source: string;
  description: string;
}

export interface SpellRef {
  id: string;
  name: string;
  description?: string;
}

/** Prepared spell = SpellRef plus level and origin metadata. */
export interface PreparedSpell extends SpellRef {
  level: SpellLevel;
  source: PreparedSource;
  concentration?: boolean;
  castTime?: string;
}

export interface SpellsInfo {
  castingAbility: LiteralAbility;
  /** Maximum slots 4/3/2 in the demo. USED slots live in sessionState. */
  slotsMax: Record<SpellLevel, number>;
  cantrips: SpellRef[];
  prepared: PreparedSpell[];
}

// --- Equipment / proficiencies / role / allies -------------------------

export interface Item {
  name: string;
  qty?: number;
  /** Inventory weight (lb) feeds the Mesa table block (model §6/#9). */
  weightLb?: number;
}

export interface EquipmentInfo {
  equipped: Item[];
  inventory: Item[];
  coins: {
    gp: number;
    sp: number;
  };
}

/** Non-skill proficiency catalog (model §2). */
export interface ProficienciesInfo {
  armor: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
}

export interface RoleInfo {
  /** Role paragraph for the Mesa table block. */
  summary: string;
  tableNotes: string[];
  questions: string[];
}

export interface Ally {
  name: string;
  relationship: string;
}

// --- Root entity ------------------------------------------------------

/** The canonical `character` (model §2, schemaVersion 1).
    This shape is the future contract of `POST /characters` (D-17):
    it NEVER carries derived values (§3), session state (§4) or UI
    metadata. The reserved "x-" prefix family is ignored by the
    schema; only `x_demoNotes` is tolerated, and only in demo
    fixtures (asymmetry of D-17 / decision D-22). */
export interface Character {
  schemaVersion: 1;
  identity: Identity;
  abilities: Abilities;
  combat: CombatInfo;
  defense: DefenseInfo;
  skillProficiencies: SkillId[];
  /** Expertise exists at model level; the demo cleric carries none. */
  skillExpertise: SkillId[];
  attacks: Attack[];
  /** Traits/capabilities; spendable resources link by id to sessionState.resourcesUsed. */
  traits: Trait[];
  spells: SpellsInfo;
  equipment: EquipmentInfo;
  proficiencies: ProficienciesInfo;
  role: RoleInfo;
  allies: Ally[];
  /** Tolerated fixture metadata (demo only); rejected for normal submissions. */
  x_demoNotes?: string[];
}

// --- sessionState (model §4, client-only, never sent) -----------------

/** Mutable session counters. Lives in `localStorage` (Phase 06).
    Reset restores defaults derived from the `character`; migration
    is forward-only by schemaVersion with unknown fields ignored.
    NEVER included in a `character` payload (D-17). */
export interface SessionState {
  schemaVersion: 1;
  characterId: string;
  hp: {
    current: number;
    temp: number;
  };
  /** vs combat.hitDice.total */
  hitDice: {
    used: number;
  };
  spellSlotsUsed: Record<SpellLevel, number>;
  /** Channel Divinity, max 2 at level 5 (2024). */
  channelDivinity: {
    used: number;
  };
  /** Checkbox flag (D-13/D-14), not a counter. */
  inspiration: boolean;
  deathSaves: {
    successes: number;
    failures: number;
  };
  conditions: string[];
  /** Keyed by trait id, e.g. "fortuna-del-erudito". */
  resourcesUsed: Record<string, number>;
}
