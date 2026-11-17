# Tasks — Fase 02 Scaffold y sistema de diseño

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Scaffold: `package.json` (scripts dev/lint/build/check), `vite.config.ts` (`base: "./"`), `tsconfig.json`, ESLint config, `index.html` raíz | done | implementador | OK usuario 2026-11-09 (propose·validate) | vite 6 · TS 5.6 · eslint 9 flat; base "./"; `npm install` OK |
| T-02 | Descargar/instalar Inter (woff2, OFL) a `src/assets/fonts/` + `@font-face` + nota de origen/licencia en `docs/design/` | done | implementador (+orquestador cierre doc) | OK usuario 2026-11-09 (D-19) | 6 woff2 (300/400/600 × latin/latin-ext), fonts.css propio con unicode-range y font-display: swap; `docs/design/fonts.md` (creado por orquestador: permiso del implementador bloqueado) |
| T-03 | `src/styles/tokens.css` (variables exactas de `docs/design/tokens.md`) + `src/styles/base.css` portado de `mockup/shared.css` refactorizado a tokens | done | implementador | OK usuario 2026-11-09 (D-20) | port íntegro sin cambios visuales; `min-width: 0` en hijos de sheet-grid; deltas --accent-soft/--overlay registrados en D-20 |
| T-04 | Página de smoke test del sistema de diseño (appbar + sheet-grid + tarjeta demo) | done | implementador (+orquestador corr. aritmética skills) | OK usuario 2026-11-09 | appbar + tarjetas demo; skills corregidos a aritmética 2024 (SAB +5, Religión +1, Persuasión +2, expert Religión +3) |
| T-05 | Compuertas: `npm run lint` + `npm run build` + check.ps1; revisor fresh-eyes C1–C6; D-18/D-19/D-20 en DECISIONS.md; INDEX de fase 02 al cierre | done | orquestador + revisor | — | lint 0 avisos; build OK (dist: index.html + 6 woff2, 0 URLs externas); check PASS; revisor **PASS with remarks** (0 majors; minors: errata D-18 corregida, fila duplicada 03 eliminada, estados sincronizados, números demo corregidos); visual 390×844 verificado con captura |
