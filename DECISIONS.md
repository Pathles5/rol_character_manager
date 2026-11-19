# DECISIONS — FichaSS

Registro append-only. Una decisión desfasada no se edita ni se borra: la nueva añade `supersedes: D-xx`.
Formato: ID · fecha · contexto · opciones · elección · motivo · riesgo.

---

## D-01 · 2026-11-08 · Reestructuración del proceso del brief

- **Contexto:** el brief original define un proceso de expansión única (fase de decisiones → scaffold → ...). El usuario quiere ritmo propio: mockup primero, modelo de datos después, implementación y tests después.
- **Opciones:** (a) seguir el proceso del brief tal cual; (b) reestructurar a ciclo SDD con mockup y modelo de datos como fases 0 y 1.
- **Elección:** (b). Fase 00 mockup de estilo (HTML estático, aprobación del usuario, tokens congelados); Fase 01 modelo de datos y contrato JSON; 02–06 implementación incremental; 07 tests/QA; 08 pulido.
- **Motivo:** validar estética antes de codear reduce rework del sistema de diseño; congelar el modelo antes de la UI evita improvisar el contrato a mitad de la implementación; el brief permite reordenar ("no ejecutes una receta").
- **Riesgo:** el mockup no reutiliza su código, solo los tokens; coste bajo.

## D-02 · 2026-11-08 · AI Harness con swarm desde todas las fases

- **Contexto:** el usuario quiere AI Harness explícito con orquestación de agentes (swarm) y SDD. Había que fijar cuándo entran los subagentes.
- **Opciones:** (a) swarm solo desde la implementación (Fase 2+); (b) desde todas las fases incluidas 0 y 1; (c) siempre con aprobación previa del usuario.
- **Elección:** (b) swarm desde todas las fases, con roles orquestador/implementador/explorador/revisor y escritura acotada, según `AGENTS.md` §3.
- **Motivo:** el usuario lo eligió explícitamente; da paralelismo también en generación de variantes de estilo y alternativas del modelo.
- **Riesgo:** en decisiones de diseño (fases 0–1) el subagente puede avanzar propuestas que el orquestador debe curtir; el control fino lo retiene el orquestador (specs, decisiones, integración).

## D-03 · 2026-11-08 · Compuerta mecánica documental desde ya

- **Contexto:** antes de Fase 02 no existe npm; las compuertas documentales corrían riesgo de ser de papel.
- **Opciones:** (a) esperar a Fase 02 para tener `npm run check`; (b) script propio sin dependencias (`scripts/check.ps1`) desde la Fase 00.
- **Elección:** (b) `scripts/check.ps1`: valida presencia y forma de constitución, `DECISIONS.md`, spec de la fase en curso con criterios de aceptación, coherencia con `INDEX.md` y estado de fases previas. Integrado como `npm run check` desde Fase 02.
- **Motivo:** convierte las compuertas del harness en algo ejecutable y barato; evita reler documentos para saber en qué estado está el repo.
- **Riesgo:** el script solo valida forma, no contenido; la calidad sigue en spec + revisor.

## D-04 · 2026-11-08 · Revisor fresh-eyes al cierre de cada fase

- **Contexto:** quién verifica que la entrega cumple los criterios de la spec.
- **Opciones:** (a) el propio orquestador; (b) subagente revisor en cada fase; (c) solo QA final (Fase 07).
- **Elección:** (b) subagente revisor con contexto mínimo (spec + criterios) en el cierre de cada fase; el orquestador corrige o registra el desvío aceptado.
- **Motivo:** evita el sesgo de autocomplacencia: quién revisa no sabe quién escribió el código.
- **Riesgo:** coste de contexto por fase; aceptado por el usuario.

## D-05 · 2026-11-08 · Jerarquía de verdad y change control

- **Contexto:** necesidad de un orden de mando estable entre brief, constitución, harness, specs y decisiones.
- **Elección:** `PROMPT.md` → `docs/specs/constitution.md` (gana a todo) → `AGENTS.md` → specs; `DECISIONS.md` append-only con IDs; estado vivo en `INDEX.md`. Constitución solo modificable con OK del usuario (I6), specs congeladas en `implement` (enmiendas documentadas).
- **Motivo:** trazabilidad decisión→spec→código y prevención de la erosión de inmutables por fases posteriores.
- **Riesgo:** overhead de proceso; mitigado con documentos concisos.

