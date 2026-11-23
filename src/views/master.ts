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
   Groups (drag & drop) and minimization arrive next.
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
import { CONDITION_CATALOG } from '../render/blocks';
import { escapeHtml } from '../lib/manifest';

let onRowsCb: ((rows: Record<string, MasterRow>) => void) | null = null;

export async function masterView(root: HTMLElement): Promise<void> {
  stopPolling();
  onRowsCb = null;
  root.innerHTML = `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS · Master</strong></div>
    <div class="appbar-main">
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

  /** Full re-render on every store emit; the focused control (if
      any) is restored by its data-focus-key so keyboard steering
      survives the repaint (C7). */
  const renderRows = (): void => {
    if (!rowsEl) return;
    const rows = getRows();
    const ids = Object.keys(rows);
    if (ids.length === 0) return; // still loading
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active && rowsEl.contains(active) ? active.dataset.focusKey : null;
    rowsEl.innerHTML = ids.map(id => rowHtml(rows[id])).join('');
    rowsEl.setAttribute('aria-busy', 'false');
    if (focusKey) {
      rowsEl.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
    }
  };

  /** Delegated clicks: every control carries data-act (+ optional
      data-delta / data-value); mapped to one relative DeltaOp. */
  const onClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    const rowEl = target?.closest<HTMLElement>('.master-row');
    const id = rowEl?.dataset.char;
    if (!target || !id) return;
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
      default: return;
    }
    if (op) editCharacter(id, op);
  };

  onRowsCb = renderRows;
  try {
    await initMasterStore({ onRows: rows => onRowsCb?.(rows) });
    await refreshAll();
    startPolling();
    refreshBtn?.addEventListener('click', () => void refreshAll());
    rowsEl?.addEventListener('click', onClick);
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

// --- Row rendering -----------------------------------------------------

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
  <div class="card master-row ${row.status}" data-char="${row.characterId}">
    <div class="master-row-head">
      <span class="appbar-name">${name}</span>
      <span class="dim dense">${meta}</span>
      ${statusBadge(row)}
    </div>
    <div class="master-row-data">${body}</div>
  </div>`;
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
