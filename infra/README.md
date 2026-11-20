# FichaSS — Infra AWS (SAM + GitHub Actions OIDC)

Guía de puesta en marcha **one-time** del USUARIO (decisión validada 2026-11-19:
el despliegue del stack lo hace el usuario una vez con sus credenciales; después,
cada push a `master` despliega solo con OIDC, sin claves longevas).

> **Coste €0 (constitución I2 / D-11):** S3 hosting estático, IAM (OIDC provider
> + rol) y CloudFormation/SAM son gratis / Free Tier. **Sin CloudFront, sin
> dominios, sin servicios pagados.** Antes del primer despliegue, crea la
> **alerta de facturación en $0** (paso 4).

---

## Paso 0 · Requisitos

- **Node 20** (versión LTS usada por el build y el workflow).
- **AWS CLI v2** (`aws --version` ≥ 2.x).
- **AWS SAM CLI** (`sam --version`).
- Cuenta de AWS con **Free Tier** activo.

## Paso 1 · Desplegar el stack (una sola vez, local)

```powershell
cd infra
sam validate
sam build
sam deploy --guided
```

En `--guided` responde:

| Pregunta | Respuesta |
|---|---|
| Stack Name | `fichass-infra` (el stack real de este repo; el template también funciona con cualquier nombre) |
| AWS Region | tu región (p. ej. `eu-west-1`) |
| Parameter BucketName | nombre único global (p. ej. `fichass-site`) |
| Parameter GitHubOrg / GitHubRepo | tu org/usuario y repo de GitHub |
| Parameter GitHubBranch | `master` |
| Parameter ExistingOidcProviderArn | ARN del provider de GitHub **ya existente en tu cuenta** (obligatorio: `arn:aws:iam::<cuenta>:oidc-provider/token.actions.githubusercontent.com`; si tu cuenta no lo tiene, créalo primero — ver abajo) |
| Confirm changes before deploy | `Y` |
| Allow SAM CLI to create IAM roles | `Y` |
| Save arguments to samconfig.toml | `Y` |

> ⚠️ El template **requiere** que el OIDC provider de GitHub exista en la cuenta
> (no lo crea). Si no lo tienes:
> ```powershell
> aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
> ```
> (AWS valida GitHub por su librería de CAs de confianza; el thumbprint histórico vale.)

> ⚠️ El stack **NO se crea vía changeset** (los changesets CREATE están rotos en
> esta cuenta — documentado en la spec 09): usa `sam deploy` solo para
> ACTUALIZAR un stack ya existente; para la primera creación usa
> `aws cloudformation create-stack` con el template subido a S3, como hizo la
> orquestadora (ver spec 09, deviations).

**Anota los Outputs del stack:**
- `WebsiteURL` → la URL pública de la app.
- `OidcRoleArn` → para el secret `AWS_OIDC_ROLE_ARN`.
- (`BucketName` también se publica como **parámetro SSM** `/fichass/bucket-name` — el workflow lo lee en runtime, D-40.)

## Paso 2 · Secrets de GitHub (lista EXACTA)

GitHub → **Settings → Environments → dev → Add environment secret**
(los secrets son de **ENTORNO "dev"**, no de repo — el job `deploy` los consume
declarando `environment: dev` en el workflow; 2 secrets, ninguno es una access
key — OIDC no los necesita):

| Secret | Valor |
|---|---|
| `AWS_OIDC_ROLE_ARN` | Output `OidcRoleArn` del stack |
| `AWS_REGION` | Región elegida en el deploy (p. ej. `eu-west-1`) — necesaria ANTES de autenticarse, por eso sigue siendo secret |

El nombre del bucket NO es un secret: el stack lo publica en SSM (`/fichass/bucket-name`, D-40) y el workflow lo lee en runtime con `ssm:GetParameter` (único permiso SSM del rol).

No hay más secrets. Nunca crees `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`:
el workflow usa `aws-actions/configure-aws-credentials@v4` con `role-to-assume`.

## Paso 3 · Despliegue continuo

1. Haz push a `master` (o lanza manualmente el workflow desde Actions →
   **deploy** → *Run workflow*).
2. GitHub Actions ejecuta: **lint → test → build** (quality gate) y, si pasa,
   hace `aws s3 sync dist/ s3://<bucket>/` con la política de cache:
   - `dist/assets/*` (ficheros con hash): `max-age=31536000, immutable`.
   - `index.html`, `characters-manifest.json`, `characters/*.json`:
     `max-age=0, must-revalidate` (los edits de personajes se ven al momento).
3. Abre `WebsiteURL` para verificar la app.

### Coste y control (€0)

- Minutos de Actions: repo público = gratis (o dentro de la cuota gratuita);
  workflow corto, runners ubuntu ×1.
- S3: Free Tier / cuota siempre-gratis para el uso de un jugador.
- **Alerta de facturación $0** (obligatoria): Consola AWS →
  **Billing → Budgets → Create budget** → plantilla *"Zero spend budget"* con
  umbral $0. Si la cuenta es nueva o no la tienes creada, hazla **antes** del
  primer despliegue.

## Paso 4 · Troubleshooting

| Problema | Solución |
|---|---|