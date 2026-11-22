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

## D-42 · 2026-11-20 · Tira rápida de PG: ±10/±5/±1 + rellenar

- **Contexto:** petición de un usuario de la app: "poder bajar la vida y subirla en más cantidad: ±5, ±10 y rellenar".
- **Elección:** en la celda de PG (tarjeta Combate) y en la fila de PG (bloque Descanso), el par ±1 se sustituye por una tira compacta **−10 · −5 · −1 · +1 · +5 · +10 · ❤ rellenar** (rellenar = `set` al maxHP, render-time). Mecánica: `applyStepper` usa el `value` del botón como **tamaño de paso** para inc/dec (default 1 — retrocompatible con todos los steppers ±1 existentes). Límites 0..maxHP ya garantizados por el clamp. Estilo: `.step-row` compacto, botón ❤ en acento.
- **Motivo:** en combate mover 10 PG de golpe era diez pulsaciones; ahora es una.
- **Riesgo:** un toque accidental — mitigado por la reversibilidad (+ al lado). Los PG temporales mantienen ±1 (fuera de la petición). Evolución visual por feedback del usuario (misma fecha): 1) ±10/±5/±1 en tira → 2) guiones en pares → 3) solo `- +` + ❤ → **4) final: tres filas alineadas bajo el ±1 — fila 1 = `- +` (±1), fila 2 = `-- ++` (±10), fila 3 = ❤ rellenar** (el ±5 se retira por decisión del usuario). `applyStepper` usa el valor como paso.

## D-48 · 2026-11-20 · Enmienda de la constitución I1 (alcance) `supersedes` I1 original

- **Contexto:** el revisor fresh-eyes de las fases 09/10/11 marcó **major procesal**: las Fases 10 (selector de personajes) y 11 (tirada de dados) implementan exactamente lo que la constitución I1 excluía por escrito ("No hay: selector de personajes… tirada de dados"), sin enmienda formal registrada — y la constitución gana a todo (jerarquía D-05/I6). El OK del usuario existía en la práctica (D-33/D-45) pero faltaba la enmienda formal del texto.
- **Elección:** **I1 enmendada** con el OK explícito del usuario de hoy: "un jugador, sus personajes (múltiples, vía JSON autoriado), navegación entre vista de personajes y vista de ficha; SÍ hay selector de personajes y tirada de dados (petición expresa del usuario); sigue sin haber edición completa de ficha, PDF, PWA, i18n, tema claro, backend en v1". El resto de la constitución (I2 coste €0, I3 contrato, I4 config única, I5 accesibilidad, I6 change control, I7 calidad) no cambia.
- **Motivo:** la constitución debe reflejar el alcance real acordado; dejarla desfasada convertía cualquier revisión futura en un falso FAIL constitucional.
- **Riesgo:** ninguno operativo — el texto ahora coincide con el producto desplegado.

## D-47 · 2026-11-20 · Cierre de deudas menores (pre-iniciativa)

- **Contexto:** pendientes documentados en las fases 05–10 antes de la siguiente fase (iniciativa/salvaciones).
- **Elección:** (1) **Esc cierra el popup del Reset** (igual que el diálogo de dados). (2) **escapeHtml en todos los textos del personaje renderizados** en blocks.ts (12 interpolaciones: identity, attacks, spells, equipment, traits, role, allies — el JSON del personaje ya no se asume de confianza implícita). (3) **`data-modes` retirado** de las secciones: nada lo consumía (los filtros leen BLOCK_CONFIG directamente, I4) — decisión "retirar" en vez de "mantener como fixture".
- **Motivo:** limpiar antes de la siguiente fase para no arrastrar ruido.
- **Riesgo:** si en el futuro se quiere inspección de modos vía DOM, habría que readucirlo; los tests de matriz usan BLOCK_CONFIG (no afectados).

## D-43 · 2026-11-20 · Reset con popup de confirmación