---

# Enmiendas de harness · 2026-11-08 (revisión del andamio con el usuario)

## D-06 · 2026-11-08 · Subagentes como archivos OpenCode V2 y rol de documentador `supersedes` parcial a D-02

- **Contexto:** la revisión del andamio pide definir los subagentes según la documentación de OpenCode (carpeta `.opencode`, formato `.md`) y añadir un quinto rol (documentador).
- **Opciones:** (a) roles descritos solo en `AGENTS.md` y lanzados como subagentes built-in (`general`/`explore`); (b) agentes custom de OpenCode V2 en `.opencode/agents/*.md` con frontmatter (`description`, `mode: subagent`, `permissions`) y system prompt en el cuerpo.
- **Elección:** (b). Cinco definiciones: `explorer.md` (solo lectura, sin shell), `implementer.md` (escritura acotada a código/mockup; prohibido docs y config), `reviewer.md` (solo lectura + compuertas `check`/`lint`/`build`), `documenter.md` (nuevo: solo `docs/**`, `DECISIONS.md`, `README.md`; nunca código ni constitución), más el orquestador. Los `permissions` refuerzan mecánicamente la escritura acotada del §3.
- **Motivo:** indicación explícita del usuario; los permisos declarativos eliminan el riesgo de que un subagente pise archivos inmutables por error.
- **Riesgo:** los permisos de ruta usan globs: una reorganización de carpetas puede dejarlos desajustados; revisarlos al reordenar el repo.

## D-07 · 2026-11-08 · Validación del usuario por tarea (user-first obligatorio)

- **Contexto:** el usuario exige que la solución de cada tarea se muestre y valide con él antes de llegar al implementador.
- **Opciones:** (a) validación solo a nivel de fase/spec; (b) validación por tarea antes del implement.
- **Elección:** (b). Ciclo por tarea: propose·validate → implement (AGENTS.md §1.3). Las propuestas nacidas en subagentes también pasan por el usuario (no hay skip automático).
- **Motivo:** decisión explícita del usuario; convierte cada implement en la ejecución de una solución ya vista y avalada.
- **Riesgo:** más paradas y latencia por sesión; a cambio, cero retrabajo grande y control total del rumbo. El límite de bucle de D-08 complementa esta decisión sin sustituirla.

## D-08 · 2026-11-08 · Límite de bucle entre subagentes: máximo 2 repeticiones

- **Contexto:** riesgo conocido del swarm: bucles de corrección infinitos entre subagentes (implement ↔ revisor) que queman contexto sin converger.
- **Opciones:** (a) sin límite (el orquestador decide ad hoc); (b) máximo 2 repeticiones de bucle por tarea; luego escalado.
- **Elección:** (b). Flujo: primera entrega → revisión → corrección 1 → revisión → corrección 2. Si aún falla: la tarea vuelve al orquestador (lo resuelve él o la escala al usuario); el bloqueo se anota en la spec (sección *Risks / deviations*).
- **Motivo:** decisión del usuario; garantiza terminación (progreso siempre) y evita el coste de tandas de revisión sin convergencia.
- **Riesgo:** una tarea difícil puede quedar "engavetada" prematuramente; el escape natural es el escalado explícito al usuario con contexto de lo intentado.

## D-09 · 2026-11-08 · Ciclo de vida y asignación de tareas por estado

- **Contexto:** el usuario pregunta cómo se asignan y rotan las tareas según el estado de inicio a fin. Revisión del andamio: estaba definido el ciclo por fase y los roles, pero no el estado por tarea ni la matriz de asignación.
- **Opciones:** (a) mantener solo casillas hecho/no-hecho y decidir caso a caso; (b) formalizar estados por tarea (`pendiente → propuesta → validada/en-flight → impl-done → revisada → done`, más `bloqueada`) con matriz de asignación por rol y plantilla de `tasks.md`.
- **Elección:** (b), validada por el usuario. La tarea rota de rol cuando cambia de estado (sin round-robin): propuesta=orquestador→usuario (D-07), ejecución=implementador, integración+compuertas=orquestador, revisión=revisor fresh-eyes, sincronización=documentador. `bloqueada` tras 2 bucles (D-08) escala al usuario. Paralelismo: varias tareas `en-flight` solo si no comparten archivos. Plantilla en `docs/harness/tasks-format.md`; matriz en `AGENTS.md` §3a.
- **Motivo:** cierra el hueco operativo del swarm antes de llegar a fases con piezas paralelas (Fase 02+); hace auditable quién hizo qué y con qué visto.
- **Riesgo:** overhead de registro por tarea; mitigado porque solo hay un campo más por fila y lo lleva el documentador, no el orquestador.

