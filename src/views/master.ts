/* ============================================================
   FichaSS — master view (Fase 16, D-58). EDITABLE rows: one per
   character, fed by the multi-character session store
   (master-data.ts). Every interactive control applies a RELATIVE
   DELTA via editCharacter (clamped + 409-retried by the store —
   the master never clobbers a concurrent player edit, C9).

   Editable per row (decision 2026-11-23: everything the player
   can edit AND appears here is editable for the master):
   - PG current ±1/±10, temp HP ±1
   - hit dice used ±1
   - spell slots ±1 (levels with slotsMax > 0 only)
   - Channel Divinity ±1 (casters only)
   - death saves ±1 (successes and failures)
   - inspiration toggle, condition chips (2024 catalog)
   - trait resources ±1 (traits with authored `uses`)

   Groups & minimization (C4/C5/C7): characters live in named
   groups or "Sin grupo"; drag & drop to move/reorder, with a
   keyboard/button alternative (group <select> + ▲/▼). Group
   composition, order and minimized rows persist in the master's
   localStorage (master-layout.ts).
   ============================================================ */

import type { SpellLevel } from '../types';
import {
  editCharacter,
  getCharacterDoc,
  getRows,
  initMasterStore,
  refreshAll,
  retryCharacter,
  startPolling,
  stopPolling,
  type DeltaOp,
  type MasterRow,
} from '../master-data';
import { loadLayout, newGroupId, saveLayout, type MasterGroup, type MasterLayout } from '../master-layout';
import { CONDITION_CATALOG } from '../render/blocks';
import { escapeHtml } from '../lib/manifest';

let onRowsCb: ((rows: Record<string, MasterRow>) => void) | null = null;
let layout: MasterLayout = { groups: [], ungrouped: [], minimized: [] };

