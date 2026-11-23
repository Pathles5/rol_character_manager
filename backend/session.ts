/* ============================================================
   FichaSS — backend Lambda: session persistence (Fase 15, D-55).

   GET   /session?characterId=<id>  → 200 {state, version, updatedAt}
                                    | 404 {error:"not_found"}
   PATCH /session {characterId, state, baseVersion}
        → 200 {version, updatedAt}
        | 409 {error:"version_conflict", state, version, updatedAt}
        | 400 {error:"validation_failed", detail}

   The PATCH validation uses the SAME pure session contract as the
   browser (src/session-schema.ts — single source, D-55): unknown
   fields ignored, every counter clamped to the rule limits of the
   character (which is fetched from the public authored JSON). Ids
   are limited to the live manifest. No auth in v1 (hardened-open
   endpoint, D-55): strict validation + small bodies + CORS pinned
   to the site origin at the Function URL level (template).
   ============================================================ */

// The AWS SDK (3.1175) defines its exports lazily AND restructured
// lib-dynamodb: the document commands are GetCommand/PutCommand (NOT
// GetItemCommand/PutItemCommand) — import the DEFAULT and destructure
// (the lazy getters aren't visible to Node's named-export detection).
import ddbClient from '@aws-sdk/client-dynamodb';
import libDynamo from '@aws-sdk/lib-dynamodb';
const { DynamoDBClient } = ddbClient;
const { DynamoDBDocumentClient, GetCommand, PutCommand } = libDynamo;
import type { Character } from '../src/types';
import {
  MASTER_LAYOUT_ID,
  sanitizeMasterLayout,
  sanitizeSessionState,
  SESSION_SCHEMA_VERSION,
} from '../src/session-schema';

const TABLE_NAME = process.env.SESSIONS_TABLE ?? '';
const MANIFEST_URL = process.env.MANIFEST_URL ?? '';
const SITE_URL = process.env.SITE_URL ?? '';
const MAX_BODY_BYTES = 16384;
// Build tag (Fase 16, r22): forces a real code change per revision —
// if a deploy produces "No updates" while this tag is stale, the
// pipeline didn't ship what we think it did.
const BUILD_TAG = 'fase16-r22';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
// Cold-start marker: proves which build is actually running.
console.log(`fichass-session init [${BUILD_TAG}]`);

interface SessionItem {
  characterId: string;
  state?: unknown;
  /** Master layout payload — present ONLY in the reserved
      MASTER_LAYOUT_ID record (Fase 16, D-59); never a SessionState. */
  layout?: unknown;
  version: number;
  updatedAt: string;
}

type LambdaResponse = { statusCode: number; body: string };

const json = (statusCode: number, payload: unknown): LambdaResponse => ({
  statusCode,
  body: JSON.stringify(payload),
});

/** Same character-id pattern as the router, the manifest generator
    and the storage namespace (one line, kept in 4 places). */
