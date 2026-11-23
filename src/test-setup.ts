/* ============================================================
   FichaSS — vitest setup (Fase 15a, diagnóstico local).

   jsdom >= 26 delega localStorage/sessionStorage en los internos
   de Node (`internal/webstorage`), que no son resolubles dentro
   del worker de vitest en Node >= 25 → `window.localStorage` sale
   undefined y ENSOMBRECE cualquier alternativa (CI con Node 20 no
   lo sufre). Si está roto, se monta un storage EN MEMORIA mínimo
   (clear/get/set/remove — todo lo que los tests usan).
   ============================================================ */

if (typeof window !== 'undefined') {
  const w = window as { localStorage?: unknown; sessionStorage?: unknown };
  const mount = (name: 'localStorage' | 'sessionStorage'): void => {
    if (typeof w[name] !== 'undefined') return;
    const store = new Map<string, string>();
    Object.defineProperty(w, name, {
      value: {
        getItem: (key: string): string | null => store.get(key) ?? null,
        setItem: (key: string, value: string): void => { store.set(key, String(value)); },
        removeItem: (key: string): void => { store.delete(key); },
        clear: (): void => { store.clear(); },
        key: (index: number): string | null => [...store.keys()][index] ?? null,
        get length(): number { return store.size; },
      },
      configurable: true,
    });
  };
  mount('localStorage');
  mount('sessionStorage');
}