## D-10 · 2026-11-08 · El orquestador se define como agente declarativo (`orchestrator.md`, default del repo) `supersedes` la columna de origen de D-02/D-06

- **Contexto:** el usuario observa que el orquestador es el único rol sin definición de subagente/agente. Hasta ahora era "la sesión principal" apoyada en el agente built-in `build` + `AGENTS.md` auto-cargado: comportamiento por instrucciones, no declarativo.
- **Opciones:** (a) dejarlo como hasta ahora (asimetría; el cumplimiento dependía de releer instrucciones); (b) definirlo como agente OpenCode V2 primario con `permissions` declarativos y marcado como `default_agent` en `opencode.jsonc`.
- **Elección:** (b). `.opencode/agents/orchestrator.md` con `mode: primary`; permisos que piden aprobación del usuario (`ask`) para editar `constitution.md`, `AGENTS.md` y `PROMPT.md` (aplicación mecánica del change control de I6/D-05) y que restringen el lanzamiento de subagentes a los 4 del harness; `opencode.jsonc` con `default_agent: "orchestrator"` para que toda sesión nueva del repo arranque con este rol.
- **Motivo:** indicación del usuario; paridad con los otros roles, enforcement mecánico del change control y comportamiento del harness estable entre sesiones sin depender de la memoria del modelo.
- **Riesgo:** un system prompt propio sustituye el prompt base del agente primario: si el cuerpo quedara incompleto, el orquestador podría ser más torpe en tareas genéricas; mitigado porque el cuerpo remite al harness como fuente de reglas y AGENTS.md se auto-carga como instrucciones.

## D-11 · 2026-11-08 · Invariante de coste €0 para infra, CI/CD y repo (enmienda de constitución, petición del usuario)

- **Contexto:** el usuario exige que la infraestructura AWS, el CI/CD y el repositorio no incurran nunca en gasto alguno.
- **Opciones:** (a) dejarlo como preferencia suelta en el brief; (b) elevarlo a invariante de constitución (I2, cláusula "Coste €0") verificado mecánicamente por `scripts/check.ps1`.
- **Elección:** (b). Free Tier de AWS exclusivamente (S3, DynamoDB on-demand, CloudFormation sin factura por plantillas, sin CloudFront), GitHub Actions solo con repo público o cuota gratuita, alerta de facturación $0 desde el primer despliegue; cualquier excepción pagada exige aprobación explícita del usuario y decisión registrada. La compuerta falla si la cláusula desaparece de la constitución.
- **Motivo:** petición explícita del usuario; el coste es un invariante financiero, no una preferencia de diseño, y por tanto pertenece a la capa que gana sobre todas las specs.
- **Riesgo:** los Free Tier son condicionales (12 meses de Amazon S3/DynamoDB en algunas métricas, cuotas de uso); la paranoia correcta es revisar la cuenta en cada compuerta de fase de infra y mantener la alerta $0; el dominio, si algún día se compra, es gasto opcional del usuario fuera del proyecto.

## D-12 · 2026-11-08 · Subagente DevOps definido por adelantado (activación en Fase 09)