const CHARACTER_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Short-TTL caches: the manifest changes on every push; the character
// JSON changes only on ingestions. Small TTLs keep correctness.
let manifestCache: { at: number; ids: Set<string> } | null = null;
const MANIFEST_TTL_MS = 60_000;
const characterCache = new Map<string, { at: number; character: Character }>();
const CHARACTER_TTL_MS = 60_000;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!response.ok) throw new Error(`fetch ${url} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

async function allowedCharacterIds(): Promise<Set<string>> {
  if (manifestCache && Date.now() - manifestCache.at < MANIFEST_TTL_MS) {
    return manifestCache.ids;
  }
  const manifest = await fetchJson<{ characters: { id: string }[] }>(MANIFEST_URL);
  const ids = new Set(manifest.characters.map(character => character.id));
  manifestCache = { at: Date.now(), ids };
  return ids;
}

async function getCharacter(id: string): Promise<Character> {
  const cached = characterCache.get(id);
  if (cached && Date.now() - cached.at < CHARACTER_TTL_MS) return cached.character;
  const character = await fetchJson<Character>(`${SITE_URL}/characters/${id}.json`);
  characterCache.set(id, { at: Date.now(), character });
  return character;
}

interface LambdaEvent {
  requestContext?: { http?: { method?: string } };
  queryStringParameters?: Record<string, string> | null;
  body?: string | null;
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  try {
    if (!TABLE_NAME || !MANIFEST_URL || !SITE_URL) {
      return json(500, { error: 'misconfigured' });
    }
    const method = event.requestContext?.http?.method ?? 'GET';
    if (method === 'OPTIONS') return { statusCode: 204, body: '' };
    if (method === 'GET') return await handleGet(event.queryStringParameters ?? {});
    if (method === 'PATCH') return await handlePatch(event.body ?? '');
    return json(405, { error: 'method_not_allowed' });
  } catch (error) {
    console.error('fichass-session internal error', error);
    return json(500, { error: 'internal_error' });
  }
};

async function handleGet(query: Record<string, string>): Promise<LambdaResponse> {
  const characterId = query.characterId ?? '';
  if (!CHARACTER_ID_RE.test(characterId)) {
    return json(400, { error: 'validation_failed', detail: 'invalid characterId' });
  }
  // Master layout record (D-59): NOT a character — no manifest
  // check, no SessionState contract; same table and versioning.
  if (characterId === MASTER_LAYOUT_ID) {
    const result = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { characterId } }));
    const item = result.Item as SessionItem | undefined;
    if (!item) return json(404, { error: 'not_found' });
    return json(200, { layout: item.layout, version: item.version, updatedAt: item.updatedAt });
  }
  const ids = await allowedCharacterIds();
  if (!ids.has(characterId)) {
    return json(400, { error: 'validation_failed', detail: 'unknown characterId' });
  }
  const result = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { characterId } }));
  const item = result.Item as SessionItem | undefined;
  if (!item) return json(404, { error: 'not_found' });
  return json(200, { state: item.state, version: item.version, updatedAt: item.updatedAt });
}

interface PatchBody {
  characterId?: unknown;
  state?: unknown;
  /** Master layout payload (reserved id only, D-59). */
  layout?: unknown;
  baseVersion?: unknown;
}

async function handlePatch(rawBody: string): Promise<LambdaResponse> {
  if (rawBody.length > MAX_BODY_BYTES) {
    return json(400, { error: 'validation_failed', detail: 'body too large' });
  }
  let body: PatchBody;
  try {
    body = JSON.parse(rawBody) as PatchBody;
  } catch {
    return json(400, { error: 'validation_failed', detail: 'invalid JSON' });
  }
  const characterId = typeof body.characterId === 'string' ? body.characterId : '';
  if (!CHARACTER_ID_RE.test(characterId)) {
    return json(400, { error: 'validation_failed', detail: 'invalid characterId' });
  }
  const baseVersion =
    typeof body.baseVersion === 'number' && Number.isInteger(body.baseVersion) && body.baseVersion >= 0
      ? body.baseVersion
      : null;
  if (baseVersion === null) {
    return json(400, { error: 'validation_failed', detail: 'baseVersion must be an integer ≥ 0' });
  }
  // Master layout branch (D-59): same optimistic locking, different
  // payload contract (layout instead of state) and no character.
  if (characterId === MASTER_LAYOUT_ID) {
    const layout = sanitizeMasterLayout(body.layout);
    if (!layout) {
      return json(400, { error: 'validation_failed', detail: 'invalid master layout' });
    }
    return await putLayoutVersioned(characterId, layout, baseVersion);
  }
  const ids = await allowedCharacterIds();
  if (!ids.has(characterId)) {
    return json(400, { error: 'validation_failed', detail: 'unknown characterId' });
  }
  if (typeof body.state !== 'object' || body.state === null) {
    return json(400, { error: 'validation_failed', detail: 'state must be an object' });
  }
  const rawState = body.state as Record<string, unknown>;
  if (rawState.schemaVersion !== SESSION_SCHEMA_VERSION) {
    return json(400, { error: 'validation_failed', detail: 'schemaVersion must be 1' });
  }
  if (rawState.characterId !== characterId) {
    return json(400, { error: 'validation_failed', detail: 'state.characterId mismatch' });
  }

  // Same contract as the browser loader (D-16 §4 / D-55): the character
  // drives the rule limits; unknown fields are ignored, values clamped.
  const character = await getCharacter(characterId);
  const state = sanitizeSessionState(body.state, character, characterId);

  const current = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { characterId } }));
  const item = current.Item as SessionItem | undefined;
  if (item && item.version !== baseVersion) {
    return json(409, {
      error: 'version_conflict',
      state: item.state,
      version: item.version,
      updatedAt: item.updatedAt,
    });
  }
  if (!item && baseVersion !== 0) {
    // The remote session vanished (never written / reset table):
    // the client must re-base from zero, never overwrite blind.
    return json(409, { error: 'version_conflict', state: null, version: 0, updatedAt: null });
  }

  const updatedAt = new Date().toISOString();
  const nextVersion = baseVersion + 1;
  try {
    await doc.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { characterId, state, version: nextVersion, updatedAt },
      // Optimistic concurrency (D-55): either the first write ever
      // or the exact expected version — a raced writer gets 409.
      ConditionExpression: item
        ? 'version = :baseVersion'
        : 'attribute_not_exists(characterId)',
      ExpressionAttributeValues: item ? { ':baseVersion': baseVersion } : undefined,
    }));
  } catch (error: unknown) {
    if (isConditionalFailure(error)) {
      return json(409, { error: 'version_conflict', state: null, version: 0, updatedAt: null });
    }
    throw error;
  }
  return json(200, { version: nextVersion, updatedAt });
}

/** Master layout put (D-59): identical optimistic-concurrency
    pattern to the session put, storing `layout` instead of `state`.
    409 bodies carry no state (the client re-GETs). */
async function putLayoutVersioned(
  characterId: string,
  layout: ReturnType<typeof sanitizeMasterLayout>,
  baseVersion: number,
): Promise<LambdaResponse> {
  const current = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { characterId } }));
  const item = current.Item as SessionItem | undefined;
  if (item && item.version !== baseVersion) {
    return json(409, { error: 'version_conflict', layout: item.layout, version: item.version, updatedAt: item.updatedAt });
  }
  if (!item && baseVersion !== 0) {
    return json(409, { error: 'version_conflict', layout: null, version: 0, updatedAt: null });
  }
  const updatedAt = new Date().toISOString();
  const nextVersion = baseVersion + 1;
  try {
    await doc.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { characterId, layout, version: nextVersion, updatedAt },
      ConditionExpression: item
        ? 'version = :baseVersion'
        : 'attribute_not_exists(characterId)',
      ExpressionAttributeValues: item ? { ':baseVersion': baseVersion } : undefined,
    }));
  } catch (error: unknown) {
    if (isConditionalFailure(error)) {
      return json(409, { error: 'version_conflict', layout: null, version: 0, updatedAt: null });
    }
    throw error;
  }
  return json(200, { version: nextVersion, updatedAt });
}

function isConditionalFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'ConditionalCheckFailedException'
  );
}
