/* ============================================================
   FichaSS — master layout tests (Fase 16, spec C4/C5; Fase 18
   editable flag, D-66). Pure normalization + local/remote
   roundtrips of the layout contract.
   ============================================================ */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchLayout, loadLayout, normalizeLayout, resetLayoutVersionForTests, saveLayout, saveLayoutRemote } from './master-layout';

afterEach(() => {
  resetLayoutVersionForTests();
  vi.unstubAllGlobals();
});

describe('normalizeLayout', () => {
  it('returns an empty layout for junk input (with "Sin grupo" first)', () => {
    expect(normalizeLayout(undefined)).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true });
    expect(normalizeLayout(42)).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true });
    expect(normalizeLayout({ groups: 'nope' })).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''], editable: true });
  });

  it('honours the container order and appends missing ids', () => {
    const layout = normalizeLayout({
      groups: [
        { id: 'g1', name: 'Uno', members: ['a'] },
        { id: 'g2', name: 'Dos', members: ['b'] },
      ],
      ungrouped: ['c'],
      minimized: [],
      containerOrder: ['g1', '', 'g2'],
    });
    expect(layout.containerOrder).toEqual(['g1', '', 'g2']);
    expect(normalizeLayout({ groups: [{ id: 'g1', name: 'Uno', members: [] }], ungrouped: [], minimized: [] }).containerOrder).toEqual(['', 'g1']);
  });

  it('keeps a character exactly once: first occurrence wins (groups before ungrouped)', () => {
    const layout = normalizeLayout({
      groups: [{ id: 'g1', name: 'Combate', members: ['a', 'b'] }],
      ungrouped: ['b', 'c'],
      minimized: [],
    });
    expect(layout.groups[0].members).toEqual(['a', 'b']);
    expect(layout.ungrouped).toEqual(['c']);
  });

  it('drops groups without name or id, and junk members', () => {
    const layout = normalizeLayout({
      groups: [
        { id: 'g1', members: ['a'] }, // no name
        { name: 'Solo nombre', members: [] }, // no id
        { id: 'g2', name: '  ', members: [] }, // blank name
        { id: 'g3', name: 'Válido', members: ['a', 42, null] },
      ],
      ungrouped: 'nope',
      minimized: [],
    });
    expect(layout.groups).toHaveLength(1);
    expect(layout.groups[0]).toEqual({ id: 'g3', name: 'Válido', members: ['a'] });
    expect(layout.ungrouped).toEqual([]);
  });

  it('filters minimized ids down to the known ones', () => {
    const layout = normalizeLayout({
      groups: [{ id: 'g1', name: 'G', members: ['a'] }],
      ungrouped: ['b'],
      minimized: ['a', 'ghost', 'b'],
    });
    expect(layout.minimized).toEqual(['a', 'b']);
  });
});

describe('remote layout persistence (D-59)', () => {
  it('fetchLayout: null on 404, sanitized layout on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(fetchLayout('https://api')).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ layout: { groups: [{ id: 'g1', name: 'Combate', members: ['x'] }], ungrouped: ['y'], minimized: ['x'], containerOrder: ['', 'g1'] }, version: 7 }), { status: 200 }),
    ));
    const layout = await fetchLayout('https://api');
    expect(layout).toEqual({
      groups: [{ id: 'g1', name: 'Combate', members: ['x'] }],
      ungrouped: ['y'],
      minimized: ['x'],
      containerOrder: ['', 'g1'],
      editable: true, // legacy remote payload without the flag → default ON
    });
  });

  it('saveLayoutRemote: 200 stores and updates the version', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) =>
      String(init?.method) === 'PATCH'
        ? new Response(JSON.stringify({ version: 3 }), { status: 200 })
        : new Response(JSON.stringify({ layout: null, version: 2 }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const ok = await saveLayoutRemote('https://api', { groups: [], ungrouped: [], minimized: [], containerOrder: [''] });
    expect(ok).toBe(true);
    const patch = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { characterId: string };
    expect(patch.characterId).toBe('master-layout');
  });

  it('saveLayoutRemote: 409 re-bases the version and saves once more', async () => {
    let patches = 0;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      if (String(init?.method) === 'PATCH') {
        patches++;
        return patches === 1 ? new Response(null, { status: 409 }) : new Response(JSON.stringify({ version: 5 }), { status: 200 });
      }
      return new Response(JSON.stringify({ layout: null, version: 4 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const ok = await saveLayoutRemote('https://api', { groups: [], ungrouped: [], minimized: [], containerOrder: [''] });
    expect(ok).toBe(true);
    expect(patches).toBe(2);
  });
});

describe('editable flag (Fase 18, D-66)', () => {
  const base = { groups: [], ungrouped: [], minimized: [], containerOrder: [''] };

  it('defaults to true when absent or non-boolean (legacy layouts stay editable)', () => {
    expect(normalizeLayout(base).editable).toBe(true);
    expect(normalizeLayout({ ...base, editable: 'false' }).editable).toBe(true);
    expect(normalizeLayout({ ...base, editable: 0 }).editable).toBe(true);
    expect(normalizeLayout({ ...base, editable: null }).editable).toBe(true);
  });

  it('keeps explicit true and false', () => {
    expect(normalizeLayout({ ...base, editable: true }).editable).toBe(true);
    expect(normalizeLayout({ ...base, editable: false }).editable).toBe(false);
  });

  it('round-trips through the local cache (saveLayout → loadLayout)', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string): string | null => store.get(key) ?? null,
        setItem: (key: string, value: string): void => { store.set(key, String(value)); },
      },
    });
    saveLayout({ ...base, editable: false });
    expect(loadLayout().editable).toBe(false);
    saveLayout({ ...base, editable: true });
    expect(loadLayout().editable).toBe(true);
  });

  it('round-trips through the session API (saveLayoutRemote → fetchLayout)', async () => {
    let stored: unknown = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      if (String(init?.method) === 'PATCH') {
        stored = (JSON.parse(String(init?.body)) as { layout: unknown }).layout;
        return new Response(JSON.stringify({ version: 1 }), { status: 200 });
      }
      return new Response(JSON.stringify({ layout: stored, version: 1 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const ok = await saveLayoutRemote('https://api', { ...base, editable: false });
    expect(ok).toBe(true);
    const fetched = await fetchLayout('https://api');
    expect(fetched?.editable).toBe(false);
  });
});
