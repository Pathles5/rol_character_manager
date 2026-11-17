# Fuente tipográfica Inter — origen y licencia (D-19)

- **Familia:** Inter · pesos incluidos: 300 (Light), 400 (Regular), 600 (SemiBold)
- **Subsets:** `latin` y `latin-ext` (latin-ext cubre áéíóúñ del español)
- **Formato:** woff2 × 6 ficheros en `src/assets/fonts/`
- **Origen:** paquete npm `@fontsource/inter@5.3.x` (devDependency, usada solo como fuente de ficheros; su CSS no se importa — `fonts.css` propio con `@font-face` y `unicode-range` 1:1, `font-display: swap`)
- **Licencia:** SIL Open Font License 1.1 (permite redistribución en el bundle; incluida también en el repositorio del paquete)
- **Fecha de incorporación:** 2026-11-09 (Fase 02)
- **Regeneración:** reinstall `@fontsource/inter` y copiar de nuevo `inter-latin-{subset}-{weight}-normal.woff2` desde `node_modules/@fontsource/inter/files/`
- **Decisión:** D-19 (auto-hospedaje validado por el usuario; el runtime no carga nada externo — prohíbe C3/C2 del brief)
