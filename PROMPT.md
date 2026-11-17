# FichaSS — Brief y mandato para el lead engineer/designer

> **Esto no es una especificación cerrada.** Es un brief de producto y un mandato de ingeniería. Tú tomas todas las decisiones de diseño y desarrollo. No ejecutes una receta: propone, justifica, construye y documenta.

---

## 1. Mandato

Actúa como **lead engineer + product designer** de una app web nueva. Eres responsable de:

- Elegir el stack y la arquitectura.
- Definir el modelo de datos.
- Definir la taxonomía de bloques de la ficha.
- Definir el sistema de filtros y su comportamiento.
- Definir el lenguaje visual y el sistema de diseño.
- Definir la estrategia de animación.
- Definir la persistencia y la verificación.
- Implementar la primera versión del front.
- Documentar cada decisión y sus riesgos.

No quiero que sigas una lista de instrucciones pixel a pixel. Quiero que tomes las decisiones que tomaría un buen equipo de producto, con criterio y con las restricciones de abajo. Si una preferencia del brief te parece equivocada, cámbiala y explica por qué.


---

## 2. Producto

**FichaSS** es una app web para que un jugador de **D&D 5e (2024)** consulte la ficha de **su** personaje durante una partida.

- Un jugador, un personaje, una pantalla. No es un gestor de campaña, ni un buscador de personajes, ni una herramienta para el DM.
- La vista principal es la ficha completa del personaje: identidad, atributos, combate, habilidades, ataques, rasgos, conjuros preparados y conocidos, equipo, inventario, monedas, competencias, rol, notas, aliados, defensas… **Tú decides la taxonomía final**.
- Hay un **menú deslizante de filtros/modos**: combate, aventura, descanso y un cuarto modo catch-all para lo que no encaje (rol, peso, notas, dudas de mesa). El nombre del cuarto modo lo decides tú.
- Al aplicar un filtro, los bloques que no aplican **desaparecen**; los que quedan **se reordenan, se estiran o se encogen** para recomponer la pantalla. La animación del reflujo es parte del producto, no un adorno.
- Cada bloque debe llevar **metadatos de filtro** (al menos un booleano por modo; puedes añadir tamaño, orden u otra dimensión si mejora el reflujo).
- La información densa debe poder consultarse sin romper el grid: tú decides si con una hoja inferior, un panel, una expansión en el sitio o una combinación.
- En esta versión los datos son **falsos**. El modelo de datos está por definir: lo diseñas tú.
- La app debe sentirse **rápida y fluida**, no como un dashboard corporativo.

---

## 3. Usuario y contexto

- El usuario es el jugador, no el DM. La app está centrada en su personaje y no necesita optimizar el cambio entre personajes.
- Se usa sobre todo en el **móvil**, en la mesa, a veces con poca luz, prisa y una mano.
- También debe funcionar bien en tablet y escritorio, pero el móvil manda.
- El autor del proyecto es **junior en React** y siente curiosidad por **Astro**. Aprender también cuenta, pero la prioridad es que la app sea rápida, fluida y mantenible.
- La UI va en **español**, con términos canónicos de D&D en inglés (`AC`, `DC`, `Spell Slots`, `Saving Throws`). El código y los identificadores, en inglés.

---

## 4. Preferencias del usuario (punto de partida, no dogma)

Estas son las inclinaciones que salieron de la entrevista. Úsalas como sesgo inicial, no como obligación. Si propones otra cosa, justifícalo.

| Área | Preferencia inicial |
|---|---|
| Estética | Minimalista, muy Apple, elegante, líneas ligeramente curvas; sin neón ni glassmorphism excesivo |
| Tema | Oscuro, con acento plateado/azul y tipografía sans limpia (Inter o similar) |
| Menú | Drawer lateral deslizante con backdrop |
| Detalle | Bottom sheet para la información densa |
| Contadores | PG, PG temporales, espacios de conjuro, inspiración, dados de golpe, salvaciones de muerte y recursos, interactivos y persistidos en local |
| Persistencia | `localStorage` para el estado de sesión; nada de backend en v1 |
| Alcance | Sin PWA, sin toggle de tema, sin router, sin autenticación, sin selector de personajes |
| Verificación | `build` + `lint`; tests solo si aportan valor real |

Puedes cambiar cualquiera de estas preferencias si tienes una razón mejor. Documenta el cambio y el motivo.

---

## 5. Restricciones reales (no negociables)

