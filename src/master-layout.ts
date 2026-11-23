/* ============================================================
   FichaSS — master layout (Fase 16, D-58).

   Pure UI state of the MASTER view, persisted in the master's
   localStorage (spec 16 decision 4): group composition and
   row order, plus which rows are minimized. Changing device →
   re-configure in seconds; zero backend.

   Invariants: every character id appears AT MOST ONCE across
   `ungrouped` + all `groups[].members`; `minimized` is a subset
   of known ids. loadLayout sanitizes hostile/legacy payloads.
   ============================================================ */

export interface MasterGroup {
  id: string;
  name: string;
  members: string[];
}

export interface MasterLayout {
  groups: MasterGroup[];
  /** Character ids without a group (order matters). */
  ungrouped: string[];
  /** Character ids rendered collapsed. */
  minimized: string[];
}

const KEY = 'fichass-master-layout-v1';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

/** Normalizes a raw layout: drops junk, dedupes membership (first
    occurrence wins) and removes empty groups. */
export function normalizeLayout(raw: unknown): MasterLayout {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const keep = (ids: string[]): string[] => {
    const result: string[] = [];
    for (const id of ids) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  };

  const groups: MasterGroup[] = [];
  if (Array.isArray(data.groups)) {
    for (const rawGroup of data.groups) {
      const group = (typeof rawGroup === 'object' && rawGroup !== null ? rawGroup : {}) as Record<string, unknown>;
      const name = typeof group.name === 'string' ? group.name.trim() : '';
      const id = typeof group.id === 'string' ? group.id : '';
      if (!name || !id) continue;
      const members = isStringArray(group.members) ? keep(group.members) : [];
      groups.push({ id, name, members });
    }
  }
  const ungrouped = isStringArray(data.ungrouped) ? keep(data.ungrouped) : [];
  const minimized = isStringArray(data.minimized) ? data.minimized.filter(id => seen.has(id)) : [];
  return { groups, ungrouped, minimized };
}

export function loadLayout(): MasterLayout {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeLayout(JSON.parse(raw)) : { groups: [], ungrouped: [], minimized: [] };
  } catch {
    return { groups: [], ungrouped: [], minimized: [] };
  }
}

export function saveLayout(layout: MasterLayout): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable: layout lives for the session only.
  }
}

/** Fresh group id (no crypto dependency needed). */
export function newGroupId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