- **Contexto:** petición del usuario durante el QA: el Reset borraba la sesión sin confirmación — riesgo de borrado accidental en partida.
- **Elección:** diálogo de confirmación centrado con la misma estética (tokens del sistema, backdrop compartido): "¿Restablecer contadores?" + texto con el nombre del personaje + botones **Cancelar** / **Restablecer** (en `--danger`). El botón Reset abre el diálogo; Cancelar/backdrop cierran; aceptar ejecuta `resetSession()` y cierra. Foco: al abrir va a Cancelar; al cerrar vuelve al botón Reset.
- **Motivo:** evita borrados accidentales sin romper la estética (mismo lenguaje visual que la hoja de detalle de conjuros).
- **Riesgo:** sin cierre por Esc en v0.1.x (botones y backdrop cubren el caso); añadir Esc si se pide.

## D-49 · 2026-11-20 · Cierre de hallazgos del revisor fresh-eyes (fases 09/10/11)

- **Contexto:** veredicto **PASS with remarks** del cierre fresh-eyes de las tres fases; 1 major procesal (resuelto con la enmienda I1, D-48) y minors aplicados.
- **Elección y fixes aplicados:** (1) infra/README sincronizado con el template real (fuera el parámetro fantasma `UseExistingOidcProvider`; guía de creación del provider si falta; stack name `fichass-infra`; nota del changeset-CREATE roto). (2) Spec 09 precisa la forma real del trust (`infra/trust.json`, una statement StringLike de 4 subs; el template declara dos statements equivalentes). (3) d20 con bonus negativo: notación con signo ASCII + guard que no abre el diálogo si el parse falla (bug latente). (4) **Focus trap** genérico (`trapTab`) aplicado a Reset y diálogo de tirada + `aria-labelledby` en el roll dialog (I5 literal). (5) escapeHtml completado (castTime, proficiencies, spell.name/id). Pendiente de verificación del usuario en dev.
- **Motivo:** cerrar el veredicto con los minors aplicados antes de la siguiente fase.
- **Riesgo:** el focus trap reutiliza el patrón de la hoja de conjuros (probado); el d20 negativo no es ejercitable en los 4 personajes actuales (sin bonus negativos).

## D-50 · 2026-11-20 · Fase 12: iniciativa + tira rápida de PG temp

- **Contexto:** petición del usuario en la misma tanda ("vamos con la tirada de iniciativa" + "PG Temp con los mismos botones que PG").
- **Elección (validada por el usuario hoy):**
  1. **Tirada de iniciativa:** botón d20 dentro del stat `Iniciativa` de la stat-grid de combate (decisión: ahí, no en defense), notación ASCII `1d20+mod` vía helper compartido `diceNotation` (refactor del d20 de ataques), mismo diálogo de dados de la Fase 11 con crítico natural.
  2. **PG temporales:** tira rápida de 3 filas como PG (±1, ±10) en sus dos ubicaciones (stat-grid y tarjeta Rest); la fila 3 NO es el ❤ de PG sino un **icono refresh que VACÍA a 0** (`set` 0) — decisión del usuario: "en vez de un corazón, un círculo con flecha como de actualizar y lo que hace es vaciar los PG temp".
- **Motivo:** temp no tiene máximo del personaje (tope de sesión TEMP_HP_MAX=20), así que la semántica de "rellenar" no aplica; vaciar cubre el caso de uso real (golpe consumió los temp) y es coherente con el Reset, que ya los deja a 0.
- **Sin cambios en session.ts:** la acción `set` con `data-value` ya estaba soportada; clamp 0..20 intacto.
- **Riesgo:** ninguno operativo — 101/101 tests (5 nuevos), QA visual del usuario pendiente sobre producción.

## D-51 · 2026-11-20 · Fase 13: tiradas de salvaciones + salvación de muerte

