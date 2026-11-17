# AGENTS.md — Harness del agente para FichaSS

Instrucciones de operación para cualquier agente de IA que trabaje en este repo.
Orden de mando: `PROMPT.md` (brief) → `docs/specs/constitution.md` (inmutables; gana a todo) → este archivo → specs por fase.
Respuestas en español; código e identificadores en inglés.

## 1. Ciclo de fase (SDD)

Cada fase es una máquina de estados:

```
draft → spec → tasks → [por tarea: propose·validate → implement] → verify → decided (→ approved si la compuerta exige visto del usuario)
```

1. **Spec.** Crear `docs/specs/NN-<nombre>/spec.md`: objetivo, alcance, decisiones previstas, **criterios de aceptación verificables** y qué queda fuera. Escribir esto SIEMPRE antes de tocar código.
2. **Tasks.** Descomponer en `docs/specs/NN-<nombre>/tasks.md` con casillas. Las casillas las marca el orquestador, o el documentador bajo su orden.
3. **Propose·validate (OBLIGATORIO para cada tarea, D-07).** Antes de pasar una tarea al implementador, el **planteamiento de la solución** se muestra al usuario y queda validado por él. Sin visto del usuario no hay implement. Esto incluye las soluciones que propongan subagentes: el subagente propone; el usuario valida; el implementador ejecuta.
4. **Implement.** Solo lo que cubren spec y tasks, ejecutando la solución validada. Trabajo no previsto: o se amplía la spec (con nota de motivo y registro en `DECISIONS.md`) o se anota como pendiente de otra fase.
5. **Verify.** Ejecutar `powershell -File scripts/check.ps1` (compuerta documental del harness). Desde Fase 2 además `npm run lint` y `npm run build`. Si falla, arreglar antes de avanzar.
6. **Revisor.** Al cierre de cada fase, un subagente revisor con ojos frescos evalúa la entrega contra los criterios de la spec (ver §3) y reporta desviaciones. El orquestador corrige o registra el desvío aceptado.
7. **Decide.** Registrar en `DECISIONS.md` las decisiones de la fase con IDs (`D-xx`), opción elegida, motivo y riesgo.

Reglas de estado:

- **El estado vive en `INDEX.md`**, no en la spec. `INDEX.md` es la única fuente de verdad del progreso.
- **La spec se congela en cuanto entra en `implement`**: cambios posteriores = enmienda documentada en la spec (sección *Amendments*) + `DECISIONS.md`.
- **`DECISIONS.md` es append-only**: una decisión desfasada no se borra; la nueva la referencia con `supersedes: D-xx`. Las specs pueden citar IDs de decisión.

## 2. Change control

- La **constitución solo se modifica con aprobación explícita del usuario**: propuesta de enmienda → OK del usuario → cambio + registro en `DECISIONS.md`.
- Las **specs** se reescriben libremente antes de `implement`; después, solo por vía de enmienda.
- El brief de producto (`PROMPT.md`) solo cambia pidiendo autorización al usuario.

## 3. Swarm (orquestación de subagentes)

Desde **todas** las fases (decisión D-02). Los roles están definidos como archivos Markdown de OpenCode V2 en `.opencode/agents/<nombre>.md` (frontmatter `description` / `mode` / `permissions`, cuerpo = system prompt); el orquestador además es el `default_agent` del repo (`opencode.jsonc`, D-10). Roles:

| Rol | Definición | Contexto | Qué hace / no hace |
|---|---|---|---|
| **Orquestador** | `.opencode/agents/orchestrator.md` (`mode: primary`, default del repo) | Brief, constitución, historia, conversación | Specs, decisiones, propuestas y validación con el usuario, integración, compuertas. No delega decisiones de diseño ni de contrato. Sus `permissions` piden aprobación del usuario para editar constitución, `AGENTS.md` y `PROMPT.md`, y solo le dejan lanzar los 5 subagentes del harness. |
| **Implementador** | `.opencode/agents/implementer.md` | Prompt cerrado: spec + tasks + **solución validada por el usuario** + archivos acotados | Ejecuta la solución validada en archivos acotados. No marca tasks, no toca config, no edita docs. Devuelve informe. |
| **Explorador** | `.opencode/agents/explorer.md` | Pregunta puntual | Lee, busca e investiga (validaciones 5e 2024 incluidas); nunca escribe. |
| **Revisor fresh-eyes** | `.opencode/agents/reviewer.md` | Spec + criterios de aceptación, sin saber quién escribió el código | Compara entrega contra criterios; reporta desviaciones por severidad. Solo lectura + compuertas (check/lint/build). |
| **Documentador** | `.opencode/agents/documenter.md` | Orden mecánica del orquestador | Sincroniza `INDEX.md`, `tasks.md`, `DECISIONS.md`, `README.md` y enmiendas de specs. Nunca toca código ni la constitución. |
| **DevOps** | `.opencode/agents/devops.md` (definido en D-12; se activa en Fase 09) | Spec de la fase de infra + constitución (I2: Coste €0, D-11) | Workflows de Actions (`**/.github/**`) y IaC CloudFormation (`infra/**`). Shell solo inspección de lectura; despliegues: los propone y los ejecuta el orquestador con el visto. Nunca crea recursos pagados ni destruye stacks/tables/buckets (deny mecánico). |

