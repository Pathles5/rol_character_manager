# Spec — Fase 18: Toggle editable/solo-lectura en la vista master

Fase: 18 · Estado: verified (QA visual del usuario pendiente) · Compuerta: compuertas base (lint/test/build/check) + criterios de la spec

## Objetivo

Un **toggle en la vista master** que define la vista como **editable** o **solo lectura**: en editable se ven los botones de stepper (+/−/±10) de los contadores (comportamiento actual); al desactivarlo **solo esos botones desaparecen** y queda una vista más limpia para proyectar/consultar durante la partida. Todo lo demás (valores, dots de muerte, inspiración, condiciones, layout) permanece igual e interactivo. Petición del usuario (2026-11-23).

## Alcance

- **Toggle en el appbar de la master** (chip con `aria-pressed`, junto a "+ grupo"/"Refrescar"/dados): ON = editable (default, comportamiento actual), OFF = solo lectura.
- En solo lectura **desaparecen únicamente los botones de stepper** generados por `steps()`: PG ±10/±1, PG temp ±1, dados de golpe ±1, slots ±1, canalizar divinidad (CD) ±1, recursos de rasgos ±1.
- **Todo lo demás se mantiene intacto e interactivo** (decisión explícita del usuario): dots de salvaciones de muerte (función visual + edición), chip de inspiración, chips de condiciones y su caja expandible, minimizar, mover a grupo, drag & drop, herramientas de grupos (▲▼/✎/×, "+ grupo"), botón de reintento de sync, badges de estado.
- **Persistencia del toggle** en el documento `master-layout` de la BD de sesión (mismo mecanismo D-59: remoto + caché local): campo `editable?: boolean` en `MasterLayoutData`, sanitizado con default `true` cuando falta o no es booleano (layouts antiguos siguen funcionando). Entre masters concurrentes: última escritura gana (estado de UI, igual que el layout).
- El cambio de modo es **solo de render**: no cancela deltas pendientes ni el flush en curso; al volver a editable los steppers reaparecen con el estado actual. El poll de 15 s sigue refrescando en ambos modos.
- Tests: sanitizador/normalización (`editable` true/false/ausente/no-booleano → default true) y la suite completa sin regresiones.

## Fuera de alcance

- Modo solo-lectura en la ficha del jugador.
- Ocultar cualquier otro control (dots, inspiración, condiciones, layout) — el usuario lo descartó explícitamente.
- Permisos reales/seguridad: el toggle es de UI, la API sigue aceptando escrituras (igual que hoy, D-55/D-59).

## Decisiones registradas (validadas por el usuario, 2026-11-23)

- D-65: en solo lectura **solo desaparecen los botones "+", "−", "+10", "−10"** (steppers). Todo lo demás se deja: drag & drop, inspiración y dots (que también tienen función visual). Validado con la respuesta del usuario.
- D-66: el toggle **se persiste** en `master-layout` (remoto + caché local) y el **default es editable ON**. Validado.
- D-67: sin render especial de muerte/inspiración/condiciones en solo lectura — permanecen con su visual e interactividad actuales (consecuencia directa de D-65; el usuario remitió a esa respuesta).

## Criterios de aceptación (verificables)

- C1: el appbar de la master muestra el toggle; con ON se ven todos los steppers actuales; con OFF desaparecen todos los botones de stepper (PG, temp, dados, slots, CD, recursos) y nada más.
- C2: en solo lectura los dots de muerte, la inspiración, las condiciones y las herramientas de layout siguen funcionando igual que en editable; los valores de los contadores siguen visibles.
- C3: el estado del toggle sobrevive a recarga y a otro dispositivo (persistido en `master-layout`, sanitizado con default true para layouts antiguos o valores no booleanos).
- C4: cambiar de modo no pierde ediciones pendientes (el flush sigue) y el poll sigue refrescando valores en ambos modos; volver a editable restaura los steppers con el estado actual.
- C5: tests del sanitizador/normalización en verde; compuertas base en verde (lint/build/check + tests); revisor fresh-eyes; D-65/D-66/D-67 registradas en `DECISIONS.md`.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)

## Amendments

- (vacía; tras entrar en `implement` los cambios solo por enmienda documentada)