- **Contexto:** continuación natural de la Fase 12 ("después iremos con la iniciativa y salvaciones"); propuesta validada por el usuario hoy.
- **Elección (validada):** (1) dado d20 **junto a cada una de las 6 salvaciones** en la tarjeta defense (`1d20+total` ASCII, mismo diálogo), descartado el botón-con-selector. (2) **Sí** a la tirada de salvación de muerte: d20 pelado en el subhead; nat 20 → "¡CRÍTICO!" (regla 2024: recuperas 1 PG) y nat 1 → "¡fallo doble!" (2 fracasos). El nat 1 en cualquier otra tirada NO se marca (es solo un 1).
- **Refactor:** el crítico inline de `renderRoll` (Fase 11) pasa a la función pura `rollFlavor(notation, rolls)` en dice.ts — comportaminto idéntico para ataques/iniciativa, ahora testeable.
- **Riesgo:** bajo — la notación `1d20` pelada solo la produce el botón de muerte (los ataques siempre llevan bonus); si en el futuro se añade otra tirada sin modificador, habría que re-visitar la marca de fallo doble. 107/107 tests (6 nuevos); QA visual del usuario pendiente sobre producción.

## D-52 · 2026-11-20 · Fase 14: ingesta de personajes vía agente (y CI/CD pospuesta)

- **Contexto:** el usuario pidió la ingesta como "por medio de un buen prompt almacenado se indique el manual, la ficha original y el modelo JSON; con eso la ficha acaba transformada en JSON", con idea futura de trasladarlo a CI/CD.
- **Elección (validada por el usuario hoy):** **vía A — asistida por agente**: prompt maestro versionado en `docs/ingest/PROMPT.md`; la transformación la ejecuta el agente. Entrada en **ambos formatos** (texto/markdown y foto/PDF). **Revisión humana siempre** antes del push. La vía **CI/CD con LLM queda POSPUESTA**: exigiría API de LLM facturada por tokens + secret de API, rompiendo I2 (Coste €0) sin enmienda del usuario; si algún día se aprueba la enmienda, se reutiliza el mismo prompt ejecutado por el job.
- **Ajuste clave del diseño:** el "manual completo" como entrada se sustituye por **referencias vivas** (contrato en `src/types.ts`, 4 JSON few-shot de `public/characters/`, `blockConfig.ts`) + la regla **autoriado vs derivado** (los derivados los calcula `derived.ts`; el agente solo transcribe) — menos ruido, menos alucinación.
- **Muralla de calidad:** el JSON ingestado pasa por las compuertas existentes (manifest en build = estructura, suite de contrato = campos completos, D-35/D-36) y por la tabla de cotejo con el usuario.
- **Evidencia (dry-run punta a punta):** hoja markdown sintética (`docs/ingest/examples/demo-sheet.md`) generada desde el personaje demo → ingesta siguiendo el prompt → diff semántico contra el original = **solo `x_demoNotes`** (campo de fixture que el prompt excluye correctamente); build + 108/108 tests con el JSON ingestado en el manifest.
- **Riesgo:** el OCR de fotos/PDF puede fallar en dígitos — mitigado por el checklist del prompt y la revisión obligatoria del usuario; el proceso depende de que el prompt se mantenga actualizado si el contrato evoluciona (referencias vivas, no copias).

## D-53 · 2026-11-20 · Skill `ingesta-fichass` (wrapper de ejecución del prompt de ingesta)

- **Contexto:** tras la primera ingesta real (Patx Vane), el usuario preguntó cómo optimizar el proceso; propuesta: skill de OpenCode.
- **Elección:** `.opencode/skills/ingesta-fichass/SKILL.md` — skill de proyecto que se auto-carga cuando el usuario pide una ingesta ("ingesta"/"ingest", entrega de ficha, personaje nuevo). Es un **wrapper de ejecución**: condensa el flujo (referencias vivas → dudosos → JSON → compuertas → cotejo → push con OK) y apunta a `docs/ingest/PROMPT.md` como fuente única (I4, sin duplicar el contrato).
- **Descartado:** subagente-ingester — la ingesta exige interacción con el usuario (dudosos y cotejo), que un subagente en segundo plano no puede hacer; el ejecutor sigue siendo el orquestador.
- **Riesgo:** bajo — un fichero de markdown versionado; si el prompt maestro cambia, la skill no necesita edición (referencia viva). La skill queda en el repo y viaja con él (cualquier agente en este repo la descubre).

