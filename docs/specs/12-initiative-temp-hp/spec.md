# Fase 12 — Tirada de iniciativa + PG temporales con tira rápida

## Objetivo

Dos mejoras de partida real, ambas con patrones ya existentes:

1. **Tirada de iniciativa**: botón de dado en el stat `Iniciativa` de la tarjeta
   de combate, reutilizando el diálogo de dados de la Fase 11 (D-44/D-45).
2. **PG temporales**: misma tira rápida de 3 filas que la de PG (D-42), con la
   tercera fila convertida en botón **vaciar** (decisión del usuario).

## Alcance

- `src/render/blocks.ts`: `hpTempStrip()` (3 filas: ±1, ±10, vaciar) que
  sustituye al stepper simple de `hp-temp` en sus dos ubicaciones (stat-grid de
  combate y tarjeta Rest); botón d20 de iniciativa con notación ASCII
  (`1d20+mod`), refactor del helper compartido `diceNotation` (ya usado por los
  ataques desde D-49).
- `src/styles/base.css`: ajuste mínimo (dado centrado dentro de `.stat`,
  tamaño del SVG del botón vaciar).
- `src/session.ts`: **sin cambios** — la acción `set` con `data-value="0"` ya
  está soportada por `applyStepper` y el clamp `0..TEMP_HP_MAX` no se toca.
- Reset: sin cambios — `defaultSessionState` ya deja `hp.temp = 0`.

## Decisiones previstas

- **D-50**: fila 3 de PG temp = icono *refresh* (círculo con flecha), acción
  `set` a 0 — decisión del usuario validada hoy (en PG el ❤ rellena al máximo;
  temp no tiene máximo del personaje, así que la semántica cambia a vaciar).
  El Reset sigue dejando temp a 0 (coherente).
- **D-50** (misma decisión): botón de iniciativa dentro del stat `Iniciativa`,
  no en la tarjeta defense (decisión del usuario).
- El crítico natural 20 en el diálogo muestra "¡CRÍTICO!" — comportamiento
  genérico del diálogo (D-46), no se especializa para iniciativa.

## Criterios de aceptación

- **C1**: el stat Iniciativa muestra un botón de dado; al pulsarlo se abre el
  diálogo con `1d20+mod` (signo ASCII), total = dado + modificador y natural 20
  → "¡CRÍTICO!".
- **C2**: PG temporales tiene las 3 filas (±1, ±10, vaciar) tanto en el
  stat-grid de combate como en la tarjeta Rest; vaciar lo deja en 0; los
  límites 0..20 se mantienen.
- **C3**: Reset deja los PG temporales a 0 (comportamiento existente, cubierto
  por test).
- **C4**: accesibilidad: `aria-label` en español en todos los botones nuevos,
  foco devuelto al botón que abrió el diálogo, focus trap genérico aplicado
  (ya existente en el diálogo de tirada, D-49).
- **C5**: compuertas en verde: lint · test (nuevos tests de strip y notación) ·
  build · check.ps1.

## Fuera de alcance (pendiente para otras fases)

- Notaciones por segmentos (`2d8+1d6`), rolls de conjuros por nivel,
  historial de tiradas, tirada de salvaciones (siguiente fase candidata).