1. **D&D 5e 2024** en exclusiva. No construyas un motor multijuego si no aporta valor; si lo haces, que sea barato y justificado.
2. **Un personaje por jugador**. Sin selector de personajes ni vistas de grupo.
3. Los filtros deben producir **reflujo animado real**, no solo ocultar y mostrar bloques.
4. La v1 es **solo front con datos falsos**. No implementes backend, autenticación, DynamoDB, CloudFormation ni GitHub Actions todavía.
5. El front debe ser compatible con la infraestructura futura:
   - AWS.
   - Front estático en **S3**, sin CloudFront.
   - Backend **Node/JS**.
   - **DynamoDB on-demand**.
   - **CloudFormation** como IaC.
   - **GitHub Actions** para CI/CD.
6. El modelo de datos que definas será el **contrato del futuro `POST /characters`** (JSON en el body). Documéntalo, pero no lo implementes.
7. **Sin recursos externos**: ni fuentes de Google, ni imágenes remotas, ni CDNs. Todo local y desplegable como estático.
8. El build debe ser **100 % estático** y subible a S3 sin servidor.
9. La UI en español; el código en inglés.
10. La app debe ser **accesible**: teclado, foco visible, diálogos con focus trap, contraste y `prefers-reduced-motion`.

---

## 6. Decisiones que debes tomar

Debes pronunciarte sobre estas diez decisiones y dejarlas escritas en `DECISIONS.md`. Para cada una: opciones consideradas, elección, motivo y riesgo.

1. **Stack**: Astro vs React vs otra opción. Evalúa interactividad, animación de layout, curva de aprendizaje, rendimiento, hosting estático y ecosistema. Elige y justifica.
2. **Arquitectura**: estructura de carpetas, capas, estado, tipos, configuración y límites entre datos, presentación y comportamiento.
3. **Modelo de datos**: entidades, campos, valores derivados vs almacenados, metadatos de filtro, versionado y contrato JSON. Mantén 5e 2024 simple; no infles el modelo.
4. **Taxonomía de bloques**: qué bloques existen, qué contiene cada uno, qué se ve en el resumen y qué en el detalle, y cómo se evita la duplicación.
5. **Modelo de filtros**: modos, semántica, exclusividad o multiselección, matriz de visibilidad/tamaño/orden y cómo se edita.
6. **Sistema de diseño**: tokens, tipografía, color, radios, spacing, materiales, iconografía y movimiento.
7. **Animación del reflujo**: Motion, View Transitions, CSS u otra. Considera `prefers-reduced-motion` y el coste en móvil.
8. **Persistencia**: qué se guarda, dónde, cómo se versiona, cómo se migra y cómo se resetea.
9. **Verificación**: build, lint y QA manual. Añade tests solo si aportan valor; si no, dilo.
10. **Contrato futuro del backend**: forma del JSON, endpoint, campos derivados, errores y qué NO debe enviar el front. Sin implementarlo.

Además, elige un **personaje de demostración** que ejercite el mayor número de bloques posible. Sugerencia: un clérigo o paladín de nivel 5, con conjuros preparados, espacios, recursos, equipo y rol. Los números deben ser coherentes con 5e 2024; si algo es dudoso, documenta la interpretación.

---

## 7. Proceso obligatorio

Trabaja en este orden. No pidas aprobación entre fases.

> **Nota de proceso (revisión v2):** el trabajo no es una tanda única: es un ciclo SDD (Spec-Driven Development) gobernado por el AI Harness (ver `AGENTS.md`). Cada fase tiene su spec en `docs/specs/` **antes** de implementar; cada fase termina con verificación y una decisión documentada en `DECISIONS.md`. Las inmutables del proyecto están en `docs/specs/constitution.md`; ninguna decisión de ninguna fase puede contradecirlas.

### Fase 0 — Mockup de estilo

1. Mockup HTML estático (sin framework, sin build) con tokens iniciales: tema oscuro, acento plateado/azul, tipografía local, tarjetas representativas de los bloques, drawer y bottom sheet.
2. Se revisa como captura a 390×844 (móvil manda) y en tablet/escritorio.
3. Ajustar el estilo hasta aprobación del usuario. Ese mockup pasa a ser la **referencia visual vinculante** para las fases siguientes: sus tokens se congelan en `docs/design/tokens.md`.

### Fase 1 — Modelo de datos

Definir entidades, campos, derivados vs almacenados, metadatos de filtro, versionado y el contrato JSON del futuro `POST /characters`. Se documenta en la spec de la fase y se congelan los tipos. No se implementa nada de UI todavía.

