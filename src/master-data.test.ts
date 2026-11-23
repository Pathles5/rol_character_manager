/* ============================================================
   FichaSS — master data store tests (Fase 16, spec C9).
   Injectable fetch + fake timers (same harness as sync.test).
   Focus: relative deltas, 409-retry re-applies the SAME delta
   over the FRESH remote state, clamp per authored document,
   poll skipping rows with pending deltas.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, SessionState } from './types';
import {
  POLL_INTERVAL_MS,
  editCharacter,
  getRows,
  initMasterStore,
  refreshAll,
  resetMasterStoreForTests,
  setMasterFetch,
  startPolling,
  stopPolling,
} from './master-data';

const API = 'https://api.example';

function snapshot(id: string, overrides: Partial<SessionState> = {}): SessionState {
  return {
    schemaVersion: 1,
    characterId: id,
    hp: { current: 20, temp: 0 },
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

/** Minimal valid authored document (clamps feed from here). */
function charDoc(maxHp = 24): Character {
  return {
    schemaVersion: 1,
    identity: { name: 'C Uno', race: 'humano', class: 'clérigo', subclass: '', level: 5, background: '', alignment: '' },
    abilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    combat: { armorClass: 16, speed: 9, maxHitPoints: maxHp, hitDice: { die: 'd8', total: 5 } },
    defense: { saveProficiencies: [] },
    skillProficiencies: [],
    skillExpertise: [],
    attacks: [],
    traits: [{ id: 'r1', name: 'Fortuna', source: 'test', description: '', uses: 2 }],
    spells: { castingAbility: 'wisdom', slotsMax: { 1: 4, 2: 3, 3: 2 }, cantrips: [], prepared: [] },
    equipment: { equipped: [], inventory: [], coins: { gp: 0, sp: 0 } },
    proficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    role: { summary: '', tableNotes: [], questions: [] },
    allies: [],
  };
}

interface ServerRow {
  state: SessionState;
  version: number;
}

interface PatchCall {
  characterId: string;
  state: SessionState;
  baseVersion: number;
}

/** Standalone fetch implementation over a mutable session table
    (manifest + docs + GET/PATCH /session with optimistic lock). */
function makeImpl(
  sessions: Record<string, ServerRow>,
  options: {
    /** Scripted server reaction before each PATCH (e.g. a player
        concurrent write + 409). Returns the response to send. */
    onPatch?: (patch: PatchCall, sessions: Record<string, ServerRow>) => Response;
    /** Hang PATCHes forever (simulates a stuck network). */
    hangPatch?: boolean;
    /** Serve the authored document (clamps need it). */
    withDocs?: boolean;
    /** Extra manifest ids WITHOUT a remote session (404 rows). */
    extraIds?: string[];
  } = {},
): { impl: typeof globalThis.fetch; patches: PatchCall[]; gets: () => number } {
  const patches: PatchCall[] = [];
  let gets = 0;
  const impl = (async (url: string | URL, init?: RequestInit) => {
    const target = String(url);
    const method = init?.method ?? 'GET';
    if (target.includes('characters-manifest.json')) {
      const ids = Object.keys(sessions).concat(options.extraIds ?? []);
      return new Response(JSON.stringify({ characters: ids.map(id => ({ id })) }), { status: 200 });
    }
    if (target.includes('session-url.json')) {
      return new Response(JSON.stringify({ url: API }), { status: 200 });
    }
    const docMatch = /characters\/([a-z0-9-]+)\.json$/.exec(target);
    if (docMatch) {
      return options.withDocs !== false && sessions[docMatch[1]]
        ? new Response(JSON.stringify(charDoc()), { status: 200 })
        : new Response(null, { status: 404 });
    }
    const idMatch = /characterId=([a-z0-9-]+)/.exec(target);
    if (method === 'GET') {
      gets++;
      const row = idMatch ? sessions[idMatch[1]] : undefined;
      return row ? new Response(JSON.stringify(row), { status: 200 }) : new Response(null, { status: 404 });
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(String(init?.body)) as PatchCall;
      patches.push(patch);
      if (options.hangPatch) return new Promise<Response>(() => {});
      if (options.onPatch) return options.onPatch(patch, sessions);
      const row = sessions[patch.characterId];
      if (!row) return new Response(null, { status: 404 });
      if (row.version !== patch.baseVersion) return new Response(null, { status: 409 });
      row.state = patch.state;
      row.version += 1;
      return new Response(JSON.stringify({ version: row.version }), { status: 200 });
    }
    return new Response(null, { status: 400 });
  }) as unknown as typeof globalThis.fetch;
  return { impl, patches, gets: () => gets };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMasterStoreForTests();
});

afterEach(() => {
  stopPolling();
  vi.useRealTimers();
});

describe('initMasterStore / refreshAll', () => {
  it('loads one row per manifest character; 404 → noSession', async () => {
    const server = makeImpl({ c1: { state: snapshot('c1'), version: 4 } }, { extraIds: ['solo-doc'] });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();
    const rows = getRows();
    expect(rows['c1'].state).toMatchObject({ characterId: 'c1' });
    expect(rows['c1'].version).toBe(4);
    expect(rows['c1'].noSession).toBe(false);
    expect(rows['solo-doc'].noSession).toBe(true);
    expect(rows['solo-doc'].state).toBeNull();
  });
});

