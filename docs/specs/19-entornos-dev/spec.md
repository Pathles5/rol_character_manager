# Spec — Fase 19: Entornos parametrizados (implementación dev)

Fase: 19 · Estado: verified (despliegue dev verificado en runtime; QA visual del usuario pendiente) · Compuerta: compuertas base (lint/test/build/check) + criterios de la spec + despliegue dev verificado con visto del usuario

## Objetivo

Dar al repo una **estructura de proyecto madura multi-entorno** (dev / pre / pro) con **recursos parametrizados por sufijo de entorno** (p. ej. `fichass-sessions-dev`). En esta fase **solo se implementa y despliega `dev`**; el esquema queda parametrizado para que `pre` y `pro` se añadan después como configuración, sin reescribir. La producción actual (`master` → recursos sin sufijo) **sigue intacta** hasta que se implementen pre/pro en fases futuras.

Petición del usuario (2026-11-24): rama `dev` para desarrollo; `pre` = preproducción estable para cerrar releases; `pro` = versiones major estables y depuradas. "Para el upgrade solo tendremos en cuenta la rama dev, según vaya madurando iremos implementando las demás."

## Estado actual (diagnóstico)

- **Hosting huérfano**: bucket `fichass-site`, bucket policy, rol OIDC `fichass-github-actions-rol_character_manager` y SSM `/fichass/bucket-name` NO los gestiona ningún stack (`infra/template.yaml` es solo referencia). Cambios en hosting = intervención manual one-time del usuario.
- **CI gestiona** dos stacks: `fichass-data` (tabla DynamoDB `fichass-sessions-rol_character_manager`, Retain) y `fichass-session` (Lambda `fichass-session-rol_character_manager` + Function URL). Nombres deterministas con sufijo de repo, ARN por `!Sub`, sin cross-stack refs.
- **Workflow** `.github/workflows/deploy.yml`: push a `master` → quality-gate + infra + deploy (sync S3 + publica `session-url.json`). Secrets en el environment de GitHub **"dev"** (hoy apunta a producción — nombre engañoso heredado).
- **Frontend**: lee `session-url.json` (publicado por el workflow desde el output del stack) para la URL de la API; si falta, sync deshabilitado grácilmente.
- **Datos reales** de la partida en la tabla de producción (Nigra/Uldrak/Nissa/Yinhao + master-layout). NO se migran en esta fase.

## Alcance (solo dev)

- **Rama `dev`** creada desde `master`; el trabajo de esta fase vive en ella. `master` sigue siendo producción legacy.
- **Esquema de nombres parametrizado por entorno** (`Environment` ∈ dev|pre|pro, sufijo `-<env>`), implementado para dev:
  - Hosting: bucket `fichass-site-dev`, SSM `/fichass/dev/bucket-name`, rol OIDC `fichass-github-actions-dev`.
  - Datos: stack `fichass-data-dev`, tabla `fichass-sessions-dev` (Retain).
  - Cómputo: stack `fichass-session-dev`, Lambda + rol `fichass-session-dev` / `fichass-session-role-dev`, Function URL con CORS al origen del bucket dev.
  - (Se elimina el sufijo de repo en los nombres nuevos; el legado pro conserva los suyos.)
- **Templates parametrizados** (`infra/template.yaml` hosting, `infra/data.yaml`, `infra/session.yaml`): parámetro `Environment` con default `dev` y sufijos derivados; los tres stacks desplegables por CI para dev. El hosting dev (`fichass-hosting-dev`) lo crea CI (D-70); el rol OIDC dev lo crea un paso de bootstrap idempotente en CI (D-70a) — sin credenciales del usuario ni cambios en el rol de producción.
- **Workflow**: rama `dev` → quality-gate + infra (data-dev + session-dev) + deploy al bucket dev, con `environment: dev` de GitHub re-apuntado al rol dev. Concurrencia por rama. **La ruta de `master` se conserva tal cual** (producción legacy intacta).
- **Rol OIDC dev** con trust acotado a la rama/environment dev y permisos mínimos sobre el prefijo de recursos dev (S3 sync, SSM, CFN/Lambda/DynamoDB/IAM acotado).
- **Runbook de bootstrap dev** documentado (crear hosting dev one-time, secrets del environment dev, primer push).
- **Docs**: `infra/README.md`, `README.md` y un documento de estrategia de ramas/entornos (`docs/PROCESS.md` o sección en README) con el mapa dev/pre/pro y cómo se añadirán pre/pro.
- **Coste €0 (I2)**: dev añade bucket + tabla on-demand + Lambda, todo dentro de Free Tier/always-free para este uso; alertas de facturación existentes (3€/10€). Sin servicios pagados.

## Fuera de alcance

- Implementar/desplegar `pre` y `pro` (fases futuras; el esquema queda listo).
- Migrar los datos de producción a recursos con sufijo (pro seguirá con sus nombres legacy hasta su fase).
- Cambiar la URL de producción actual ni tocar los recursos legacy de master.
- Branch protection / required reviewers en GitHub (configuración del usuario, opcional; se documenta como recomendación).
- Dominios propios, CloudFront, API Gateway (I2).

## Decisiones registradas (validadas por el usuario, 2026-11-24)

