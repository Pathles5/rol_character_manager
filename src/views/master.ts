/* ============================================================
   FichaSS — master view (Fase 16, D-58). FIRST CUT: read-only
   rows (one per character) fed by the multi-character session
   store (master-data.ts). Groups (drag & drop), minimization
   and editing arrive in the following increments.
   ============================================================ */

import { getCharacterDoc, getRows, initMasterStore, refreshAll, startPolling, stopPolling, type MasterRow } from '../master-data';
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

  const renderRows = (): void => {
    if (!rowsEl) return;
    const rows = getRows();
    const ids = Object.keys(rows);
    if (ids.length === 0) return; // still loading
    rowsEl.innerHTML = ids
      .map(id => rowHtml(rows[id]))
      .join('');
    rowsEl.setAttribute('aria-busy', 'false');
  };

  onRowsCb = renderRows;
  try {
    await initMasterStore({ onRows: rows => onRowsCb?.(rows) });
    await refreshAll();
    startPolling();
    refreshBtn?.addEventListener('click', () => void refreshAll());
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

function rowHtml(row: MasterRow): string {
  const doc = getCharacterDoc(row.characterId);
  const name = escapeHtml(doc?.identity.name ?? row.characterId);
  const meta = doc ? `${escapeHtml(doc.identity.class)} · nivel ${doc.identity.level}` : '';
  const state = row.state;
  const body = !state
    ? `<span class="dim">${row.status === 'error' ? 'error de carga' : 'sin sesión iniciada'}</span>`
    : `
      <span class="m-hp"><strong>${state.hp.current}</strong><span class="den">/${doc?.combat.maxHitPoints ?? '?'}</span> PG</span>
      <span class="m-temp">🛡 ${state.hp.temp}</span>
      <span class="m-insp ${state.inspiration ? 'on-ok' : 'dim'}">✦</span>
      <span class="m-cond dim">${state.conditions.length ? escapeHtml(state.conditions.join(', ')) : '—'}</span>
      <span class="m-sync dim">${row.status}</span>`;
  return `
  <div class="card master-row" data-char="${row.characterId}">
    <div class="master-row-head">
      <span class="appbar-name">${name}</span>
      <span class="dim dense">${meta}</span>
    </div>
    <div class="master-row-data">${body}</div>
  </div>`;
}
