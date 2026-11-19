# Tasks — Fase 04 Ficha estática

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Catálogo `src/data/skills.ts` (18 skills id/label/ability) y refactor de `derived.ts` para usarlo | done | implementador | OK usuario 2026-11-17 (D-23) | 18 skills con ability PHB 2024 correcta; 6 ids del fixture intactos; derived.ts sin mapa local |
| T-02 | Render de bloques `src/render/` (bloques visibles de BLOCK_CONFIG en orden weight) + orquestador `sheet.ts` | done | implementador | OK usuario 2026-11-17 (D-24) | 13 funciones de render; sheet ordena/filtra por matriz; `data-modes` sembrado; firma (character, derived, session) con defaultSessionState; characterId derivado (corr. minor) |
| T-03 | index.html y smoke test anterior reemplazados por la ficha completa (aventura por defecto) | done | implementador | OK usuario 2026-11-17 | appbar + contenedor vacío, todo render en runtime; 0 valores de personaje en HTML |
| T-04 | Verificación visual 390×844 + captura de evidencia | done | orquestador | OK usuario 2026-11-17 (propuesta validada) | mosaico iframes 390×844: 12 secciones, overflowX=false, orden correcto; captura en `docs/design/capturas/fase-04-ficha-390x844.jpeg` |
| T-05 | Compuertas + revisor fresh-eyes C1–C6 + D-23/D-24 + INDEX al cierre | done | orquestador + revisor | — | lint/build/check PASS; revisor **PASS with remarks** (0 majors, 5 minors resueltos: registro documental D-23/D-24, efecto C4 en enmienda, comentario "13" corregido, characterId derivado, CSS muerto .b-death anotado para Fase 05) |
