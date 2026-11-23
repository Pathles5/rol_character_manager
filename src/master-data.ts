/* ============================================================
   FichaSS — master data store (Fase 16, D-58).

   Multi-character session store for the MASTER view: fetches the
   remote session of EVERY manifest character, tracks the
   optimistic version per character and applies EDITS as RELATIVE
   DELTAS over the FRESH remote state with 409-retry (the master
   never overwrites a concurrent player change — spec 16, C9).

   - Local-first per edit: the delta is applied to the optimistic
     view state immediately (clamped to the character's authored
     limits); the PATCH carries the FULL merged state; on 409 the
     row re-GETs the FRESH remote state, re-applies the pending
     DELTAS on top (relative deltas survive a concurrent player
     write) and re-PATCHes (up to 3 attempts, then the row marks
     error with manual retry).
   - The poll (every 15 s) skips characters with pending deltas
     so it never clobbers an in-flight master edit.
   - fetch is injectable for tests (setMasterFetch).
   ============================================================ */

import type { Character, SessionState, SpellLevel } from './types';
import { clampSessionToRules } from './session-schema';

export type RowStatus = 'fresh' | 'pending' | 'error';

/** A RELATIVE edit: each value is a delta over the current state
    (inspiration and condition toggles are absolute-by-nature). */
export interface DeltaOp {
  hp?: { current?: number; temp?: number };
  hitDice?: { used?: number };
  spellSlotsUsed?: Partial<Record<SpellLevel, number>>;
  channelDivinity?: { used?: number };
  deathSaves?: { successes?: number; failures?: number };
  inspiration?: boolean;
  conditions?: { toggle: string };
  resource?: { traitId: string; delta: number };
}

export interface MasterRow {
  characterId: string;
  /** Optimistic state: remote state + pending deltas applied. */
  state: SessionState | null;
  version: number;
  /** Relative deltas not yet confirmed by the server (re-applied
      on 409 over the FRESH remote state). */
  pendingOps: DeltaOp[];
  status: RowStatus;
  /** True when the API answered 404 (no remote session yet). */
  noSession: boolean;
  lastFetchedAt: number | null;
}

interface MasterCallbacks {
  onRows(rows: Record<string, MasterRow>): void;
}

let fetchImpl: typeof globalThis.fetch = (input, init) => fetch(input, init);
export function setMasterFetch(impl: typeof globalThis.fetch): void {
  fetchImpl = impl;
}

let apiUrl: string | null = null;
let characterIds: string[] = [];
/** The authored character documents (public/characters/<id>.json):
    needed client-side to clamp edited counters to the REAL rule
    limits (maxHP, hit dice, slots, trait uses) exactly like the
    player's own client does (Fase 16, C9). */
const docs: Record<string, Character> = {};
let rows: Record<string, MasterRow> = {};
let callbacks: MasterCallbacks | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export const POLL_INTERVAL_MS = 15000;

function emit(): void {
  callbacks?.onRows({ ...rows });
}

/** Discovers the API URL (same file the player sync uses), the
    manifest ids to observe and their authored documents. */
export async function initMasterStore(cb: MasterCallbacks): Promise<void> {
  callbacks = cb;
  const manifest = await fetchImpl('characters-manifest.json', { cache: 'no-store' });
  if (!manifest.ok) throw new Error('manifest');
  const body = (await manifest.json()) as { characters: { id: string }[] };
  characterIds = body.characters.map(c => c.id);
  await Promise.all(characterIds.map(async id => {
    try {
      const response = await fetchImpl(`characters/${id}.json`, { cache: 'no-store' });
      if (response.ok) docs[id] = (await response.json()) as Character;
    } catch {
      // Missing doc: the row still renders; edits to it are skipped
      // by the doc guard in editCharacter.
    }
  }));
  const meta = await fetchImpl('session-url.json', { cache: 'no-store' });
  apiUrl = meta.ok ? ((await meta.json()) as { url?: string }).url?.replace(/\/+$/, '') ?? null : null;
  if (!apiUrl) throw new Error('no session API');
}

