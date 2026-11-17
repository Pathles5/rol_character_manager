# Spec — Fase 00: Mockup de estilo

Fase: 00 · Estado: spec · Compuerta: aprobación del usuario + tokens congelados en `docs/design/tokens.md`

## Objetivo

Validar el lenguaje visual de FichaSS **antes de montar el proyecto real**: 2 variantes de estilo, en HTML/CSS estático (sin framework, sin build, nada que se herede como código de aplicación), revisadas a 390×844 (móvil manda) y con las pantallas de interacción clave (drawer, bottom sheet, recomposición por modo). El mockup pasa a ser referencia visual vinculante; sus tokens se congelan en `docs/design/tokens.md`.

## Alcance

- Páginas estáticas en `mockup/`: ficha completa (modo aventura), ficha recompuesta en modo combate, ficha recompuesta en modo descanso, drawer de filtros abierto, bottom sheet de detalle abierto.
- Tokens suficientes: color (tema oscuro + acento plateado/azul), tipografía (stack local, sin fuentes remotas), radios, espaciado, elevación/sombras, escala de texto.
- Datos falsos coherentes con 5e 2024: personaje demo clérigo nivel 5 (conjuros preparados, espacios, recursos, equipo, rol) — claro aviso de que los números son placeholder del mockup; el modelo de datos no se fija aquí.
- UI en español con términos canónicos D&D en inglés.

## Fuera de alcance

- Nada de React/Astro/scaffolding real; nada de lógica de filtros; nada de persistencia; accesibilidad completa no se exige aquí (la exigencia real entra en fases 02+), aunque se pide HTML semántico y buen contraste.
- No se congelan decisiones de arquitectura ni de modelo de datos (Fase 01).

## Decisiones previstas (se cierran en approve)

- D-13: micro-estética elegida (variante A/B o híbrido) y dirección exacta de acento.
- D-14: tokens congelados (nombre y valores).

## Criterios de aceptación (verificables)

- C1: existe `mockup/` con 2 variantes navegables y al menos 5 pantallas en total (aventura, combate, descanso, drawer abierto, bottom sheet abierto).
- C2: a 390×844 no hay scroll horizontal en ninguna página de ninguna variante.
- C3: ninguna variante carga recursos externos (fuentes, imágenes, CDNs); el HTML es estático y abrirlo como archivo funciona.
- C4: las dos variantes contienen los mismos bloques de ficha completa (identidad, atributos, combate, habilidades, ataques, rasgos, conjuros, equipo/monedas, competencias, rol/notas, aliados, defensas) — cambia la piel, no el contenido.
- C5: los reencuentros por modo (combate, descanso) reordenan/ocultan bloques de forma visible y distinta al modo aventura en ambas variantes.
- C6: capturas 390×844 presentadas al usuario y estilo aprobado; `docs/design/tokens.md` escrito con los tokens congelados.
- C7: `scripts/check.ps1` en PASS.

## Riesgos / deviations

- bucle 1 (2026-11-08): el implementador cerró 11 páginas + shared.css con check PASS; el explorador validó los datos 5e 2024 y marcó 6 incorrecciones (armadura pesada no legal para clérigo 2024, fórmula de preparados de 2014 en lugar de 9 fijos, Channel Divinity 1 uso en vez de 2, 3 cantrips en vez de 4, Religión con WIS en vez de INT, conteo de siempre detectados por dominio). Corrección en vuelo dentro del límite de bucle D-08.
- bucle 2 + resolución directa del orquestador (2026-11-08): Summon Celestial (nivel 5 en 2024, no preparable a nivel 5) sustituido por Protection from Energy (verificado por el explorador); INT restaurado a 8 (−1); Investigación y Naturaleza corregidos a −1 por el orquestador (la instrucción bucle 2 contenía un error aritmético propio); cabecera de preparados sin el texto erróneo "8 usados". Presupuesto de bucles D-08 agotado; restan revisión fresh-eyes, capturas 390×844 y aprobación del usuario (D-13/D-14).
- delta final y cierre (2026-11-08…09): segunda pasada del revisor = PASS with remarks; solo majors documentales (INDEX fila fusionada, T-08 sin registrar) y un minor de simetría (leyenda en B), todos resueltos por el orquestador. El usuario eligió **Variante A "Porcelana oscura"** (D-13); B archivada como referencia. Ajustes del usuario aplicados: inspiración = checkbox booleano (+sin JS en A) y skills con 3 estados (—/✓/✓✓×2) con leyenda, también en B. Deuda para Fase 01/02: 6 competencias de demo (2 clase + 2 trasfondo + 2 con licencia del explorador: Religión/Persuasión), mapeo de "defensas" y visibilidad de `b-spells` en modo descanso, `overflow-x: clip` no debe heredarse como única garantía del C2. Incidente de harness: el subagente documentador agotó su límite de uso gratuito a mitad del cierre; el orquestador ejecutó el cierre restante directamente (tasks, tokens, DECISIONS, INDEX). Capturas fijas como imagen quedan como limitación menor (mosaico en vivo presentado y aprobado).
