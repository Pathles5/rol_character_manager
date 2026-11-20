#!/usr/bin/env node
/* ============================================================
   FichaSS — characters manifest generator (build-time, D-33).
   Scans public/characters/*.json and writes
   public/characters-manifest.json: { schemaVersion: 1,
   characters: [{ id, name, class, level, initials }] } sorted
   by id (array order = overview listing order).

   Each file: id = basename without extension, validated against
   /^[a-z0-9-]+$/ (the same pattern the hash router enforces).
   Identity fields are extracted for the summary cards; a file
   failing to parse or missing a required field breaks the build
   with a clear message (spec C4, D-35 spirit).

   Node ESM, zero dependencies (constitution I2). Mirrors the
   ManifestEntry type of src/lib/manifest.ts by hand: the script
   must stay plain JavaScript for `npm run prebuild`.
   ============================================================ */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const charactersDir = fileURLToPath(new URL('../public/characters/', import.meta.url));
const manifestPath = fileURLToPath(new URL('../public/characters-manifest.json', import.meta.url));

/** Same id pattern the router accepts (src/router.ts). */
const ID_PATTERN = /^[a-z0-9-]+$/;

/** Reports one failing file and breaks the build (exit 1). */
function fail(file, reason) {
  console.error(`[generate-manifest] ${file}: ${reason}`);
  process.exit(1);
}

const files = readdirSync(charactersDir)
  .filter(name => extname(name).toLowerCase() === '.json')
  .sort();

const characters = [];

for (const file of files) {
  const id = basename(file, '.json');
  if (!ID_PATTERN.test(id)) {
    fail(file, `character id "${id}" must match ${ID_PATTERN} (file name = id)`);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(join(charactersDir, file), 'utf8'));
  } catch (error) {
    fail(file, `invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }

  const identity = data !== null && typeof data === 'object' ? data.identity : undefined;
  if (identity === null || typeof identity !== 'object') {
    fail(file, 'missing "identity" object (model §2)');
  }

  const name = identity.name;
  const className = identity.class;
  const level = identity.level;
  if (typeof name !== 'string' || name.trim() === '') {
    fail(file, 'identity.name must be a non-empty string');
  }
  if (typeof className !== 'string' || className.trim() === '') {
    fail(file, 'identity.class must be a non-empty string');
  }
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 20) {
    fail(file, 'identity.level must be an integer between 1 and 20');
  }

  // Same initials scheme as the client (model §3, derived.getInitials).
  const initials = name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();

  characters.push({ id, name, class: className, level, initials });
}

characters.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

writeFileSync(manifestPath, `${JSON.stringify({ schemaVersion: 1, characters }, null, 2)}\n`);
console.log(`[generate-manifest] ${characters.length} character(s) -> public/characters-manifest.json`);
