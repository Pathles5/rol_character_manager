# Spec — Fase 02: Scaffold y sistema de diseño

Fase: 02 · Estado: spec · Compuerta: `npm run lint` + `npm run build` + `scripts/check.ps1`

## Objetivo

Montar el esqueleto de la app web FichaSS: proyecto buildable con Vite + TypeScript vanilla (sin framework), la base del sistema de diseño portada de la variante A aprobada (tokens de `docs/design/tokens.md` congelados en D-14) y estructura de carpetas lista para recibir los datos (Fase 03). Salida de build: carpeta de estáticos planos subible a S3 sin CloudFront.

## Alcance

- `package.json` con scripts `dev`, `lint`, `build`, `check` (check = compuerta documental) y devDependencies mínimas (vite, typescript, eslint). Coste €0 (D-11): solo herramientas libres, publicación futura S3-only.
- `index.html` raíz + módulos TS/ESLint config + `vite.config.ts` mínimo (base relativa para S3: `base: "./"`).
- `src/styles/tokens.css` con las variables exactas de `docs/design/tokens.md`.
- `src/styles/base.css` portado de `mockup/shared.css` (variante A) refactorizado a los tokens (`var(--...)`), componentes `.card/.chip/.stat/.row/.blockhead/.appbar` etc.
- Auto-hospedaje de Inter: ficheros de fuente en `src/assets/fonts/` (`@font-face`, formato woff2, descubridor local, licencia OFL, nota de origen en `docs/design/`).
- Página mínima renderizable (hero de verificación visual: una tarjeta `appbar` + `sheet-grid` con una tarjeta de ejemplo) que sirve de smoke test del sistema de diseño.

## Fuera de alcance

- Tipos TS e importación de datos (Fase 03), bloques de ficha reales (Fase 04), filtros/animación (Fase 05), contadores (Fase 06), tests (Fase 07).

## Decisiones previstas

- D-18: stack = Vite + TypeScript vanilla (validado con el usuario 2026-11-09).
- D-19: Inter auto-hospedada (validación del usuario 2026-11-09, cierra la deuda de D-14).
- D-20: CSS portado de la variante A aprobada, no reescrito.

## Criterios de aceptación (verificables)

- C1: `npm run lint` y `npm run build` pasan; el build produce `dist/` con `index.html` y las fuentes Inter incluidas en el paquete (sin URLs remotas).
- C2: grep del `dist/` no encuentra ninguna referencia a dominios externos ni rutas absolutas (todo relativo, apto para S3 en la raíz de un bucket).
- C3: los valores de `tokens.css` coinciden 1:1 con `docs/design/tokens.md` (canvas `#0b0d12`, surface, acento `#8fb3e8`, radios 20/12, spacing 4/8/12/16/24/32, …).
- C4: la página de smoke test abre en vista 390×844 sin desbordes (`overflow`), usa `sheet-grid` con `minmax(0,1fr)` + `min-width: 0`, y renderiza la estética "Porcelana oscura" aprobada con la fuente Inter visible.
- C5: revisor fresh-eyes contra C1–C5; `scripts/check.ps1` PASS.
- C6: decisión D-18/D-19/D-20 registradas en `DECISIONS.md`.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