export async function masterView(root: HTMLElement): Promise<void> {
  stopPolling();
  onRowsCb = null;
  layout = loadMasterLayout();
  root.innerHTML = `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS · Master</strong></div>
    <div class="appbar-main">
      <button type="button" class="chip" id="master-add-group">+ grupo</button>
      <button type="button" class="chip" id="master-refresh">Refrescar</button>
      <a class="chip" href="#/">← personajes</a>
    </div>
  </header>
  <main class="master-grid" id="master-rows" aria-busy="true" aria-label="Estado del grupo">
    <div class="card skeleton" aria-hidden="true">
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
    </div>
  </main>`;

  const rowsEl = root.querySelector<HTMLElement>('#master-rows');
  const refreshBtn = root.querySelector<HTMLButtonElement>('#master-refresh');
  const addGroupBtn = root.querySelector<HTMLButtonElement>('#master-add-group');

  /** Full re-render on every store emit; the focused control (if
      any) is restored by its data-focus-key so keyboard steering
      survives the repaint (C7). */
  const renderRows = (): void => {
    if (!rowsEl) return;
    const rows = getRows();
    const ids = Object.keys(rows);
    if (ids.length === 0) return; // still loading
    absorbUnknownIds(ids);
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active && rowsEl.contains(active) ? active.dataset.focusKey : null;
    rowsEl.innerHTML = renderContainers(rows);
    rowsEl.setAttribute('aria-busy', 'false');
    if (focusKey) {
      rowsEl.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
    }
  };

  /** Delegated clicks: row steppers (data-act → DeltaOp), group
      tools and row tools. */
  const onClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const rowEl = target.closest<HTMLElement>('.master-row');
    const groupEl = target.closest<HTMLElement>('.master-group');
    const id = rowEl?.dataset.char ?? '';
    const act = target.dataset.act;
    const delta = Number(target.dataset.delta ?? 0);
    const value = target.dataset.value ?? '';
    let op: DeltaOp | null = null;
    switch (act) {
      case 'hp': op = { hp: { current: delta } }; break;
      case 'hp-temp': op = { hp: { temp: delta } }; break;
      case 'hit-dice': op = { hitDice: { used: delta } }; break;
      case 'slot': {
        const level = Number(value) as SpellLevel;
        const slots: Partial<Record<SpellLevel, number>> = {};
        slots[level] = delta;
        op = { spellSlotsUsed: slots };
        break;
      }
      case 'channel': op = { channelDivinity: { used: delta } }; break;
      case 'death-succ': op = { deathSaves: { successes: delta } }; break;
      case 'death-fail': op = { deathSaves: { failures: delta } }; break;
      case 'inspiration': {
        const row = getRows()[id];
        if (row?.state) op = { inspiration: !row.state.inspiration };
        break;
      }
      case 'condition': op = { conditions: { toggle: value } }; break;
      case 'resource': op = { resource: { traitId: value, delta } }; break;
      case 'retry': retryCharacter(id); return;
      case 'minimize': toggleMinimized(id); return;
      case 'order': moveRelative(id, delta); return;
      case 'group-rename': renameGroup(value); return;
      case 'group-delete': deleteGroup(value); return;
      default: return;
    }
    if (op && id) editCharacter(id, op);
  };

  /** Group <select> change: move the row to the chosen container
      (the accessible alternative to drag & drop, C7). */
  const onChange = (event: Event): void => {
    const select = (event.target as HTMLElement).closest<HTMLElement>('.m-group-select');
    const rowEl = select?.closest<HTMLElement>('.master-row');
    const id = rowEl?.dataset.char;
    if (!select || !id) return;
    moveCharacter(id, select.value || null, Number.MAX_SAFE_INTEGER);
  };

  // --- Drag & drop (C4): rows are draggable; groups and rows are
  // drop targets. dropTarget is recomputed on every dragover.
  let dragId: string | null = null;
  let dropTarget: { group: string | null; index: number } | null = null;

  const onDragStart = (event: DragEvent): void => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('.master-row');
    if (!row) return;
    dragId = row.dataset.char ?? null;
    row.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', dragId ?? '');
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = (): void => {
    dragId = null;
    dropTarget = null;
    rowsEl?.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    rowsEl?.querySelectorAll('.drop-ok').forEach(el => el.classList.remove('drop-ok'));
  };

  const onDragOver = (event: DragEvent): void => {
    const group = (event.target as HTMLElement).closest<HTMLElement>('.master-group');
    if (!group || !dragId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    rowsEl?.querySelectorAll('.drop-ok').forEach(el => el.classList.remove('drop-ok'));
    group.classList.add('drop-ok');
    dropTarget = { group: group.dataset.group || null, index: dropIndex(group, event.clientY) };
  };

  const onDrop = (event: DragEvent): void => {
    const group = (event.target as HTMLElement).closest<HTMLElement>('.master-group');
    if (!group || !dragId || !dropTarget) return;
    event.preventDefault();
    moveCharacter(dragId, dropTarget.group, dropTarget.index);
    onDragEnd();
  };

  onRowsCb = renderRows;
  try {
    await initMasterStore({ onRows: rows => onRowsCb?.(rows) });
    await refreshAll();
    startPolling();
    refreshBtn?.addEventListener('click', () => void refreshAll());
    addGroupBtn?.addEventListener('click', () => createGroup());
    rowsEl?.addEventListener('click', onClick);
    rowsEl?.addEventListener('change', onChange);
    rowsEl?.addEventListener('dragstart', onDragStart);
    rowsEl?.addEventListener('dragend', onDragEnd);
    rowsEl?.addEventListener('dragover', onDragOver);
    rowsEl?.addEventListener('drop', onDrop);
  } catch {
    if (rowsEl) {
      rowsEl.innerHTML = `
      <div class="card error-view">
        <h1 class="display">Sin panel</h1>
        <p class="dim">No se pudo cargar el estado de la sesión (¿falta session-url.json?).</p>
        <a href="#/">← volver a personajes</a>
      </div>`;
      rowsEl.setAttribute('aria-busy', 'false');
    }
  }
}

// --- Layout helpers ----------------------------------------------------

function loadMasterLayout(): MasterLayout {
  return loadLayout();
}

/** Makes sure every manifest character has a place in the layout
    (new ids join "Sin grupo" at the end). */
function absorbUnknownIds(ids: string[]): void {
  const known = new Set([...layout.ungrouped, ...layout.groups.flatMap(g => g.members)]);
  let changed = false;
  for (const id of ids) {
    if (!known.has(id)) {
      layout.ungrouped.push(id);
      changed = true;
    }
  }
  if (changed) saveLayout(layout);
}

/** Which container holds a character (or null if nowhere). */
function findContainer(id: string): MasterGroup | null {
  if (layout.ungrouped.includes(id)) return null;
  return layout.groups.find(g => g.members.includes(id)) ?? null;
}