- **Contexto:** el usuario duda si tener un subagente devops para pipelines e IaC. Mi recomendación era aplazarlo a la Fase 09; el usuario eligió definirlo ya.
- **Opciones:** (a) aplazar definición hasta Fase 09 con su spec; (b) definir ahora `devops.md` con permisos cerrados y activación diferida.
- **Elección:** (b). `.opencode/agents/devops.md`: escritura acotada a `.github/**` (CI) e `infra/**` (IaC CloudFormation); shell solo de inspección sobre estados del repositorio, acciones de GitHub y servicios de AWS (`ls`/`describe`/`view`/`validate`); denegación mecánica de acciones destructivas (`git push --delete`, `s3 rb/rm`, `delete-table`, `delete-stack`) y de cualquier otro comando `aws` que salga del rango de inspección (si se necesita un despliegue real, lo ejecuta el orquestador). Su primer deber inmutable es el Coste €0 (D-11): alerta de facturación $0 antes de ningún despliegue, Free Tier solo, y cada recurso etiquetado con `<cost-policy>: free-tier-only`.
- **Motivo:** elección explícita del usuario; da continuidad al harness: el swarm queda cerrado con 5 subagentes listos para todas las fases, y el uso futuro queda sujeto a reglas inmutables ya escritas.
- **Riesgo:** definido sin uso, puede darle un ligero desajuste de permisos cuando se active si las herramientas reales de la fase (p. ej. `aws cli` versiones, namespaces de mcp) cambian; revisar los permisos del agente al abrir la Fase 09 como primera tarea de esa spec (ya anotado en INDEX).

# Cierre de Fase 00 · 2026-11-08…09

## D-13 · 2026-11-08 · Micro-estética elegida: Variante A "Porcelana oscura"

- **Contexto:** compuerta de la Fase 00: se entregaron 2 variantes (A: aire + hairlines + radios grandes; B: contraste alto + compacidad) en un mosaico de viewports reales de 390×844 (`mockup/capturas.html`) y el usuario eligió.
- **Opciones:** A / B / híbrido A+B.
- **Elección:** A. B queda archivada en `mockup/variant-b/` como referencia (sin los retoques finales salvo la leyenda de estados y el marcador de competencia por CSS compartido).
- **Motivo:** indicación directa del usuario tras ver el mosaico (D-07); rinde mejor el brief "minimalista, muy Apple".
- **Riesgo:** la densidad de B puede re-explorarse si la app real se siente vacía en tablets/escritorio; decisión barata de revisar en Fase 02.

## D-14 · 2026-11-08 · Tokens congelados en `docs/design/tokens.md`

- **Contexto:** la compuerta de Fase 00 exige tokens congelados como referencia vinculante.
- **Elección:** valores exactos (color, forma/espacio, tipografía solo local, componentes y convenciones) en `docs/design/tokens.md`, leídos de `mockup/shared.css` de la variante A. Cambios futuros = enmienda con OK del usuario + decisión registrada.
- **Motivo:** cierra C6 y entrega a la Fase 02 (scaffold y sistema de diseño) su punto de partida tal cual.
- **Riesgo:** no heredar `overflow-x: clip` como única garantía del C2; mantener `minmax(0,1fr)` + `min-width: 0` como regla de contrato de grid (observación del revisor).

## D-15 · 2026-11-09 · Incidente de harness: límite de uso del subagente documentador

- **Contexto:** durante el cierre de la Fase 00, la llamada al documentador falló por límite de uso gratuito de la plataforma; el cierre quedó a mitad.
- **Opciones:** (a) reintentar el subagente; (b) el orquestador ejecuta el cierre documental directamente y lo registra como incidente.
- **Elección:** (b). tasks.md/spec/INDEX/tokens/DECISIONS cerrados por el orquestador; la Resolución se anota en la spec de la fase.
- **Motivo:** el ciclo exige terminación; el harness no puede quedar bloqueado por un límite externo del proveedor. El rol documentador sigue siendo el estándar y obsérvelo en cuanto vuelva a estar disponible.
- **Riesgo:** si los límites free persisten, el swarm quedará reducido al orquestador + gates mecánicos; alternativa práctica: asumir en el informe que las tareas de documentación hechas por orquestador son la excepción documentada, no la norma.

## D-16 · 2026-11-09 · Modelo de datos v1: dos documentos raíz (`character` + `sessionState`)