### Fase 2 — Scaffold y sistema de diseño

Proyecto, dependencias, tokens elegidos en la Fase 0, tipografía, layout shell, app bar y grid base.

### Fase 3 — Datos en código

Tipos de la Fase 1, fixture del personaje demo, valores derivados y configuración de filtros.

### Fase 4 — Ficha estática

Grid, tarjetas, resúmenes, responsive. Todavía sin filtros ni hojas.

### Fase 5 — Filtros y animación

Menú, matriz, reflujo, persistencia del modo y `prefers-reduced-motion`.

### Fase 6 — Detalle y contadores

Hojas o el patrón de detalle que hayas elegido; PG, espacios, inspiración, dados, muerte y recursos; persistencia y reset.

### Fase 7 — Tests y QA

Tests de valor real (derivados, matriz de filtros, persistencia con versionado) elegidos en la spec de la fase. Accesibilidad, estados vacíos, error boundary. QA manual a 390×844.

### Fase 8 — Pulido y entrega

`README.md`, informe final, límites conocidos.

Al final de cada fase ejecuta `npm run lint` y `npm run build`. Si algo falla, corrígelo antes de continuar.

---

## 8. Criterios de éxito

- La app arranca y compila sin errores.
- A 390×844 no hay scroll horizontal y la ficha se lee con comodidad; tablet y escritorio están cuidados.
- La vista principal es rica y legible: identidad, atributos, combate, habilidades, ataques, rasgos, conjuros, equipo, monedas, competencias, rol, notas, aliados y defensas, o la taxonomía que hayas defendido.
- El menú deslizante cambia entre modos; los bloques correctos desaparecen; el resto se recoloca con una animación fluida y sin saltos.
- Cada bloque tiene metadatos de filtro editables en un único sitio.
- La información densa se consulta sin romper el grid.
- Los contadores funcionan y persisten; el resto de la ficha es de solo lectura.
- La app es accesible por teclado, con foco visible, diálogos con focus trap y reduced motion.
- No hay backend, router, PWA, autenticación ni recursos externos.
- `DECISIONS.md` y `README.md` explican el qué, el porqué y cómo se edita.

---

## 9. Entregables

- Repo funcional.
- `DECISIONS.md`: las diez decisiones + árbol de componentes + modelo de datos + contrato futuro.
- `README.md`: arranque, estructura, cómo editar filtros y tokens, limitaciones.
- Informe final: qué construiste, comandos, decisiones clave, desviaciones y siguientes pasos.

---

## 10. Fuera de alcance de la v1

- Backend, API real, DynamoDB, CloudFormation, GitHub Actions, auth y multiusuario.
- Selector de personajes, edición de la ficha, PDF, tirada de dados, PWA, tema claro e i18n.
- Tests extensivos, Storybook, MSW o validación en runtime.
- Cualquier recurso externo (imágenes, fuentes remotas, CDNs).

Si algo de esto aparece como “mejora obvia”, anótalo en el informe final, no lo implementes.

---

## 11. Cómo responder

- Empieza con un plan de 10–15 líneas y las decisiones principales.
- Después implementa sin pedir permiso.
- Si algo es ambiguo, decide, documenta y sigue.
- No cierres con preguntas abiertas.
- Termina con el informe final y la confirmación de que `lint` y `build` pasan.

---

## 12. Contexto original del usuario (resumen)

> “El front tiene que ser una composición minimalista con líneas ligeramente curvas a un estilo muy Apple, muy elegante. Todo se ordenará por categoría: atributos, lista de items, equipo, hechizos aprendidos, hechizos preparados… A nivel funcional, la app está pensada para que cada jugador la use centrada en su personaje. La primera vista principal debe ser del personaje del jugador con todas las estadísticas como en una ficha de D&D. Debe haber un menú deslizante con filtros como combate, aventura, descanso, off-topic. Al aplicar los filtros, habrá atributos y categorías que desaparezcan si no aplican, y las que quedan se deslizarán y ampliarán o encogerán para reordenarse ocupando toda la pantalla. Cada categoría o atributo debe tener un objeto `filter` con un valor booleano por filtro. El modelo de datos está por definir; de momento trabajaremos el front falseando datos. Se alojará en AWS, con GitHub Actions, CloudFormation, DynamoDB bajo demanda y front en S3 sin CloudFront. A valorar entre Astro o React: soy muy junior en React y Astro me llama la atención; la app debe ser rápida y fluida. Backend JS/Node.”