function membersOf(container: MasterGroup | null): string[] {
  return container ? container.members : layout.ungrouped;
}

/** Moves a character into a container at `index` (dropIndex already
    excludes the dragged row). Same-container drops reorder; others
    move. Persists and repaints. */
function moveCharacter(id: string, groupId: string | null, index: number): void {
  const from = findContainer(id);
  const to = layout.groups.find(g => g.id === groupId) ?? null;
  if ((from?.id ?? null) === (to?.id ?? null)) {
    // Same container: reorder. The current list still contains the
    // dragged row; `index` counts rows WITHOUT it.
    const list = membersOf(from);
    const oldIndex = list.indexOf(id);
    const target = Math.max(0, Math.min(index, list.length - 1));
    if (oldIndex === -1 || target === oldIndex) return;
    list.splice(oldIndex, 1);
    list.splice(target, 0, id);
  } else {
    // Cross-container move: remove from source, insert in target.
    const source = membersOf(from);
    const oldIndex = source.indexOf(id);
    if (oldIndex >= 0) source.splice(oldIndex, 1);
    const targetList = membersOf(to);
    const target = Math.max(0, Math.min(index, targetList.length));
    targetList.splice(target, 0, id);
  }
  saveLayout(layout);
  onRowsCb?.(getRows());
}

/** ▲/▼ alternative: move one slot within its own container. */
function moveRelative(id: string, delta: number): void {
  const container = findContainer(id);
  const list = membersOf(container);
  const index = list.indexOf(id);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= list.length) return;
  list.splice(index, 1);
  list.splice(target, 0, id);
  saveLayout(layout);
  onRowsCb?.(getRows());
}

function toggleMinimized(id: string): void {
  const index = layout.minimized.indexOf(id);
  if (index >= 0) layout.minimized.splice(index, 1);
  else layout.minimized.push(id);
  saveLayout(layout);
  onRowsCb?.(getRows());
}

function createGroup(): void {
  const name = window.prompt('Nombre del grupo', '')?.trim();
  if (!name) return;
  layout.groups.push({ id: newGroupId(), name, members: [] });
  saveLayout(layout);
  onRowsCb?.(getRows());
}

function renameGroup(groupId: string): void {
  const group = layout.groups.find(g => g.id === groupId);
  if (!group) return;
  const name = window.prompt('Nombre del grupo', group.name)?.trim();
  if (!name || name === group.name) return;
  group.name = name;
  saveLayout(layout);
  onRowsCb?.(getRows());
}

/** Deletes the group; its members return to "Sin grupo". */
function deleteGroup(groupId: string): void {
  const index = layout.groups.findIndex(g => g.id === groupId);
  if (index === -1) return;
  const [group] = layout.groups.splice(index, 1);
  layout.ungrouped.push(...group.members);
  saveLayout(layout);
  onRowsCb?.(getRows());
}

/** Insertion index among the container's rows from the pointer Y
    (rows are compared by vertical midpoint; the dragged row is
    excluded so same-container moves need no offset fix-up). */
function dropIndex(container: HTMLElement, clientY: number): number {
  const rows = Array.from(container.querySelectorAll<HTMLElement>('.master-row:not(.dragging)'));
  let index = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const rect = rows[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      index = i;
      break;
    }
  }
  return index;
}

// --- Rendering ---------------------------------------------------------

/** The "Sin grupo" container first, then each group in order. */
function renderContainers(rows: Record<string, MasterRow>): string {
  const ungroupedHtml = groupHtml(null, 'Sin grupo', layout.ungrouped, rows);
  const groupsHtml = layout.groups
    .map(g => groupHtml(g.id, escapeHtml(g.name), g.members, rows))
    .join('');
  return ungroupedHtml + groupsHtml;
}

function groupHtml(
  groupId: string | null,
  title: string,
  members: string[],
  rows: Record<string, MasterRow>,
): string {
  const count = members.length;
  const tools = groupId
    ? `
      <button type="button" class="step m-group-btn" data-act="group-rename" data-value="${groupId}" aria-label="Renombrar grupo ${title}">✎</button>
      <button type="button" class="step m-group-btn" data-act="group-delete" data-value="${groupId}" aria-label="Eliminar grupo ${title} (sus filas van a Sin grupo)">×</button>`
    : '';
  const body = members.length
    ? members.map(id => rows[id] ? rowHtml(rows[id]) : '').join('')
    : `<p class="dim dense m-group-empty">Arrastra filas aquí</p>`;
  return `
  <section class="card master-group" data-group="${groupId ?? ''}" aria-label="${title}">
    <div class="master-group-head">
      <span class="m-group-name">${title}</span>
      <span class="dim dense">${count}</span>
      ${tools}
    </div>
    <div class="master-group-body">${body}</div>
  </section>`;
}