- **Contexto:** Fase 01; la propuesta se validó con el usuario vía propose·validate (D-07), junto con dos subdecisiones: `spells` visible también en modo `descanso` y nombre canónico del 4.º modo = **"mesa"**.
- **Elección:** modelo documentado en `docs/specs/01-data-model/model.md`: `character` canónico (identity, abilities, combat, defense, skills×2, attacks, traits, spells, equipment, proficiencies, role, allies, `x_demoNotes`) + `sessionState` solo-cliente (hp/temp, hitDice usados, slots usados, channelDivinity, inspiration booleana, deathSaves, conditions, resourcesUsed), ambos con `schemaVersion: 1` y migración forward-only. Derivados (modificadores, totales, CD de conjuro, ataque de conjuro, iniciativa, preparedCount, iniciales) se **calculan en cliente, nunca se almacenan ni viajan**; se almacenan AC/velocidad/maxHP/hitDice. Matriz de filtros de 13 bloques × 4 modos con `weight`/`layout` en config única; aventura = ficha completa por defecto.
- **Motivo:** separa lo consultado de lo contado; el brief de v1 no tiene backend, pero el contrato queda listo.
- **Riesgo:** maxHP almacenado (el cálculo de creación de PG no se modela); las duraciones concretas de algunos conjuros 2024 quedan como textos de demo (anotado en `x_demoNotes` del fixture).

## D-17 · 2026-11-09 · Contrato del futuro `POST /characters` (documentado, no implementado)

- **Contexto:** cierre de Fase 01; define la forma del futuro endpoint sin implementar backend.
- **Elección:** `POST /characters` con body = `character` completo (schemaVersion 1); `201` → `{ "characterId", "character": <eco canónico> }`; `400` → `{ "error": "validation_failed", "fields": { ruta→mensaje } }`; rechazo de derivados, de `sessionState`, de metadatos de UI y de cualquier `x-*` salvo `x_demoNotes` en fixtures; `415` si el content-type no es JSON; autenticación fuera del alcance v1. El front no envía derivados (§3 del modelo) ni estado de sesión.
- **Motivo:** servidor tonto que valida orden y no calcula: mantiene la frontera character/sessionState intacta aunque aparezca backend.
- **Riesgo:** la asimetría de rechazo (`x_demoNotes` permitido en fixtures) debe reflejarla el validador sierra de Fase 03 en cliente; anotado en model.md.

## D-18 · 2026-11-09 · Stack del scaffold: Vite + TypeScript vanilla

- **Contexto:** Fase 02; el resto de decisiones de la fase se validó juntas con el usuario (propose·validate).
- **Elección:** Vite + TypeScript vanilla, sin framework. `vite.config.ts` con `base: "./"` y target es2018 → `dist/` de estáticos planos subibles a S3 sin CloudFront. devDependencies solo dev (vite, typescript, eslint 9 flat, typescript-eslint, @fontsource/inter como fuente de ficheros). Scripts `dev/build/lint/check`.
- **Motivo:** verificación tipada del modelo (D-16) sin runtime externo; cumple el brief (I3/I5) y las compuertas lint/build; coste €0 (I2).
- **Riesgo:** sin framework, los componentes de la ficha son plantillas JS propias; más código de render que con un framework, pero cero dependencias en runtime.

## D-19 · 2026-11-09 · Inter auto-hospedada en el bundle

- **Contexto:** deuda de Fase 00 (D-14 dejaba la fuente "si está instalada").
- **Elección:** 6 woff2 (pesos 300/400/600 × latin/latin-ext) de `@fontsource/inter` copiados a `src/assets/fonts/`, con `@font-face` propios (`font-display: swap`); origen/licencia en `docs/design/fonts.md`.
- **Motivo:** tipografía idéntica en cualquier dispositivo; sigue sin recursos externos en runtime.
- **Riesgo:** ~150 KB de fuentes en el bundle; aceptado explícitamente por el usuario.

## D-20 · 2026-11-09 · CSS sistema de diseño: port de la variante A aprobada

- **Contexto:** Fase 02; tokens congelados D-14.
- **Elección:** `src/styles/base.css` es port de `mockup/shared.css` con hardcodes sustituidos por `var(--token)` de `tokens.css`, sin cambios visuales; incluye drawer/bottom sheet (para Fase 06). Contrato de overflow realzado: `min-width: 0` en hijos de `sheet-grid` (el `overflow-x: clip` de body queda como red de seguridad).
- **Motivo:** fiel a lo aprobado por el usuario en D-13; el mockup deja de ser código de referencia.
- **Riesgo:** tokens añadidos no enumerados en tokens.md (`--accent-soft`, `--overlay` con valor exacto del runtime) se registran aquí para la próxima revisión de tokens; si difirieran de una futura enmienda, manda tokens.md.

