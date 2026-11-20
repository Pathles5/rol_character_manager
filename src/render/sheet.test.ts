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

describe('renderSheet — initiative roll + temp strip (Phase 12, D-50)', () => {
  const html = renderSheet(demoCharacter, demoDerived);

  it('the initiative stat carries a d20 button with ASCII notation', () => {
    const mod = demoDerived.initiative;
    const notation = `1d20${mod < 0 ? `-${Math.abs(mod)}` : `+${mod}`}`;
    expect(html).toContain(`aria-label="Tirar iniciativa: ${notation}"`);
    expect(html).toContain(`data-notation="${notation}"`);
  });

  it('temp HP shows the three-row strip with a clear button in both cards', () => {
    // 5 buttons per strip (±1, ±10, clear) × 2 strips (combat stat-grid + rest card)
    expect(html.match(/data-target="hp-temp"/g)?.length).toBe(10);
    expect(html.match(/step-clear/g)?.length).toBe(2);
    expect(html).toContain('aria-label="Vaciar los PG temporales"');
  });
});

describe('renderSheet — save rolls (Phase 13, D-51)', () => {
  const html = renderSheet(demoCharacter, demoDerived);

  it('every one of the 6 saves carries a d20 with its ASCII notation', () => {
    expect(html.match(/Tirar salvación de (?:FUE|DES|CON|INT|SAB|CAR): 1d20[+-]\d+/g)?.length).toBe(6);
  });

  it('the death-save head carries a bare 1d20 button', () => {
    expect(html).toContain('aria-label="Tirar salvación de muerte: 1d20"');
    expect(html).toContain('data-notation="1d20"');
  });
});
