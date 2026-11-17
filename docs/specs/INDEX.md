# INDEX — Specs por fase

Fuente de verdad del progreso. Una fila por fase: título, estado y pendientes.
Estados: `spec` → `implement` → `verified` (+ `approved` si requiere visto del usuario).

| Fase | Título | Estado | Pendientes |
|---|---|---|---|
| 00 | Mockup de estilo | approved | — (cerrada; deuda anotada y recogida en la spec de Fase 01) |
| 01 | Modelo de datos | verified | Modelo aprobado con revisor fresh-eyes PASS with remarks (4 minors resueltos por orquestador); D-16/D-17; check PASS |
| 02 | Scaffold y sistema de diseño | verified | Scaffold Vite+TS (D-18), Inter auto-hospedada (D-19), CSS portado de variante A (D-20); lint/build/check en verde; revisor PASS with remarks (minors resueltos); visual smoke test 390×844 verificado |
| 03 | Datos en código | verified | Tipos 1:1 con D-16, character/blockConfig en TS, derivados y validador verificados mecánicamente (D-21/D-22); revisor PASS with remarks (minors resueltos); lint/build/check PASS |
| 04 | Ficha estática | spec | Spec escrita; pendiente propose·validate T-01–T-05 |
| 05 | Filtros y animación | — | |
| 06 | Detalle y contadores | — | |
| 07 | Tests y QA | — | |
| 08 | Pulido y entrega | — | |

Convenciones:
- Cada fase vive en `docs/specs/NN-<nombre>/` con `spec.md` y `tasks.md`.
- Al terminar una fase: actualizar esta tabla y registrar decisiones en `DECISIONS.md`.

Fases futuras (fuera de la v1 del brief, para memoria):

| Fase | Título | Estado | Pendientes |
|---|---|---|---|
| 09 | Infra AWS + CI/CD + IaC (S3, Actions, CloudFormation; invariante Coste €0 D-11) | waiting | Definir `devops.md` hoy (D-12): revisar y ajustar sus permisos como primera tarea de esta fase |
