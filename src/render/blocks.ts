/* ============================================================
   FichaSS — block renderers (Phase 04, D-24; editable counters
   added in Phase 06, D-27).
   One function per block of BLOCK_CONFIG; each receives the
   character, the derived stats and the (editable) session
   state, and returns an HTML string using ONLY the class
   vocabulary of styles/base.css (.card, .blockhead, .rows,
   .stat-grid, .skill-list, .spells, .dot-row, ...).

   Rule: every displayed number comes from `character`,
   `derived` or `sessionState` — zero hardcoded character
   values (spec C1). Generic rule constants (death saves = 3,
   Channel Divinity max 2 at 2024 level 5, temp HP cap) live
   in src/session.ts and are imported from there.

   Editable counters (Phase 06, T-02) render as steppers:
   <button class="step" data-action data-target aria-label>,
   consumed by the delegated handlers in views/character.ts → session.ts.
   Rule limits are enforced in session.ts (spec C5).

   The `x_demoNotes` fixture field is NEVER rendered.
   ============================================================ */

import type {
  Character,
  Item,
  LiteralAbility,
  PreparedSource,
  SessionState,
  SpellLevel,
} from '../types';
import type { DerivedStats } from '../derived';
import { SKILL_CATALOG } from '../data/skills';
import type { BlockId } from '../data/blockConfig';
import { escapeHtml } from '../lib/manifest';
import { parseDamage } from '../dice';
import { CHANNEL_DIVINITY_MAX, DEATH_SAVE_MAX, type StepperTarget } from '../session';

// --- Shared display helpers -----------------------------------------

/** Spanish labels for ability ids (UI only; ids stay English). */
export const ABILITY_LABELS: Record<LiteralAbility, string> = {
  strength: 'FUE',
  dexterity: 'DES',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'SAB',
  charisma: 'CAR',
};