## D-54 · 2026-11-22 · Enmienda de la constitución I1 (backend mínimo de sesión) `supersedes` cláusula "sin backend en v1" de I1

- **Contexto:** el usuario pidió la persistencia de estados en DynamoDB y validó el planteamiento completo ("todo lo que sugieres es lo que yo tenia planeado, perfecto"). I1 (en su forma D-48) excluía "backend en v1" — la persistencia ES un backend, así que hace falta enmienda formal (mismo procedimiento que D-48).
- **Elección (OK explícito del usuario de hoy):** I1 enmendada — "Sí hay (desde la Fase 15): backend mínimo de sesión — persistencia de estados en DynamoDB vía Lambda — invariablemente sujeto a I2 (coste €0) y limitado a estados de sesión (no hay edición de ficha ni almacenamiento de personajes personales ahí)". Sigue sin haber: edición completa de ficha, PDF, PWA, i18n, tema claro.
- **Motivo:** reflejar el alcance real acordado; la enmienda es deliberadamente ESTRECHA (solo estados de sesión) para no abrir la puerta a un backend general.
- **Riesgo:** la guardia mecánica de check.ps1 sobre el texto de la constitución se mantiene; cualquier ampliación futura del backend exige nueva enmienda.

## D-55 · 2026-11-22 · Fase 15: diseño de la persistencia de estados (spec 15)

- **Contexto:** planteamiento validado íntegro por el usuario (fue su plan original).
- **Elección:** (1) **Arquitectura A**: Lambda + Function URL (sin API Gateway — único free tier de 12 meses, riesgo I2); Function URL gratis, Lambda Free Tier 1M req/mes always-free, CORS bloqueado al origen S3, IaC en `infra/template.yaml`, deploy por el pipeline existente. (2) **Sync local-first + debounce (~1,5 s) + cola de reintentos**: localStorage sigue mandando al instante (UX sin cambios); PATCH batch tras quietud; flush al reconectar. (3) **Conflicto optimista** con campo `version`: 409 devuelve el estado remoto y toast "cargar remoto / sobrescribir con el mío" — sin pérdida silenciosa. (4) **Auth: endpoint abierto endurecido** para v1 (validación estricta del contrato, ids limitados al manifest, CORS, dato de sesión de valor bajo, alertas 3€/10€); Cognito descartado por desproporcionado. (5) **Modelo Dynamo**: tabla única, PK characterId, atributos state/version/updatedAt, ~1 KB/ítem. (6) **Carga inicial**: si hay estado remoto válido, manda el remoto (local = respaldo si la red falla). (7) El Reset es un PATCH más (versión +1).
- **Motivo:** minimizar piezas y coste real a €0 dentro de I2; el contrato de sesión reutiliza la sanitización/migración existente (D-16 §4).
- **Riesgo:** la Lambda depende del contrato actual (evolución del sessionState → misma versión de migración); el endpoint abierto es un riesgo de abuso asumido y documentado; recordatorios del repo: `sam build` antes de cada deploy, usar el `sam.cmd` (no el .exe), Tags de SSM como mapa.

## D-46 · 2026-11-20 · `damage` en conjuros y tirada de acertar (enmienda 3 de D-16)

- **Contexto:** peticiones del usuario tras estrenar los dados: falta el **d20 para acertar** y dados también en **los conjuros** que tiran daño o curación.
- **Elección:** (1) los ataques ganan un botón **[d20] de acertar** con la notación `1d20+bonus` del ataque (el natural 20 muestra "¡CRÍTICO!" en el diálogo). (2) **Enmienda del modelo**: `SpellRef`/`PreparedSpell` aceptan `damage?: string` (notación validada con el parser) — los chips con `damage` muestran su dado dentro del pill (7 conjuros de Seren; la curación usa el mismo diálogo). Detalles: el dado de conjuro es **hermano** del chip (un `<button>` no puede anidarse en otro) con separador hairline; el conjuro sin `damage` no muestra dado.
- **Motivo:** modelo estructurado en vez de parsear descripciones en texto libre; el validador garantiza que la notación es correcta.
- **Riesgo:** la curación se muestra igual que el daño (el jugador sabe si suma o resta); `damage` solo cubre la tirada principal del conjuro (escalados por nivel quedan en la descripción).

