# Spec — Fase 17: Dados custom rápidos

Fase: 17 · Estado: verified (QA visual del usuario pendiente) · Compuerta: compuertas base (lint/test/build/check) + criterios de la spec

## Objetivo

Constructor de **fórmulas de dados rápidos** fuera de ataques/conjuros: un desplegable con un **botón por dado** (d4, d6, d8, d10, d12, d20, d100) que alimenta un **input de texto editable**, donde también se puede escribir la fórmula a mano (`2d8 + 3d12`). Un botón **Lanzar** ejecuta la fórmula con la misma animación de la Fase 11, con **una animación por grupo de dados** (para `2d4 + 1d8`: los dados del grupo d4 animan juntos y el d8 anima solo). Función de mesa pura: **no modifica el sessionState**.

Origen: petición del usuario (2026-11-20, ingesta de Patx Vane; revalidada 2026-11-23 en el propose·validate de esta fase), recogida en `INDEX.md` como fase futura.

## Alcance

- **Parser de fórmula compuesta** (`src/dice.ts`, extensiones puras y testeables): `2d4 + 1d8` → grupos `[{count:2,faces:4,mod:0},{count:1,faces:8,mod:0}]`; cada término es `NdX` o un número suelto (modificador), unidos por `+`. La notación de un solo dado de la Fase 11 (`1d8+4`) sigue funcionando igual.
- **Roller de fórmula**: un roll por grupo, total = suma de todos los dados + modificadores. `Math.random` inyectable para tests (patrón D-44).
- **Desplegable de dados** (componente compartido `src/views/dice-picker.ts`): botón de dado en la appbar lo abre; panel centrado (patrón backdrop/card del proyecto, estética Fase 00) con:
  - Fila de botones por dado (d4…d100). Click en un dado **alimenta la fórmula**: primera pulsación añade `1dX`, repetir la pulsación lo sube (`2d4`, `3d4`…); los grupos se ordenan por primera pulsación (ejemplo del usuario: d4 ×2 y d8 ×1 → `2d4 + 1d8`).
  - **Input de texto editable** con la fórmula actual; escritura a mano libre.
  - Botón **Lanzar**: parsea y ejecuta; fórmula inválida → mensaje inline en el panel (sin `alert`, sin crash); fórmula vacía → botón sin efecto.
  - Cierre: al lanzar, con Esc y al pulsar fuera (backdrop).
- **Diálogo de tirada con grupos**: reutiliza el `#roll-dialog` de la Fase 11 extendido a varios grupos — un cuadrado de dado animado por cada dado, agrupados y etiquetados por su notación (`2d4`, `1d8`); total grande = suma de dados + modificadores; "Tirar de nuevo" re-rollea la fórmula completa; "Cerrar" devuelve el foco al botón que abrió el desplegable.
- **Integración en ambas vistas** (decisión del usuario): appbar de la ficha de personaje y appbar de la vista master. El master hoy no tiene diálogo de tirada: se le añade el mismo diálogo (marcado compartido, sin duplicar lógica).
- Sabor de tirada (D-51): `¡CRÍTICO!` si algún grupo d20 saca un 20 natural; el "¡fallo doble!" queda reservado a la tirada pelada de muerte (`1d20` exacto), como ya está.
- Animación respetuosa: `prefers-reduced-motion` sin tumbling (herencia del diálogo de la Fase 11).
- Sin recursos externos: iconos/dados dibujados con SVG inline y CSS (I2).
- Tests: parser de fórmula (válidas, inválidas, espacios, modificadores sueltos), roller (rangos, total, determinismo con random mockeado), presets del picker parsean todos.

## Fuera de alcance

- Historial de tiradas, registro en sessionState, ventaja/desventaja, roll dual.
- Persistencia de la última fórmula usada.
- Desplegable en la vista overview (raíz sin ficha cargada).

## Decisiones registradas (validadas por el usuario, 2026-11-23)

- D-61: gatillo = **botón de dado en la appbar** (ficha + master), no botón flotante. Validado.
- D-62: **constructor de fórmula** (botones por dado que alimentan un input editable + notación manual) en lugar de lista fija de presets. Validado con la respuesta del usuario: "botón de cada dado (d4, d6…) y un input text donde se puede introducir la fórmula a mano (2d8 + 3d12). Al clicar los botones se alimenta la fórmula… 2d4 + 1d8. Un botón de lanzar dados que ejecuta la fórmula con la misma animación… 1 animación por cada dX".
- D-63: alcance en **ficha + master** (elección del usuario en la misma pregunta).

## Criterios de aceptación (verificables)

- C1: en la appbar de la ficha y de la master hay un botón de dado; el click abre el desplegable con los botones d4…d100 y el input de fórmula; se cierra con Esc, al lanzar y al pulsar fuera.
- C2: pulsar d4 dos veces y d8 una deja en el input `2d4 + 1d8`; escribir a mano sobreescribe/edita el input y Lanzar respeta lo escrito.
- C3: Lanzar abre el diálogo de tirada con un dado animado por cada dado de la fórmula, agrupados por notación, y el total = suma de dados + modificadores; fórmula inválida muestra error inline y no abre el diálogo.
- C4: "Tirar de nuevo" re-rollea la fórmula completa; "Cerrar" devuelve el foco al botón de dado del appbar correspondiente.
- C5: nat 20 en un grupo d20 → `¡CRÍTICO!`; bajo `prefers-reduced-motion` no hay animación.
- C6: parser y roller de fórmula con tests (válidas/inválidas/determinismo); compuertas base en verde (lint/build/check + tests); revisor fresh-eyes; D-61/D-62/D-63 registradas en `DECISIONS.md`.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)

## Amendments

### Amendment 1 (2026-11-23, petición del usuario durante `implement`) — Regla de percentil d10/d100

- **d10**: las caras del dado son 0–9 y el 0 vale 10; el cuadrado del dado muestra la cara real (valor 10 → cara "0") y el total cuenta como 10. Aplica a todo grupo Nd10.
- **d100 (percentil)**: un 1d100 se tira como DOS d10 (decenas + unidades), ambos con caras 0–9; total = decenas×10 + unidades, y el **doble 0 es 100, no 0**. La notación que escribe el usuario sigue siendo `1d100`; es el roll/render el que la descompone en el par de d10 (etiquetados "decenas"/"unidades" en el diálogo).
- Criterios afectados: C3 (render de grupos) y C6 (tests). Se añade a C6: tests de cara de d10 (10→0, cuenta 10) y de d100 (doble 0 → 100; decenas×10 + unidades).
- Decisión a registrar en `DECISIONS.md` al cierre: **D-64** (regla de percentil d10/d100, propuesta por el usuario).
