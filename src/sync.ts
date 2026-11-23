/* ============================================================
   FichaSS — client sync layer (Fase 15b/c, D-55).

   LOCAL-FIRST: localStorage stays the immediate source (the UX of
   the sheet never changes). Local mutations (patchSession, reset…
   via onSessionChange) are batched with a TRAILING debounce
   (~1.5 s after the LAST change — review qwen4-max: it was a
   fixed-window throttle before) and sent as ONE PATCH to the
   session API; failures schedule retries; a 409 conflict PAUSES
   the sync (flush refuses to run) until the user resolves the
   toast explicitly (Fase 15c — no silent remote-wins). The
   initial load prefers the REMOTE state when the API has one
   (local is the fallback if the network fails).

   The API endpoint is discovered from /session-url.json (published
   by the pipeline next to the site); missing/unreachable → the
   layer is DISABLED and everything keeps working as before.

   No DOM: statuses and remote states are reported through
   callbacks. fetch is injectable for tests (setSyncFetch).
   ============================================================ */

import type { SessionState } from './types';

export type SyncStatus = 'disabled' | 'synced' | 'pending' | 'error';

export interface SyncCallbacks {
  onStatus(status: SyncStatus): void;
  /** A remote state arrived (raw JSON from the API): the caller
      applies it via session.applyRemoteState (which sanitizes with
      the character and re-renders). */
  onRemoteState(state: unknown): void;
  /** A 409 conflict: the API returned the remote state while there
      were unconfirmed local changes. The sync PAUSES (no automatic
      retries) until the caller resolves via resolveLoadRemote() or
      resolveOverwriteLocal() (Fase 15c: explicit user choice). */
  onConflict?(conflict: { remoteState: unknown; remoteVersion: number; localState: SessionState }): void;
}

const DEBOUNCE_MS = 1500;
const RETRY_MS = 5000;

let fetchImpl: typeof globalThis.fetch = (input, init) => fetch(input, init);
export function setSyncFetch(impl: typeof globalThis.fetch): void {
  fetchImpl = impl;
}

let urlCache: Promise<string | null> | null = null;
let status: SyncStatus = 'disabled';
let callbacks: SyncCallbacks | null = null;
let characterId: string | null = null;
/** Optimistic version per character (the server's truth). */
const versions: Record<string, number> = {};
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** Latest local snapshot not yet confirmed by the server. */
let pendingState: SessionState | null = null;
let inFlight = false;
/** Open conflict (Fase 15c): while set, the sync is PAUSED — no
    debounced flushes (they would 409 again). The view resolves it
    via resolveLoadRemote / resolveOverwriteLocal. */
let openConflict: { remoteState: unknown; remoteVersion: number } | null = null;

function setStatus(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  callbacks?.onStatus(next);
}

/** Discovers the session API URL from session-url.json (site root,
    published by the pipeline). Cached for the whole page life —
    a failure at load keeps the layer DISABLED until reload (by
    design, grácil; known behavior for long sessions). */
function discoverUrl(): Promise<string | null> {
  if (!urlCache) {
    urlCache = fetchImpl('session-url.json', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { url?: string } | null) => body?.url?.replace(/\/+$/, '') ?? null)
      .catch(() => null);
  }
  return urlCache;
}

/** Bootstraps the sync for one character: discovers the endpoint,
    GETs the remote session and reports it (remote wins on load,
    D-55). 404 = no remote session yet (fresh). Any failure →
    local fallback (error status). */
export async function initSync(id: string, callbacksIn: SyncCallbacks): Promise<void> {
  // (review major, Fase 15c): navigating away with an open conflict
  // toast must NOT leave the sync dead for the next character —
  // clear the paused conflict, pending snapshot and timers.
  openConflict = null;
  pendingState = null;
  inFlight = false;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  characterId = id;
  callbacks = callbacksIn;
  setStatus('pending');
  const url = await discoverUrl();
  if (!url) {
    setStatus('disabled');
    return;
  }
  try {
    const response = await fetchImpl(
      `${url}/session?characterId=${encodeURIComponent(id)}`,
      { cache: 'no-store' },
    );
    if (response.status === 200) {
      const body = (await response.json()) as { state: unknown; version: number };
      versions[id] = body.version;
      setStatus('synced');
      callbacksIn.onRemoteState(body.state);
    } else if (response.status === 404) {
      // No remote session yet: the local one will be PATCHed on the
      // first change (baseVersion 0).
      versions[id] = 0;
      setStatus('synced');
    } else {
      setStatus('error');
    }
  } catch {
    setStatus('error');
  }
}

/** Re-arms the TRAILING debounce (~1.5 s after the last notify —
    review qwen4-max: the old arm-if-unset was a throttle, not a
    debounce). */
function schedule(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, DEBOUNCE_MS);
}

/** Called by the view for EVERY local mutation (onSessionChange).
    TRAILING debounce (resets the timer — fires 1.5 s after the
    LAST change). While a conflict is open the sync is PAUSED: the
    snapshot is kept (the resolution uses the latest one) but
    nothing is sent. */
