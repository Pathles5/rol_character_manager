/* ============================================================
   FichaSS — master layout tests (Fase 16, spec C4/C5).
   Pure normalization + localStorage roundtrip (jsdom storage).
   ============================================================ */

import { describe, expect, it } from 'vitest';
import { normalizeLayout } from './master-layout';

describe('normalizeLayout', () => {
  it('returns an empty layout for junk input (with "Sin grupo" first)', () => {
    expect(normalizeLayout(undefined)).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''] });
    expect(normalizeLayout(42)).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''] });
    expect(normalizeLayout({ groups: 'nope' })).toEqual({ groups: [], ungrouped: [], minimized: [], containerOrder: [''] });
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
