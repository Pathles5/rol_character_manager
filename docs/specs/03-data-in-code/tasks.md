# Tasks — Fase 03 Datos en código

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | `src/types.ts`: tipos TS de character/sessionState 1:1 con model.md §2/§4 | done | implementador | OK usuario 2026-11-09 (propose·validate) | `LiteralAbility`/`SpellLevel`/`PreparedSource`/`AttackKind` + interfaces Character/SessionState completas; compila strict |
| T-02 | `src/data/character.ts` (fixture Seren Aldaard como módulo) y `src/data/blockConfig.ts` (matriz §6) | done | implementador | OK usuario 2026-11-09 (D-21) | transcripción valor a valor del JSON; 13 filas §6 con weights 10–70 |
| T-03 | `src/derived.ts`: derivados §3 como funciones puras | done | implementador | OK usuario 2026-11-09 | verificado mecánicamente con bundle CJS (esbuild+node): DES +1, CD 14, ataque +6, iniciativa +1, 9 libres, iniciales "SA", salv. WIS 6/CHA 3/INT −1 |
| T-04 | `src/validate.ts`: validador cliente espejo del contrato D-17 | done | implementador | OK usuario 2026-11-09 (D-22) | fixture pasa; rechaza `spellDC`/`sessionState`/`x_test` con mapa campo→mensaje (verificación mecánica); sin dependencias |
| T-05 | Smoke test de datos (1 tarjeta con derivados calculados) | done | implementador | OK usuario 2026-11-09 | tarjeta Atributos con mods calculados en runtime por `computeDerived` |
| T-06 | Compuertas + revisor fresh-eyes C1–C6 + D-21/D-22 + INDEX al cierre | done | orquestador + revisor | — | lint/build/check PASS; revisor **PASS with remarks** (0 majors): minors resueltos por orquestador (skills calculados en runtime y verificados en navegador: +6/+6/+2/+3; `data-modes` de Atributos corregido a "aventura mesa" según §6); verificación mecánica de derivados/validador con bundle CJS (esbuild+node): DES +1 · CD 14 · ataque +6 · 9 libres · "SA" · salv. 6/3/−1 · rechazo de `spellDC`/`sessionState`/`x_test`; erratas limpiadas (spec C2, D-21) |
