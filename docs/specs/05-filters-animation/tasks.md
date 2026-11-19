# Tasks — Fase 05 Filtros y animación

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | `src/filters.ts`: modo activo + aplicación de matriz + FLIP | done | implementador | OK usuario 2026-11-17 (D-25/D-26) | FLIP completo con guardia reduced-motion; cancelación de timers y transforms (sin estados fantasma); no re-render de contenido |
| T-02 | Chips → botones accesibles (`aria-pressed`, foco, activo único) | done | implementador | OK usuario 2026-11-17 | 4 `<button type="button">`; syncChips en filters.ts; verificado en los 4 modos |
| T-03 | Layout compacto identity (combate/descanso) + role destacado (mesa) + limpieza `.b-death` | done | implementador | OK usuario 2026-11-17 | `.is-compact`/`.is-highlight` vía syncBlockVariants; 4 reglas muertas `.b-death` eliminadas |
| T-04 | Verificación visual de los 4 modos a 390×844 + capturas + verificación de animación | done | orquestador | OK usuario 2026-11-17 | runtime: 12/5/3/7 secciones exactas por matriz; overflowX=false en los 4; capturas `fase-05-modo-{combate,descanso,mesa}.jpeg`; detección y corrección del bloque `rest` ausente (enmienda operativa: renderSheet 13 pre-ocultos) |
| T-05 | Compuertas + revisor fresh-eyes C1–C6 + D-25/D-26 + INDEX al cierre | done | orquestador + revisor | — | lint/build/check PASS; revisor **PASS with remarks** (0 majors, 2 minors documentados como deudas Fase 07/08) |
