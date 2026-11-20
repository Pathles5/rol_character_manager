# Fase 13 — Tiradas de salvaciones (+ salvación de muerte)

## Objetivo

Completar el patrón de dados (Fase 11/12) en la tarjeta defense: tirar las 6
salvaciones de característica y la salvación de muerte con el diálogo de dados
existente.

## Alcance

- `src/render/blocks.ts` (`renderDefense`): dado d20 junto al modificador de
  cada una de las 6 salvaciones (`1d20+mod` ASCII, helper `diceNotation`); botón
  d20 de salvación de muerte en el subhead (notación `1d20`, sin modificador).
- `src/dice.ts`: nueva función pura `rollFlavor(notation, rolls)` que unifica el
  grito de crítico (nat 20 en d20, ya existente inline en character.ts) y añade
  la marca **¡fallo doble!** para la salvación de muerte con nat 1 (regla 2024:
  2 fracasos). character.ts pasa a consumirla.
- `src/styles/base.css`: alineación del dado en la fila de salvación y en el
  subhead.
- `src/session.ts`: sin cambios (los contadores de muerte siguen siendo dots).

## Decisión validada por el usuario (hoy)

- Dado **junto a cada salvación** (no un botón con selector).
- **Sí** a la tirada de salvación de muerte, con nat 1 → "¡fallo doble!" y
  nat 20 → "¡CRÍTICO!" (el diálogo genérico ya lo muestra).

## Criterios de aceptación

- **C1**: cada salvación de la tarjeta defense tiene su dado; la tirada es
  `1d20+total` (signo ASCII) y el total del diálogo = dado + modificador.
- **C2**: la salvación de muerte tira `1d20` pelado; nat 20 → "¡CRÍTICO!",
  nat 1 → "· ¡fallo doble!"; un nat 1 en otra tirada con modificador NO lo
  marca (solo aplica a la muerte).
- **C3**: el crítico de los ataques/iniciativa sigue funcionando igual
  (refactor `rollFlavor` sin cambio de comportamiento).
- **C4**: accesibilidad: aria-label en español por botón, foco devuelto, focus
  trap (todo heredado del diálogo, D-49).
- **C5**: compuertas en verde: lint · test · build · check.

## Fuera de alcance

- Trabajo del rollFlavor para notas por segmentos (`2d8+1d6`), upcast, historial
  de tiradas, beneficio/desventaja (si se pide, fase propia).