/** One stepper pair (−delta / +delta) for a counter. `value`
    disambiguates the act when needed (spell level, trait id). */
function steps(id: string, act: string, deltas: number[], label: (d: number) => string, value = ''): string {
  return deltas
    .map(d => {
      const key = `${id}:${act}:${value}:${d}`;
      return `<button type="button" class="step m-step" data-act="${act}" data-delta="${d}"${value ? ` data-value="${value}"` : ''} data-focus-key="${key}" aria-label="${label(d)}">${d > 0 ? `+${d}` : d}</button>`;
    })
    .join('');
}

function statusBadge(row: MasterRow): string {
  if (row.status === 'pending') return `<span class="m-status pending" role="status">enviando…</span>`;
  if (row.status === 'error') {
    return `<button type="button" class="chip m-status error" data-act="retry" data-focus-key="${row.characterId}:retry" aria-label="Reintentar envío de ${escapeHtml(row.characterId)}">⚠ error · reintentar</button>`;
  }
  return '';
}

function rowHtml(row: MasterRow): string {
  const doc = getCharacterDoc(row.characterId);
  const name = escapeHtml(doc?.identity.name ?? row.characterId);
  const meta = doc ? `${escapeHtml(doc.identity.class)} · nivel ${doc.identity.level}` : '';
  const state = row.state;
  const min = layout.minimized.includes(row.characterId);

  const body = !state
    ? `<p class="dim">${row.status === 'error' ? 'error de carga — usa Refrescar' : 'sin sesión iniciada'}</p>`
    : `
    <div class="m-counters">
      <span class="m-counter">
        <span class="m-label">PG</span>
        <span class="m-value">${state.hp.current}<span class="den">/${doc?.combat.maxHitPoints ?? '?'}</span></span>
        ${steps(row.characterId, 'hp', [-10, -1, 1, 10], d => `PG ${d > 0 ? '+' : ''}${d}`)}
      </span>
      <span class="m-counter">
        <span class="m-label">Temp</span>
        <span class="m-value">${state.hp.temp}</span>
        ${steps(row.characterId, 'hp-temp', [-1, 1], d => `PG temporales ${d > 0 ? '+' : ''}${d}`)}
      </span>
      <span class="m-counter">
        <span class="m-label">Dados</span>
        <span class="m-value">${state.hitDice.used}<span class="den">/${doc?.combat.hitDice.total ?? '?'}</span></span>
        ${steps(row.characterId, 'hit-dice', [-1, 1], d => `Dados de golpe ${d > 0 ? '+' : ''}${d}`)}
      </span>
      ${slotsHtml(row, doc)}
      ${cdHtml(row, doc)}
      <span class="m-counter">
        <span class="m-label">Muerte</span>
        <span class="m-value m-death"><span class="ok">✔ ${state.deathSaves.successes}</span> <span class="danger">✖ ${state.deathSaves.failures}</span></span>
        ${steps(row.characterId, 'death-succ', [-1, 1], d => `Éxitos de muerte ${d > 0 ? '+' : ''}${d}`)}
        ${steps(row.characterId, 'death-fail', [-1, 1], d => `Fracasos de muerte ${d > 0 ? '+' : ''}${d}`)}
      </span>
      <span class="m-counter">
        <span class="m-label">Inspiración</span>
        <button type="button" class="chip ${state.inspiration ? 'active' : ''}" data-act="inspiration" data-focus-key="${row.characterId}:insp" aria-pressed="${state.inspiration}" aria-label="Alternar inspiración">${state.inspiration ? '✦ activa' : '✦ no'}</button>
      </span>
      ${resourcesHtml(row, doc)}
    </div>
    <div class="m-cond-chips" aria-label="Condiciones activas">
      ${CONDITION_CATALOG.map(c => conditionChip(row.characterId, c, state.conditions.includes(c))).join('')}
    </div>`;

  return `
  <div class="card master-row ${row.status}${min ? ' minimized' : ''}" data-char="${row.characterId}" draggable="true">
    <div class="master-row-head">
      <button type="button" class="step m-min" data-act="minimize" data-focus-key="${row.characterId}:min" aria-expanded="${!min}" aria-label="${min ? 'Maximizar' : 'Minimizar'} fila de ${name}">${min ? '▸' : '▾'}</button>
      <span class="appbar-name">${name}</span>
      <span class="dim dense">${meta}</span>
      <span class="m-tools">
        ${groupSelect(row.characterId)}
        <button type="button" class="step m-step" data-act="order" data-delta="-1" data-focus-key="${row.characterId}:order:-1" aria-label="Subir fila de ${name}">▲</button>
        <button type="button" class="step m-step" data-act="order" data-delta="1" data-focus-key="${row.characterId}:order:1" aria-label="Bajar fila de ${name}">▼</button>
      </span>
      ${statusBadge(row)}
    </div>
    <div class="master-row-data"${min ? ' hidden' : ''}>${body}</div>
  </div>`;
}

