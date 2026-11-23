/* ============================================================
   FichaSS — sync layer tests (Fase 15b, spec C9 / D-55).
   Pure module: injectable fetch + fake timers. No jsdom.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initSync,
  notifyLocalChange,
  resetSyncStateForTests,
  resolveLoadRemote,
  resolveOverwriteLocal,
  setSyncFetch,
  type SyncStatus,
} from './sync';
import type { SessionState } from './types';

const API = 'https://api.example';

/** Minimal valid session snapshot for one character. */
function snapshot(id: string, overrides: Partial<SessionState> = {}): SessionState {
  return {
    schemaVersion: 1,
    characterId: id,
    hp: { current: 30, temp: 0 },
    hitDice: { used: 0 },
    spellSlotsUsed: { 1: 0, 2: 0, 3: 0 },
    channelDivinity: { used: 0 },
    inspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    resourcesUsed: {},
    ...overrides,
  };
}

/** Fake fetch driven by a route table (url-matcher → result). */
function makeFetch(
  routes: Array<{ match: string; respond: (url: string, init?: RequestInit) => { status: number; body?: unknown } }>,
): { fetch: typeof globalThis.fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = ((url: string | URL, init?: RequestInit) => {
    const target = String(url);
    calls.push({ url: target, init });
    const route = routes.find(entry => target.includes(entry.match));
    const result = route
      ? route.respond(target, init)
      : { status: 404 };
    return Promise.resolve(new Response(result.body ? JSON.stringify(result.body) : null, { status: result.status }));
  }) as unknown as typeof globalThis.fetch;
  return { fetch: impl, calls };
}

function urlRoutes(): Array<{ match: string; respond: () => { status: number; body: unknown } }> {
  return [{ match: 'session-url.json', respond: () => ({ status: 200, body: { url: API } }) }];
}

const statuses: SyncStatus[] = [];
function statusTracker(): { onStatus: (s: SyncStatus) => void; last: () => SyncStatus } {
  statuses.length = 0;
  return {
    onStatus: s => statuses.push(s),
    last: () => statuses[statuses.length - 1],
  };
}

const remoteStates: unknown[] = [];
function remoteTracker(): { onRemoteState: (state: unknown) => void; last: () => unknown } {
  remoteStates.length = 0;
  return {
    onRemoteState: state => remoteStates.push(state),
    last: () => remoteStates[remoteStates.length - 1],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetSyncStateForTests();
});

afterEach(() => {
  // Clears timers under FAKE timers first (a real-timer retry after
  // the teardown would fire flush() outside the test context).
  resetSyncStateForTests();
  vi.useRealTimers();
});

describe('initSync — discovery', () => {
  it('without session-url.json the layer is DISABLED and local changes are not sent', async () => {
    const { fetch, calls } = makeFetch([
      { match: 'session-url.json', respond: () => ({ status: 404 }) },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    expect(st.last()).toBe('disabled');
    notifyLocalChange(snapshot('elira'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls.filter(c => c.url.includes('/session')).length).toBe(0);
  });

  it('a discovery failure also disables the layer', async () => {
    setSyncFetch(() => Promise.reject(new Error('offline')));
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    expect(st.last()).toBe('disabled');
  });
});

describe('initSync — remote load (remote wins, D-55)', () => {
  it('reports the remote state and the version on 200', async () => {
    const remote = snapshot('elira', { hp: { current: 25, temp: 3 } });
    const { fetch } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 200, body: { state: remote, version: 4 } }) },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    const rt = remoteTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: rt.onRemoteState });
    expect(st.last()).toBe('synced');
    expect(rt.last()).toEqual(remote);
  });

  it('404 = fresh remote (no session yet), still synced', async () => {
    const { fetch } = makeFetch([...urlRoutes(), { match: '/session?', respond: () => ({ status: 404 }) }]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    expect(st.last()).toBe('synced');
  });

  it('a remote load failure falls back to LOCAL with error status', async () => {
    const { fetch } = makeFetch([
      ...urlRoutes(),
      { match: '/session?', respond: () => { throw new Error('boom'); } },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    expect(st.last()).toBe('error');
  });
});

describe('notifyLocalChange — debounce and batched PATCH', () => {
  it('sends ONE PATCH after the debounce with the latest snapshot', async () => {
    const { fetch, calls } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 404 }) },
      { match: '/session', respond: (_url, init) => {
        const body = JSON.parse(String(init?.body));
        return { status: 200, body: { version: (body.baseVersion ?? 0) + 1 } };
      } },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    notifyLocalChange(snapshot('elira', { hp: { current: 28, temp: 0 } }));
    notifyLocalChange(snapshot('elira', { hp: { current: 26, temp: 0 } }));
    notifyLocalChange(snapshot('elira', { hp: { current: 24, temp: 0 } }));
    expect(st.last()).toBe('pending');
    await vi.advanceTimersByTimeAsync(1500);
    const patches = calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH');
    expect(patches.length).toBe(1);
    const sent = JSON.parse(String(patches[0].init?.body));
    expect(sent.state.hp.current).toBe(24); // latest snapshot
    expect(sent.baseVersion).toBe(0);
    expect(st.last()).toBe('synced');
  });

  it('no PATCH for a snapshot of ANOTHER character (stale navigation)', async () => {
    const { fetch, calls } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 404 }) },
      { match: '/session', respond: () => ({ status: 200, body: { version: 1 } }) },
    ]);
    setSyncFetch(fetch);
    await initSync('elira', { onStatus: () => {}, onRemoteState: () => {} });
    notifyLocalChange(snapshot('moss-ferrow'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH').length).toBe(0);
  });
});

