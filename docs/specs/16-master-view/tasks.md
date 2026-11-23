# Tasks — Fase 16 (Vista del Master, diseño validado)

- [x] T-01 Ruta `#/master` + botón de acceso "Vista del Master" en el appbar del overview. (router.ts, app.ts, views/overview.ts)
- [x] T-02 Store multi-personaje `src/master-data.ts`: GET de la sesión de cada personaje del manifest, filas con estado optimista, deltas relativos, clamp por documento real, 409-reintento (re-GET + re-aplicar deltas + re-PATCH, hasta 3), poll que salta filas con deltas pendientes.
- [x] T-03 Filas read-only + refresco manual + polling 15 s (primera checkpoint `672b919`).
- [x] T-04 Edición en filas: PG ±1/±10, PG temp ±1, dados golpe ±1, slots ±1 (niveles con hueco), CD ±1 (casters), muerte saves ±, inspiración toggle, condiciones chips (catálogo 2024), recursos de rasgos ±1 — todo vía DeltaOp. (commit `e57dabf`) (Amendment 2: alcance ampliado a dados/CD/muerte/condiciones/recursos — D-60)
- [x] T-05 Grupos con drag & drop + alternativa de botones (select de grupo + subir/bajar), crear/renombrar/eliminar grupos; minimizar/maximizar; persistencia de layout en localStorage del master (`src/master-layout.ts`). (commit `9490061`)
- [x] T-06 Indicador "actualizado hace Xs" (C6) + tests de `master-data` (deltas, 409-retry re-aplicando deltas sobre estado fresco, clamp por documento, poll salta pendientes) y de `master-layout` (normalización, dedupe): 137/137 en verde; lint + build + check en verde. (commits `15aaa90`, `92de2ac`)
- [x] T-07 QA del usuario (edición, drag & drop, grupos, minimizar, refresh — 8 tandas de QA atendidas) + revisor fresh-eyes (corrección 1: D1 flush serializado, D2 poll detenido, D3 enmiendas) + re-revisión PASS/GO + tag v0.3.0.
