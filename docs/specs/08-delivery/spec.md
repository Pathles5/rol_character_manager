# Spec — Fase 08: Pulido y entrega

Fase: 08 · Estado: spec · Compuerta: informe final + compuertas base en verde + aprobación del usuario

## Objetivo

Cerrar la v1: limpiar las deudas de pulido acumuladas durante las fases, congelar el informe final de entrega (estado, límites conocidos, cómo desplegar) y dejar el repo listo para su uso/despliegue.

## Alcance

- Limpieza de deudas registradas en fases anteriores:
  - CSS muerto `body.m-<modo>` de la era mockup (retirar; la recomposición desktop actual funciona sin él — decisión a validar con el usuario abajo).
  - `@types/node` como devDependency + import estático de `node:fs` en `character.test.ts` (cierra la peculiaridad anotada en D-29).
  - `data-modes` en secciones: mantener como metadato (útil para extensión/inspect) o retirar — decisión del usuario abajo.
- Revisión visual final (checklist corta de la piel: tipografía, spacing, hover/focus) sobre el build de producción.
- Informe final de entrega: `docs/ENTREGA.md` — qué es FichaSS v1, qué incluye, límites conocidos (un personaje, sin backend, sin edición de ficha, sin PWA…), deudas abiertas para fases futuras (09 infra), cómo levantar/desplegar (punteros al README).
- `INDEX.md` a estado final de la v1.

## Fuera de alcance

- Fase 09 (infra AWS/CI/CD — fuera de la v1 del brief); nuevas funcionalidades; cambios de tokens (frozen).

## Decisiones previstas

- D-31: limpieza de `body.m-<modo>` y de `data-modes` (según elección del usuario).
- D-32: informe final en `docs/ENTREGA.md` como cierre de la v1.

## Criterios de aceptación (verificables)

- C1: cero CSS muerto relacionado con modos en `base.css` (grep sin resultados) o `body.m-<modo>` activado si el usuario lo elige — según decisión.
- C2: `@types/node` instalado; `character.test.ts` con import estático; 72+ tests en verde.
- C3: `docs/ENTREGA.md` existe con: resumen, límites conocidos, deudas abiertas referenciadas (IDs de decisión), instrucciones de despliegue (puntero a README).
- C4: `npm run lint/test/build/check` en verde; sin recursos externos en `dist/` (grep).
- C5: revisor fresh-eyes C1–C5; D-31/D-32 registradas; aprobación del usuario del cierre de la v1.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Minors del revisor resueltos por el orquestador (2026-11-19): clase huérfana `body.m-aventura` retirada del `index.html`; CSS muerto residual fuera del alcance literal de la spec eliminado (bloque drawer completo `.drawer/.mode-list/.mode-item*`, `.hub-list a` en la transición, `.flag-row/.flag-input` tras D-30) — el espíritu de D-31 ("entregable limpio sin código muerto") manda; `npm run test` re-ejecutado por el orquestador tras cada cambio (72/72, el revisor no pudo ejecutarlo por su allowlist).
