# Spec — Fase 11: Tiradas con dados animados

Fase: 11 · Estado: spec · Compuerta: compuertas base (lint/test/build/check) + criterios de la spec

## Objetivo

Tirar los dados de los ataques **desde la ficha, con animación**: click en el daño de un ataque (o botón de dado) abre un pequeño diálogo con los dados animándose y el resultado (dados + modificador = total). Función de mesa pura: **no modifica el sessionState**.

## Alcance

- `src/dice.ts`: parser de la notación de daño de los ataques (`"1d8+4"`, `"2d6+3"`, `"1d6"`, `"1d4+4"`) → `{ count, faces, mod }` + roller (`rollDice(parsed)` → valores por dado en `[1..faces]` + total) — funciones puras, testeables.
- Diálogo de tirada: centrado (misma estética que el popup del Reset, backdrop compartido), con **dados animados** (CSS keyframes — tumbling con rotación) que se asientan mostrando su valor; total grande (`dados + modificador = total`); botones **Tirar de nuevo** / **Cerrar**.
- Gatillo: botón de dado junto al daño de cada ataque (los ataques de la ficha; los de conjuros quedan fuera en esta fase — su daño vive en descripciones).
- Sin recursos externos: dados dibujados con CSS (cuadrados redondeados con el valor numérico — sin imágenes ni fuentes extra, I2).
- Animación respetuosa: bajo `prefers-reduced-motion` el dado aparece directamente asentado (sin tumbling), como el resto de animaciones del proyecto.
- Tests: parser (todas las notaciones del fixture), roller (rango por dado, total, determinismo con Math.random mockeado).

## Fuera de alcance

- Rolls de conjuros (daño en descripciones — necesita parser de texto libre); tirada de iniciativa/salvaciones (se propone como extensión futura si se pide); registro de tiradas en sessionState; historial de tiradas.

## Decisiones previstas

- D-44: el gatillo es un **botón de dado junto al daño** (no el texto clicable) y el resultado aparece en **diálogo centrado** (no inline) — se valida con el usuario.

## Criterios de aceptación (verificables)

- C1: cada ataque de la ficha muestra su botón de dado; el click abre el diálogo con tantos dados como indique la notación del daño.
- C2: el total mostrado = suma de los valores de los dados + modificador; cada dado muestra un valor de su rango.
- C3: "Tirar de nuevo" re-rollea sin cerrar; "Cerrar" vuelve a la ficha con el foco devuelto al botón de dado que lo abrió.
- C4: bajo `prefers-reduced-motion` no hay animación (dados estáticos con el resultado).
- C5: parser y roller con tests (notaciones del fixture: `1d8+4`, `2d6+3`? — las reales del fixture son `1d8+4`, `1d8+2`, `1d4+4`, `1d6+4`, `1d12+4`, `1d6+4`); compuertas base en verde; revisor fresh-eyes; D-44 registrada.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
