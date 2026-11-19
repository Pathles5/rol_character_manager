# Tasks — Fase 08 Pulido y entrega

Estado de fase: verified (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Limpieza de deudas: CSS muerto `body.m-<modo>`, `@types/node` + import estático, `data-modes` según decisión | done | orquestador | OK usuario 2026-11-19 (D-31) | 0 reglas `.m-*` en base.css; `data-modes` mantenido; @types/node instalado + import estático; lint/test 72/72/build en verde |
| T-02 | Informe final de entrega `docs/ENTREGA.md` | done | orquestador | OK usuario 2026-11-19 (D-32) | informe con entregables por fase, límites v1, deudas referenciadas y despliegue; README ya en raíz (2026-11-18) |
| T-03 | Revisión visual final sobre el build + QA del usuario | done | orquestador + usuario | OK usuario 2026-11-19 | QA manual de Fase 07 aprobado ("todo ok") tras el cambio de inspiración (D-30); limitación: sin sesión de navegador del harness para capturas nuevas |
| T-04 | Compuertas + revisor fresh-eyes C1–C5 + D-31/D-32 + INDEX final | done | orquestador + revisor | — | lint/test 72/72/build/check PASS; dist sin recursos externos; revisor **APROBADO CON OBSERVACIONES** (0 majors): minors resueltos por orquestador (clase huérfana body.m-aventura retirada; CSS muerto residual drawer/hub-list/flag-input eliminado, comentarios actualizados); `npm run test` ejecutado por orquestador tras cada cambio (72/72) |