/** Applies ONE relative delta over a state and clamps the result
    to the character's authored limits (same rules the player's
    client enforces — session-schema is the single source). */
function applyDelta(state: SessionState, op: DeltaOp, doc: Character | undefined): SessionState {
  const merged: SessionState = {
    ...state,
    hp: {
      current: state.hp.current + (op.hp?.current ?? 0),
      temp: state.hp.temp + (op.hp?.temp ?? 0),
    },
    hitDice: { used: state.hitDice.used + (op.hitDice?.used ?? 0) },
    spellSlotsUsed: {
      1: state.spellSlotsUsed[1] + (op.spellSlotsUsed?.[1] ?? 0),
      2: state.spellSlotsUsed[2] + (op.spellSlotsUsed?.[2] ?? 0),
      3: state.spellSlotsUsed[3] + (op.spellSlotsUsed?.[3] ?? 0),
    },
    channelDivinity: { used: state.channelDivinity.used + (op.channelDivinity?.used ?? 0) },
    inspiration: op.inspiration !== undefined ? op.inspiration : state.inspiration,
    deathSaves: {
      successes: state.deathSaves.successes + (op.deathSaves?.successes ?? 0),
      failures: state.deathSaves.failures + (op.deathSaves?.failures ?? 0),
    },
    conditions: op.conditions
      ? state.conditions.includes(op.conditions.toggle)
        ? state.conditions.filter((c: string) => c !== op.conditions!.toggle)
        : [...state.conditions, op.conditions.toggle]
      : [...state.conditions],
    resourcesUsed: { ...state.resourcesUsed },
  };
  if (op.resource) {
    const traitId = op.resource.traitId;
    merged.resourcesUsed[traitId] = (merged.resourcesUsed[traitId] ?? 0) + op.resource.delta;
  }
  return doc ? clampSessionToRules(merged, doc) : merged;
}

/** Fetches the remote session of EVERY character (initial load and
    poll). Characters with pending deltas are skipped (their truth
    is local until confirmed). */
export async function refreshAll(): Promise<void> {
  if (!apiUrl) return;
  await Promise.all(characterIds.map(id => refreshOne(id)));
}