/** The group <select> of one row (button alternative to drag). */
function groupSelect(id: string): string {
  const container = findContainer(id);
  const options = [
    `<option value=""${container === null ? ' selected' : ''}>Sin grupo</option>`,
    ...layout.groups.map(g => `<option value="${g.id}"${container?.id === g.id ? ' selected' : ''}>${escapeHtml(g.name)}</option>`),
  ];
  return `<select class="m-group-select" data-focus-key="${id}:group" aria-label="Grupo de ${escapeHtml(id)}">${options.join('')}</select>`;
}

function conditionChip(id: string, condition: string, on: boolean): string {
  const key = `${id}:condition:${condition}`;
  return `<button type="button" class="chip m-cond ${on ? 'active' : ''}" data-act="condition" data-value="${condition}" data-focus-key="${key}" aria-pressed="${on}">${escapeHtml(condition)}</button>`;
}

/** Slot steppers: only levels the character actually has (max > 0). */
function slotsHtml(row: MasterRow, doc: ReturnType<typeof getCharacterDoc>): string {
  if (!doc) return '';
  const levels = ([1, 2, 3] as SpellLevel[]).filter(l => doc.spells.slotsMax[l] > 0);
  if (levels.length === 0) return '';
  return levels
    .map(l => {
      const used = row.state?.spellSlotsUsed[l] ?? 0;
      return `
      <span class="m-counter">
        <span class="m-label">Nv ${l}</span>
        <span class="m-value">${used}<span class="den">/${doc.spells.slotsMax[l]}</span></span>
        ${steps(row.characterId, 'slot', [-1, 1], d => `Espacios de nivel ${l} ${d > 0 ? '+' : ''}${d}`, String(l))}
      </span>`;
    })
    .join('');
}

/** Channel Divinity: casters only (decision "CD ±1 para casters"). */
function cdHtml(row: MasterRow, doc: ReturnType<typeof getCharacterDoc>): string {
  if (!doc) return '';
  const isCaster = !doc.hiddenBlocks?.includes('spells');
  if (!isCaster) return '';
  const used = row.state?.channelDivinity.used ?? 0;
  return `
  <span class="m-counter">
    <span class="m-label">CD</span>
    <span class="m-value">${used}<span class="den">/2</span></span>
    ${steps(row.characterId, 'channel', [-1, 1], d => `Canalizar divinidad ${d > 0 ? '+' : ''}${d}`)}
  </span>`;
}

/** Trait resources with authored `uses` (amendment D-38): ±1 each. */
function resourcesHtml(row: MasterRow, doc: ReturnType<typeof getCharacterDoc>): string {
  if (!doc) return '';
  const activable = doc.traits.filter(t => t.uses !== undefined && t.uses > 0);
  if (activable.length === 0) return '';
  return activable
    .map(trait => {
      const used = row.state?.resourcesUsed[trait.id] ?? 0;
      return `
      <span class="m-counter">
        <span class="m-label">${escapeHtml(trait.name)}</span>
        <span class="m-value">${used}<span class="den">/${trait.uses}</span></span>
        ${steps(row.characterId, 'resource', [-1, 1], d => `${trait.name} ${d > 0 ? '+' : ''}${d}`, trait.id)}
      </span>`;
    })
    .join('');
}