## D-45 · 2026-11-20 · Tiradas con dados animados (Fase 11)

- **Contexto:** fase diferida activada por el usuario ("sigamos"). Solución validada: botón de dado junto al daño + diálogo centrado + tumbling CSS.
- **Elección:** `src/dice.ts` (parser `parseDamage("XdY±Z")` + `rollDice` con `Math.random` inyectable — funciones puras, 9 tests); botón de dado SVG junto al daño de cada ataque **solo cuando la notación es parseable**; diálogo centrado con dados animados (CSS keyframes `dice-tumble`, ~600ms, escalonados 80ms por dado), total grande (`1d8+4 → 5 + 4 = 9`), **Tirar de nuevo** / **Cerrar**, cierre por Esc/backdrop, foco devuelto al botón de dado. Bajo `prefers-reduced-motion` los dados aparecen estáticos. El sessionState no se toca (azar de mesa puro).
- **Motivo:** el daño de los ataques es notación limpia; los conjuros (texto libre) quedan como extensión futura.
- **Riesgo:** solo notación `XdY±Z` simple (sin dados múltiples por segmentos tipo "1d8+1d6"); el botón de dado se oculta si el daño no parsea (degradación elegante). Extensión D-46: los conjuros ganan `damage?: string` opcional (validado contra el parser) con botón de dado en el chip (7 conjuros de Seren); el d20 de acertar usa `1d20+bonus` y el natural 20 muestra "¡CRÍTICO!".

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

## D-40 · 2026-11-19 · Config de despliegue por IaC (SSM): `AWS_S3_BUCKET` deja de ser secret

- **Contexto:** el usuario pregunta por qué `AWS_S3_BUCKET` era un secret si la IaC ya conoce el bucket.
- **Elección:** el stack SAM publica `/fichass/bucket-name` en **SSM Parameter Store** y el workflow lo lee tras autenticarse (`ssm:GetParameter` es el único permiso SSM del rol, limitado a `parameter/fichass/*`). Secrets finales: **solo 2** — `AWS_OIDC_ROLE_ARN` y `AWS_REGION` (esta última necesaria ANTES de autenticarse, por eso no puede venir de SSM). Registro en `infra/README.md`.
- **Motivo:** fuente única de verdad (la IaC); cambiar de bucket = re-desplegar el stack, sin tocar secrets de GitHub.
- **Riesgo:** si el stack no se re-despliega tras cambiar el template, el workflow falla con `ParameterNotFound` (troubleshooting actualizado). Nota: `sam validate --lint` marca un falso positivo E3006 sobre `AWS::IAM::OpenIdConnectProvider` (global y válido); documentado.

## D-33 · 2026-11-19 · Multi-personaje: arquitectura "React-shaped" en vanilla, hash routing y manifest validado en build

- **Contexto:** v2 del producto (tras el cierre de la v1); el usuario quiere N personajes servidos como JSON con vista raíz → detalle. Evaluación conjunta del enfoque React y su traducción.
- **Elección:** sin framework nuevo (D-18 congelado): `router.ts` de hash (`#/`, `#/c/<id>`) + `views/{overview,character}.ts` montadas en un `#app` raíz (cada vista con su appbar); personajes en `public/characters/*.json` con **nombre de archivo = id**; manifest enriquecido `{id,name,class,level,initials}` **generado en build y validado con `validateCharacter`** (JSON inválido = build rojo). Vista detalle = el flujo actual de `main.ts` encapsulado; sesión por personaje (`fichass-session-v1:<id>`).
- **Motivo:** misma forma que React (router/vistas/estados loading-error-success) sin peso ni reescritura; el JSON en runtime permite editar personajes subiéndolos al bucket sin recompilar.
- **Riesgo:** resumen de la raíz desactualizado si se edita el JSON directo en el bucket (se refresca con push — aceptado); hash routing no guarda la ruta en el server log (irrelevante en v1).