async function refreshOne(id: string): Promise<void> {
  const existing = rows[id];
  if (existing && existing.pendingOps.length > 0) return; // pending deltas: skip
  try {
    const response = await fetchImpl(`${apiUrl}/session?characterId=${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (response.status === 404) {
      const pending = rows[id];
      if (pending && (pending.status === 'pending' || pending.pendingOps.length > 0)) return;
      rows[id] = {
        characterId: id,
        state: null,
        version: 0,
        pendingOps: [],
        status: 'fresh',
        noSession: true,
        lastFetchedAt: Date.now(),
      };
      emit();
      return;
    }
    if (response.status !== 200) {
      markError(id);
      return;
    }
    const body = (await response.json()) as { state: SessionState; version: number };
    const current = rows[id];
    // Review D2: responses that lost a race are DISCARDED, never
    // clobber — either the row went pending while this GET flew
    // (local truth beats the stale snapshot) or the GET started
    // before one of OUR confirmed PATCHes (older version).
    if (current && (current.status === 'pending' || current.pendingOps.length > 0 || body.version < current.version)) {
      return;
    }
    rows[id] = {
      characterId: id,
      state: body.state,
      version: body.version,
      pendingOps: [],
      status: 'fresh',
      noSession: false,
      lastFetchedAt: Date.now(),
    };
    emit();
  } catch {
    markError(id);
  }
}

function markError(id: string): void {
  const row = rows[id];
  rows[id] = {
    characterId: id,
    state: row?.state ?? null,
    version: row?.version ?? 0,
    pendingOps: row?.pendingOps ?? [],
    status: 'error',
    noSession: row?.noSession ?? false,
    lastFetchedAt: row?.lastFetchedAt ?? null,
  };
  emit();
}

/** Applies ONE delta to the row's optimistic state (clamped to the
    character's authored limits) and queues it; then flushes the
    row (PATCH with the merged state). */
export function editCharacter(id: string, op: DeltaOp): void {
  const row = rows[id];
  const doc = docs[id];
  if (!row || row.noSession || !row.state || !doc) return;
  row.pendingOps = [...row.pendingOps, op];
  row.state = applyDelta(row.state, op, doc);
  row.status = 'pending';
  emit();
  void flushRow(id);
}

/** One flush loop PER ROW (review D1): editCharacter never starts a
    second concurrent flush — the running loop picks up ops queued
    while its PATCH was in flight. On 200 only the ops INCLUDED in
    the sent state are confirmed (slice by count, not clear); the
    state sent always includes every op queued up to build time. */
const flushing = new Set<string>();

async function flushRow(id: string): Promise<void> {
  if (flushing.has(id)) return;
  flushing.add(id);
  try {
    let attempts = 0;
    for (;;) {
      const row = rows[id];
      if (!row || !row.state || row.pendingOps.length === 0 || !apiUrl) return;
      const sentCount = row.pendingOps.length;
      let response: Response;
      try {
        response = await fetchImpl(`${apiUrl}/session`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            characterId: id,
            state: row.state,
            baseVersion: row.version,
          }),
        });
      } catch {
        markError(id);
        return;
      }
      const current = rows[id];
      if (response.status === 200) {
        const body = (await response.json()) as { version: number };
        if (current) {
          current.version = body.version;
          // Only the ops baked into the sent state are confirmed;
          // ops queued while the PATCH flew stay pending.
          current.pendingOps = current.pendingOps.slice(sentCount);
          current.status = current.pendingOps.length > 0 ? 'pending' : 'fresh';
          if (current.pendingOps.length === 0) current.lastFetchedAt = Date.now();
          emit();
        }
        continue; // loop: more ops queued during the PATCH
      }
      attempts++;
      if (response.status === 409 && attempts < 3) {
        // The player wrote concurrently: re-GET the FRESH remote
        // state, re-apply OUR relative deltas on top, re-PATCH
        // (spec 16 C9 — the master never clobbers a player change).
        const fresh = await fetchImpl(`${apiUrl}/session?characterId=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        if (fresh.ok && current && current.pendingOps.length > 0) {
          const body = (await fresh.json()) as { state: SessionState; version: number };
          let merged = body.state;
          const doc = docs[id];
          for (const op of current.pendingOps) merged = applyDelta(merged, op, doc);
          current.state = merged;
          current.version = body.version;
          emit();
          continue;
        }
        markError(id);
        return;
      }
      markError(id);
      return;
    }
  } catch {
    markError(id);
  } finally {
    flushing.delete(id);
  }
}

/** Starts the 15 s poll (skips rows with pending deltas). */
export function startPolling(): void {
  if (pollTimer !== null) return;
  pollTimer = setInterval(() => {
    void refreshAll();
  }, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** The row data for the view (renderers read this, not the module
    internals). */
export function getRows(): Record<string, MasterRow> {
  return { ...rows };
}

/** Manual retry of a failed row: re-attempts the PATCH with the
    current optimistic state (a 409 triggers the fresh re-apply
    path inside flushRow). */
export function retryCharacter(id: string): void {
  void flushRow(id);
}

export function getCharacterDoc(id: string): Character | undefined {
  return docs[id];
}

/** The discovered session API URL (null before init / on failure) —
    shared with the master-layout remote persistence (D-59). */
export function getApiUrl(): string | null {
  return apiUrl;
}

/** Test helper: clears all module state. */
export function resetMasterStoreForTests(): void {
  stopPolling();
  apiUrl = null;
  characterIds = [];
  rows = {};
  callbacks = null;
  flushing.clear();
  for (const key of Object.keys(docs)) delete docs[key];
}
