# Tasks — Fase 06 Detalle y contadores

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | `src/session.ts`: estado vivo + update parcial + persistencia/reset | done | implementador | OK usuario 2026-11-18 (D-27) | defaultSessionState migrado; patchSession con clamp de reglas; localStorage versionado; reset |
| T-02 | Contadores editables (+/− accesibles, límites de regla, sincronizados) | done | implementador + orquestador (enmienda) | OK usuario 2026-11-18 (D-27; Fortuna validada aparte) | steppers hp/temp/slots/dados/canal; dots de muerte (bug de handler corregido por orquestador); checkbox inspiración; 12 condiciones oficiales togglables; Fortuna del Erudito 0/1 en Rasgos (enmienda, D-27) |
| T-03 | Hoja de detalle de conjuros (bottom sheet accesible) | done | implementador | OK usuario 2026-11-18 (D-28) | aria-modal + foco atrapado + Esc/overlay/✕; foco devuelto al chip; verificado en navegador (title "Llama sagrada") |
| T-04 | Verificación de persistencia/reset + visual 390×844 + capturas | done | orquestador | OK usuario 2026-11-18 | persistencia/recarga/reset verificados dinámicamente; capturas no disponibles (limitación de harness, ver deviations de la spec) |
| T-05 | Compuertas + revisor fresh-eyes C1–C6 + D-27/D-28 + INDEX al cierre | done | orquestador + revisor | — | lint/build/check PASS; revisor **PASS with remarks**: 1 major resuelto por orquestador (restauración de foco tras re-render parcial, I5) + minors resueltos (concordancia labels dots, enmienda de redacción C5) y deudas anotadas (acoplamiento RESOURCE_FORTUNA, import circular blocks⇄session → Fase 07/08) |
