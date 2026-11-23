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
import { DEATH_SAVE_MAX } from '../session-schema';
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
let layout: MasterLayout = { groups: [], ungrouped: [], minimized: [], containerOrder: [''] };
/** Row ids with the conditions box EXPANDED (transient UI state —
    the header line already shows the active ones when collapsed). */
const condBoxes = new Set<string>();

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
      case 'cond-box': {
        if (condBoxes.has(id)) condBoxes.delete(id);
        else condBoxes.add(id);
        onRowsCb?.(getRows());
        return;
      }
      case 'order': moveRelative(id, delta); return;
      case 'group-order': moveContainerRelative(value, delta); return;
      case 'group-rename': renameGroup(value); return;
      case 'group-delete': deleteGroup(value); return;
      case 'death-set': {
        const row = getRows()[id];
        if (!row?.state) return;
        const kind = value === 'success' ? 'successes' : 'failures';
        const current = row.state.deathSaves[kind];
        const applied = Number(target.dataset.set ?? current);
        const d: { successes?: number; failures?: number } = {};
        d[kind] = applied - current;
        op = d.successes || d.failures ? { deathSaves: d } : null;
        break;
      }
      default: return;
    }
    if (op && id) editCharacter(id, op);
  };

  /** Group <select> change: move the row to the chosen container
      (the accessible alternative to drag & drop, C7). */
  const onChange = (event: Event): void => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>('.m-group-select');
    const rowEl = select?.closest<HTMLElement>('.master-row');
    const id = rowEl?.dataset.char;
    if (!select || !id) return;
    moveCharacter(id, select.value || null, Number.MAX_SAFE_INTEGER);
  };

  // --- Drag & drop (C4): rows AND group heads are draggable; groups
  // are drop targets. dropTarget/dropGroupTarget are recomputed on
  // every dragover.
  let dragId: string | null = null;
  let dragGroupId: string | null = null;
  let draggingGroup = false;
  let dropTarget: { group: string | null; index: number } | null = null;
  let dropGroupTarget: string | null = null;

  const onDragStart = (event: DragEvent): void => {
    const head = (event.target as HTMLElement).closest<HTMLElement>('.master-group-head');
    if (head) {
      draggingGroup = true;
      dragGroupId = head.closest<HTMLElement>('.master-group')?.dataset.group ?? null;
      head.classList.add('dragging');
      event.dataTransfer?.setData('text/plain', `group:${dragGroupId ?? ''}`);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      return;
    }
    const row = (event.target as HTMLElement).closest<HTMLElement>('.master-row');
    if (!row) return;
    draggingGroup = false;
    dragId = row.dataset.char ?? null;
    row.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', dragId ?? '');
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = (): void => {
    dragId = null;
    dragGroupId = null;
    draggingGroup = false;
    dropTarget = null;
    dropGroupTarget = null;
    rowsEl?.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    rowsEl?.querySelectorAll('.drop-ok').forEach(el => el.classList.remove('drop-ok'));
  };

  const onDragOver = (event: DragEvent): void => {
    const group = (event.target as HTMLElement).closest<HTMLElement>('.master-group');
    if (!group) return;
    const groupId = group.dataset.group || null;
    if (draggingGroup) {
      if (dragGroupId === null || dragGroupId === groupId) return; // onto itself / none
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      rowsEl?.querySelectorAll('.drop-ok').forEach(el => el.classList.remove('drop-ok'));
      group.classList.add('drop-ok');
      dropGroupTarget = groupId;
      return;
    }
    if (!dragId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    rowsEl?.querySelectorAll('.drop-ok').forEach(el => el.classList.remove('drop-ok'));
    group.classList.add('drop-ok');
    dropTarget = { group: groupId, index: dropIndex(group, event.clientY) };
  };

  const onDrop = (event: DragEvent): void => {
    const group = (event.target as HTMLElement).closest<HTMLElement>('.master-group');
    if (!group) return;
    if (draggingGroup) {
      if (dragGroupId !== null && dropGroupTarget !== null) {
        event.preventDefault();
        moveGroupBefore(dragGroupId, dropGroupTarget);
      }
      onDragEnd();
      return;
    }
    if (!dragId || !dropTarget) return;
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

/** ▲/▼ on a group head: move the CONTAINER one slot in the display
    order (works for "Sin grupo" too). */
function moveContainerRelative(groupId: string, delta: number): void {
  const order = layout.containerOrder;
  const index = order.indexOf(groupId);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= order.length) return;
  order.splice(index, 1);
  order.splice(target, 0, groupId);
  saveLayout(layout);
  onRowsCb?.(getRows());
}

/** Drops a dragged group head onto another container: the dragged
    container takes the target's position (target shifts down). */
function moveGroupBefore(dragGroupId: string, targetGroupId: string | null): void {
  if (dragGroupId === targetGroupId) return;
  const order = layout.containerOrder;
  const from = order.indexOf(dragGroupId);
  if (from === -1 || !order.includes(targetGroupId ?? '')) return;
  order.splice(from, 1);
  order.splice(order.indexOf(targetGroupId ?? ''), 0, dragGroupId);
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

/** Containers in the master's display order ('' = "Sin grupo"). */
function renderContainers(rows: Record<string, MasterRow>): string {
  const byId = new Map(layout.groups.map(g => [g.id, g]));
  return layout.containerOrder
    .map(id => {
      if (id === '') return groupHtml(null, 'Sin grupo', layout.ungrouped, rows);
      const group = byId.get(id);
      return group ? groupHtml(group.id, escapeHtml(group.name), group.members, rows) : '';
    })
    .join('');
}

function groupHtml(
  groupId: string | null,
  title: string,
  members: string[],
  rows: Record<string, MasterRow>,
): string {
  const count = members.length;
  const id = groupId ?? '';
  const label = escapeHtml(title);
  const orderButtons = `
      <button type="button" class="step m-group-btn" data-act="group-order" data-value="${id}" data-delta="-1" data-focus-key="order:${id}:-1" aria-label="Subir el grupo ${label}">▲</button>
      <button type="button" class="step m-group-btn" data-act="group-order" data-value="${id}" data-delta="1" data-focus-key="order:${id}:1" aria-label="Bajar el grupo ${label}">▼</button>`;
  const tools = groupId
    ? `${orderButtons}
      <button type="button" class="step m-group-btn" data-act="group-rename" data-value="${groupId}" data-focus-key="rename:${groupId}" aria-label="Renombrar grupo ${label}">✎</button>
      <button type="button" class="step m-group-btn" data-act="group-delete" data-value="${groupId}" data-focus-key="del:${groupId}" aria-label="Eliminar grupo ${label} (sus filas van a Sin grupo)">×</button>`
    : orderButtons;
  const body = members.length
    ? members.map(id => rows[id] ? rowHtml(rows[id]) : '').join('')
    : `<p class="dim dense m-group-empty">Arrastra filas aquí</p>`;
  return `
  <section class="card master-group" data-group="${id}" aria-label="${title}">
    <div class="master-group-head" draggable="true">
      <span class="m-group-name">${title}</span>
      <span class="dim dense">${count}</span>
      <span class="m-tools">${tools}</span>
    </div>
    <div class="master-group-body">${body}</div>
  </section>`;
}

/** One stepper pair for a counter. ±1 buttons collapse to −/+;
    other deltas keep their number (−10/+10). */
function steps(id: string, act: string, deltas: number[], label: (d: number) => string, value = ''): string {
  return deltas
    .map(d => {
      const key = `${id}:${act}:${value}:${d}`;
      const text = Math.abs(d) === 1 ? (d > 0 ? '+' : '−') : `${d > 0 ? '+' : '−'}${Math.abs(d)}`;
      return `<button type="button" class="step m-step" data-act="${act}" data-delta="${d}"${value ? ` data-value="${value}"` : ''} data-focus-key="${key}" aria-label="${label(d)}">${text}</button>`;
    })
    .join('');
}

function statusBadge(row: MasterRow): string {
  if (row.status === 'pending') return `<span class="m-status pending" role="status">enviando…</span>`;
  if (row.status === 'error') {
    return `<button type="button" class="chip m-status error" data-act="retry" data-focus-key="${row.characterId}:retry" aria-label="Reintentar envío de ${escapeHtml(row.characterId)}">⚠ error · reintentar</button>`;
  }
  // C6: "actualizado hace Xs" (repaints at least every poll cycle).
  const ago = row.lastFetchedAt === null ? '' : ` · hace ${Math.max(0, Math.round((Date.now() - row.lastFetchedAt) / 1000))}s`;
  return `<span class="m-status" role="status">sincronizado${ago}</span>`;
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
      <span class="m-counter m-deathbox">
        <span class="m-label">Muerte</span>
        <span class="m-deathrows">
          <span class="dot-row"><span class="dense dim">Éxitos</span><span class="dots">${deathDots(row.characterId, 'success', state.deathSaves.successes)}</span></span>
          <span class="dot-row"><span class="dense dim">Fracasos</span><span class="dots">${deathDots(row.characterId, 'failure', state.deathSaves.failures)}</span></span>
        </span>
      </span>
      <span class="m-counter">
        <span class="m-label">Inspiración</span>
        <button type="button" class="chip ${state.inspiration ? 'active' : ''}" data-act="inspiration" data-focus-key="${row.characterId}:insp" aria-pressed="${state.inspiration}" aria-label="Alternar inspiración">${state.inspiration ? '✦ activa' : '✦ no'}</button>
      </span>
      ${resourcesHtml(row, doc)}
    </div>
    <div class="m-cond-box">
      <button type="button" class="m-cond-toggle" data-act="cond-box" data-focus-key="${row.characterId}:condbox" aria-expanded="${condBoxes.has(row.characterId)}" aria-label="Estados alterados de ${name}">
        <span aria-hidden="true">${condBoxes.has(row.characterId) ? '▾' : '▸'}</span>
        Estados alterados (${state.conditions.length})
        ${state.conditions.length ? `<span class="m-cond-active">${escapeHtml(state.conditions.join(', '))}</span>` : '<span class="dim dense">ninguno</span>'}
      </button>
      <div class="m-cond-chips" aria-label="Condiciones activas"${condBoxes.has(row.characterId) ? '' : ' hidden'}>
        ${CONDITION_CATALOG.map(c => conditionChip(row.characterId, c, state.conditions.includes(c))).join('')}
      </div>
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

/** Death-save dots, EXACTLY as the player's sheet renders them
    (blocks.ts): clicking a dot marks up to it; clicking the LAST
    active dot unmarks it. The master applies the movement as a
    relative delta (editCharacter). */
function deathDots(id: string, kind: 'success' | 'failure', filled: number): string {
  const onClass = kind === 'success' ? 'on-ok' : 'on-bad';
  const noun = kind === 'success' ? 'éxito' : 'fracaso';
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
    const key = `${id}:death:${kind}:${count}`;
    return `<button type="button" class="dot${active ? ` ${onClass}` : ''}" data-act="death-set" data-value="${kind}" data-set="${value}" data-focus-key="${key}" aria-pressed="${active}" aria-label="${label}"></button>`;
  }).join('');
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
