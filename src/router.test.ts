/* ============================================================
   Phase 10 — router tests (T-01, D-33). parseHash is pure: the
   tests run in node with no DOM and no network.
   ============================================================ */

import { describe, expect, it } from 'vitest';
import { parseHash } from './router';

describe('parseHash — pure route parsing (Phase 10, T-01)', () => {
  it('maps the empty hash and "/" to the overview', () => {
    expect(parseHash('')).toEqual({ name: 'overview' });
    expect(parseHash('#')).toEqual({ name: 'overview' });
    expect(parseHash('#/')).toEqual({ name: 'overview' });
  });

  it('maps "/c/<id>" to a character route carrying the id', () => {
    expect(parseHash('#/c/tax-demonion-goblin')).toEqual({
      name: 'character',
      id: 'tax-demonion-goblin',
    });
    expect(parseHash('#/c/character-demo')).toEqual({
      name: 'character',
      id: 'character-demo',
    });
  });

  it('accepts ids without the leading "#" too (tolerant input)', () => {
    expect(parseHash('/c/character-demo')).toEqual({
      name: 'character',
      id: 'character-demo',
    });
  });

  it('rejects ids outside [a-z0-9-] as not-found (never raw ids)', () => {
    expect(parseHash('#/c/Inválido!')).toEqual({ name: 'not-found' });
    expect(parseHash('#/c/UPPER-case')).toEqual({ name: 'not-found' });
    expect(parseHash('#/c/with_underscore')).toEqual({ name: 'not-found' });
  });

  it('maps unknown paths to not-found', () => {
    expect(parseHash('#/otra')).toEqual({ name: 'not-found' });
    expect(parseHash('#/c/')).toEqual({ name: 'not-found' });
    expect(parseHash('#/c/')).not.toEqual({ name: 'character', id: '' });
  });
});
