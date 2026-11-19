# Spec — Fase 06: Detalle y contadores

Fase: 06 · Estado: spec · Compuerta: compuertas base + persistencia y reset verificados

## Objetivo

Los contadores del `sessionState` (D-16 §4) pasan de render-only a editables con persistencia en `localStorage`, y los conjuros ganan hoja de detalle (bottom sheet del mockup). Reset funcional.

## Alcance

- `src/session.ts`: módulo de sesión migrado desde `blocks.ts` (`defaultSessionState`), estado vivo + `update()` que re-renderiza SOLO contenido interno de secciones (nunca `#sheet` entero, para no romper el estado de filtros de Fase 05) + persistencia.
- Contadores editables con botones +/− accesibles (foco por teclado, `aria-label`): HP actual/temporales (bloque combat), dados de golpe, slots por nivel (cabecera de spells), Canalizar Divinidad, salvaciones de muerte (dots clickables en defense), inspiración (checkbox), condiciones (chips togglables).
- La edición aparece donde el contador se muestra (según decisión de usuario abajo); todas las instancias del mismo contador se actualizan a la vez (estado único).
- Persistencia: `localStorage` con clave versionada (`fichass-session-v1`), `schemaVersion` 1; load al arrancar con migración forward-only; campos desconocidos ignorados (D-16 §4).
- Botón Reset (appbar o bloque rest): restaura defaults y borra la clave.
- Hoja de detalle: pulsar un chip de conjuro abre el bottom sheet ya portado en `base.css` (handle, overlay, drawer) con la descripción completa; cerrar con overlay/Esc/botón. `aria-modal` + foco atrapado (I5).
- Los datos editables tocan solo `sessionState`; el `character` nunca cambia en sesión.

## Fuera de alcance

- Tests formales (Fase 07); edición del `character`; drawer lateral de navegación (solo el bottom sheet de detalle).

## Decisiones previstas

- D-27: edición de contadores donde se muestran (según elección del usuario) con estado único sincronizado.
- D-28: hoja de detalle de conjuros vía bottom sheet accesible.

## Criterios de aceptación (verificables)

- C1: todos los contadores de §4 son editables y visualizan su estado; los +/- funcionan por click Y teclado; no hay contadores decorativos.
- C2: recargar la página conserva el estado editado (localStorage); el botón Reset lo devuelve a defaults y borra la clave.
- C3: el estado editado se refleja en TODAS las instancias del contador (p. ej. slots en spells y en rest) sin re-render del sheet completo (el modo activo y el orden de bloques no se alteran).
- C4: los conjuros abren su hoja de detalle (bottom sheet accesible con foco atrapado y cierre por Esc/overlay).
- C5: límites de regla respetados: hp.current 0..maxHP y hp.temp 0..20 (independientes; los temporales no elevan el máximo — enmienda de redacción 2026-11-19), dados 0..total, slots 0..max, canal 0..2, muerte 0..3, fortuna 0..1 — los +/- no salen del rango.
- C6: vista 390×844 sin desbordes tras editar; capturas de evidencia; revisor fresh-eyes; D-27/D-28; `check.ps1` PASS.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Verificación en navegador (2026-11-18): edición de HP 38→36 y slot nv1 0→1 con persistencia en localStorage; recarga restaura el estado editado; Reset restaura defaults y borra la clave; hoja de detalle abierta con `aria-modal` correcto. Bug detectado y corregido: los dots de salvaciones de muerte no eran capturados por el handler delegado (selector `.step` exclusivo); ampliado a `.dot[data-action][data-target]` (verificación dinámica de los dots limitada después por pérdida de la sesión de navegador del harness).
- Enmienda validada por el usuario (2026-11-18): T-02 omitió `resourcesUsed` (Fortuna del Erudito) en su enumeración; añadido stepper 0/1 en Rasgos (D-27). Ejecutado directamente por el orquestador: el subagente implementador quedó indisponible por límite del proveedor (incidente D-15 vigente).
- Limitación de evidencia: las capturas 390×844 de esta fase no se pudieron tomar (sesión de navegador del harness no disponible al cierre); las verificaciones dinámicas previas (p. ev. persistencia, reset, hoja de detalle) quedan como evidencia textual del orquestador y el revisor cubre el resto por lectura de código + compuertas.
- Enmienda de redacción (2026-11-19, post-revisor): C5 decía "HP 0..maxHP+temp"; lo correcto por reglas 5e 2024 (y lo implementado) es hp.current 0..maxHP y hp.temp 0..20 independientes (los temporales no elevan el máximo). Se corrige el texto del criterio, no el código.
- Majors del revisor resueltos por el orquestador (2026-11-19): pérdida de foco al editar por teclado (refreshBlock ahora restaura el foco al control homólogo vía clave estable `id`/`data-*`) — candidato a test de accesibilidad en Fase 07; concordancia de labels de dots corregida ("1 éxito"). Minors anotados como deuda: acoplamiento de `RESOURCE_FORTUNA` al fixture (v1 un personaje), importación circular blocks⇄session (segura hoy; anotada para Fase 07/08).
