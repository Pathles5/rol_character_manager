---
name: Ingesta de personajes FichaSS
description: Ingesta de un personaje de D&D 5e 2024 a JSON FichaSS (ficha original texto/PDF → public/characters/<id>.json) con compuertas y revisión del usuario. Úsala cuando el usuario diga "ingesta"/"ingest", entregue una ficha para convertir, o pida añadir un personaje nuevo.
---

# Ingesta de personajes (FichaSS)

Eres el ejecutor del proceso de ingesta de FichaSS (decisión D-52: vía
agente, coste €0). **La fuente única del procedimiento es
`docs/ingest/PROMPT.md`** — léelo COMPLETO antes de tocar nada; esta skill
solo te ordena la secuencia y te recuerda las reglas duras.

## Flujo (siempre, sin atajos)

1. Lee `docs/ingest/PROMPT.md` (procedimiento y reglas completas).
2. Lee las referencias vivas que el prompt indica: `src/types.ts`,
   `src/data/blockConfig.ts`, `src/data/skills.ts` (ids exactos de pericias)
   y 2–3 JSON de `public/characters/` (un caster y un no-caster, p. ej.
   `character-demo.json` y `moss-ferrow.json`).
3. Lee la ficha original (texto pegado, archivo, foto o PDF).
4. **Dudosos `?` → pregunta al usuario ANTES de generar el JSON final**
   (regla del prompt: nada se inventa; las suposiciones se declaran).
5. Genera `public/characters/<id>.json` (id kebab-case, mismo orden de
   campos que los ejemplos, notación de dados ASCII).
6. Compuertas en el repo: `npm run build` (valida estructura vía manifest)
   y `npm run test` (suite de contrato, valida TODOS los campos). Si algo
   falla, corrige el JSON — NUNCA el validador.
7. **Revisión obligatoria**: presenta el JSON completo + tabla de cotejo
   (identidad, PG, CA, iniciativa, mods, salvaciones, pericias, rasgos con
   usos, slots, ataques, hiddenBlocks, dudosos resueltos y suposiciones).
   **Sin OK explícito del usuario NO hay push.**
8. Con el OK: commit (`Ingesta: <nombre>`), push a master → despliegue
   automático; verifica el manifest y el JSON en la URL de producción.

## Reglas duras que no se pueden saltar

- Solo se autoria lo que la hoja declara; los derivados los calcula el
  código (`derived.ts`). Si escribes un total calculado, sobra.
- `trait.uses` solo en rasgos de recurso de sesión; recursos compartidos
  (p. ej. dados psiónicos) llevan UN contador en el rasgo dueño de la
  reserva.
- No-caster: `spells` vacío (convención de `moss-ferrow.json`) +
  `hiddenBlocks: ["spells"]`.
- Comandos de ingesta para fotos/PDF: el OCR puede fallar en dígitos —
  marca explícitamente cada dígito dudoso en la tabla de cotejo.