## D-34 · 2026-11-19 · IaC de Fase 09 en formato AWS SAM

- **Contexto:** el usuario activa la capa DevOps y pide SAM explícitamente porque es el formato que ya maneja en otro proyecto.
- **Elección:** `template.yaml` (SAM) para bucket S3 + rol OIDC de GitHub Actions (sin claves longevas) + guard de coste; workflow de Actions con quality gate → deploy. La spec de Fase 09 queda escrita en `docs/specs/09-infra-sam/` con estado `waiting` hasta cerrar la Fase 10.
- **Motivo:** petición explícita del usuario; reutiliza su familiaridad y tooling.
- **Riesgo:** SAM añade transform al stack (sin coste); los permisos del subagente devops se revisan como primera tarea de la fase (D-12, pendiente).

## D-38 · 2026-11-19 · Rasgos activables: `trait.uses` (segunda enmienda de D-16)

- **Contexto:** QA multi-personaje del usuario: la Furia del bárbaro (2 usos/descanso) es activable y no tenía contador; el mecanismo existía (Fortuna era un caso especial hardcodeado).
- **Elección:** `Trait` gana **`uses?: number`** (dato autoriado del JSON). Cualquier rasgo con `uses` pinta un contador `0/uses` en su línea, conectado a `sessionState.resourcesUsed[<trait id>]` vía targets `resource-<traitId>` generalizados (la excepción de Fortuna desaparece). El clamp de sesión respeta el `uses` del rasgo. Rasgos de raza añadidos a las 4 fichas (Humana: Adaptable + Afortunado uses 2; Medio-orco: Visión en la oscuridad, Aguante implacable uses 1, Impulso de adrenalina uses 2) — petición del usuario.
- **Motivo:** regla general en vez de casos especiales; el editor del JSON decide qué rasgos son activables sin tocar código.
- **Riesgo:** un `uses` faltante desactiva el contador silenciosamente (decisión de diseño: sin `uses` = rasgo pasivo); si el JSON cambia el id de un rasgo, la sesión previa queda huérfana (D-36 la ignora).

## D-41 · 2026-11-20 · Appbar usable en móvil: dos filas, modos como iconos SVG

- **Contexto:** feedback de usabilidad del usuario probando la app en el responsive móvil: los chips de modo se solapaban y salían del viewport; pidió iconos, alineación, quitar "Personajes" de la flecha y la identidad en dos líneas.
- **Elección:** appbar reestructurada en dos filas — fila 1: `←` (solo flecha) + **FichaSS** … Reset; fila 2: identidad en dos líneas (nombre / clase · nivel) … **4 botones de modo como iconos SVG inline** (espada/brújula/luna/grupo, sin recursos externos I2) con `title`/`aria-label` y estado activo en acento; etiqueta de texto visible desde 834px.
- **Motivo:** petición explícita del usuario; todo queda alineado dentro de su fila a 390px sin solapes.
- **Riesgo:** los iconos SVG requieren `title`/`aria-label` para accesibilidad (aplicado); el Reset permanece como texto (a petición del usuario).

## D-39 · 2026-11-19 · Workflow sync-only: el despliegue del stack es one-time manual

- **Contexto:** Fase 09; la spec original decía `sam build + sam deploy` en el workflow. El devops lo re-evaluó y el orquestador aprueba la enmienda.
- **Elección:** el workflow de GitHub Actions NO despliega stacks — hace quality gate (lint/test/build) y `aws s3 sync dist/` con OIDC. El **stack** (bucket + OIDC + rol) lo despliega el USUARIO una vez, localmente, con `sam deploy --guided` (sus credenciales; ver `infra/README.md`). El rol OIDC tiene **mínimo privilegio S3** (sin cloudformation/sam/IAM:PassRole): el CI no puede crear ni destruir infraestructura jamás.
- **Motivo:** seguridad (el CI con IAM:PassRole/cloudformation es un vector clásico de escalada), y el stack cambia una vez al año — automatizarlo sobra. El despliegue de **contenido** (push) sí es automático.
- **Riesgo:** cambiar de rama principal o de repo exige update del stack (parámetros GitHubBranch/GitHubOrg/GitHubRepo); documentado. Nota: el devops lo numeró "D-37" por error — ese ID ya existía; queda registrado como **D-39**.

