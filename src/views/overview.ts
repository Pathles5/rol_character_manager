/* ============================================================
   FichaSS — overview view (Phase 10, T-03 / D-33).
   Lists every character of characters-manifest.json (ONE fetch)
   as native hash links: keyboard navigation and focus come for
   free from the <a> (constitution I5).

   React-like states over the same shell:
   - loading: skeleton card pulsing with the current skin
     (static under prefers-reduced-motion);
   - empty: manifest [] → amiable "add a JSON" message;
   - error: fetch/manifest failure → amiable card, no crash;
   - success: one .card.character-card per entry.
   Paints ALL of its DOM (appbar included, no mode chips) into
   the container given by the router.
   ============================================================ */

import { escapeHtml, loadManifest, type ManifestEntry } from '../lib/manifest';

/** View shell: appbar (title + "Personajes", no mode chips)
    plus the main grid that every state reuses. */
function shell(mainHtml: string): string {
  return `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS</strong><span> · Personajes</span></div>
  </header>
  <main class="sheet-grid" id="overview">
${mainHtml}
  </main>`;
}

function skeletonHtml(): string {
  return `    <div class="card skeleton" aria-hidden="true">
      <span class="skeleton-line"></span>
      <span class="skeleton-line"></span>
    </div>`;
}

function cardHtml(entry: ManifestEntry): string {
  return `    <a class="card character-card" href="#/c/${entry.id}">
      <div class="portrait" aria-hidden="true">${escapeHtml(entry.initials)}</div>
      <div class="identity-lines">
        <span class="display">${escapeHtml(entry.name)}</span>
        <p class="dim">${escapeHtml(entry.class)} ${entry.level}</p>
      </div>
    </a>`;
}

/** Paints the success/empty/error content into the grid. */
function paint(root: HTMLElement, mainHtml: string, busy: boolean): void {
  const main = root.querySelector<HTMLElement>('#overview');
  if (!main) return;
  main.innerHTML = mainHtml;
  main.setAttribute('aria-busy', String(busy));
}

const EMPTY_HTML = `    <div class="card">
      <h1 class="display">Aún no hay personajes</h1>
      <p class="dim">Añade un JSON a public/characters/ y haz push: el build lo valida y aparecerá aquí.</p>
    </div>`;

const ERROR_HTML = `    <div class="card error-view">
      <h1 class="display">No se pudo cargar el listado</h1>
      <p class="dim">Falta o es inválido characters-manifest.json (se genera en el build) — ejecuta npm run build y recarga.</p>
    </div>`;

/** Overview route: appbar + manifest listing. The router mounts
    this view in a fresh container, so a slow fetch finishing
    after a newer navigation only touches a detached node (DOM);
    the hash-token guard additionally keeps module state and the
    live view untouched (review major 2, Phase 10). */
export async function overviewView(root: HTMLElement): Promise<void> {
  const hashAtStart = window.location.hash;
  const stale = (): boolean => window.location.hash !== hashAtStart;
  root.innerHTML = shell(skeletonHtml());

  try {
    const characters = await loadManifest();
    if (stale()) return;
    if (characters.length === 0) {
      paint(root, EMPTY_HTML, false);
    } else {
      paint(root, characters.map(cardHtml).join('\n'), false);
    }
  } catch {
    if (stale()) return;
    paint(root, ERROR_HTML, false);
  }
}
