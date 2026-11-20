/* ============================================================
   Phase 07 — validator tests (contract of model §5, D-17).
   Control input: public/characters/character-demo.json (the
   LIVING fixture since Phase 10, D-33; docs/data keeps a
   historical copy) must be ACCEPTED; every contract
   rejection (derived values, session state, unknown/x-* fields,
   empty required fields) must produce an ok:false with a
   field-path message map.
   ============================================================ */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Character } from './types';
import type { ValidationResult } from './validate';
import { validateCharacter } from './validate';

/** The fixture is read at test time from its public location
    (src/ → repo root → public/characters/), exactly like the
    former D-21 coherence test did: no JSON duplicated into a
    bundle, no copied literals. import.meta.dirname works in
    both vitest environments (node and jsdom). The validator
    itself guards the shape, so the typed cast below only aids
    field access. */
import { join } from 'node:path';

const fixturePath = join(import.meta.dirname, '../public/characters/character-demo.json');
const demoCharacter = JSON.parse(readFileSync(fixturePath, 'utf8')) as Character;

/** Narrows a ValidationResult to the error map, failing the test
    when the validator unexpectedly accepted the payload. */
function expectRejected(result: ValidationResult): Record<string, string> {
  expect(result.ok).toBe(false);
  if (result.ok) {
    // Unreachable when the expectation above holds; satisfies the type checker.
    throw new Error('expected the validator to reject this payload');
  }
  return result.fields;
}

describe('validateCharacter — fixture acceptance', () => {
  it('accepts the demo character verbatim (ok: true)', () => {
    expect(validateCharacter(demoCharacter)).toEqual({ ok: true });
  });

  it('accepts the fixture tolerance field x_demoNotes (D-17/D-22)', () => {
    const clone: Character = structuredClone(demoCharacter);
    clone.x_demoNotes = ['note one', 'note two'];
    expect(validateCharacter(clone)).toEqual({ ok: true });
  });
});

describe('validateCharacter — derived values are never sent (model §3, D-17)', () => {
  it('rejects a spellDC field, pointing at the field name', () => {
    const fields = expectRejected(validateCharacter({ ...demoCharacter, spellDC: 14 }));
    expect(fields['spellDC']).toBeDefined();
  });

  it('rejects a preparedCount field', () => {
    const fields = expectRejected(validateCharacter({ ...demoCharacter, preparedCount: 9 }));
    expect(fields['preparedCount']).toBeDefined();
  });
});

describe('validateCharacter — session state never rides along (model §4)', () => {
  it('rejects a sessionState field', () => {
    const fields = expectRejected(
      validateCharacter({ ...demoCharacter, sessionState: { hp: { current: 10, temp: 0 } } }),
    );
    expect(fields['sessionState']).toBeDefined();
  });
});

describe('validateCharacter — unknown and reserved top-level fields', () => {
  it('rejects an unknown reserved x_* field other than x_demoNotes', () => {
    const fields = expectRejected(validateCharacter({ ...demoCharacter, x_otra: 'nota' }));
    expect(fields['x_otra']).toBeDefined();
  });

  it('rejects an unknown plain field', () => {
    const fields = expectRejected(validateCharacter({ ...demoCharacter, invented: true }));
    expect(fields['invented']).toBeDefined();
  });
});

describe('validateCharacter — required fields empty or mistyped', () => {
  it('rejects an empty identity.name', () => {
    const clone: Character = structuredClone(demoCharacter);
    clone.identity.name = '';
    const fields = expectRejected(validateCharacter(clone));
    expect(fields['identity.name']).toBeDefined();
  });

  /** hiddenBlocks (amendment D-37 of D-16): optional authored
      visibility — valid ids pass, unknown ids / non-array /
      duplicates fail. */
  describe('hiddenBlocks (amendment D-37 of D-16)', () => {
    it('accepts a known block id and passes validation', () => {
      const clone: Character = structuredClone(demoCharacter);
      clone.hiddenBlocks = ['spells'];
      expect(validateCharacter(clone).ok).toBe(true);
    });

    it('rejects an unknown block id', () => {
      const bad = { ...structuredClone(demoCharacter), hiddenBlocks: ['no-existe'] };
      const fields = expectRejected(validateCharacter(bad));
      expect(fields['hiddenBlocks[0]']).toBeDefined();
    });

    it('rejects a non-array hiddenBlocks', () => {
      const bad = { ...structuredClone(demoCharacter), hiddenBlocks: 'spells' };
      const fields = expectRejected(validateCharacter(bad));
      expect(fields['hiddenBlocks']).toBeDefined();
    });

    it('rejects duplicate block ids', () => {
      const bad = { ...structuredClone(demoCharacter), hiddenBlocks: ['spells', 'spells'] };
      const fields = expectRejected(validateCharacter(bad));
      expect(fields['hiddenBlocks']).toBeDefined();
    });
  });

  it('rejects an out-of-range ability score (0)', () => {
    const clone: Character = structuredClone(demoCharacter);
    clone.abilities.wisdom = 0;
    const fields = expectRejected(validateCharacter(clone));
    expect(fields['abilities.wisdom']).toBeDefined();
  });

  it('rejects a non-positive maxHitPoints', () => {
    const clone: Character = structuredClone(demoCharacter);
    clone.combat.maxHitPoints = 0;
    const fields = expectRejected(validateCharacter(clone));
    expect(fields['combat.maxHitPoints']).toBeDefined();
  });

  it('rejects a level outside 1–20', () => {
    const clone: Character = structuredClone(demoCharacter);
    clone.identity.level = 21;
    const fields = expectRejected(validateCharacter(clone));
    expect(fields['identity.level']).toBeDefined();
  });

  it('rejects a schemaVersion other than 1', () => {
    const fields = expectRejected(validateCharacter({ ...demoCharacter, schemaVersion: 2 }));
    expect(fields['schemaVersion']).toBeDefined();
  });

  it('rejects non-object payloads wholesale', () => {
    const fields = expectRejected(validateCharacter('seren'));
    expect(fields['(root)']).toBeDefined();
  });
});

/** Phase 10 (D-33): the build-time manifest check is structural
    (parse + identity fields, scripts/generate-manifest.mjs); the
    FULL D-17 contract for every published character is enforced
    here, in the test gate. Reads the generated manifest and each
    referenced public/characters/<id>.json from disk. */
describe('validateCharacter — every published character passes the full contract (Phase 10)', () => {
  const manifestPath = join(import.meta.dirname, '../public/characters-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    schemaVersion: number;
    characters: { id: string }[];
  };

  it('the manifest exists and has a valid schemaVersion', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(Array.isArray(manifest.characters)).toBe(true);
  });

  it.each(manifest.characters.map(entry => [entry.id]))(
    'character "%s" passes validateCharacter',
    id => {
      const path = join(import.meta.dirname, '../public/characters', `${id}.json`);
      const character = JSON.parse(readFileSync(path, 'utf8'));
      const result = validateCharacter(character);
      expect(result.ok, `character "${id}" must pass the D-17 contract`).toBe(true);
    },
  );
});