describe('editCharacter — relative deltas (C9)', () => {
  it('applies the delta locally and PATCHes the merged state', async () => {
    const server = makeImpl({ c1: { state: snapshot('c1', { hp: { current: 20, temp: 3 } }), version: 2 } });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();

    editCharacter('c1', { hp: { current: -5, temp: 1 } });
    expect(getRows()['c1'].state).toMatchObject({ hp: { current: 15, temp: 4 } }); // optimistic
    expect(getRows()['c1'].status).toBe('pending');

    await vi.waitFor(() => expect(getRows()['c1'].status).toBe('fresh'));
    expect(server.patches[0]).toMatchObject({
      characterId: 'c1',
      baseVersion: 2,
      state: expect.objectContaining({ hp: { current: 15, temp: 4 } }),
    });
    expect(getRows()['c1'].pendingOps).toHaveLength(0);
    expect(getRows()['c1'].version).toBe(3);
  });

  it('clamps the optimistic state to the authored document', async () => {
    const server = makeImpl({ c1: { state: snapshot('c1', { hp: { current: 23, temp: 0 } }), version: 1 } });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();

    editCharacter('c1', { hp: { current: +100 } });
    expect(getRows()['c1'].state?.hp.current).toBe(24); // charDoc maxHitPoints

    editCharacter('c1', { resource: { traitId: 'r1', delta: +7 } });
    expect(getRows()['c1'].state?.resourcesUsed['r1']).toBe(2); // trait uses cap
  });

  it('ignores edits to characters without session or document', async () => {
    const server = makeImpl({ c1: { state: snapshot('c1'), version: 1 } }, { withDocs: false, extraIds: ['solo-doc'] });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();

    editCharacter('c1', { hp: { current: -1 } }); // no doc → skip
    expect(getRows()['c1'].state?.hp.current).toBe(20);
    expect(getRows()['c1'].pendingOps).toHaveLength(0);

    editCharacter('solo-doc', { hp: { current: -1 } }); // no session → skip
    expect(getRows()['solo-doc'].state).toBeNull();
  });
});

describe('409 retry — never clobbers the player (C9)', () => {
  it('re-GETs the fresh state, re-applies the same DELTA and re-PATCHes', async () => {
    const sessions = { c1: { state: snapshot('c1', { hp: { current: 20, temp: 0 } }), version: 2 } };
    let patchCount = 0;
    const server = makeImpl(sessions, {
      onPatch: (patch, table) => {
        patchCount++;
        if (patchCount === 1) {
          // The player writes concurrently (heal to 22) BEFORE the
          // server applies the master's stale patch → 409.
          table['c1'] = { state: snapshot('c1', { hp: { current: 22, temp: 0 } }), version: 3 };
          return new Response(null, { status: 409 });
        }
        const row = table[patch.characterId];
        if (row.version !== patch.baseVersion) return new Response(null, { status: 409 });
        row.state = patch.state;
        row.version += 1;
        return new Response(JSON.stringify({ version: row.version }), { status: 200 });
      },
    });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();

    editCharacter('c1', { hp: { current: -5 } }); // master: 5 damage

    await vi.waitFor(() => {
      const row = getRows()['c1'];
      expect(row.status).toBe('fresh');
      expect(row.pendingOps).toHaveLength(0);
    });
    expect(patchCount).toBe(2);
    // The delta survived the conflict: 22 (player's fresh) − 5.
    expect(sessions['c1'].state.hp.current).toBe(17);
    expect(getRows()['c1'].state?.hp.current).toBe(17);
    expect(getRows()['c1'].version).toBe(4);
  });

  it('marks the row error after 3 attempts, keeping the deltas for manual retry', async () => {
    const sessions = { c1: { state: snapshot('c1'), version: 2 } };
    const server = makeImpl(sessions, {
      onPatch: () => new Response(null, { status: 409 }), // always conflicts
    });
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();

    editCharacter('c1', { hp: { current: -1 } });
    await vi.waitFor(() => expect(getRows()['c1'].status).toBe('error'));
    expect(server.patches).toHaveLength(3); // exactly 3 attempts
    expect(getRows()['c1'].pendingOps).toHaveLength(1); // re-appliable
    expect(sessions['c1'].state.hp.current).toBe(20); // player state untouched
  });
});

describe('polling (15 s)', () => {
  it('refreshes rows without pending deltas', async () => {
    const sessions = {
      c1: { state: snapshot('c1'), version: 1 },
      c2: { state: snapshot('c2'), version: 1 },
    };
    const server = makeImpl(sessions);
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();
    startPolling();
    const before = getRows()['c1'].lastFetchedAt ?? 0;

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect((getRows()['c1'].lastFetchedAt ?? 0)).toBeGreaterThan(before);
    expect(getRows()['c2'].lastFetchedAt).not.toBeNull();
  });

  it('does not GET a character whose deltas are still pending', async () => {
    const sessions = { c1: { state: snapshot('c1'), version: 1 } };
    const server = makeImpl(sessions);
    setMasterFetch(server.impl);
    await initMasterStore({ onRows: () => {} });
    await refreshAll();
    const baseline = server.gets();
    startPolling();

    // A PATCH that never resolves keeps the row pending.
    setMasterFetch((async (url: string | URL, init?: RequestInit) => {
      if (String(init?.method) === 'PATCH') return new Promise<Response>(() => {});
      return await server.impl(url, init);
    }) as unknown as typeof globalThis.fetch);
    editCharacter('c1', { hp: { current: -1 } });
    expect(getRows()['c1'].status).toBe('pending');

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);
    expect(server.gets()).toBe(baseline); // poll skipped the pending row
  });
});