describe('failures and conflicts', () => {
  it('a PATCH failure sets error and RETRIES once the timer fires', async () => {
    let failing = true;
    const { fetch, calls } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 404 }) },
      { match: '/session', respond: () => (failing ? { status: 500 } : { status: 200, body: { version: 1 } }) },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', { onStatus: st.onStatus, onRemoteState: () => {} });
    notifyLocalChange(snapshot('elira'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(st.last()).toBe('error');
    failing = false;
    // RETRY_MS (5 s) dispara el reintento; su debounce añade 1,5 s más.
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(st.last()).toBe('synced');
    expect(calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH').length).toBe(2);
  });
});

describe('conflicts (Fase 15c): pause + explicit resolution', () => {
  it('a 409 PAUSES the sync and reports the conflict (no silent apply)', async () => {
    const remote = snapshot('elira', { hp: { current: 12, temp: 2 } });
    const { fetch, calls } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 200, body: { state: remote, version: 7 } }) },
      { match: '/session', respond: () => ({ status: 409, body: { error: 'version_conflict', state: remote, version: 7 } }) },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    const conflicts: Array<{ remoteState: unknown; remoteVersion: number }> = [];
    await initSync('elira', {
      onStatus: st.onStatus,
      onRemoteState: () => {},
      onConflict: c => conflicts.push(c),
    });
    notifyLocalChange(snapshot('elira', { hp: { current: 5, temp: 0 } }));
    await vi.advanceTimersByTimeAsync(1500);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].remoteVersion).toBe(7);
    expect(st.last()).toBe('error'); // red dot, steady: attention
    // PAUSED: further local changes do NOT trigger flushes.
    const before = calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH').length;
    notifyLocalChange(snapshot('elira', { hp: { current: 3, temp: 0 } }));
    await vi.advanceTimersByTimeAsync(10000);
    expect(calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH').length).toBe(before);
  });

  it('resolveLoadRemote applies the remote state and marks synced', async () => {
    const remote = snapshot('elira', { hp: { current: 12, temp: 2 } });
    const { fetch } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 200, body: { state: remote, version: 7 } }) },
      { match: '/session', respond: () => ({ status: 409, body: { state: remote, version: 7 } }) },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    const rt = remoteTracker();
    await initSync('elira', {
      onStatus: st.onStatus,
      onRemoteState: rt.onRemoteState,
      onConflict: () => {},
    });
    notifyLocalChange(snapshot('elira'));
    await vi.advanceTimersByTimeAsync(1500);
    resolveLoadRemote();
    expect(st.last()).toBe('synced');
    expect(rt.last()).toEqual(remote);
  });

  it('resolveOverwriteLocal PATCHes the LATEST local state with the remote base', async () => {
    const remote = snapshot('elira', { hp: { current: 12, temp: 2 } });
    const { fetch, calls } = makeFetch([
      ...urlRoutes(),
      { match: '/session?characterId=elira', respond: () => ({ status: 200, body: { state: remote, version: 7 } }) },
      { match: '/session', respond: (_url, init) => {
        const body = JSON.parse(String(init?.body));
        // The remote moved on (version 8): PATCHes with an older base
        // conflict; with the remote base (8) they succeed.
        return body.baseVersion < 8
          ? { status: 409, body: { state: remote, version: 8 } }
          : { status: 200, body: { version: body.baseVersion + 1 } };
      } },
    ]);
    setSyncFetch(fetch);
    const st = statusTracker();
    await initSync('elira', {
      onStatus: st.onStatus,
      onRemoteState: () => {},
      onConflict: () => {},
    });
    notifyLocalChange(snapshot('elira', { hp: { current: 5, temp: 0 } }));
    await vi.advanceTimersByTimeAsync(1500);
    // Edits made while the conflict toast is open are INCLUDED.
    notifyLocalChange(snapshot('elira', { hp: { current: 2, temp: 0 } }));
    await resolveOverwriteLocal();
    expect(st.last()).toBe('synced');
    const patches = calls.filter(c => (c.init?.method ?? 'GET') === 'PATCH');
    const last = JSON.parse(String(patches[patches.length - 1].init?.body));
    expect(last.baseVersion).toBe(8); // the remote version as base
    expect(last.state.hp.current).toBe(2); // the LATEST local state
  });
});
