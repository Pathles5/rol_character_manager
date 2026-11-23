/* ============================================================
   FichaSS — hash router (Phase 10, T-01 / D-33).
   Pure route parsing, testable without DOM: the hash string in,
   a discriminated Route union out. The router owns NO state:
   src/app.ts listens to hashchange and mounts one view per
   route into the #app root.
   Routes: '' | '/' → overview · '/c/<id>' → character (id
   validated, lowercase kebab: the manifest's file-name id) ·
   anything else → not-found (amiable error view).
   ============================================================ */

/** Valid character ids: lowercase letters, digits and hyphens.
    The same pattern the manifest generator enforces on file
    names, so a route can never reference a file the build
    would have rejected. */
export const CHARACTER_ID_PATTERN = /^[a-z0-9-]+$/;

export type Route =
  | { name: 'overview' }
  | { name: 'character'; id: string }
  | { name: 'master' }
  | { name: 'not-found' };

/** Parses one location hash ('#', '' or '#/...' forms) into a
    Route. Pure: no window access, no side effects. */
export function parseHash(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { name: 'overview' };
  if (path === '/master') return { name: 'master' };

  const match = /^\/c\/([^/]+)$/.exec(path);
  if (match && CHARACTER_ID_PATTERN.test(match[1])) {
    return { name: 'character', id: match[1] };
  }
  return { name: 'not-found' };
}