## D-37 · 2026-11-19 · Visibilidad de bloques por personaje: `hiddenBlocks` (enmienda de D-16)

- **Contexto:** QA multi-personaje del usuario: Dahna Voreio (guerrera sin conjuros) mostraba el bloque Conjuros con CD decorativa y slots 0/0 — sin sentido para un no-caster. Petición: visibilidad personalizable por personaje ("show/enable" por categoría).
- **Opciones evaluadas:** (a) lista por personaje; (b) flag `show` dentro de cada sección; (c) deducción automática por sección vacía. Elección: **(a)** con OK del usuario (propose·validate).
- **Elección:** campo opcional **`hiddenBlocks?: BlockId[]`** de primer nivel en el `character` (dato autoriado, viaja en el contrato D-17): ids de bloques que NO se renderizan para ese personaje en ningún modo (default `[]`). `BlockId` vive ahora en `types.ts` (re-exportado por `blockConfig.ts`); el validador acepta solo ids conocidos, sin duplicados; `renderSheet` filtra los ocultos manteniendo el orden de la matriz; el bloque Descanso oculta las filas de slots con máximo 0.
- **Motivo:** un único sitio decide; generaliza a cualquier ficha parcial (sin aliados, sin rol…) sin tocar la matriz congelada §6, que sigue siendo el default.
- **Riesgo:** la sección `spells` sigue requerida en el JSON (estructura), aunque el bloque se oculte — coherente con D-16 (la ficha declara sus datos; la vista decide qué mostrar). Si en el futuro se quiere visibilidad por MODO por personaje, sería otra enmienda.
- **Enmienda documentada en model.md** (D-16 congelado) y en la spec de Fase 10; `dahna-voreio.json` lleva `"hiddenBlocks": ["spells"]`. Tests: 83/83 (4 nuevos del validador + 3 de renderSheet).

## D-35 · 2026-11-19 · Validación estricta en runtime y en build (dos niveles)

- **Contexto:** Fase 10; qué pasa con un JSON de personaje inválido.
- **Elección:** en **build**, validación estructural de cada `public/characters/*.json` (parse + identity + id con regex; mensaje claro con fichero y motivo; exit 1 — `scripts/generate-manifest.mjs`). En **runtime**, validación completa con `validateCharacter`: un JSON inválido muestra pantalla de error con el mapa campo→mensaje y NO renderiza ficha parcial (D-17). En **tests**, el contrato completo de cada personaje publicado se aplica en el gate (`validate.test.ts` lee el manifest y valida cada fichero).
- **Motivo:** fallo temprano en CI sin tooling extra en el `.mjs`; el jugador nunca ve una ficha a medias.
- **Riesgo:** dos fuentes de verdad de validación (build estructural + tests contractuales); documentado en la spec y en ENTREGA al desplegar.

## D-36 · 2026-11-19 · Sesiones de personajes eliminados: ignoradas, sin limpieza activa

- **Contexto:** Fase 10; qué pasa con `fichass-session-v1:<id>` de un personaje cuyo JSON ya no existe.
- **Elección:** la clave queda huérfana en localStorage (inofensiva: nadie la lee); no se barre activamente. El guard D-16 §4 (characterId vs id de URL, ahora comparado en `sanitizeLoaded`) impide que una sesión de otro personaje contamine la nueva.
- **Motivo:** simplicidad; el storage de un navegador es del jugador.
- **Riesgo:** acumulación trivial de claves si se rota mucho el elenco (KB por personaje); una limpieza en Reset global podría añadirse en el futuro si se pide.
