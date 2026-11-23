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
| 08 | Pulido y entrega | approved | Deudas limpiadas (D-31, ampliada con drawer/flag CSS muerto), informe docs/ENTREGA.md (D-32); revisor APROBADO CON OBSERVACIONES (minors resueltos); **v1 cerrada y etiquetada v0.0.1** (commit 649013a, pushed) |
| 10 | Multi-personaje (JSON + vista raíz + routing) | verified | Multi-personaje completo (D-33/D-35/D-36/D-37/D-38): router hash, overview, manifest validado en build, sesión por id, 4 personajes publicados, rasgos activables; revisor PASS (tras 1 corrección); QA usuario "todo ok"; 86/86 tests |
| 09 | Infra AWS SAM + CI/CD | approved | Infra desplegada y verificada: stack fichass-infra (S3+OIDC+SSM, D-34/D-39/D-40), workflow success (gates + sync), URL pública HTTP 200; alerta de facturación 3€/10€ (variante aceptada del usuario); cadenas de fallo documentadas (spec deviations) |
| 10.1 | Pulido de usabilidad v0.1.1 (D-41/D-42/D-43) | approved | Appbar con iconos de modo, tira de PG en 3 filas, Reset con confirmación, fixes de overflow; desplegado en producción y verificado (CSS con .mode-btn/.confirm-dialog en la URL pública) |
| 11 | Tiradas con dados animados | approved | Implementado (D-45/D-46): `src/dice.ts` (parser+roller), dados de daño en ataques y conjuros, **[d20] de acertar con crítico natural**; 96/96 tests; pushes v0.1.2/v0.1.3 |
| 12 | Tirada de iniciativa + PG temp con tira rápida | approved | D-50: dado d20 en el stat Iniciativa (notación ASCII, helper compartido `diceNotation`) y tira rápida de 3 filas en PG temp en sus dos ubicaciones (±1, ±10, vaciar con icono refresh — decisión del usuario); 101/101 tests; QA visual del usuario: OK (v0.1.5 en producción) |
| 13 | Tiradas de salvaciones + salvación de muerte | verified | D-51: dado d20 junto a cada una de las 6 salvaciones en defense y d20 pelado de muerte en el subhead (nat 20 → ¡CRÍTICO!, nat 1 → ¡fallo doble!, solo en la muerte — `rollFlavor` pura en dice.ts, refactor del crítico inline); 107/107 tests; QA visual del usuario pendiente |
| 14 | Ingesta de personajes (ficha → JSON) | approved | D-52: vía agente (coste €0, I2 intacta), prompt maestro versionado en `docs/ingest/PROMPT.md` (referencias vivas a types.ts + 4 JSON few-shot; regla autoriado vs derivado; checklist anti-invención; revisión humana obligatoria); dry-run punta a punta OK (diff = solo `x_demoNotes`, 108/108 tests con el personaje ingestado en el manifest); vía CI/CD documentada como futura condicionada a enmienda I2 |
| 15 | Persistencia de estados (DynamoDB + Lambda) | approved | **COMPLETA (15a+15b+15c) y APROBADA**: infra self-healing por CI (stacks data/session separados), sync local-first con debounce trailing + cola de reintentos + toast de conflicto 409 (dos botones), QA del usuario APROBADO, revisor fresh-eyes aplicado (major de navegación con toast abierto corregido en initSync) + review qwen4-max del sync (3 bugs corregidos: throttle→debounce, pausa en flush, guarda inFlight); Ingesta x4 de la partida real (D-52): Nigra, Uldrak, Nissa, Yinhao cargados; ejemplos demo fuera del público (fixture en tests/fixtures); 125/125 tests; **tag v0.2.0** |
Convenciones:
- Cada fase vive en `docs/specs/NN-<nombre>/` con `spec.md` y `tasks.md`.
- Al terminar una fase: actualizar esta tabla y registrar decisiones en `DECISIONS.md`.
- **`README.md` en la raíz**: guía para levantar la app (requisitos, comandos, despliegue, estructura y punteros a la documentación). Referenciado desde aquí y desde las specs de entrega (Fase 08); mantenerlo al día con los scripts del `package.json`.
- El orden de filas refleja el orden de ejecución acordado con el usuario: la Fase 10 va ANTES que la 09 (número ≠ orden).

| 16 | Vista del Master (panel de grupo) | approved | **COMPLETA y APROBADA** (diseño validado por el usuario): edición con deltas relativos y reintento 409, muerte saves editables, condiciones editables, grupos drag & drop con alternativa de botones, minimizar, layout persistido en la BD de sesión, indicador hace-Xs, tests 144/144 y compuertas en verde; desplegado en producción vía pipeline. Enmienda 1 (D-59): layout del master persistido en la BD de sesión (id reservado master-layout) con caché local; Enmienda 2 (D-60): alcance editable completo (paridad con el jugador). Revisor fresh-eyes: corrección 1 aplicada (D1 flush serializado, D2 poll detenido, D3 enmiendas) + re-revisión PASS/GO; QA del usuario completado (8 tandas); límites conocidos anotados en la spec (sección Amendments). **tag v0.3.0** |

Fases futuras (fuera de la v1 del brief, para memoria - sin filas de tabla para que la compuerta no las trate como activas):

- **Dados custom rápidos**: desplegable con lista de dados (1d20, 2d6, 1d4, 1d100...) para tiradas rápidas fuera de ataques/conjuros - petición del usuario (2026-11-20, durante la ingesta de Patx Vane). Encaja con el diálogo de dados de la Fase 11.
- **Upgrade del runtime Lambda a Node.js 26**: cuando AWS publique `nodejs26.x`, subir `Runtime` en `infra/session.yaml` y el `--target` de `npm run build:backend` (package.json) en el mismo cambio - petición del usuario (2026-11-23, Fase 15a). El bundle CJS de esbuild se ajusta a `--target=node26` sin más cambios.
