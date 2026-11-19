# Spec — Fase 07: Tests y QA

Fase: 07 · Estado: spec · Compuerta: tests elegidos en verde + revisión manual móvil/tablet/escritorio + `check.ps1`

## Objetivo

Dotar al proyecto de una red de tests unitarios (Vitest, dev-only, coste €0) sobre las piezas con lógica real, y ejecutar el QA manual de la app en móvil/tablet/escritorio. Sin tocar el comportamiento de la app (salvo bugs que los tests destapen, que se corrigen con enmienda documentada).

## Alcance

- Vitest como devDependency + script `npm run test` + config mínima (entorno node; los tests de DOM usan jsdom o pureza de funciones — decisión del implementador reportada).
- Tests de: derivados (fórmulas §3 del modelo), validador (fixture pasa; derivados/`sessionState`/`x-*` rechazados con mapa), matriz de filtros (13 filas contra model.md §6), migración/carga de sesión (versión≠1, characterId ajeno, JSON corrupto, clamps de límites), coherencia fixture JSON ↔ `demoCharacter` TS (deuda D-21), y restauración de foco tras re-render parcial (major de Fase 06, si el entorno de test lo permite; si no, queda documentado).
- QA manual: checklist de los 4 modos + reset + hoja de detalle en 390×844 (móvil), 834px (tablet) y 1200px+ (escritorio), registrada con evidencia (capturas si el navegador del harness está disponible; si no, checklist firmada por el orquestador).
- `README.md` ya documenta los comandos (creado 2026-11-18); verificar que `npm run test` coincide con lo documentado.

## Fuera de alcance

- E2E con Playwright/Cypress (fuera de v1); cobertura obligatoria (objetivo: piezas de lógica, no % mágico); pulido visual y entrega (Fase 08).

## Decisiones previstas

- D-29: Vitest + entorno de test elegido (node/jsdom según la pieza), tests dentro de `src/` junto al código testado o en carpeta propia.

## Criterios de aceptación (verificables)

- C1: `npm run test` existe y pasa en verde con ≥ 30 aserciones cubriendo derivados, validador, matriz, migración y coherencia JSON↔TS.
- C2: la matriz de `blockConfig.ts` se valida test contra la tabla §6 del modelo (13 filas, visibilidad por modo, weights únicos y ordenados).
- C3: el test de coherencia fallaría si el fixture JSON y el módulo TS divergen (comprobado con una mutación temporal revertida, o por diseño del test si compara ambos directamente).
- C4: QA manual registrado: checklist 4 modos × 3 viewports con resultado y evidencia; incidencias encontradas corregidas o anotadas como deudas.
- C5: revisor fresh-eyes C1–C6; D-29 registrada; `check.ps1` PASS; `README.md` actual si algún script cambió de nombre.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Typo en esta spec congelada: los criterios son C1–C5 (no C1–C6); sin impacto (sin corrección sustantiva).
- Minors del revisor resueltos por el orquestador (2026-11-19): script `preview` añadido a package.json (el README ya lo documentaba); selector del test de foco acotado a `section[data-block="combat"]` (robustez ante reorden DOM); `DECISIONS.md` reordenado físicamente a orden numérico D-01…D-29 (contenido intacto, append-only respetado). Deudas para Fase 08: `data-modes` como metadato no consumido (fixture de tests o retirar), `body.m-<modo>` CSS muerto, @types/node para el import de node:fs.
- Enmienda por petición del usuario (2026-11-19, D-30): la inspiración pasa de checkbox (bloque Descanso) a dot tipo salvaciones de muerte, renderizado en la tarjeta Identidad (visible en las 4 vistas). Implementado directamente por el orquestador (D-15 vigente); tests 72/72 y compuertas en verde tras el cambio. Colocación ajustada con feedback visual del usuario (dentro de identity-lines).
- Cierre (2026-11-19): QA manual aprobado por el usuario ("todo ok") — persistencia/recarga, reset, dots, edición por teclado, hoja de detalle y 4 modos en móvil/tablet/escritorio. Fase cerrada.
