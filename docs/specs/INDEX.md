# INDEX — Specs por fase

Fuente de verdad del progreso. Una fila por fase: título, estado y pendientes.
Estados: `spec` → `implement` → `verified` (+ `approved` si requiere visto del usuario).

| Fase | Título | Estado | Pendientes |
|---|---|---|---|
| 00 | Mockup de estilo | approved | — (cerrada; deuda anotada y recogida en la spec de Fase 01) |
| 01 | Modelo de datos | verified | Modelo aprobado con revisor fresh-eyes PASS with remarks (4 minors resueltos por orquestador); D-16/D-17; check PASS |
| 02 | Scaffold y sistema de diseño | verified | Scaffold Vite+TS (D-18), Inter auto-hospedada (D-19), CSS portado de variante A (D-20); lint/build/check en verde; revisor PASS with remarks (minors resueltos); visual smoke test 390×844 verificado |
| 03 | Datos en código | verified | Tipos 1:1 con D-16, character/blockConfig en TS, derivados y validador verificados mecánicamente (D-21/D-22); revisor PASS with remarks (minors resueltos); lint/build/check PASS |
| 04 | Ficha estática | verified | Ficha completa renderizada desde datos (12 bloques aventura según D-16); revisor PASS with remarks (minors resueltos); captura 390×844; D-23/D-24 |
| 05 | Filtros y animación | verified | Reflujo FLIP real (D-25) con matriz única D-16; 4 modos verificados en navegador con capturas; revisor PASS with remarks; D-26 |
| 06 | Detalle y contadores | verified | Contadores editables con persistencia/reset verificados dinámicamente; hoja de detalle accesible; Fortuna añadida (enmienda); revisor PASS with remarks (major foco resuelto); D-27/D-28 |
| 07 | Tests y QA | verified | 72 tests en verde (D-29); revisor PASS with remarks; QA manual aprobado por el usuario; D-30 (inspiración como dot en identidad) |
| 08 | Pulido y entrega | decided | Deudas limpiadas (D-31, ampliada con drawer/flag CSS muerto), informe docs/ENTREGA.md (D-32); revisor APROBADO CON OBSERVACIONES (minors resueltos); compuertas en verde — pendiente visto final del usuario |

Convenciones:
- Cada fase vive en `docs/specs/NN-<nombre>/` con `spec.md` y `tasks.md`.
- Al terminar una fase: actualizar esta tabla y registrar decisiones en `DECISIONS.md`.
- **`README.md` en la raíz**: guía para levantar la app (requisitos, comandos, despliegue, estructura y punteros a la documentación). Referenciado desde aquí y desde las specs de entrega (Fase 08); mantenerlo al día con los scripts del `package.json`.

Fases futuras (fuera de la v1 del brief, para memoria):

| Fase | Título | Estado | Pendientes |
|---|---|---|---|
| 09 | Infra AWS + CI/CD + IaC (S3, Actions, CloudFormation; invariante Coste €0 D-11) | waiting | Definir `devops.md` hoy (D-12): revisar y ajustar sus permisos como primera tarea de esta fase |
