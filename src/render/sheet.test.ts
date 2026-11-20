/* ============================================================
   FichaSS — renderSheet tests (Phase 10, amendment D-37).
   renderSheet is a pure string builder: block ids from the
   frozen matrix, minus the authored hiddenBlocks of the
   character. DOM-free: no environment needed. The fixture is
   read from its public location (the living data since
   Phase 10, D-33).
   ============================================================ */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOCK_CONFIG } from '../data/blockConfig';
import { computeDerived } from '../derived';
import type { Character } from '../types';
import { renderSheet } from './sheet';

const fixturePath = join(import.meta.dirname, '../../public/characters/character-demo.json');
const demoCharacter = JSON.parse(readFileSync(fixturePath, 'utf8')) as Character;
const demoDerived = computeDerived(demoCharacter);

/** Parses the data-block ids out of the rendered sheet string. */
const blockIdsOf = (html: string): string[] =>
  [...html.matchAll(/data-block="([a-z]+)"/g)].map(m => m[1]);

describe('renderSheet — hiddenBlocks (amendment D-37 of D-16)', () => {
  it('renders 12 aventura sections + rest (13 total) for the demo', () => {
    const ids = blockIdsOf(renderSheet(demoCharacter, demoDerived));
    expect(ids.length).toBe(13);
    expect(ids).toContain('spells');
    expect(ids).toContain('rest');
  });

  it('never renders a block listed in hiddenBlocks (any mode)', () => {
    const casterless: Character = { ...demoCharacter, hiddenBlocks: ['spells'] };
    const ids = blockIdsOf(renderSheet(casterless, demoDerived));
    expect(ids).not.toContain('spells');
    expect(ids).toContain('rest'); // still pre-marked for descanso
    expect(ids.length).toBe(12);
  });

  it('keeps the frozen matrix order after filtering', () => {
    const casterless: Character = { ...demoCharacter, hiddenBlocks: ['spells'] };
    const expected = [...BLOCK_CONFIG]
      .sort((a, b) => a.weight - b.weight)
      .filter(entry => entry.id !== 'spells')
      .map(entry => entry.id);
    expect(blockIdsOf(renderSheet(casterless, demoDerived))).toEqual(expected);
  });
});
