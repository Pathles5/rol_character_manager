# Tasks — Fase 17: Dados custom rápidos

Solución validada por el usuario (D-61/D-62/D-63, 2026-11-23). Estados: `pendiente → propuesta → validada(en-flight) → impl-done → revisada → done`.

## T-01 · Parser y roller de fórmula compuesta (dice.ts)

- Estado: done
- Responsable: implementador (propuesta ya validada: D-62)
- Archivos: `src/dice.ts`, `src/dice.test.ts`
- Detalle:
  - `parseFormula(notation: string): ParsedDice[] | null` — términos `NdX` o número suelto (mod) unidos por `+`; tolerante a espacios; devuelve `null` en vacío/inválida (sin grupos de dados y sin mod → `null`).
  - `rollFormula(groups, random)` — un roll por grupo (reutiliza `rollDice`); devuelve rolls por grupo + total global.
  - Sabor: `¡CRÍTICO!` si algún grupo d20 saca 20 natural; el "¡fallo doble!" sigue reservado al `1d20` pelado.
  - Tests: válidas (`2d4 + 1d8`, `1d8+4`, `3d12+2`), inválidas (``, `d4`, `2x`, `1d4++`), determinismo con `random` mockeado.
- Evidencia: `parseFormula`/`rollFormula` implementados en `src/dice.ts` con la regla de percentil d10/d100 (D-64, Amendment 1: doble 0 → 100); 21 tests de Fase 17 en verde.

## T-02 · Desplegable de dados (dice-picker compartido)

- Estado: done
- Responsable: implementador
- Archivos: `src/views/dice-picker.ts` (nuevo), `src/styles/base.css`
- Detalle:
  - Botón de dado en appbar (SVG inline, misma geometría que `dice-btn`) + panel centrado backdrop/card (estética Fase 00).
  - Botones d4/d6/d8/d10/d12/d20/d100 que alimentan el input: primera pulsación `1dX`, siguientes suben el contador (`2d4`…); grupos ordenados por primera pulsación (ejemplo validado: `2d4 + 1d8`).
  - Input editable a mano; botón **Lanzar**; error inline en fórmula inválida; cierre con Esc/backdrop/al lanzar; foco gestionado (apertura/cierre).
  - Estilos propios en `base.css` siguiendo tokens existentes (nada de CSS nuevo suelto fuera del archivo).
- Evidencia: `src/views/dice-picker.ts` creado (presets d4…d100 que alimentan el input, input editable, Lanzar, error inline, cierre Esc/backdrop) con estilos en `src/styles/base.css`.

## T-03 · Integración en la ficha (character.ts)

- Estado: done
- Responsable: implementador
- Archivos: `src/views/character.ts`, `src/styles/base.css` (si procede)
- Detalle:
  - Botón de dado en `appbar-main` de la ficha que abre el picker.
  - `#roll-dialog` extendido a grupos: cuadrados de dado agrupados y etiquetados (`2d4`, `1d8`), total = suma; "Tirar de nuevo" re-rollea la fórmula; foco de cierre de vuelta al botón del appbar (las tiradas de la Fase 11/12/13 siguen funcionando intactas).
- Evidencia: botón de dado en el `appbar-main` de la ficha + `#roll-dialog` multi-grupo (agrupado/etiquetado, total = suma, "Tirar de nuevo"); tiradas legacy Fase 11/12/13 intactas.

## T-04 · Integración en la master (master.ts)

- Estado: done
- Responsable: implementador
- Archivos: `src/views/master.ts`
- Detalle:
  - Botón de dado en el appbar de la master + mismo picker + mismo diálogo de tirada (marcado/lógica compartida con la ficha, sin duplicar).
  - Guardas de stale-mount existentes respetadas (el picker no sobrevive a una navegación).
- Evidencia: botón de dado en el appbar de la master con el mismo picker/diálogo compartido con la ficha; cableado antes del store con las guardas de stale-mount respetadas.

## T-05 · Tests, compuertas y revisión

- Estado: done
- Responsable: implementador (tests/gates) → revisor fresh-eyes
- Archivos: los de T-01…T-04
- Detalle:
  - Tests del parser/roller en verde; suite completa sin regresiones (≥144).
  - `npm run lint`, `npm run build`, `npm run check` en verde.
  - Revisor fresh-eyes contra C1–C6 de la spec; QA visual del usuario (móvil 390×844).
- Evidencia: 166/166 tests en verde (144 base + 21 Fase 17 + 1 de presets del picker); `npm run lint` ✓, `npm run build` ✓, `powershell -File scripts/check.ps1` → PASS (orquestador; revisor ejecutó lint/build/check también); revisor fresh-eyes PASS with remarks (majors D-61–D-64 y estado resueltos; minors test de presets y suite resueltos); QA del usuario APROBADO (2026-11-23).