export function notifyLocalChange(state: SessionState): void {
  if (status === 'disabled' || !characterId) return;
  // A snapshot of another character (stale view during navigation)
  // is dropped — its older changes were already flushed.
  if (state.characterId !== characterId) return;
  pendingState = state;
  if (openConflict) return; // paused: resolution first
  setStatus('pending');
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  schedule();
}

async function flush(): Promise<void> {
  // (review qwen4-max): a debounce timer armed BEFORE the 409 must
  // not fire during the pause — flush refuses while a conflict is
  // open (the resolution re-schedules).
  if (inFlight || openConflict || !pendingState || !characterId) return;
  inFlight = true;
  // (review minor, Fase 15c): the PATCH travels with the SNAPSHOT's
  // own characterId — a fast navigation A→B must not send A's
  // snapshot against B's character (backend would 400).
  const id = (pendingState as SessionState).characterId ?? characterId;
  const snapshot = pendingState;
  const url = await discoverUrl();
  if (!url) {
    inFlight = false;
    setStatus('disabled');
    return;
  }
  try {
    const response = await fetchImpl(`${url}/session`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterId: id, state: snapshot, baseVersion: versions[id] ?? 0 }),
    });
    if (response.status === 200) {
      const body = (await response.json()) as { version: number };
      versions[id] = body.version;
      if (pendingState === snapshot) pendingState = null;
      setStatus('synced');
    } else if (response.status === 409) {
      // Conflict (Fase 15c): PAUSE and let the user choose — the
      // silent remote-wins of 15b is replaced by an explicit toast.
      const body = (await response.json()) as { state: unknown; version?: number };
      if (body.state) {
        openConflict = { remoteState: body.state, remoteVersion: body.version ?? 0 };
        setStatus('error'); // red dot, steady: attention required
        callbacks?.onConflict?.({
          remoteState: openConflict.remoteState,
          remoteVersion: openConflict.remoteVersion,
          localState: pendingState ?? snapshot,
        });
      } else {
        // 409 WITHOUT remote state (item vanished): re-base from zero
        // so the retry creates the item instead of looping blind
        // (review minor, Fase 15c).
        versions[id] = 0;
        setStatus('error');
        scheduleRetry();
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    setStatus('error');
    scheduleRetry();
  } finally {
    inFlight = false;
  }
  // Changes that arrived while the PATCH was in flight → next batch.
  // While a CONFLICT is open the sync is paused: nothing reschedules.
  if (pendingState && !openConflict && debounceTimer === null) schedule();
}

function scheduleRetry(): void {
  if (retryTimer !== null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    const retryState = pendingState ?? getSessionSnapshot();
    if (retryState) notifyLocalChange(retryState);
  }, RETRY_MS);
}

/** The current session snapshot — set by the view wiring (session
    context), used when a retry has no pending snapshot. */
let snapshotProvider: (() => SessionState | null) | null = null;
export function setSnapshotProvider(provider: () => SessionState | null): void {
  snapshotProvider = provider;
}
function getSessionSnapshot(): SessionState | null {
  return snapshotProvider ? snapshotProvider() : null;
}

/** Conflict resolution (Fase 15c): apply the REMOTE state (the
    local unconfirmed changes are discarded). */
export function resolveLoadRemote(): void {
  if (!openConflict || !characterId) return;
  const id = characterId;
  versions[id] = openConflict.remoteVersion;
  const remote = openConflict.remoteState;
  pendingState = null;
  openConflict = null;
  setStatus('synced');
  callbacks?.onRemoteState(remote);
}

/** Conflict resolution (Fase 15c): overwrite with the LOCAL state —
    PATCHed using the remote version as base (the local edits win).
    Uses the LATEST snapshot (edits made while the toast was open
    are included). A new 409 reopens the conflict. */
export async function resolveOverwriteLocal(): Promise<void> {
  if (!openConflict || !characterId) return;
  const id = characterId;
  const base = openConflict.remoteVersion;
  const state = snapshotProvider?.() ?? pendingState;
  openConflict = null;
  if (!state) {
    resolveLoadRemote();
    return;
  }
  const url = await discoverUrl();
  if (!url) {
    setStatus('disabled');
    return;
  }
  setStatus('pending');
  inFlight = true; // (review qwen4-max): block concurrent flushes during the overwrite
  try {
    const response = await fetchImpl(`${url}/session`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterId: id, state, baseVersion: base }),
    });
    if (response.status === 200) {
      const body = (await response.json()) as { version: number };
      versions[id] = body.version;
      pendingState = null;
      setStatus('synced');
    } else {
      // A new conflict (someone wrote again) or a server error: the
      // flow re-enters through the same paths.
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    setStatus('error');
    scheduleRetry();
  } finally {
    inFlight = false;
  }
  // Edits made during the overwrite → next batch.
  if (pendingState && !openConflict && debounceTimer === null) schedule();
}

/** Test helper: clears all module state (timers, caches, versions). */
export function resetSyncStateForTests(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  if (retryTimer !== null) clearTimeout(retryTimer);
  debounceTimer = null;
  retryTimer = null;
  pendingState = null;
  inFlight = false;
  characterId = null;
  callbacks = null;
  status = 'disabled';
  urlCache = null;
  for (const key of Object.keys(versions)) delete versions[key];
}
