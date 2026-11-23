# Tasks — Fase 18: Toggle editable/solo-lectura en la vista master

Solución validada por el usuario (D-65/D-66/D-67, 2026-11-23). Estados: `pendiente → propuesta → validada(en-flight) → impl-done → revisada → done`.

## T-01 · Contrato: `editable` en MasterLayoutData + sanitizador

- Estado: done
- Responsable: implementador (propuesta validada: D-66)
- Archivos: `src/session-schema.ts`, `src/master-layout.test.ts`
- Detalle:
  - `editable?: boolean` en `MasterLayoutData` (comentario de dominio en inglés, como el resto del contrato).
  - `sanitizeMasterLayout`: `editable` = `data.editable === false ? false : true` (ausente o no booleano → default true; layouts antiguos intactos).
  - `normalizeLayout`/default de `master-layout.ts`: incluir `editable: true` en el fallback (si el tipo lo exige).
  - Tests: true/false/ausente/no-booleano → default true; round-trip de normalize/save/fetch con el campo.
- Evidencia: campo editable en `MasterLayoutData` + sanitizador con default true (ausente/no-booleano → true) + fallbacks en `normalizeLayout`/default; 4 tests nuevos en verde.

## T-02 · Toggle en el appbar + render condicional de steppers

- Estado: done
- Responsable: implementador
- Archivos: `src/views/master.ts`, `src/styles/base.css` (si procede)
- Detalle:
  - Chip toggle en `appbar-main` de la master ("Editar", `aria-pressed`, clase active cuando ON) que alterna `layout.editable` y persiste con el MISMO patrón que minimizar/grupos (saveLayout + saveLayoutRemote, D-59).
  - `steps()` devuelve cadena vacía cuando `layout.editable === false` (único punto de corte: cubre PG, temp, dados, slots, CD y recursos). Nada más cambia: dots, inspiración, condiciones, layout tools, retry, drag & drop intactos e interactivos.
  - El toggle dispara repaint de filas (patrón renderRows existente); foco del toggle preservado tras el repaint (data-focus-key).
  - El cambio de modo NO toca el store de sesión ni el flush: solo render.
- Evidencia: chip "Editar" con `aria-pressed`, corte único en `steps()`, `persist()` con patrón D-59, sync tras layout remoto, foco fuera de `#master-rows`, solo render.

## T-03 · Tests, compuertas y revisión

- Estado: done
- Responsable: implementador (tests/gates) → revisor fresh-eyes
- Archivos: los de T-01…T-02
- Detalle:
  - Suite completa sin regresiones (≥166).
  - `npm run lint`, `npm run build`, `powershell -File scripts/check.ps1` en verde.
  - Revisor fresh-eyes contra C1–C5; QA visual del usuario (toggle ON/OFF, persistencia, dots/inspiración siguen editables en OFF).
- Evidencia: 170/170 tests en verde (166 previos + 4 nuevos); `npm run lint`/`npm run build`/`check.ps1` PASS; revisor fresh-eyes PASS with remarks (majors D-65–D-67 registrados y estado sincronizado); QA del usuario APROBADO (2026-11-23).