Reglas del protocolo:

1. **Prompts autosuficientes**: los subagentes nacen sin memoria; cada prompt lleva ruta de constitución, ruta de spec y tarea explícita. Un prompt tipo "continúa lo de antes" es un bug del orquestador.
2. **Escritura acotada**: el prompt lista los archivos exactos que puede crear/editar. Fuera de esa lista: informe, no acción. (Los `permissions` de cada `.md` lo refuerzan mecánicamente.)
3. **Devolución estructurada**: qué hizo, qué quedó fuera, riesgos. El orquestador integra y el documentador sincroniza estado.
4. **Paralelización con criterio**: varias tareas pueden estar `en-flight` a la vez solo si no comparten archivos. Contratos de datos e integración final: siempre del orquestador.

### 3a. Ciclo de vida y asignación de tareas (D-09)

Cada tarea de `tasks.md` tiene ID (`T-xx`), estado, responsable y evidencia. Estados:

```
pendiente → propuesta → validada(en-flight) → impl-done → revisada → done
                                     ↘ bloqueada (tras 2 bucles, D-08)
```

Matriz de asignación (la tarea rota de rol **cuando cambia de estado**; no hay round-robin):

| Estado | Propon la solución | Ejecuta | Revisa | Sincroniza doc |
|---|---|---|---|---|
| pendiente | Orquestador (o el subagente que él designe) | — | — | Documentador |
| propuesta | Orquestador te la muestra (D-07) | — | — | Documentador |
| validada (en-flight) | — | Implementador | — | Documentador |
| impl-done | — | Orquestador corre compuertas (`check`/`lint`/`build`) | Revisor fresh-eyes | Documentador |
| revisada-OK | — | — | — | Documentador marca `done` |
| revisada-FAIL | Orquestador reencuadra la solución → nueva validación → corrección 1 → 2 (máx., D-08) | Implementador (corrección) | Revisor | Documentador |
| bloqueada | **Escala al usuario** con lo intentado | — | — | Documentador |

Reglas de asignación:

- Contratos de datos, enmiendas y decisiones: nunca salen del orquestador.
- El explorador solo interviene en `pendiente`/`propuesta` (investigación y validación de datos) cuando el orquestador se lo ordena.
- La rotación termina en `done`: una tarea no vuelve a estados anteriores salvo vía revisión-FAIL (y siempre con el límite de bucle de D-08).
- El responsable de sincronizar el estado en `tasks.md`/`INDEX.md` es siempre el documentador (por orden); el orquestador nunca ejecuta en-flight a sí mismo en fases 2+.

5. **Límite de bucle (máximo 2 repeticiones, D-08)**: una tarea no puede rebotar entre subagentes más de 2 veces. Primera entrega → revisión → corrección 1 → revisión → corrección 2. Si tras la segunda corrección no pasa, la tarea pasa a `bloqueada` y vuelve al orquestador: la resuelve él directamente o escala al usuario. El bloqueo queda anotado en la spec (sección *Risks / deviations*).
6. **Validación user-first (D-07)**: las propuestas de solución que nazcan en subagentes (p. ej. variantes de estilo del mockup) no llegan al implementador sin pasar por el usuario (ver §1.3). El orquestador presenta y recolecta el visto.
7. Las plantillas de prompt y las listas de verificación viven en `docs/harness/` (no en las specs).

## 4. Compuertas de fase

| Fase | Contenido | Compuerta |
|---|---|---|
| 00 | Mockup de estilo | `check.ps1` en verde; capturas a 390×844; **aprobación del usuario**; tokens congelados en `docs/design/tokens.md` |
| 01 | Modelo de datos | `check.ps1` en verde; entidades y contrato JSON documentados; fixture del personaje demo coherente con 5e 2024 |
| 02 | Scaffold y sistema de diseño | `npm run lint` + `npm run build` + `check.ps1` |
| 03 | Datos en código | Compuertas 02 + tipos coherentes con el contrato de Fase 01 |
| 04 | Ficha estática | Compuertas base + criterios de la spec |
| 05 | Filtros y animación | Compuertas base + reflujo animado real verificado |
| 06 | Detalle y contadores | Compuertas base + persistencia y reset verificados |
| 07 | Tests y QA | Tests elegidos en verde; revisión manual móvil/tablet/escritorio |
| 08 | Pulido y entrega | Informe final; límites conocidos anotados |

## 5. Reglas de comunicación

- Si algo es ambiguo: decidir, documentar (spec + `DECISIONS.md`) y seguir. No cerrar con preguntas abiertas, salvo decisiones de estilo/producto que la constitución exige validar con el usuario.
- Si un criterio de la constitución se rompe para superar una limitación técnica: **parar y explicarlo antes**, no silenciar la anomalía.
- Responder con estado del repo actualizado (`INDEX.md`) cuando la conversación toque el trabajo.

## 6. Verificación mecánica

- `scripts/check.ps1`: valida constitución y `DECISIONS.md` presentes, spec de la fase en curso con criterios de aceptación, fases previas verificables y estado coherente en `INDEX.md`. Sin dependencias externas.
- Desde Fase 02 el proyecto integra el mismo script como `npm run check` además de `lint`/`build`.
