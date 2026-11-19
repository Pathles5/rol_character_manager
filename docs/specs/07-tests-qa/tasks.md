# Tasks — Fase 07 Tests y QA

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Setup Vitest (devDependency, script `test`, config) + tests de derivados y validador | done | implementador | OK usuario 2026-11-18 (D-29) | vitest ^3.2.4 + jsdom ^26; node global + jsdom per-file; derivados 16 + validador 13 tests |
| T-02 | Tests de matriz de filtros (§6) y coherencia JSON↔TS (deuda D-21) | done | implementador | OK usuario 2026-11-18 (D-29) | matriz como tabla de control §6 (7 tests); coherencia leyendo el fixture en runtime (15 tests, comparación directa) |
| T-03 | Tests de migración/clamps de sesión + restauración de foco | done | implementador | OK usuario 2026-11-18 (D-29) | 21 tests jsdom: defaults, clamps, applyStepper, migración (versión≠1, characterId ajeno, JSON roto), y foco restaurado tras re-render (major de Fase 06 → test real) |
| T-04 | QA manual 4 modos × 3 viewports + incidencias | done | orquestador + usuario | OK usuario 2026-11-19 ("todo ok") | checklist completa: 4 modos con reflujo, persistencia/recarga, reset, dots de muerte, edición por teclado, hoja de detalle, tablet/escritorio; 1 incidencia cosmética detectada y resuelta en la sesión (dot de inspiración desalineado → recolocado en identity-lines, D-30) |
| T-05 | Compuertas + revisor fresh-eyes C1–C5 + D-29 + INDEX al cierre | done | orquestador + revisor | — | lint/test 72/72/build/check PASS (orquestador) + revisor **PASS with remarks** (0 majors; minors resueltos: script preview, selector de foco acotado, orden de DECISIONS.md restaurado) |
