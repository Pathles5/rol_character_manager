/* ============================================================
   FichaSS — master layout (Fase 16, D-58; remote since D-59).

   UI state of the MASTER view: group composition and row order,
   which rows are minimized, and the editable/read-only toggle
   (Fase 18, D-66). PERSISTED IN THE SESSIONS TABLE
   under the reserved MASTER_LAYOUT_ID (user request, QA
   2026-11-23 — same API, same optimistic locking as sessions):
   the master's layout survives devices. localStorage stays as
   cache and offline fallback (seeded to remote on first save).

   Invariants (sanitizeMasterLayout, shared contract): every
   character id appears AT MOST ONCE across `ungrouped` + all
   `groups[].members`; `minimized` is a subset of known ids.
   ============================================================ */

import { MASTER_LAYOUT_ID, sanitizeMasterLayout, type MasterLayoutData } from './session-schema';

export interface MasterGroup {
  id: string;
  name: string;
  members: string[];
}

export type MasterLayout = MasterLayoutData;

const KEY = 'fichass-master-layout-v2';

/** Legacy/local normalization: pure sanitize with empty fallback
    (editable ON by default, Fase 18 D-66). */
export function normalizeLayout(raw: unknown): MasterLayout {
  return sanitizeMasterLayout(raw) ?? { groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true };
}

export function loadLayout(): MasterLayout {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeLayout(JSON.parse(raw)) : { groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true };
  } catch {
    return { groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true };
  }
}

export function saveLayout(layout: MasterLayout): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable: layout lives for the session only.
  }
}

/** Fresh group id (no crypto dependency needed). */
export function newGroupId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// --- Remote persistence (D-59): the layout lives in the sessions
// table under MASTER_LAYOUT_ID; localStorage is the cache/fallback.

let layoutVersion = 0;

/** Loads the layout from the session API. Returns null on 404
    (nothing stored yet) and THROWS on network/API failure (the
    caller falls back to the local cache). */
export async function fetchLayout(apiUrl: string): Promise<MasterLayout | null> {
  const response = await fetch(`${apiUrl}/session?characterId=${MASTER_LAYOUT_ID}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`layout GET → HTTP ${response.status}`);
  const body = (await response.json()) as { layout?: unknown; version?: number };
  layoutVersion = typeof body.version === 'number' && Number.isInteger(body.version) ? body.version : 0;
  return sanitizeMasterLayout(body.layout);
}

/** Persists the layout to the session API (optimistic version).
    On 409 the fresh version is taken and the SAME layout is saved
    once more — layout is absolute UI state, so between two masters
    the last write wins (sessions themselves never clobber: D-55).
    Returns false on failure (the caller keeps the local cache).
    Calls are SERIALIZED (review minor): two rapid persists would
    otherwise race with the same base version and the older layout
    could overwrite the newer one after a re-base. */
let saveQueue: Promise<boolean> = Promise.resolve(false);

export function saveLayoutRemote(apiUrl: string, layout: MasterLayout): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    try {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await fetch(`${apiUrl}/session`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ characterId: MASTER_LAYOUT_ID, layout, baseVersion: layoutVersion }),
        });
        if (response.status === 200) {
          const body = (await response.json()) as { version: number };
          layoutVersion = body.version;
          return true;
        }
        if (response.status === 409 && attempt === 1) {
          const fresh = await fetch(`${apiUrl}/session?characterId=${MASTER_LAYOUT_ID}`, { cache: 'no-store' });
          if (fresh.status === 200) {
            const body = (await fresh.json()) as { version: number };
            layoutVersion = body.version;
            continue;
          }
          if (fresh.status === 404) {
            layoutVersion = 0;
            continue;
          }
          return false;
        }
        return false;
      }
      return false;
    } catch {
      return false;
    }
  };
  saveQueue = saveQueue.then(run);
  return saveQueue;
}

/** Test helper: clears the remote version state. */
export function resetLayoutVersionForTests(): void {
  layoutVersion = 0;
}