## D-21 · 2026-11-09 · `character` vive como módulo TS (`src/data/character.ts`)

- **Contexto:** Fase 03; dónde vive el dato en código.
- **Elección:** el fixture JSON (`docs/data/character-demo.json`) es la fuente de verdad editable; el módulo TS (`demoCharacter: Character`) es la transcripción en código. Cualquier edición del JSON debe replicarse a mano en el TS (nota del propio módulo); sync verificado en compuerta de fase (C2 de la spec). `BLOCK_CONFIG` (§6, 13 filas) vive igualmente en `src/data/blockConfig.ts`.
- **Motivo:** sin backend, el dato en TS se importa directo y compila strict contra los tipos; el JSON queda auditable y sirve para migraciones.
- **Riesgo:** doble copia JSON↔TS; si diverge, manda el JSON y el TS es bug. Fase 07 puede añadir test de coherencia.

## D-22 · 2026-11-09 · Validador de cliente espejo del contrato D-17

- **Contexto:** Fase 03; el contrato `POST /characters` (D-17) no tiene servidor aún, pero el validador que lo refleja vive ya en el cliente.
- **Elección:** `src/validate.ts` con guards manuales incrementales (sin dependencias: zod y similares quedan fuera). Acepta `x_demoNotes` en fixtures y rechaza derivados (`spellDC` etc.), `sessionState`, metadatos UI y cualquier `x-*` desconocido, devolviendo `fields: { ruta → mensaje }` en inglés. Decisiones menores anotadas en el informe del implementador: arrays legitimamente vacíos (p. ej. `skillExpertise: []`) pasan (la exigencia de no-vacío aplica a textos requeridos); `layout: "full" | "compact"` es un valor único por fila y la compacidad de `identity` en combate/descanso es un detalle de render (anotado en el comentario de `blockConfig.ts`, CSS ya existente).
- **Motivo:** misma frontera y mensajes que el futuro servidor = menos sorpresas al conectarlo; sirve también de prueba para tests de Fase 07.
- **Riesgo:** el validador manual no es un schema formal; si el contrato crece, valoraré conmputo un generador de tipos/schemas en una enmienda (nunca lib externa de runtime).

## D-23 · 2026-11-17 · Catálogo de skills en `src/data/skills.ts`

- **Contexto:** Fase 04; `derived.ts` llevaba un mapa local parcial (6 skills) que debía extenderse a 18.
- **Elección:** catálogo único con `{ id, label, ability }` (labels en español, ids en inglés kebab-case, las 6 del fixture con sus ids exactos) + record derivado `SKILL_ABILITY`; `derived.ts` lo consume y ya no tiene mapa propio. Orden de render de skills: alfabético por label (decisión reportada por el implementador y validada por el revisor).
- **Motivo:** una sola fuente para derived y render (I4); los labels del mockup no se duplican en el código.
- **Riesgo:** un id del fixture fuera del catálogo degrada a mod crudo en silencio (fallback `?? mod`); test de coherencia fixture↔catálogo anotado para Fase 07.

## D-24 · 2026-11-17 · Render por bloques orquestado por `BLOCK_CONFIG` (weight)

- **Contexto:** Fase 04; cómo se monta la ficha.
- **Elección:** `src/render/sheet.ts` ordena por `weight` ascendente, filtra por el modo (aventura por defecto) y genera cada `<section class="card b-<id>" data-block data-modes>`; una función de render por bloque en `src/render/blocks.ts` (13 funciones; `rest` construido y listo para modo descanso). Renderers con firma `(character, derived, session)` y `defaultSessionState(character)` para los contadores render-only (migrará a módulo de sesión en Fase 06). `characterId` derivado del nombre (antes literal 'demo'). Añadidos mínimos a `base.css` con tokens existentes (`.subhead`, `.spells .mark`, `.note-list`).
- **Motivo:** la matriz §6 congelada (D-16) es el único sitio que decide qué se ve en cada modo (I4); los `data-modes` sembrados permiten que Fase 05 filtre sin re-render total.
- **Riesgo:** en aventura se ven 12 bloques (`rest` excluido por D-16): C4 de esta spec queda recortado hasta el modo descanso de Fase 05 — enmienda documentada en la spec. CSS muerto del mockup (`.b-death`) se limpia en Fase 05.

