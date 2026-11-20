# Fase 14 — Ingesta de personajes (ficha original → JSON)

## Objetivo

Proceso reproducible y auditable para convertir la ficha original de un
personaje (texto/markdown o foto/PDF) en el JSON del contrato FichaSS,
**asistido por el agente** (decisión del usuario), con el prompt maestro
versionado en el repo y revisión humana obligatoria antes del push.

## Alcance

- `docs/ingest/PROMPT.md`: el prompt maestro — autosuficiente, con referencias
  VIVAS (no copias) al contrato (`src/types.ts`) y a los 4 JSON de
  `public/characters/` como ejemplos few-shot. Incluye: qué se autoria y qué
  deriva el código, tratamiento por formato de entrada, checklist
  anti-invención, protocolo de revisión del usuario y compuertas.
- `docs/specs/14-character-ingestion/`: esta spec y tasks.
- **Sin cambios de código**: la validación ya existe (compuertas lint · test ·
  build/check del manifest) y se reutiliza tal cual.

## Decisión del usuario (validada hoy)

- **Vía A — asistida por agente**: la transformación la ejecuta el agente con
  el prompt del repo. Coste €0 (I2 intacta, sin enmienda). La vía
  **CI/CD con LLM** queda documentada como fase futura **condicionada a que el
  usuario enmiende I2** (coste por tokens + secret de API).
- **Entrada: ambos formatos** (texto/markdown y foto/PDF).
- **Revisión humana siempre**: tras cada ingesta se muestra el JSON completo +
  tabla de números clave para cotejo contra la hoja antes del push.

## Criterios de aceptación

- **C1**: `docs/ingest/PROMPT.md` es autosuficiente y no duplica el contrato
  (referencia `src/types.ts` y los JSON vivos; regla I4 de fuente única).
- **C2**: el proceso está probado de punta a punta con un dry-run: se genera
  una hoja markdown desde un personaje existente, se ingesta siguiendo el
  prompt y el resultado coincide semánticamente con el JSON original
  (diferencias posibles solo de orden de arrays/notas).
- **C3**: el protocolo de revisión está escrito en el prompt (tabla de números
  clave: PG, CA, iniciativa, mods, salvaciones con competencia, rasgos con
  usos, slots, hiddenBlocks, ataques).
- **C4**: la vía CI/CD futura está documentada con su condición explícita
  (enmienda I2) en spec + DECISIONS.
- **C5**: compuertas en verde (check.ps1 + build/test).

## Fuera de alcance

- Vía CI/CD (fase futura condicionada), ingesta en la app (BYO key, fuera de
  I2), persistencia de estados (siguiente sesión de diseño).
