/* ============================================================
   FichaSS — client sync layer (Fase 15b, D-55).

   LOCAL-FIRST: localStorage stays the immediate source (the UX of
   the sheet never changes). Local mutations (patchSession, reset…
   via onSessionChange) are batched with a ~1.5 s debounce and sent
   as ONE PATCH to the session API; failures schedule retries; a
   409 conflict applies the REMOTE state (remote wins — the conflict
   toast is Phase 15c). The initial load prefers the REMOTE state
   when the API has one (local is the fallback if the network
   fails).

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

function setStatus(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  callbacks?.onStatus(next);
}

/** Discovers the session API URL from session-url.json (site root,
    published by the pipeline). Cached for the whole page life. */
function discoverUrl(): Promise<string | null> {
  if (!urlCache) {
    urlCache = fetchImpl('session-url.json', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((body: { url?: string } | null) => body?.url ?? null)
      .catch(() => null);
  }
  return urlCache;
}

/** Bootstraps the sync for one character: discovers the endpoint,
    GETs the remote session and reports it (remote wins on load,
    D-55). 404 = no remote session yet (fresh). Any failure →
    local fallback (error status). */
export async function initSync(id: string, callbacksIn: SyncCallbacks): Promise<void> {
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

/** Called by the view for EVERY local mutation (onSessionChange).
    Debounces and schedules the batched PATCH. */
export function notifyLocalChange(state: SessionState): void {
  if (status === 'disabled' || !characterId) return;
  // A snapshot of another character (stale view during navigation)
  // is dropped — its older changes were already flushed.
  if (state.characterId !== characterId) return;
  pendingState = state;
  setStatus('pending');
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  if (inFlight || !pendingState || !characterId) return;
  inFlight = true;
  const id = characterId;
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
      // Conflict (D-55): REMOTE WINS in 15b — apply the remote state
      // the API returned; the fine-grained toast is Phase 15c.
      const body = (await response.json()) as { state: unknown; version?: number };
      if (body.state) {
        versions[id] = body.version ?? versions[id] ?? 0;
        if (pendingState === snapshot) pendingState = null;
        setStatus('synced');
        callbacks?.onRemoteState(body.state);
      } else {
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
  if (pendingState && debounceTimer === null) schedule();
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
