/* ============================================================
   FichaSS — application entry (Phase 10, T-01 / D-33).
   Hash router host: listens to hashchange, parses the route
   and mounts ONE view into the #app root. Each mount replaces
   the root content with a fresh container, so:

   - an async view that resolves after a newer navigation only
     writes into a detached node (no stale clobbering);
   - every listener a view registers lives on the view's own
     fresh DOM and dies with it (the one document-level
     handler of the character view is detached by the view).

   Views paint ALL of their DOM (appbar included); the shell
   owns nothing but the mount point.
   ============================================================ */

import './styles/tokens.css';
import './styles/base.css';
import './assets/fonts/fonts.css';

import { parseHash, type Route } from './router';
import { overviewView } from './views/overview';
import { characterView } from './views/character';

/** Amiable not-found view (unknown hash paths): plain card with
    a way back, no crash and no partial content (D-35 spirit). */
function notFoundView(root: HTMLElement): void {
  root.innerHTML = `
  <header class="appbar">
    <div class="appbar-home"><strong>FichaSS</strong></div>
  </header>
  <main class="sheet-grid" id="overview">
    <div class="card error-view">
      <h1 class="display">Página no encontrada</h1>
      <p class="dim">La ruta del enlace no existe o no es válida.</p>
      <a href="#/">← volver a personajes</a>
    </div>
  </main>`;
}

/** Mounts one route: fresh container per mount (see header). */
async function mountRoute(app: HTMLElement, route: Route): Promise<void> {
  const container = document.createElement('div');
  app.replaceChildren(container);
  window.scrollTo(0, 0);

  if (route.name === 'overview') {
    await overviewView(container);
  } else if (route.name === 'character') {
    await characterView(container, route.id);
  } else {
    notFoundView(container);
  }
}

function boot(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) {
    console.error('FichaSS: missing #app mount point in index.html');
    return;
  }

  const mount = (): void => {
    void mountRoute(app, parseHash(window.location.hash));
  };

  window.addEventListener('hashchange', mount);
  mount();
}

boot();