const ABILITY_ORDER: readonly LiteralAbility[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const SPELL_LEVELS: readonly SpellLevel[] = [1, 2, 3];

/** Formats a bonus for display (+3 / −1, minus sign U+2212). */
function formatModifier(mod: number): string {
  return `${mod < 0 ? '\u2212' : '+'}${Math.abs(mod)}`;
}

/** Stepper buttons for one editable counter (T-02): native
    buttons, so keyboard focus/activation comes for free; the
    delegated handler in views/character.ts routes them to session.ts. */
function stepper(target: StepperTarget, incLabel: string, decLabel: string): string {
  return `<span class="stepper">
        <button type="button" class="step" data-action="dec" data-target="${target}" aria-label="${decLabel}">\u2212</button>
        <button type="button" class="step" data-action="inc" data-target="${target}" aria-label="${incLabel}">+</button>
      </span>`;
}

/** Quick-change strip for hit points (user request 2026-11-20, final
    layout after visual feedback): THREE left-aligned rows under the
    ±1 pair — row 2 is ±10 (`-- ++`), row 3 is the fill-to-max button
    (absolute `set` action with the character's max HP — render-time
    value, no hardcoding). The ±5 step is dropped (user decision). */
function hpStrip(maxHitPoints: number): string {
  const button = (action: 'dec' | 'inc' | 'set', step: number, label: string, text: string, extraClass = ''): string =>
    `<button type="button" class="step ${extraClass}" data-action="${action}" data-target="hp-current" data-value="${step}" aria-label="${label}">${text}</button>`;
  return `<span class="step-wrap">
        <span class="step-row">
          ${button('dec', 1, 'Restar 1 punto de golpe', '-')}
          ${button('inc', 1, 'Sumar 1 punto de golpe', '+')}
        </span>
        <span class="step-row">
          ${button('dec', 10, 'Restar 10 puntos de golpe', '--')}
          ${button('inc', 10, 'Sumar 10 puntos de golpe', '++')}
        </span>
        <span class="step-row">
          ${button('set', maxHitPoints, 'Rellenar los PG al máximo', '\u2764')}
        </span>
      </span>`;
}

/** Official 2024 condition catalog (model §8, Spanish labels for
    the player; sessionState.conditions stores these labels). */
export const CONDITION_CATALOG: readonly string[] = [
  'agarrado',
  'asustado',
  'aturdido',
  'cegado',
  'derribado',
  'encantado',
  'inconsciente',
  'intoxicado',
  'paralizado',
  'petrificado',
  'restringido',
  'sordo',
];

/** Default session state lives in src/session.ts since Phase 06
    (T-01); re-exported here so Phase 04 imports keep working. */
export { defaultSessionState } from '../session';

/** Spanish block titles for the card headers. */
export const BLOCK_TITLES: Record<BlockId, string> = {
  identity: 'Identidad',
  combat: 'Combate',
  attributes: 'Atributos',
  defense: 'Salvaciones',
  skills: 'Habilidades',
  attacks: 'Ataques',
  spells: 'Conjuros',
  rest: 'Descanso',
  equipment: 'Equipo',
  traits: 'Rasgos',
  proficiencies: 'Competencias',
  role: 'Rol en mesa',
  allies: 'Aliados',
};

/** Grid classes per block (mockup vocabulary in base.css). */
export const BLOCK_CSS_CLASS: Record<BlockId, string> = {
  identity: 'b-identity',
  combat: 'b-combat',
  attributes: 'b-attributes',
  defense: 'b-saves',
  skills: 'b-skills',
  attacks: 'b-attacks',
  spells: 'b-spells',
  rest: 'b-recovery',
  equipment: 'b-equipment',
  traits: 'b-traits',
  proficiencies: 'b-proficiencies',
  role: 'b-role',
  allies: 'b-allys',
};

// --- Block renderers --------------------------------------------------

export function renderIdentity(
  character: Character,
  derived: DerivedStats,
  session: SessionState,
): string {
  const identity = character.identity;
  // Inspiration as a single dot, same interaction as death saves
  // (user request 2026-11-19): visible in every mode because the
  // identity block is "siempre".
  const dot = `<button type="button" class="dot${session.inspiration ? ' on-ok' : ''}" data-action="set" data-target="inspiration" data-value="${session.inspiration ? 0 : 1}" aria-pressed="${session.inspiration}" aria-label="${session.inspiration ? 'Desmarcar inspiración' : 'Marcar inspiración'}"></button>`;
  return `
    <div class="identity">
      <div class="portrait">${derived.initials}</div>
      <div class="identity-lines">
        <span class="display">${identity.name}</span>
        <p class="dim">${identity.race} · ${identity.class} ${identity.level} · ${identity.subclass}</p>
        <p class="dim dense extra">${identity.background} · ${identity.alignment}</p>
        <div class="identity-inspiration"><span class="dense dim">Inspiración</span><span class="dots">${dot}</span></div>
      </div>
    </div>`;
}

export function renderAttributes(
  character: Character,
  derived: DerivedStats,
): string {
  return `<div class="attr-grid">${ABILITY_ORDER.map(ability => `
      <div class="attr">
        <span class="lbl">${ABILITY_LABELS[ability]}</span>
        <span class="num">${character.abilities[ability]}</span>
        <span class="mod">${formatModifier(derived.mods[ability])}</span>
      </div>`).join('')}
  </div>`;
}

export function renderCombat(
  character: Character,
  derived: DerivedStats,
  session: SessionState,
): string {
  const combat = character.combat;
  return `<div class="stat-grid">
    <div class="stat"><span class="num">${combat.armorClass}</span><span class="lbl">CA</span></div>
    <div class="stat">
      <span class="num">${session.hp.current}<span class="den">/${combat.maxHitPoints}</span></span>
      <span class="lbl">PG</span>
      ${hpStrip(combat.maxHitPoints)}
    </div>
    <div class="stat">
      <span class="num">${session.hp.temp}</span><span class="lbl">PG temp</span>
      ${stepper('hp-temp', 'Sumar 1 punto de golpe temporal', 'Restar 1 punto de golpe temporal')}
    </div>
    <div class="stat"><span class="num">${formatModifier(derived.initiative)}</span><span class="lbl">Iniciativa</span></div>
    <div class="stat"><span class="num">${combat.speed}</span><span class="lbl">Velocidad · ft</span></div>
    <div class="stat"><span class="num">${combat.hitDice.total}</span><span class="lbl">Dados ${combat.hitDice.die} · ${session.hitDice.used} usados</span></div>
    <div class="stat"><span class="num">${session.conditions.length}</span><span class="lbl">Condiciones</span></div>
  </div>`;
}

export function renderDefense(
  character: Character,
  derived: DerivedStats,
  session: SessionState,
): string {
  const saves = ABILITY_ORDER.map(ability => {
    const proficient = character.defense.saveProficiencies.includes(ability);
    return `<div class="row skill${proficient ? ' prof' : ''}"><span class="k">${ABILITY_LABELS[ability]}</span><span class="v">${formatModifier(derived.saveTotals[ability])}</span></div>`;
  }).join('');
  /** Clickable death-save dots (T-02): clicking a dot marks up to
      it; clicking the LAST active dot unmarks it (validated UX).
      Each dot is a native button carrying an absolute `set` value;
      rule limits stay enforced in session.ts. */
  const deathDots = (kind: 'success' | 'failure', filled: number): string => {
    const target: StepperTarget = kind === 'success' ? 'death-successes' : 'death-failures';
    const noun = kind === 'success' ? 'éxito' : 'fracaso';
    const onClass = kind === 'success' ? ' on-ok' : ' on-bad';
    return Array.from({ length: DEATH_SAVE_MAX }, (_, index) => {
      const count = index + 1;
      const active = index < filled;
      const value = active && count === filled ? filled - 1 : count;
      const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
      const label = !active
        ? `Marcar ${plural(count, noun)} de muerte`
        : count === filled
          ? `Desmarcar: quedan ${plural(filled - 1, noun)} de muerte`
          : `Marcar hasta ${plural(count, noun)} de muerte`;
      return `<button type="button" class="dot${active ? onClass : ''}" data-action="set" data-target="${target}" data-value="${value}" aria-pressed="${active}" aria-label="${label}"></button>`;
    }).join('');
  };
  return `
    <div class="skill-list">${saves}</div>
    <p class="legend">✓ con competencia de salvación</p>
    <div class="subhead">Salvaciones de muerte</div>
    <div class="dot-row"><span class="dense dim">Éxitos</span><span class="dots">${deathDots('success', session.deathSaves.successes)}</span></div>
    <div class="dot-row"><span class="dense dim">Fracasos</span><span class="dots">${deathDots('failure', session.deathSaves.failures)}</span></div>`;
}

export function renderSkills(
  character: Character,
  derived: DerivedStats,
): string {
  const proficient = new Set(character.skillProficiencies);
  const expertise = new Set(character.skillExpertise);
  const rows = [...SKILL_CATALOG]
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    .map(skill => {
      const isProficient = proficient.has(skill.id);
      const isExpert = expertise.has(skill.id);
      const cls = isExpert ? ' expert' : isProficient ? ' prof' : '';
      // Fallback = raw modifier if the fixture carries an id outside
      // the catalog (derived skips unknown ids by design).
      const total = derived.skillTotals[skill.id] ?? derived.mods[skill.ability];
      return `<div class="row skill${cls}"><span class="k">${skill.label} (${ABILITY_LABELS[skill.ability]})</span><span class="v">${formatModifier(total)}</span></div>`;
    })
    .join('');
  return `
    <div class="skill-list">${rows}</div>
    <p class="legend">— sin competencia · ✓ competencia · ✓✓ pericia</p>`;
}

export function renderAttacks(
  character: Character,
  derived: DerivedStats,
): string {
  const rows = character.attacks.map(attack => {
    const bonus = attack.bonus !== undefined ? `${formatModifier(attack.bonus)} · ` : '';
    const damage = attack.damage
      ? `${attack.damage}${attack.damageType ? ` ${attack.damageType}` : ''}`
      : '';
    const note = attack.note ? `<li class="dense dim">${attack.note}</li>` : '';
    // Dice button (Phase 11): only when the damage is clean dice notation.
    const dice = attack.damage && parseDamage(attack.damage)
      ? `<button type="button" class="dice-btn" data-notation="${escapeHtml(attack.damage)}" aria-label="Tirar ${escapeHtml(attack.damage)} de ${escapeHtml(attack.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01"/></svg></button>`
      : '';
    return `<li class="row"><span class="k">${escapeHtml(attack.name)}</span><span class="v">${bonus}${damage}${dice}</span></li>${note}`;
  }).join('');
  return `
    <ul class="rows">${rows}</ul>
    <p class="legend">Ataque de conjuro ${formatModifier(derived.spellAttack)} · CD de conjuro ${derived.spellDC}</p>`;
}

interface SpellChipData {
  id: string;
  name: string;
  castTime?: string;
  source?: PreparedSource;
  concentration?: boolean;
}

/** Spell chip as a button (Phase 06, T-03): the delegated handler
    in views/character.ts opens the detail bottom sheet with the spell's own
    data (name/level/origin/castTime/description). */
function spellChip(spell: SpellChipData): string {
  const castTime = spell.castTime ? `<span class="cast">${spell.castTime}</span>` : '';
  const domain = spell.source === 'domain' ? '<span class="mark">dominio</span>' : '';
  const concentration = spell.concentration ? '<span class="mark dim">⛓</span>' : '';
  return `<li><button type="button" class="spell-chip" data-spell-id="${spell.id}">${spell.name}${castTime}${domain}${concentration}</button></li>`;
}

export function renderSpells(
  character: Character,
  derived: DerivedStats,
  session: SessionState,
): string {
  const spells = character.spells;
  // Editable slot counters (D-27: where they are displayed): the
  // same counters also appear in the rest card and stay in sync
  // through the single session state.
  const slotCounters = SPELL_LEVELS.map(level => `
    <span class="slot-counter">
      <span class="dense dim">Nv. ${level}</span>
      <span class="val">${session.spellSlotsUsed[level]}/${spells.slotsMax[level]}</span>
      ${stepper(`slot-${level}`, `Gastar un espacio de nivel ${level}`, `Recuperar un espacio de nivel ${level}`)}
    </span>`).join('');
  const cantripGroup = `
    <div class="spell-group">
      <div class="lvl-head"><span>Trucos</span><span class="count">${spells.cantrips.length}</span></div>
      <ul class="spells">${spells.cantrips.map(spellChip).join('')}</ul>
    </div>`;
  const levelGroups = SPELL_LEVELS.map(level => {
    const prepared = spells.prepared.filter(spell => spell.level === level);
    return `
    <div class="spell-group">
      <div class="lvl-head"><span>Nivel ${level}</span><span class="count">${prepared.length}</span></div>
      <ul class="spells">${prepared.map(spellChip).join('')}</ul>
    </div>`;
  }).join('');
  return `
    <div class="stat-grid">
      <div class="stat"><span class="num">${derived.spellDC}</span><span class="lbl">CD conjuro</span></div>
      <div class="stat"><span class="num">${formatModifier(derived.spellAttack)}</span><span class="lbl">Ataque</span></div>
      <div class="stat"><span class="num">${derived.preparedFreeCount}</span><span class="lbl">Preparados libres</span></div>
    </div>
    <div class="slot-line"><span class="legend">Espacios de conjuro (usados/máx):</span>${slotCounters}</div>
    ${cantripGroup}${levelGroups}`;
}

export function renderRest(
  character: Character,
  _derived: DerivedStats,
  session: SessionState,
): string {
  const combat = character.combat;
  // Amendment D-37: a 0-max slot level (non-casters) shows no row —
  // "0 / 0" counters are noise in the rest card.
  const slotRows = SPELL_LEVELS
    .filter(level => character.spells.slotsMax[level] > 0)
    .map(level => `<li class="row"><span class="k">Espacios nivel ${level}</span><span class="counter"><span class="val">${session.spellSlotsUsed[level]} / ${character.spells.slotsMax[level]}</span>${stepper(`slot-${level}`, `Gastar un espacio de nivel ${level}`, `Recuperar un espacio de nivel ${level}`)}</span></li>`).join('');
  const conditions = session.conditions.length ? session.conditions.join(', ') : '—';
  const conditionChips = CONDITION_CATALOG.map(condition => {
    const active = session.conditions.includes(condition);
    return `<button type="button" class="chip condition${active ? ' active' : ''}" data-action="toggle-condition" data-value="${condition}" aria-pressed="${active}">${condition}</button>`;
  }).join('');
  return `
    <ul class="rows">
      <li class="row"><span class="k">PG</span><span class="counter"><span class="val">${session.hp.current} / ${combat.maxHitPoints}</span>${hpStrip(combat.maxHitPoints)}</span></li>
      <li class="row"><span class="k">PG temporales</span><span class="counter"><span class="val">${session.hp.temp}</span>${stepper('hp-temp', 'Sumar 1 punto de golpe temporal', 'Restar 1 punto de golpe temporal')}</span></li>
      <li class="row"><span class="k">Dados golpe</span><span class="counter"><span class="val">${session.hitDice.used} / ${combat.hitDice.total} ${combat.hitDice.die}</span>${stepper('hit-dice', 'Gastar 1 dado de golpe', 'Recuperar 1 dado de golpe')}</span></li>
      ${slotRows}
      <li class="row"><span class="k">Canalizar divinidad</span><span class="counter"><span class="val">${session.channelDivinity.used} / ${CHANNEL_DIVINITY_MAX}</span>${stepper('channel-divinity', 'Gastar 1 uso de Canalizar Divinidad', 'Recuperar 1 uso de Canalizar Divinidad')}</span></li>
      <li class="row"><span class="k">Condiciones</span><span class="v">${conditions}</span></li>
    </ul>
    <div class="subhead">Condiciones</div>
    <div class="chip-set" role="group" aria-label="Condiciones (pulsa para activar o desactivar)">${conditionChips}</div>`;
}

function itemWeight(item: Item): string {
  const weight = (item.qty ?? 1) * (item.weightLb ?? 0);
  return item.weightLb === undefined ? '—' : `${weight} lb`;
}

function itemRow(item: Item): string {
  const qty = item.qty ?? 1;
  const label = qty > 1 ? `${item.name} ×${qty}` : item.name;
  return `<li class="row"><span class="k">${label}</span><span class="v">${itemWeight(item)}</span></li>`;
}

export function renderEquipment(character: Character): string {
  const equipment = character.equipment;
  const all = [...equipment.equipped, ...equipment.inventory];
  const totalWeight = all.reduce((sum, item) => sum + (item.qty ?? 1) * (item.weightLb ?? 0), 0);
  return `
    <div class="lvl-head"><span>Equipado</span><span class="count">${equipment.equipped.length}</span></div>
    <ul class="rows">${equipment.equipped.map(itemRow).join('')}</ul>
    <div class="lvl-head"><span>Inventario</span><span class="count">${equipment.inventory.length}</span></div>
    <ul class="rows">${equipment.inventory.map(itemRow).join('')}</ul>
    <p class="legend">Peso total: ${totalWeight} lb · Bolsillo: ${equipment.coins.gp} gp · ${equipment.coins.sp} sp</p>`;
}

export function renderTraits(
  character: Character,
  _derived: DerivedStats,
  session: SessionState,
): string {
  return `<ul class="traits">${character.traits.map(trait => {
    // Activable traits (amendment D-38 of D-16): any trait with an
    // authored `uses` cap renders a 0/uses counter wired to
    // sessionState.resourcesUsed[<trait id>] (generalizes the
    // Phase 06 Fortuna special case).
    const counter = trait.uses !== undefined
      ? `<span class="counter"><span class="val">${session.resourcesUsed[trait.id] ?? 0} / ${trait.uses}</span>${stepper(
          `resource-${trait.id}`,
          `Gastar 1 uso de ${trait.name}`,
          `Recuperar 1 uso de ${trait.name}`,
        )}</span>`
      : '';
    return `
      <li>
        <span class="tname">${trait.name} <span class="dim dense">· ${trait.source}</span>${counter}</span>
        <span class="tdesc">${trait.description}</span>
      </li>`;
  }).join('')}
  </ul>`;
}

export function renderProficiencies(character: Character): string {
  const proficiencies = character.proficiencies;
  const groups: [string, string[]][] = [
    ['Armaduras', proficiencies.armor],
    ['Armas', proficiencies.weapons],
    ['Herramientas', proficiencies.tools],
    ['Idiomas', proficiencies.languages],
  ];
  return `<ul class="rows">${groups.map(([label, entries]) =>
    `<li class="row"><span class="k">${label}</span><span class="v">${entries.join(', ')}</span></li>`).join('')}</ul>`;
}

export function renderRole(character: Character): string {
  const role = character.role;
  return `
    <p>${role.summary}</p>
    <div class="subhead">Notas de mesa</div>
    <ul class="note-list">${role.tableNotes.map(note => `<li>${note}</li>`).join('')}</ul>
    <div class="subhead">Puntos pendientes</div>
    <ul class="note-list questions">${role.questions.map(question => `<li>${question}</li>`).join('')}</ul>`;
}

export function renderAllies(character: Character): string {
  return `<ul class="rows">${character.allies.map(ally =>
    `<li class="row"><span class="k">${ally.name}</span><span class="v">${ally.relationship}</span></li>`).join('')}</ul>`;
}
