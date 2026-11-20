# Tasks — Fase 11 Tiradas con dados animados

Estado de fase: approved (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | `src/dice.ts`: parser de notación + roller puro + tests | done | orquestador | OK usuario 2026-11-20 | 9 tests: notaciones del fixture (`1d8+4`, `2d6+3`, `1d4+4`, `1d12+4`, `1d6`) + rechazos + roller determinista con random inyectado |
| T-02 | Diálogo de tirada (dados CSS animados + total + reroll/cerrar) y botón de dado en los ataques | done | orquestador | OK usuario 2026-11-20 (D-45) | botón de dado solo si el daño parsea (escapeHtml); diálogo con dados escalonados + total; reroll/cerrar/Esc/backdrop; foco devuelto |
| T-03 | Accesibilidad (foco, Esc, reduced-motion) y verificación visual 390px | done | orquestador + usuario | OK usuario 2026-11-20 | `prefers-reduced-motion` → dados estáticos; Esc/backdrop cierran; foco devuelto al botón que abrió; verificación pendiente del usuario en dev/prod |
| T-04 | Compuertas + revisor fresh-eyes + D-44 + INDEX al cierre | done | orquestador + revisor(pendiente) | — | lint · **95/95 tests** · build · check PASS; D-45 registrada; INDEX approved; revisor fresh-eyes pendiente por límites del proveedor (D-15) |
