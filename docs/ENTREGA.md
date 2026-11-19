# Entrega — FichaSS v1 (2026-11-19)

Informe final de la versión 1. La fuente de instrucciones para ejecutar/desplegar es el [`README.md`](../README.md); aquí queda el cierre de proceso: qué es, qué incluye, límites conocidos y deudas abiertas.

## Qué es

App web **100 % estática** (sin backend) para consultar en partida la ficha de un personaje de **D&D 5e (2024)**: ficha completa, 4 modos (combate / aventura / descanso / mesa) con reflujo animado, contadores de partida editables con persistencia local y hoja de detalle de conjuros. Personaje único incluido como demo: **Seren Aldaard**, clériga humana de la Vía de la Vida, nivel 5 (datos validados contra las reglas 2024).

## Qué incluye (por fase)

| Fase | Entrega | Estado |
|---|---|---|
| 00 | Mockup de estilo ("Porcelana oscura", D-13) + tokens congelados (D-14) | approved |
| 01 | Modelo de datos: `character` + `sessionState` (D-16), contrato `POST /characters` (D-17) | verified |
| 02 | Scaffold Vite + TypeScript vanilla (D-18), Inter auto-hospedada (D-19), CSS portado de la variante A (D-20) | verified |
| 03 | Datos en código tipados + derivados + validador de cliente (D-21/D-22) | verified |
| 04 | Ficha completa renderizada desde datos (D-23/D-24) | verified |
| 05 | Filtros por modo con reflujo FLIP real (D-25/D-26) | verified |
| 06 | Contadores editables + persistencia/reset + hoja de detalle (D-27/D-28) | verified |
| 07 | 72 tests (Vitest, D-29) + QA manual aprobado; inspiración como dot (D-30) | verified |
| 08 | Pulido de deudas + este informe (D-31/D-32) | en cierre |

Proceso completo, decisiones y trazabilidad: [`docs/specs/INDEX.md`](specs/INDEX.md) y [`DECISIONS.md`](../DECISIONS.md).

## Límites conocidos de la v1

- **Un personaje**: el demo va en código (`src/data/character.ts`, transcripción del fixture JSON — coherencia mecanizada por test). No hay selector ni creación de personajes.
- **Sin backend**: el contrato `POST /characters` está documentado (D-17) y espejado en el validador de cliente, pero no implementado.
- **Sin edición de ficha**: los datos del personaje son de solo lectura; solo el `sessionState` (contadores) es editable.
- **Descripciones de conjuros**: resúmenes de mesa (no texto legal completo); algunas duraciones anotadas como pendientes en `x_demoNotes` del fixture.
- **Peso/monedas**: informativo, sin capacidad de carga ni cálculo de encumbrimiento.
- **Sin PWA/offline explícito ni i18n**: solo español; localStorage como única persistencia.
- **Accesibilidad**: foco visible/tratado, teclado y `aria-*` en lo interactivo; una auditoría WCAG formal no se ha ejecutado.

## Deudas abiertas (para el futuro, referenciadas)

- **Fase 09 — Infra**: AWS S3 + CI/CD + IaC con invariante Coste €0 (D-11/D-12); el subagente devops ya definido se activa entonces (revisar sus permisos como primera tarea).
- Recomposición desktop por modo si algún día se quiere diseño por-modo en escritorio (el CSS muerto de la era mockup se retiró en D-31; habría que recrearlo con verificación visual).
- `data-modes` en las secciones: metadato mantenido por decisión (D-31), hoy no consumido por `filters.ts`.
- Acoplamiento de `RESOURCE_FORTUNA` al fixture (v1 = un personaje) e importación circular `blocks`⇄`session` (segura hoy, anotada en Fase 06).
- Test de foco dependiente de jsdom (degradar a QA manual si una subida lo rompe, D-29).

## Cómo desplegar

`npm run build` → subir el contenido de `dist/` (rutas relativas, sin recursos externos) a la raíz de un bucket S3 o cualquier hosting estático. Detalles en el [README](../README.md).
