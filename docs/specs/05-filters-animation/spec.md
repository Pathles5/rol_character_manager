# Spec — Fase 05: Filtros y animación

Fase: 05 · Estado: spec · Compuerta: compuertas base + reflujo animado real verificado

## Objetivo

Activar la navegación entre modos (combate/aventura/descanso/mesa) en una sola página: los chips se vuelven botones reales y los bloques se reordenan/ocultan **con reflujo animado real**, según la matriz congelada (`BLOCK_CONFIG`, D-16). Es el cierre de la deuda central del brief: los filtros con animación.

## Alcance

- `src/filters.ts`: gestión de modo activo + aplicación de la matriz (`data-modes` ya sembrado en cada sección por D-24).
- Chips → `<button>` con `aria-pressed` (I5): appbar y demo eliminados; un único conjunto de tabs funcional.
- Reflujo animado (FLIP: measure→toggle→invert→play) sobre las tarjetas: reordenar por `weight` del modo activo y ocultar/mostrar las excluidas, con transición de posición+opacidad. Respeta `prefers-reduced-motion` (guard ya existente).
- Layout compacto de `identity` en combate/descanso y `role` destacado en mesa (render-time, según D-24).
- Limpieza: CSS muerto `.b-death` de base.css.
- Los contadores siguen render-only (editables en Fase 06).

## Fuera de alcance

- Edición de contadores, localStorage (Fase 06); detail sheet de conjuros (Fase 06); tests formales (Fase 07).

## Decisiones previstas

- D-25: técnica de animación FLIP única para todos los cambios de modo (elegida por el usuario entre FLIP / cross-fade / mixta) — a registrar con la elección.
- D-26: los 4 modos comparten el mismo mecanismo de matriz; sin lógica especial por modo (la matriz manda).

## Criterios de aceptación (verificables)

- C1: pulsar cada chip cambia el modo sin recarga ni cambio de página; los bloques visibles coinciden EXACTAMENTE con la matriz §6 para ese modo (combate: identity compacto/combat/defense/attacks/spells; descanso: identity compacto/rest/spells; mesa: identity/attributes/equipment/traits/proficiencies/role/allies; aventura: los 12).
- C2: el reordenamiento entre modos es animado (transición de posición/opacidad real, no swap instantáneo) y con `prefers-reduced-motion` el reflujo es instantáneo.
- C3: los chips son botones accesibles: foco por teclado, `aria-pressed` correcto, activo único por modo.
- C4: en mesa, el bloque role destaca (estilo diferencial) y en combate/descanso identity es compacta.
- C5: vista 390×844 sin desbordes en los 4 modos + capturas de evidencia.
- C6: revisor fresh-eyes C1–C6; D-25/D-26 registradas; `check.ps1` PASS.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Enmienda operativa (2026-11-17, necesaria para C1): `renderSheet` (Fase 04) solo producía los 12 bloques de aventura, así que el modo descanso no podía mostrar `rest` (no existía en el DOM). Corregido: `sheet.ts` renderiza los 13 en orden de weight y pre-marca ocultos los no visibles en aventura; `filters.ts` gobierna la visibilidad desde ahí. Verificado en navegador: los 4 modos coinciden exactamente con la matriz §6 (12/5/3/7 secciones), overflowX=false, `aria-pressed` correcto.
- Deudas anotadas para fases siguientes: `body.m-<modo>` no se actualiza en `setMode` (CSS de recomposición desktop por modo queda muerto — decidir en Fase 08); `data-modes` sembrado en secciones no lo consume `filters.ts` (usa `BLOCK_CONFIG` directamente, I4 mejor cumplido) — Fase 07 decidirá si es fixture de tests o se retira.
