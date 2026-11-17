# Tokens congelados de FichaSS (D-14 — approve de Fase 00)

Fuente: `mockup/shared.css` (variante A "Porcelana oscura" como piel definitiva, decisión D-13).
Valores exactos leídos del CSS. Cualquier cambio: enmienda con OK del usuario + registro en `DECISIONS.md`.

## Color

- canvas: `#0b0d12` (fondo de app)
- surface: `#12151c` (tarjetas)
- surface-raised: `#171b24` (drawer, bottom sheet, elementos elevados)
- hairline: `rgba(168,178,203,.14)` (bordes de 1px)
- text: `#e8ebf2` · text-dim: `#9aa3b2`
- accent: `#8fb3e8` (plateado-azul; foco, chips activos, acentos)
- ok: `#7fc7a3` · danger: `#e08a8a` · warning: `#dfc07a`
- overlay/backdrop (drawer/sheet): oscurecido temático sobre canvas (~`rgba(4,6,10,.55)`)

## Forma y espacio

- radius: lg 20px (tarjetas) · md 12px (chips/internos)
- escala de spacing: 4 / 8 / 12 / 16 / 24 / 32 px
- padding de tarjeta: 20px (aire generoso, variante A)
- sombra: `0 8px 30px rgba(0,0,0,.25)` (flotantes suaves: drawer/sheet)

## Tipografía (solo local — I2/C3 prohíbe fuentes remotas)

- stack: `Inter, "Segoe UI", system-ui, ui-sans-serif, sans-serif` (Inter solo si está instalada en el sistema; auto-hospedaje de Inter se decide en Fase 02)
- display/números grandes: 28–32px, peso 300
- título de tarjeta: 15px / 600
- cuerpo: 14px · denso: 12px
- etiqueta secundaria: 11px versalitas, `letter-spacing: .08em`

## Componentes base (nombres congelados)

`.card` · `.chip` (+`.active`) · `.stat`/`.stat-grid` · `.row` (+`.skill`, `.prof` ✓, `.expert` ✓✓ ×2, `.flag-row`/`.flag-input` checkbox) · `.blockhead` · `.appbar` · `.sheet-grid` (mobile-first: 6 columnas a 390px; 8 a ≥834px; 12 a ≥1200px; `minmax(0,1fr)` + `min-width: 0` como regla de contrato de grid) · `.legend` · `.spell-group`/`.group-head` · drawer (`width: min(270px, 82vw)`) · bottom sheet con handle.

## Convenciones

- UI en español; identificadores y clases en inglés.
- Inspiración: checkbox booleano (no contador).
- 3 estados de habilidad: sin competencia / ✓ competencia / ✓✓ pericia (×2 al bonus).
- Bloques marcados con `data-modes="combate aventura descanso mesa"` (contrato provisorio que formaliza la Fase 01).
