# Spec — Fase 04: Ficha estática

Fase: 04 · Estado: spec · Compuerta: compuertas base (lint/build/check) + criterios de la spec

## Objetivo

Renderizar la ficha completa del personaje en una sola página, alimentada 100% por los datos de Fase 03 (`demoCharacter` + `computeDerived` + `BLOCK_CONFIG`), en modo aventura (por defecto, ficha completa). Sin filtros interactivos (Fase 05), sin contadores editables (Fase 06).

## Alcance

- `src/render/`: módulos de render por bloque (identidad, atributos, combate, defense, skills, attacks, spells, rest, equipment, traits, proficiencies, role, allies) usando el orden/`weight` de `BLOCK_CONFIG`.
- Catálogo de 18 skills con labels españoles (model §8) en `src/data/skills.ts`; `derived.ts` ya no depende de su mapa local (usa el catálogo).
- Los 13 bloques visibles en modo aventura; los otros modos quedan deshabilitados visualmente (chips demo) hasta Fase 05.
- Salvaciones de muerte y contadores del `sessionState` se muestran con sus valores default (render-only).
- Ataques y conjuros agrupados (cantrips / preparados por nivel, marca free/domain, concentración ⛓).
- Equipo con peso total calculado; monedas gp/sp.
- Nota de `x_demoNotes` NO se renderiza (solo fixtures).

## Fuera de alcance

- Interactividad de chips/filtros y animación (Fase 05), contadores clickables y localStorage (Fase 06), tests (Fase 07).

## Decisiones previstas

- D-23: catálogo de skills en `src/data/skills.ts` (id inglés + label español + ability), única fuente para derived y render.
- D-24: el render por bloques vive en `src/render/` (un módulo por bloque o agrupados lógicos), orquestado por `src/render/sheet.ts` que consume `BLOCK_CONFIG` (orden = weight).

## Criterios de aceptación (verificables)

- C1: la página renderiza los 13 bloques de `BLOCK_CONFIG` en orden de weight, con cero valores harcodeados de personaje en HTML (todo sale de data/derived).
- C2: números correctos en pantalla: AC 18, HP 38, CD 14, ataque +6, iniciativa +1, slots 4/3/2, salvaciones WIS +6/CHA +3 (INT −1 sin comp), skills según fixture, peso del equipo = suma de weightLb.
- C3: conjuros agrupados y marcados: 4 cantrips, 15 preparados (9 free + 6 domain con marca visible), concentración visible en los 6 que la llevan.
- C4: sesión default visible (render-only): 38/38 PG, 0 dados, slots 0 usados, canal 0/2, inspiración sin marcar, sin condiciones.
- C5: vista 390×844 sin desbordes; captura de evidencia guardada.
- C6: revisor fresh-eyes C1–C6; D-23/D-24 registradas; `check.ps1` PASS.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Enmienda (2026-11-17, tras entrar en implement): el alcance decía "los 13 bloques visibles en modo aventura", en contradicción con la matriz §6 del modelo congelado (D-16), que excluye `rest` de aventura (solo descanso). **Manda D-16**: aventura renderiza los 12 bloques de la matriz; `renderRest` se construye y queda listo para el modo descanso (Fase 05). C1 se lee con esta corrección. Efecto colateral: **C4 queda recortado en la página de aventura** — canal 0/2, inspiración y condiciones solo se ven en el bloque `rest` (modo descanso, Fase 05); en aventura quedan visibles 38/38 PG, 0 temp, 0 dados usados, slots 0 usados y salvaciones de muerte 0/3 (bloque defense), verificados por el revisor.