- D-68: **mapa rama→entorno**: `dev`→dev, `pre`→pre (futura), `master`→pro (legacy hasta su fase). Solo dev se implementa ahora.
- D-69: **nombres con sufijo `-dev`** y sin sufijo de repo en los recursos nuevos (`fichass-sessions-dev`, `fichass-site-dev`, `fichass-session-dev`, SSM `/fichass/dev/bucket-name`, rol `fichass-github-actions-dev`); el legado pro conserva sus nombres actuales. **Defaults legacy-compatible**: el parámetro `Environment` de los templates vale `''` (legacy) por defecto → reproduce los nombres actuales de master (sufijo de repo, stacks sin sufijo, `fichass-site`, `/fichass/bucket-name`); `dev` (y futuros pre/pro) se pasa EXPLÍCITAMENTE desde la ruta dev del workflow. Así master queda intacto aunque comparta templates (D-71).
- D-70: **hosting dev gestionado por CI** (no bootstrap manual): el workflow crea el stack `fichass-hosting-dev` (bucket `fichass-site-dev` + policy + SSM) igual que data/session.
- D-70a: **rol dev dedicado creado por CI**: el rol actual (`fichass-github-actions-rol_character_manager`) tiene `iam:CreateRole`/`PutRolePolicy`/`PassRole` sobre `fichass-*` pero S3 solo de sync sobre `fichass-site` (no puede crear buckets). Un paso de bootstrap idempotente en CI, asumiendo el rol actual, crea `fichass-github-actions-dev` con permisos de gestión S3 sobre `fichass-*-dev` + CFN/Lambda/Dynamo/SSM/IAM acotados a dev; los jobs de dev asumen ese rol por **ARN determinista** (`arn:aws:iam::159177056493:role/fichass-github-actions-dev`, sin cambiar secrets). **El rol de producción NO se modifica.** Trust del rol dev: rama `dev` + environment `dev` (ambos formatos de sub).
- D-71: **master intacto**: la ruta de producción del workflow conserva sus stacks/bucket/SSM/rol legacy sin cambios; dev es una ruta nueva paralela.

## Criterios de aceptación (verificables)

- C1: existe la rama `dev` y el trabajo de la fase vive en ella; `master` no recibe cambios de recursos legacy.
- C2: los templates aceptan `Environment` y derivan nombres con sufijo; para dev producen `fichass-site-dev`, `fichass-data-dev`/`fichass-sessions-dev`, `fichass-session-dev`, SSM `/fichass/dev/bucket-name`, rol `fichass-github-actions-dev`.
- C3: push a `dev` dispara quality-gate + infra (data-dev + session-dev) + sync al bucket dev y publica `session-url.json` con la URL de la Lambda dev; la ruta de `master` sigue desplegando producción legacy sin cambios.
- C4: el sitio dev (URL del bucket dev) carga la app y la capa de sync apunta a la API dev ( round-trip de sesión verificado en dev, sin tocar datos de producción).
- C5: runbook de bootstrap dev + estrategia de ramas/entornos documentados; coste €0 intacto (I2); compuertas base en verde; revisor fresh-eyes; D-68…D-71 registradas.

## Riesgos / deviations

- **Corrección 1 (revisión fresh-eyes, 2026-11-24):** D1 major — los ARN de stack de `infra/role-policy-dev.json` usaban `stack/fichass-*-dev` (sin comodín final), que NO casa con los ARN reales de CloudFormation (`stack/fichass-<name>/<uuid>`); corregido a `stack/fichass-*-dev/*` en los dos statements (patrón análogo al `stack/fichass-*` de producción). D3 minor — añadido `ssm:DeleteParameter` sobre `/fichass/dev/*` para que el self-heal del hosting dev pueda borrar el parámetro SSM (sin Retain) sin atascar el stack. D4 minor (deuda heredada del trust de producción): el segundo formato de sub con `@*` no es el formato real de IDs numéricos de GitHub; funcional hoy por el formato clásico, se anota como deuda.
- Riesgo conocido: el bootstrap del rol dev lo hace CI (paso idempotente con el rol actual); el orquestador ejecuta el primer despliegue dev con el visto del usuario. Los quirks de changeset-CREATE de la cuenta siguen aplicando (create-stack directo para la primera creación de cada stack). El rol de producción no se modifica (D-70a).
- Riesgo residual: el trust del rol dev comparte `environment:dev` con los jobs de master (acotado por permisos: el rol dev solo toca `fichass-*-dev`); el trust dev no converge tras la primera creación (el rol actual no tiene `iam:UpdateAssumeRolePolicy`) → cambios futuros al trust = intervención manual one-time. `aws s3 sync --delete` borra `sam-artifacts/` del bucket dev (mismo patrón que master).
- Verificación runtime (2026-11-24): run 45500494138 SUCCESS; sitio dev HTTP 200; round-trip de sesión dev (master-layout v1 + elira v1 con clamp); producción intacta y aislada. Menor heredado: aviso de Node.js 20 deprecado en actions/checkout@v4 y configure-aws-credentials@v4 (forzado a Node 24), no bloqueante.

## Amendments

- (vacía; tras entrar en `implement` los cambios solo por enmienda documentada)
