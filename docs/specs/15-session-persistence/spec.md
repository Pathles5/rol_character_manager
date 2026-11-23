# Fase 15 — Persistencia de estados de sesión (DynamoDB)

## Objetivo

Los contadores de sesión (PG, temp, dados golpe, slots, canalizar, muerte,
inspiración, condiciones, recursos de rasgos) persisten en **DynamoDB** a
través de una Lambda con Function URL, sincronizados local-first, con
conflicto optimista. localStorage sigue siendo la fuente inmediata: la UX de
hoy no cambia.

## Decisiones de diseño (validadas por el usuario — D-54/D-55)

| # | Decisión | Elección |
|---|---|---|
| 1 | Arquitectura | **Lambda + Function URL** (sin API Gateway); CORS bloqueado al origen S3; IaC en `infra/template.yaml`; deploy por el pipeline existente |
| 2 | Sincronización | **Local-first + debounce ~1,5 s + cola de reintentos**; PATCH batch tras quietud; flush al reconectar |
| 3 | Conflicto | **Optimista con `version`**: 409 → toast "cargar remoto / sobrescribir con el mío" |
| 4 | Auth | **Endpoint abierto endurecido**: validación estricta del contrato, ids limitados al manifest, CORS, rate básico; Cognito descartado para v1 |
| 5 | Modelo Dynamo | Tabla única `fichass-sessions`: PK `characterId`; atributos `state` (JSON `schemaVersion: 1`), `version`, `updatedAt` |
| 6 | Carga inicial | Estado remoto válido manda; local = respaldo si la red falla |
| 7 | Reset | Es un PATCH más (defaults, versión +1) |

## Sub-fases

### 15a — Infra y contrato de backend

- `infra/template.yaml`: tabla DynamoDB (PAY_PER_REQUEST, SSE nativo,
  `UpdateReplacePolicy: Retain`) + función Lambda (Node 22, handler
  `src-backend/session.ts` o `backend/`, bundled con esbuild vía SAM) +
  Function URL (auth `NONE` + CORS al origin del site) + permisos
  `dynamodb:GetItem/PutItem` solo sobre esa tabla.
- Comportamiento: `GET ?characterId=<id>` → `{state, version, updatedAt}` o
  404; `PATCH` con `{characterId, state, baseVersion}` → valida el JSON
  contra el contrato de sesión (misma lógica de sanitización, D-16 §4),
  escribe con concurrencia optimista (`attribute_exists(version)` +
  `version = baseVersion`), devuelve `{version, updatedAt}`; 409 con el
  estado remoto si la versión no enmienda.
- Endurecimiento: ids restringidos a los del manifest (la Lambda los obtiene
  del bucket vía SSM o fetch), tamaño máximo del body, sin campos sueltos.
- **Enmienda del modelo D-17** (model.md §5): nueva sección "contrato de
  sesión" documentando los endpoints. Amendment registrado.
- Deploy: **toda la infra se gestiona desde la pipeline** (criterio del
  usuario, 2026-11-22): el workflow gana un job `infra` que hace `sam build`
  + `sam deploy` del stack con la OIDC existente (environment `dev`); el rol
  OIDC amplía su policy con lo mínimo para desplegar (CloudFormation, Lambda
  incl. PassRole, DynamoDB sobre `fichass-*`, SSM) — acotado por prefijo,
  sin recursos pagados (I2). **En local no se ejecutan despliegues** (el
  bootstrap de Fase 09 ya existe: el quirk roto era solo el CREATE via
  changeset; las actualizaciones funcionan). El despliegue por push
  reemplaza al visto-por-despliegue local; el OK del usuario se da sobre el
  cambio del template en la revisión de la tarea, no sobre cada ejecución.
  Quirks que siguen aplicando (ahora en CI): si un job de CFN falla con
  "Stack does not exist" en CREATE, es el quirk del changeset-CREATE roto
  (remediado por el bootstrap ya hecho); Tags de SSM en forma MAPA.

**Criterios de aceptación 15a**
- **C1**: tabla + Lambda + Function URL desplegados y visibles en el stack
  `fichass-infra`; ningún recurso pagado fuera de Free Tier (I2).
- **C2**: round-trip verificado contra la URL real: PATCH válido → 200 con
  version+1; GET devuelve el estado escrito; PATCH con baseVersion antigua →
  409 con estado remoto; GET de id inexistente → 404.
