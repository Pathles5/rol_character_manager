# FichaSS — Infra AWS (SAM + GitHub Actions OIDC)

Guía de la infra del repo. Desde la **Fase 19** el proyecto es **multi-entorno**
(`dev`/`pre`/`pro`, D-68…D-71): la rama `dev` despliega el entorno `dev` con
recursos con sufijo `-dev`; `master` sigue desplegando producción legacy sin
cambios. Estrategia de ramas/entornos y runbook de dev:
[`docs/PROCESS.md`](../docs/PROCESS.md).

El despliegue es **100 % CI** (Fase 15+, D-55): en local no se despliega nunca.
Cada push a `master` o `dev` ejecuta el workflow `.github/workflows/deploy.yml`
vía OIDC, sin claves longevas. El bootstrap one-time de la Fase 09 (provider
OIDC de GitHub en la cuenta) queda documentado al final.

> **Coste €0 (constitución I2 / D-11):** S3 hosting estático, IAM (OIDC provider
> + rol) y CloudFormation/SAM son gratis / Free Tier. **Sin CloudFront, sin
> dominios, sin servicios pagados.** El entorno dev añade bucket + tabla
> on-demand + Lambda, todo dentro de Free Tier. Antes del primer despliegue,
> crea la **alerta de facturación en $0** (paso 3).

---

## Paso 0 · Requisitos

- **Node 20** (versión LTS usada por el build y el workflow).
- **AWS CLI v2** (`aws --version` ≥ 2.x).
- **AWS SAM CLI** (`sam --version`).
- Cuenta de AWS con **Free Tier** activo.

## Paso 1 · Despliegue de stacks: parámetro `Environment`

Los tres templates (`infra/template.yaml` hosting, `infra/data.yaml`,
`infra/session.yaml`) llevan el parámetro **`Environment`** con **default `''`
(legacy-compatible)**: vacío reproduce byte a byte los nombres actuales de
producción (master intacto aunque comparta templates, D-69/D-71); la ruta dev lo
pasa **`Environment=dev` explícitamente** y produce nombres con sufijo `-dev` y
sin sufijo de repo.

| Qué | master (default `''`) | dev (`Environment=dev`) |
|---|---|---|
| Stack hosting | — (huérfano, ver nota) | `fichass-hosting-dev` |
| Bucket / SSM | `fichass-site` / `/fichass/bucket-name` | `fichass-site-dev` / `/fichass/dev/bucket-name` |
| Stack datos / tabla | `fichass-data` / `fichass-sessions-rol_character_manager` | `fichass-data-dev` / `fichass-sessions-dev` |
| Stack cómputo / Lambda / rol | `fichass-session` / `fichass-session-rol_character_manager` | `fichass-session-dev` / `fichass-session-role-dev` |
| Rol OIDC de Actions | `fichass-github-actions-rol_character_manager` | `fichass-github-actions-dev` (lo crea CI) |

El mapa completo (incluido `pre` futuro) está en
[`docs/PROCESS.md`](../docs/PROCESS.md).

> ⚠️ El hosting legacy (`fichass-site` + bucket policy + SSM `/fichass/bucket-name`)
> sigue **huérfano**: la ruta `master` no despliega `template.yaml` (D-70). No lo
> despliegues manualmente con defaults — chocaría con los recursos vivos.

> ⚠️ El stack **NO se crea vía changeset** (los changesets CREATE están rotos en
> esta cuenta — spec 09): la primera creación de cada stack es
> `aws cloudformation create-stack` directo. El workflow ya lo hace así
> (self-heal de shells rotos + create-stack directo); los updates van por
> changeset UPDATE.

> ⚠️ El trust de los roles referencia el **provider OIDC de GitHub**, que debe
> existir en la cuenta (no lo crean los templates). Si falta:
> ```powershell
> aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
> ```
> (AWS valida GitHub por su librería de CAs de confianza; el thumbprint histórico vale.)

## Paso 2 · Secrets de GitHub (lista EXACTA)

GitHub → **Settings → Environments → dev → Add environment secret**
(los secrets son de **ENTORNO "dev"**, no de repo — todos los jobs del workflow
declaran `environment: dev` (nombre heredado de la Fase 09, hoy lo usan todas
las rutas); 2 secrets, ninguno es una access key — OIDC no los necesita):

| Secret | Valor |
|---|---|
| `AWS_OIDC_ROLE_ARN` | ARN del rol **actual** `fichass-github-actions-rol_character_manager` — lo usan los jobs de `master` y el job `bootstrap-dev-role` (el único que necesita permisos de IAM para crear el rol dev) |
| `AWS_REGION` | Región elegida (p. ej. `eu-west-1`) — necesaria ANTES de autenticarse, por eso sigue siendo secret |

