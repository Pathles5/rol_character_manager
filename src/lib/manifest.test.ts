/* ============================================================
   Phase 10 — manifest validation tests (T-02 / D-33). Pure
   structural checks over an example manifest constant: NO
   network, NO DOM. The generated artifact itself is exercised
   indirectly at build time by scripts/generate-manifest.mjs.
   ============================================================ */

import { describe, expect, it } from 'vitest';
import {
  MANIFEST_SCHEMA_VERSION,
  isManifestEntry,
  parseManifest,
} from './manifest';

const VALID_ENTRY = {
  id: 'character-demo',
  name: 'Seren Aldaard',
  class: 'clériga',
  level: 5,
  initials: 'SA',
};

const VALID_MANIFEST = {
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  characters: [VALID_ENTRY],
};

describe('isManifestEntry — one summary row', () => {
  it('accepts a well-formed entry', () => {
    expect(isManifestEntry(VALID_ENTRY)).toBe(true);
  });

  it('rejects non-objects and missing/empty fields', () => {
    expect(isManifestEntry(null)).toBe(false);
    expect(isManifestEntry('character-demo')).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, id: '' })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, name: '' })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, class: '' })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, initials: '' })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, id: 'Inválido!' })).toBe(false);
  });

  it('rejects levels outside 1–20', () => {
    expect(isManifestEntry({ ...VALID_ENTRY, level: 0 })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, level: 21 })).toBe(false);
    expect(isManifestEntry({ ...VALID_ENTRY, level: 5.5 })).toBe(false);
  });
});

describe('parseManifest — the manifest document (schemaVersion 1, array)', () => {
  it('accepts a valid manifest and returns its entries', () => {
    expect(parseManifest(VALID_MANIFEST)).toEqual([VALID_ENTRY]);
  });

  it('rejects a wrong schemaVersion', () => {
    expect(parseManifest({ ...VALID_MANIFEST, schemaVersion: 2 })).toBeNull();
    expect(parseManifest({ characters: [VALID_ENTRY] })).toBeNull();
  });

  it('rejects a non-array characters field', () => {
    expect(parseManifest({ ...VALID_MANIFEST, characters: VALID_ENTRY })).toBeNull();
    expect(parseManifest({ ...VALID_MANIFEST, characters: 'nope' })).toBeNull();
  });

  it('rejects manifests with any malformed entry', () => {
    expect(
      parseManifest({ ...VALID_MANIFEST, characters: [VALID_ENTRY, { id: 'x' }] }),
    ).toBeNull();
  });

  it('rejects non-object documents', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest([VALID_ENTRY])).toBeNull();
  });
});