## D-25 · 2026-11-17 · Animación del reflujo: FLIP mover+desvanecer

- **Contexto:** Fase 05; elección de técnica de animación presentada al usuario (FLIP / cross-fade puro / FLIP+stagger).
- **Elección:** FLIP completo (FIRST→LAST→INVERT→PLAY): las tarjetas se deslizan a su nueva posición y las salientes se desvanecen (~250 ms transform / 200 ms opacity). Con `prefers-reduced-motion: reduce` el estado se aplica directo (doble guardia: JS `matchMedia` + media query CSS en la transición).
- **Motivo:** elección directa del usuario (D-07); muestra el reorden completo, estilo "Apple" del brief.
- **Riesgo:** clicks rápidos durante la transición (resuelto con cancelación de timers y limpieza de transforms inline); los salientes se deslizan hacia el final del sheet mientras se funden — efecto validado visualmente por el orquestador.

## D-26 · 2026-11-17 · Mecanismo de modos único dirigido por `BLOCK_CONFIG`

- **Contexto:** Fase 05; cómo se aplican los filtros.
- **Elección:** un solo mecanismo para los 4 modos: `targetOrder(mode)` lee `BLOCK_CONFIG` (peso ascendente, booleanos de visibilidad) y lo aplica sobre el DOM existente (reorden con `appendChild`, ocultar/mostrar con clases); cero lógica de contenido por modo. Variante necesaria: `renderSheet` renderiza los 13 bloques con los no visibles en aventura pre-ocultos (enmienda operativa documentada en la spec de Fase 05/esta). Los chips son `<button>` con `aria-pressed` y el estado activo vive en `filters.ts`.
- **Motivo:** la matriz congelada (D-16) manda sin excepciones (I4); añadir un modo futuro = una fila en la config.
- **Riesgo:** los `data-modes` sembrados en secciones quedan como metadato no consumido (decidir en Fase 07: fixture de tests o retirar); `body.m-<modo>` de la era mockup queda muerto para desktop (Fase 08).

## D-27 · 2026-11-18 · Edición de contadores "donde se muestran" con estado único

- **Contexto:** Fase 06; decisión de usuario (propose·validate): dónde se editan los contadores del sessionState.
- **Elección:** cada contador se edita en TODOS los sitios donde aparece (HP/temporales en Combate, slots en la cabecera de Conjuros, salvaciones de muerte en dots de Salvaciones, dados/canal/inspiración/condiciones en Descanso, Fortuna del Erudito en Rasgos — enmienda validada por el usuario para cerrar C1). Estado único en `session.ts`: `patchSession` re-renderiza solo el contenido interno de las tarjetas afectadas (nunca `#sheet`), así el modo activo y el orden FLIP de Fase 05 sobreviven. Persistencia `fichass-session-v1` + Reset (restaura defaults y borra la clave).
- **Motivo:** usabilidad en partida (gastar un slot en combate sin cambiar de modo); un solo estado = sin divergencias entre instancias.
- **Riesgo:** los steppers viven en tarjetas ocultas según el modo (p. ej. rest en combate): no son problema (display:none); el bug detectado en verificación (dots de muerte no capturados por el handler) se corrigió ampliando el selector a `.dot[data-action][data-target]`.

## D-28 · 2026-11-18 · Hoja de detalle de conjuros: bottom sheet accesible

- **Contexto:** Fase 06; decisión de usuario (propose·validate).
- **Elección:** pulsar un chip de conjuro abre el bottom sheet ya portado en base.css, con nombre/nivel/origen/castTime/concentración y descripción completa desde el dato (sin hardcode). `role="dialog"` + `aria-modal` + foco atrapado + cierre por ✕/overlay/Esc, devolviendo el foco al chip originador; scroll de fondo bloqueado.
- **Motivo:** el mockup aprobado ya definía la interacción; I5 exige el patrón de accesibilidad completo.
- **Riesgo:** solo conjuros tienen hoja de detalle (rasgos/ataques quedan inline); si se pide más tarde, el patrón es reutilizable.

