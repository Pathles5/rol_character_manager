# Spec — Fase 10: Multi-personaje (datos JSON + vista raíz + routing)

Fase: 10 · Estado: spec · Compuerta: compuertas base (lint/test/build/check) + criterios de la spec

## Objetivo

Pasar de "un personaje en código" a **N personajes servidos como JSON estáticos**, con una **vista raíz** que los liste y una **vista detalle** (la ficha v1) a la que se llega por URL. Arquitectura "React-shaped" en vanilla TS (D-33): `router.ts` + `views/{overview,character}.ts` montadas sobre un `#app` raíz. Sin framework nuevo (D-18 sigue congelado).

## Alcance

- `public/characters/*.json`: cada fichero es un personaje; el **nombre del archivo es el id** (`tax-demonion-goblin.json` → `tax-demonion-goblin`). `character-demo.json` se convierte en uno más (mismo contenido).
- **Manifest enriquecido autogenerado en build**: script que escanea `public/characters/`, **valida cada JSON con `validateCharacter`** (un JSON inválido rompe el build) y genera `characters-manifest.json` con `{id, name, class, level, initials}`. Vite lo copia a `dist/`.
- **Hash routing**: `#/` → overview; `#/c/<id>` → detalle; hashchange → parse → montar vista. Ruta desconocida/JSON ausente → estado de error amable.
- **Vista overview** (`#/`): lista desde el manifest (un fetch), tarjetas/botones con nombre · clase · nivel · iniciales; estado vacío si no hay personajes.
- **Vista character** (`#/c/<id>`): el flujo actual de `main.ts` encapsulado: fetch del JSON → `validateCharacter` (error con mapa campo→mensaje si falla) → `computeDerived` → appbar con modos + `renderSheet` → `session` por personaje.
- **Estados React-like**: loading (indicador con la piel actual), error (404 JSON / inválido), success — en ambas vistas.
- **sessionState por personaje**: clave `fichass-session-v1:<id>`.
- **Reestructuración de entrada**: `index.html` → solo `<main id="app">`; `main.ts` → `app.ts` (router + montaje); la appbar con chips de modo pasa a ser parte de la vista character.
- **Tests**: el test de coherencia JSON↔TS (D-21) se retira (ya no hay transcripción TS) y se sustituye por: cada JSON referenciado por el manifest pasa `validateCharacter` y calcula derivados; router (parse de rutas), manifest (formato) y claves de sesión por personaje se testean; lo demás (matriz, migración, foco) intacto.

## Fuera de alcance

- Edición/creación de personajes en la app; backend; rutas con paths reales; PWA; Fase 09 (infra SAM, spec aparte).

## Decisiones previstas

- D-33 (ya registrada): arquitectura React-shaped vanilla + hash routing + manifest enriquecido validado en build.
- D-35: validación estricta en runtime — un JSON inválido muestra pantalla de error y NO renderiza una ficha parcial (rechazo entero, coherente con D-17).
- D-36: sesiones de personajes eliminados se ignoran (la clave vieja queda huérfana en localStorage; limpieza opcional en el detalle de la spec).

## Criterios de aceptación (verificables)

- C1: `#/` lista los personajes de `characters-manifest.json` (nombre · clase · nivel · iniciales) con un solo fetch; clic → `#/c/<id>`.
- C2: `#/c/<id>` carga, valida y renderiza el JSON correspondiente con todos los contadores funcionando; recargar conserva el estado de ESE personaje (sesión por id).
- C3: JSON inválido o id inexistente → pantalla de error (con mapa campo→mensaje si es validación), sin ficha parcial ni crash.
- C4: añadir un personaje = nuevo JSON en `public/characters/` + push → aparece en la raíz (el build valida y regenera el manifest; un JSON inválido rompe el build con mensaje claro).
- C5: URL compartible/recargable: `#/c/<id>` directo muestra la ficha; sin sesiones cruzadas entre personajes.
- C6: tests en verde (retirado D-21-coherencia, añadidos routing/manifest/validación-por-fichero); revisor fresh-eyes; `check.ps1` PASS; D-35/D-36 registradas.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Excepción mecánica (D-06/D-15): el subagente implementador no puede escribir en `scripts/**`; `scripts/generate-manifest.mjs` lo creó el orquestador con el apéndice del informe (mismo algoritmo; verificado: prebuild genera el manifest con UTF-8 correcto).
- Validación en dos niveles (matiz de la solución validada): el build valida **estructuralmente** cada JSON (parse + identity + id, mensaje claro y exit 1); el **contrato completo D-17** de cada personaje publicado se aplica en el gate de tests (`validate.test.ts` lee el manifest y valida cada fichero). Equivalente en rigor sin tooling extra en el `.mjs` — espeja el espíritu de C4.
- Coherencia characterId (Fase 10): `initSession(character, derived, characterId)` fija `state.characterId = id` de URL y `sanitizeLoaded` compara contra él — el guard D-16 §4 ahora compara contra el id de la URL (antes: id derivado del nombre).
- Normalización de modo entre vistas: `filters.ts` conserva `currentMode` a nivel de módulo; la vista character llama `setMode('aventura')` tras renderizar (no-op si ya estaba) — sin tocar filters.ts (comportamiento Fase 05 intacto).
- Incidente: `package.json` llevaba un BOM preexistente que el tooling actual no tolera (fallaba `npx vite build`); retirado por el implementador (retrocompatible).
- Landmarks: `main#app` + `main` interno de cada vista = dos `main` anidados; el CSS neutraliza el externo (respetando la solución validada; revisar si se prefiere un solo landmark en el futuro).
- Enmienda UI por petición del usuario (2026-11-19, durante el QA): vuelta a la raíz desde la ficha con **logo-home + "← Personajes"** (opción 4 de las propuestas; `<a>` nativos con hover en acento; el botón atrás del navegador sigue funcionando). Implementado directamente por el orquestador; 76/76 tests en verde tras el cambio.
- Segundo personaje de QA: `public/characters/dahna-voreio.json` (guerrera 2, creada por el orquestador con OK implícito del QA multi-personaje; `x_demoNotes` documenta sus licencias) — permite ejercitar la vista raíz y las sesiones cruzadas con N>1.
