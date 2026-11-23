// backend/session.ts
import ddbClient from "@aws-sdk/client-dynamodb";
import libDynamo from "@aws-sdk/lib-dynamodb";

// src/session-schema.ts
var SESSION_SCHEMA_VERSION = 1;
var TEMP_HP_MAX = 20;
var DEATH_SAVE_MAX = 3;
var CHANNEL_DIVINITY_MAX = 2;
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function numberOr(value, fallback) {
  return finiteNumber(value) ?? fallback;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
function fallbackCharacterId(character) {
  return character.identity.name.toLowerCase().replace(/\s+/g, "-");
}
function defaultSessionState(character) {
  return {
    schemaVersion: 1,
    // Name-derived fallback id; the URL id overrides it in
    // initSession/resetSession (Phase 10 coherence, D-16 §4).
    characterId: fallbackCharacterId(character),
    hp: { current: character.combat.maxHitPoints, temp: 0 },
    hitDice: { used: 0 },
    spellSlotsUsed: { 1: 0, 2: 0, 3: 0 },
    channelDivinity: { used: 0 },
    inspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    conditions: [],
    resourcesUsed: {}
  };
}
function sanitizeSessionState(raw, character, characterId) {
  const defaults = defaultSessionState(character);
  if (typeof raw !== "object" || raw === null) return defaults;
  const data = raw;
  if (data.schemaVersion !== SESSION_SCHEMA_VERSION) return defaults;
  if (data.characterId !== characterId) return defaults;
  const hp = typeof data.hp === "object" && data.hp !== null ? data.hp : {};
  const hitDice = typeof data.hitDice === "object" && data.hitDice !== null ? data.hitDice : {};
  const slots = typeof data.spellSlotsUsed === "object" && data.spellSlotsUsed !== null ? data.spellSlotsUsed : {};
  const channel = typeof data.channelDivinity === "object" && data.channelDivinity !== null ? data.channelDivinity : {};
  const deathSaves = typeof data.deathSaves === "object" && data.deathSaves !== null ? data.deathSaves : {};
  const resourcesUsed = {};
  if (typeof data.resourcesUsed === "object" && data.resourcesUsed !== null) {
    for (const [traitId, used] of Object.entries(data.resourcesUsed)) {
      const value = finiteNumber(used);
      if (value !== null) resourcesUsed[traitId] = value;
    }
  }
  return clampSessionToRules(
    {
      schemaVersion: SESSION_SCHEMA_VERSION,
      characterId,
      hp: {
        current: numberOr(hp.current, defaults.hp.current),
        temp: numberOr(hp.temp, defaults.hp.temp)
      },
      hitDice: { used: numberOr(hitDice.used, 0) },
      spellSlotsUsed: {
        1: numberOr(slots["1"], 0),
        2: numberOr(slots["2"], 0),
        3: numberOr(slots["3"], 0)
      },
      channelDivinity: { used: numberOr(channel.used, 0) },
      inspiration: data.inspiration === true,
      deathSaves: {
        successes: numberOr(deathSaves.successes, 0),
        failures: numberOr(deathSaves.failures, 0)
      },
      conditions: Array.isArray(data.conditions) ? data.conditions.filter((condition) => typeof condition === "string") : [],
      resourcesUsed
    },
    character
  );
}
function clampSessionToRules(state, character) {
  const combat = character.combat;
  const clamped = {
    ...state,
    hp: {
      current: clamp(state.hp.current, 0, combat.maxHitPoints),
      temp: clamp(state.hp.temp, 0, TEMP_HP_MAX)
    },
    hitDice: { used: clamp(state.hitDice.used, 0, combat.hitDice.total) },
    spellSlotsUsed: {
      1: clamp(state.spellSlotsUsed[1], 0, character.spells.slotsMax[1]),
      2: clamp(state.spellSlotsUsed[2], 0, character.spells.slotsMax[2]),
      3: clamp(state.spellSlotsUsed[3], 0, character.spells.slotsMax[3])
    },
    channelDivinity: { used: clamp(state.channelDivinity.used, 0, CHANNEL_DIVINITY_MAX) },
    deathSaves: {
      successes: clamp(state.deathSaves.successes, 0, DEATH_SAVE_MAX),
      failures: clamp(state.deathSaves.failures, 0, DEATH_SAVE_MAX)
    },
    resourcesUsed: { ...state.resourcesUsed }
  };
  for (const [traitId, used] of Object.entries(clamped.resourcesUsed)) {
    const max = character.traits.find((trait) => trait.id === traitId)?.uses;
    if (max !== void 0) clamped.resourcesUsed[traitId] = clamp(used, 0, max);
  }
  return clamped;
}

// backend/session.ts
var { DynamoDBClient } = ddbClient;
var { DynamoDBDocumentClient, GetCommand, PutCommand } = libDynamo;
var TABLE_NAME = process.env.SESSIONS_TABLE ?? "";
var MANIFEST_URL = process.env.MANIFEST_URL ?? "";
var SITE_URL = process.env.SITE_URL ?? "";
var MAX_BODY_BYTES = 16384;
var BUILD_TAG = "fase15a-r21c";
var doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
console.log(`fichass-session init [${BUILD_TAG}]`);
var json = (statusCode, payload) => ({
  statusCode,
  body: JSON.stringify(payload)
});
var CHARACTER_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var manifestCache = null;
var MANIFEST_TTL_MS = 6e4;
var characterCache = /* @__PURE__ */ new Map();
var CHARACTER_TTL_MS = 6e4;
async function fetchJson(url) {
  const response = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`fetch ${url} \u2192 HTTP ${response.status}`);
  return await response.json();
}
async function allowedCharacterIds() {
  if (manifestCache && Date.now() - manifestCache.at < MANIFEST_TTL_MS) {
    return manifestCache.ids;
  }
  const manifest = await fetchJson(MANIFEST_URL);
  const ids = new Set(manifest.characters.map((character) => character.id));
  manifestCache = { at: Date.now(), ids };
  return ids;
}
async function getCharacter(id) {
  const cached = characterCache.get(id);
  if (cached && Date.now() - cached.at < CHARACTER_TTL_MS) return cached.character;
  const character = await fetchJson(`${SITE_URL}/characters/${id}.json`);
  characterCache.set(id, { at: Date.now(), character });
  return character;
}
var handler = async (event) => {
  try {
    if (!TABLE_NAME || !MANIFEST_URL || !SITE_URL) {
      return json(500, { error: "misconfigured" });
    }
    const method = event.requestContext?.http?.method ?? "GET";
    if (method === "OPTIONS") return { statusCode: 204, body: "" };
    if (method === "GET") return await handleGet(event.queryStringParameters ?? {});
    if (method === "PATCH") return await handlePatch(event.body ?? "");
    return json(405, { error: "method_not_allowed" });
  } catch (error) {
    console.error("fichass-session internal error", error);
    return json(500, { error: "internal_error" });
  }
};
async function handleGet(query) {
  const characterId = query.characterId ?? "";
  if (!CHARACTER_ID_RE.test(characterId)) {
    return json(400, { error: "validation_failed", detail: "invalid characterId" });
  }
  const ids = await allowedCharacterIds();
  if (!ids.has(characterId)) {
    return json(400, { error: "validation_failed", detail: "unknown characterId" });
  }
  const result = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: { characterId } }));
  const item = result.Item;
  if (!item) return json(404, { error: "not_found" });
  return json(200, { state: item.state, version: item.version, updatedAt: item.updatedAt });
}
async function handlePatch(rawBody) {
  if (rawBody.length > MAX_BODY_BYTES) {
    return json(400, { error: "validation_failed", detail: "body too large" });
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "validation_failed", detail: "invalid JSON" });
  }
  const characterId = typeof body.characterId === "string" ? body.characterId : "";
  if (!CHARACTER_ID_RE.test(characterId)) {
    return json(400, { error: "validation_failed", detail: "invalid characterId" });
  }
  const baseVersion = typeof body.baseVersion === "number" && Number.isInteger(body.baseVersion) && body.baseVersion >= 0 ? body.baseVersion : null;
  if (baseVersion === null) {
    return json(400, { error: "validation_failed", detail: "baseVersion must be an integer \u2265 0" });
  }
  const ids = await allowedCharacterIds();
  if (!ids.has(characterId)) {
    return json(400, { error: "validation_failed", detail: "unknown characterId" });
  }
  if (typeof body.state !== "object" || body.state === null) {
    return json(400, { error: "validation_failed", detail: "state must be an object" });
  }
  const rawState = body.state;
  if (rawState.schemaVersion !== SESSION_SCHEMA_VERSION) {
    return json(400, { error: "validation_failed", detail: "schemaVersion must be 1" });
  }
  if (rawState.characterId !== characterId) {
    return json(400, { error: "validation_failed", detail: "state.characterId mismatch" });
  }
  const character = await getCharacter(characterId);
  const state = sanitizeSessionState(body.state, character, characterId);
  const current = await doc.send(new GetItemCommand({ TableName: TABLE_NAME, Key: { characterId } }));
  const item = current.Item;
  if (item && item.version !== baseVersion) {
    return json(409, {
      error: "version_conflict",
      state: item.state,
      version: item.version,
      updatedAt: item.updatedAt
    });
  }
  if (!item && baseVersion !== 0) {
    return json(409, { error: "version_conflict", state: null, version: 0, updatedAt: null });
  }
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const nextVersion = baseVersion + 1;
  try {
    await doc.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { characterId, state, version: nextVersion, updatedAt },
      // Optimistic concurrency (D-55): either the first write ever
      // or the exact expected version — a raced writer gets 409.
      ConditionExpression: item ? "version = :baseVersion" : "attribute_not_exists(characterId)",
      ExpressionAttributeValues: item ? { ":baseVersion": baseVersion } : void 0
    }));
  } catch (error) {
    if (isConditionalFailure(error)) {
      return json(409, { error: "version_conflict", state: null, version: 0, updatedAt: null });
    }
    throw error;
  }
  return json(200, { version: nextVersion, updatedAt });
}
function isConditionalFailure(error) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "ConditionalCheckFailedException";
}
export {
  handler
};
