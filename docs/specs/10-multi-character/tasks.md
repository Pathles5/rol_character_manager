# Tasks — Fase 10 Multi-personaje

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Reestructuración de entrada: `#app` raíz, `router.ts` (hash), `app.ts`, extracción de la vista character desde `main.ts` | done | implementador | OK usuario 2026-11-19 (D-33) | parseHash puro (5 tests); app.ts monta en hashchange; main.ts eliminado; vistas async con guard de carrera (review major 2, fix orquestador) |
| T-02 | `public/characters/*.json` (demo incluido) + script de manifest enriquecido con validación en build | done | implementador + orquestador (script, D-06/D-15) | OK usuario 2026-11-19 (D-33) | `scripts/generate-manifest.mjs` (creado por orquestador con apéndice del informe); prebuild genera manifest UTF-8 ok; validación estructural con exit 1 |
| T-03 | Vista overview (`#/`) con estados loading/vacío | done | implementador | OK usuario 2026-11-19 (D-33) | un fetch; tarjetas `<a>` nativas con escapeHtml; skeleton/empty/error |
| T-04 | Vista character (`#/c/<id>`) con loading/error/success + sesión por personaje | done | implementador + orquestador | OK usuario 2026-11-19 (D-33) | flujo v1 portado; sessionKey por id; characterId del estado = id de URL (guard D-16 §4); resetSession re-fija el id (review major 1, fix orquestador) |
| T-05 | Tests: retirar D-21-coherencia; añadir routing/manifest/validación; mantener matriz/migración/foco | done | implementador + orquestador | OK usuario 2026-11-19 (D-33) | 74/74: router 5 · manifest 8 · validate 15 (2 nuevos: manifest + contrato por personaje publicado) · blockConfig 7 · derived 16 · session 23 |
| T-06 | Compuertas + revisor fresh-eyes C1–C6 + D-35/D-36 + QA del usuario + INDEX | done | orquestador + revisor | — | revisor 1ª pasada **FAIL** (2 majors: reset/persistencia, carrera de navegaciones) → fixes del orquestador → 2ª pasada **PASS with remarks**; QA usuario **"todo ok"** con 4 personajes publicados; enmiendas D-37 (hiddenBlocks) y D-38 (trait.uses) durante el QA; 86/86 tests; lint/build/check PASS |