- **C3**: la Lambda rechaza (400) estados fuera de contrato e ids no
  presentes en el manifest.
- **C4**: CORS solo permite el origin del site (request desde otro origin
  rechazado en navegador).
- **C5**: enmienda D-17 en `model.md` + compuertas (lint/build/check) en
  verde.

### 15b — Capa de sincronización en el cliente

- Módulo nuevo `src/sync.ts`: detección de cambios de `sessionState`
  (hook en `patchSession`/`applyStepper`/`toggleCondition`/`resetSession`),
  debounce ~1,5 s, cola con reintentos exponenciales, indicador de estado
  expuesto a la UI (sincronizado / pendiente / error).
- Carga en `character.ts`: `GET` remoto en paralelo con el localStorage;
  remoto válido manda, local = respaldo si la red falla; si difieren con
  versiones remotas superiores → se aplica el remoto (sanitizado).
- El estado sigue siendo lo primero que se ve: NINGÚN cambio visual de la
  ficha actual (el indicador es pequeño y no intrusivo).

**Criterios de aceptación 15b**
- **C6**: en partida simulada (multi-dispositivo, p. ej. dos navegadores),
  los contadores de un dispositivo aparecen en el otro tras recargar la
  ficha (≤ unos segundos).
- **C7**: con la red cortada, los contadores siguen funcionando (localStorage)
  y al reconectar se sincronizan (flush de cola).
- **C8**: el indicador refleja sincronizado/pendiente/error y se recupera de
  un fallo sin intervención.
- **C9**: tests unitarios del módulo de sync (debounce, cola, resolución
  remoto/local) + compuertas en verde.

### 15c — Conflicto y pulido

- Toast de conflicto 409: "Otro dispositivo actualizó esta ficha — [Cargar
  remoto] / [Sobrescribir con el mío]", mismo patrón a11y del Reset
  (focus trap genérico, Esc, foco devuelto).
- QA manual móvil/escritorio del flujo completo (dos dispositivos + Reset +
  offline) y revisor fresh-eyes de la fase.

**Criterios de aceptación 15c**
- **C10**: el toast de conflicto funciona en ambos sentidos y es accesible
  (I5).
- **C11**: revisión manual del usuario (la partida real manda) + revisor
  fresh-eyes; veredicto registrado.
- **C12**: compuertas finales en verde y docs sincronizados.

## Fuera de alcance

- Edición de fichas en la nube (los personajes siguen siendo JSON autoriado
  + push, D-52); autenticación de usuarios (Cognito) para v1; historial de
  tiradas; CRDTs/merge por campo; dominio personalizado.

## Deviations (Fase 15a — 2026-11-23, D-56)

- **Deploy explícito por CloudFormation** en vez de `sam deploy`: los waiters
  de sam se rinden antes de que esta cuenta lenta cree los changesets. Flujo
  en el job `infra`: create-stack directo para creación (los changesets
  CREATE fallan la validación temprana de forma flaky aquí), changeset
  UPDATE para updates, self-heal de shells rotos (borrar + recrear),
  changesets pendientes obsoletos SE BORRAN (nunca se ejecutan — desplegaban
  código antiguo) y changesets vacíos tratados como no-op.
- **Stacks separados** (decisión del usuario): `fichass-data` (tabla, Retain)
  y `fichass-session` (cómputo desechable) en vez de un único stack — la
  recreación del cómputo ya no toca la tabla.
- **Lambda packaging**: SDK v3 EXTERNO con node_modules propio; bundle esbuild
  ESM sin inlinar (los exports perezosos del SDK se rompen bajo esbuild
  interop); comandos `GetCommand`/`PutCommand` (reestructuración 3.1175);
  aserción anti-regresión de nombres en el build.
- **Function URL**: resource policy con DOS statements (InvokeFunctionUrl +
  InvokeFunction con `InvokedViaFunctionUrl: true`) — doc Lambda oct-2025.
- **Sin Tags** en los recursos de sesión (evitan `TagResource` en la policy;
  el prefijo `fichass-*` identifica el proyecto).
- **Fix local de vitest** (solo entorno, no producto): jsdom 26 delega el
  storage en internos de Node que no son resolubles en el worker → fallback
  en memoria en `src/test-setup.ts` (CI Node 20 no afectado).