El rol **dev** NO es un secret: los jobs `infra-dev`/`deploy-dev` lo asumen por
**ARN determinista** (`arn:aws:iam::<cuenta>:role/fichass-github-actions-dev`),
creado por `scripts/bootstrap-dev-role.sh` en CI (idempotente, D-70a) — sin
credenciales nuevas y sin tocar el rol de producción.

El nombre del bucket NO es un secret: cada stack lo publica en su parámetro
SSM (`/fichass/bucket-name` legacy, `/fichass/dev/bucket-name` dev, D-40/D-69)
y el workflow lo lee en runtime con `ssm:GetParameter` (único permiso SSM del
rol de su entorno).

No hay más secrets. Nunca crees `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`:
el workflow usa `aws-actions/configure-aws-credentials@v4` con `role-to-assume`.

## Paso 3 · Despliegue continuo

**Rama `master` → producción legacy (intacta, D-71):**

1. Haz push a `master` (o lanza manualmente el workflow desde Actions →
   **deploy** → *Run workflow*).
2. GitHub Actions ejecuta **lint → test → build** (quality gate) y, si pasa,
   el job `infra` despliega `fichass-data`/`fichass-session` con los defaults y
   el job `deploy` publica `session-url.json` + hace `aws s3 sync` al bucket
   legacy con la política de cache:
   - `dist/assets/*` (ficheros con hash): `max-age=31536000, immutable`.
   - `index.html`, `characters-manifest.json`, `characters/*.json`:
     `max-age=0, must-revalidate` (los edits de personajes se ven al momento).
3. Abre la URL pública (`WebsiteURL`) para verificar la app.

**Rama `dev` → entorno dev (Fase 19):**

1. Haz push a `dev`. El workflow ejecuta, en orden:
   **quality-gate → `bootstrap-dev-role`** (asume el rol ACTUAL y crea/converge
   `fichass-github-actions-dev`, idempotente) **→ `infra-dev`** (asume el rol
   dev por ARN determinista y despliega `fichass-hosting-dev` →
   `fichass-data-dev` → `fichass-session-dev` con `Environment=dev`)
   **→ `deploy-dev`** (`session-url.json` desde `fichass-session-dev` + sync a
   `fichass-site-dev`, misma política de cache).
2. Verifica en
   <http://fichass-site-dev.s3-website-eu-west-1.amazonaws.com> y el
   round-trip de sesión dev (sin tocar datos de producción). El **primer
   despliegue** lo ejecuta el orquestador con el visto del usuario.

La concurrencia es por rama (`fichass-deploy-<rama>`): nunca corren dos sync
simultáneos contra el mismo bucket.

### Coste y control (€0)

- Minutos de Actions: repo público = gratis (o dentro de la cuota gratuita);
  workflow corto, runners ubuntu ×1.
- S3: Free Tier / cuota siempre-gratis para el uso de un jugador. Dev añade
  bucket + tabla on-demand + Lambda, también Free Tier.
- **Alerta de facturación $0** (obligatoria): Consola AWS →
  **Billing → Budgets → Create budget** → plantilla *"Zero spend budget"* con
  umbral $0. Si la cuenta es nueva o no la tienes creada, hazla **antes** del
  primer despliegue.

## Paso 4 · Troubleshooting

| Problema | Solución |
|---|---|
| Changeset CREATE falla con "Stack does not exist" engañoso | Quirk de la cuenta (spec 09): primera creación por `aws cloudformation create-stack` directo — el workflow ya lo hace (self-heal) |
| Changeset en `FAILED` con "didn't contain changes" / "No updates are to be performed" | No-op correcto: el template no cambió, no hay nada que aplicar |
| Changesets pendientes de corridas interrumpidas | Nunca ejecutarlos: el workflow los borra y crea uno fresco con el build actual |
| `trust-dev.json` cambiado pero el rol dev no lo refleja | El rol actual no tiene `iam:UpdateAssumeRolePolicy`: convergencia manual one-time (D-70a) |
| Esperas de stack muy largas / timeouts | AWS CLI v2 no soporta `--waiter-attempts`: todos los waits son bucles de sondeo manual (patrón ya usado en el workflow) |

## Bootstrap one-time (Fase 09, registro histórico)

- El arranque original (provider OIDC + stack + secrets) está documentado en la
  spec 09 (`docs/specs/09-infra-sam/spec.md`). El `samconfig.toml` que generó
  ese bootstrap se retiró del repo (los despliegues van desde CI).
- La creación directa del primer stack (changeset CREATE roto) y el drift real
  de IAM quedaron registrados en `infra/trust.json` + `infra/role-policy.json`
  (IaC de referencia del rol de producción).