## D-29 · 2026-11-19 · Red de tests: Vitest dev-only (node + jsdom por fichero)

- **Contexto:** Fase 07; solución aprobada por el usuario ("continua" 2026-11-18).
- **Elección:** Vitest ^3.2.4 + jsdom ^26.1.0 (solo devDependencies, I2: no van al bundle); script `npm run test`; entorno `node` global con jsdom per-file en `src/session.test.ts` (única pieza que toca document/localStorage). Suites: derivados (16), validador (13), matriz §6 como tabla de control (7), coherencia JSON↔TS leyendo el fixture en runtime (15), sesión/migración/clamps/foco (21) — 72 tests, 5 ficheros, junto al código testado.
- **Motivo:** congelar con tests la lógica de reglas (D-16/D-21) y los bugs ya encontrados (foco tras re-render del major de Fase 06 es ahora test real, no solo QA manual).
- **Riesgo:** `character.test.ts` usa node:fs con especificador no-literal por falta de @types/node (comentado en el fichero); el test de foco depende de jsdom (si una subida lo vuelve inestable, la spec prevé degradarlo a QA manual); npm audit avisa de transitivas de dev (sin runtime afectado).

## D-30 · 2026-11-19 · Inspiración como dot en la tarjeta Identidad (visible en las 4 vistas)

- **Contexto:** petición directa del usuario durante el QA manual de Fase 07: "el checkbox de inspiración que sea igual que el de las salvaciones de muerte" y que se muestre en todas las vistas.
- **Elección:** un dot único (mismo patrón de interacción que los de salvaciones de muerte: click marca, click desmarca, `aria-pressed`, `data-action="set" data-target="inspiration"`) renderizado en la tarjeta Identidad (bloque "siempre", visible en los 4 modos). El checkbox `flag-input` desaparece del bloque Descanso; `PATCH_BLOCKS.inspiration` pasa a `['identity']` y `identity` entra en el registry de re-render parcial.
- **Motivo:** indicación explícita del usuario; coherente con el lenguaje visual de dots ya aprobado.
- **Riesgo:** la identidad es la única tarjeta que ahora consume sesión fuera de los contadores clásicos — el test de foco y los de clamps siguen en verde (72/72); el dot hereda el fix de restauración de foco de Fase 06. Colocación final (misma fecha, feedback visual del usuario): dentro de `identity-lines`, como última línea bajo "humana · clériga 5…", alineada con flex (`align-items: center`), para no romper el eje del retrato.

## D-31 · 2026-11-19 · Pulido de cierre: CSS muerto retirado, `data-modes` se mantiene

- **Contexto:** Fase 08; deudas de las fases 05–07 (elección validada con el usuario: retirar CSS muerto, mantener `data-modes`).
- **Elección:** retiradas las reglas `body.m-<modo>` de la era mockup (desktop: la recomposición real funciona por reorden DOM de Fase 05; el CSS nunca se activaba). `data-modes` se mantiene como metadato de sección (barato, útil para inspección/extensión; hoy no lo consume `filters.ts`). `@types/node` añadido a devDependencies y `character.test.ts` usa import estático de `node:fs` (cierra la peculiaridad anotada en D-29).
- **Motivo:** entregable limpio sin código muerto ni riesgos visuales no verificables (no había sesión de navegador para validar la activación del CSS).
- **Riesgo:** si en el futuro se quiere composición desktop por modo, habrá que recrear ese CSS con verificación visual (anotado en ENTREGA.md).

## D-32 · 2026-11-19 · Informe final de entrega en `docs/ENTREGA.md`

- **Contexto:** compuerta de Fase 08; cierre de la v1.
- **Elección:** `docs/ENTREGA.md` como informe final: qué es, entregables por fase, límites conocidos de la v1, deudas abiertas referenciadas (IDs de decisión) y despliegue (puntero al README). `README.md` (creado el 2026-11-18 por petición del usuario) queda como guía de levantamiento y su existencia registrada en las convenciones de `INDEX.md`.
- **Motivo:** separar el "cómo se usa" (README) del "qué quedó y qué falta" (ENTREGA), ambos discoverables desde la raíz.
- **Riesgo:** la sincronización README/ENTREGA es manual; mantener ambos al actualizar scripts (convención ya anotada en INDEX).
