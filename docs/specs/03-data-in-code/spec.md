# Spec — Fase 03: Datos en código

Fase: 03 · Estado: spec · Compuerta: compuertas base (lint/build/check) + tipos coherentes con D-16/D-17

## Objetivo

Convertir los datos del personaje en módulos TypeScript tipados y un validador de cliente, congelando la representación en código de lo decidido en el modelo (D-16) y la asimetría del contrato (D-17). Los derivados se calculan en cliente con las fórmulas de `model.md` §3. Sin UI de ficha (eso es Fase 04+), sin backend.

## Alcance

- `src/types.ts`: tipos TS de `character` y `sessionState` 1:1 con `model.md` §2/§4 (literales para ability ids, spell levels…).
- `src/data/character.ts`: el fixture Sere Aldaard como módulo TS (mismo contenido que `docs/data/character-demo.json`; común único = el JSON original manda y el TS hace la conversión a mano).
- `src/data/blockConfig.ts`: la matriz de filtros §6 como configuración única (13 bloques × 4 modos + weight + layout).
- `src/derived.ts`: funciones puras de derivados §3 (mods, totales de skill/save, CD, ataque de conjuro, iniciativa, preparedCount, iniciales) — sin dependencia del DOM.
- `src/validate.ts`: validador de cliente espejo del contrato D-17: rechaza derivados envueltos, `sessionState` o `x-*` desconocidos; devuelve mapa mapa-campo→mensaje. Sirve como futuro pre-check de `POST /characters` y para tests de Fase 07.
- `index.html` / smoke test: al menos UNA tarjeta alimentada por datos reales derivados (p. ej. los stats con modificadores calculados) para probar el pipeline datos→UI, sin construir la ficha completa.

## Fuera de alcance

- Bloques de ficha completos (Fase 04), filtros/animación (Fase 05), contadores/persistencia (Fase 06), tests formales (Fase 07).

## Decisiones previstas

- D-21: `character` vive como módulo TS (`src/data/character.ts`), el JSON original queda como fuente 100% (speck de verdad para migraciones/edición); sync verificado en compuerta de fase.
- D-22: `validate.ts` valida pk "normalized" también con rechazo benigno de `x_demoNotes` (acepta en fixtures, marca warning) — refleja la asimetría de D-17.

## Criterios de aceptación (verificables)

- C1: `src/types.ts` cubre 100% de los campos de `model.md` §2 y §4; compila strict (npm run build).
- C2: los derivados calculados en código coinciden con las fórmulas del modelo §3 (mods: DES 12→+1, INT 8→−1; CD=14, ataque de conjuro=+6, iniciativa=+1, preparedCount=9, iniciales "SA"; AC 18/HP 38 quedan como almacenados, no se recalculan).
- C3: `validate.ts`: un object `character` válido pasa; uno con derivado añadido, `sessionState` o `x_*` desconocido falla con mapa campo→mensaje.
- C4: `blockConfig.ts` = matriz §6 exacta (13 filas × 4 bool + weight + layout) exportada como array tipado.
- C5: revisor fresh-eyes contra C1–C5; compuertas lint/build/check	en verde.
- C6: D-21/D-22 registradas en DECISIONS.md.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
