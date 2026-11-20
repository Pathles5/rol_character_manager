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
| Stack Name | `fichass` |
| AWS Region | tu región (p. ej. `eu-south-2` / `eu-west-1`) |
| Parameter BucketName | nombre único global (p. ej. `fichass-site-<tu-usuario>`) |
| Parameter GitHubOrg / GitHubRepo | tu org/usuario y repo de GitHub |
| Parameter GitHubBranch | `master` |
| Parameter UseExistingOidcProvider | `false` (o `true` si ya tienes el provider, ver troubleshooting) |
| Confirm changes before deploy | `Y` |
| Allow SAM CLI to create IAM roles | `Y` |
| Save arguments to samconfig.toml | `Y` |

> ⚠️ Si el OIDC provider de GitHub ya existe en tu cuenta (por otro proyecto),
> el deploy fallará con `EntityAlreadyExists` → ver troubleshooting.

**Anota los Outputs del stack:**
- `WebsiteURL` → la URL pública de la app.
- `OidcRoleArn` → para el secret `AWS_OIDC_ROLE_ARN`.
- (`BucketName` también se publica como **parámetro SSM** `/fichass/bucket-name` — el workflow lo lee en runtime, D-40.)

## Paso 2 · Secrets de GitHub (lista EXACTA)

GitHub → **Settings → Secrets and variables → Actions → New repository secret**
(2 secrets, ninguno de ellos es una access key — OIDC no los necesita):

| Secret | Valor |
|---|---|
| `AWS_OIDC_ROLE_ARN` | Output `OidcRoleArn` del stack |
| `AWS_REGION` | Región elegida en el deploy (p. ej. `eu-south-2`) — necesaria ANTES de autenticarse, por eso sigue siendo secret |

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
| Deploy falla con `EntityAlreadyExists` / `AlreadyExists` (OIDC provider ya existe en la cuenta) | Re-desplegar con el provider existente: `sam deploy --guided` y responder `UseExistingOidcProvider=true` + `ExistingOidcProviderArn=arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com` (mismo `samconfig.toml` guardará los valores). El stack NO intenta crearlo y reutiliza el tuyo. |
| `sam validate --lint` marca `E3006: AWS::IAM::OpenIdConnectProvider does not exist in <región>` | Falso positivo de cfn-lint (su base de especificaciones no incluye ese tipo; IAM es global y el tipo es válido — `sam validate` básico pasa). Puedes ignorarlo. |
| Workflow falla en `Configure AWS credentials` con *Not authorized* | Revisa que `AWS_OIDC_ROLE_ARN` sea el `OidcRoleArn` output exacto y que el push sea a la rama parametrizada (`master`). El trust del rol solo acepta `repo:<org>/<repo>:ref:refs/heads/master` — un PR o cualquier otra rama queda denegado (por diseño). |
| Workflow falla en `Read deployment settings from SSM` con `ParameterNotFound` | El stack no publicó `/fichass/bucket-name`: re-despliega el stack (paso 1) con esta versión del template. |
| Página sirve contenido antiguo tras un deploy | No debería: `index.html` y los JSON van con `must-revalidate`. Comprueba en DevTools → Network → respuesta de `index.html` la cabecera `Cache-Control: max-age=0, must-revalidate`. Si falta, un sync anterior pudo subir sin cabeceras: fuerza re-subida borrando… no, NO borres el bucket; re-lanza el workflow (los sync no re-suben ficheros idénticos, así que si una cabecera quedó mal, contacta al orquestador para una corrección puntual). |
| 403 al abrir `WebsiteURL` | Comprueba que `SiteBucketPolicy` existe en el stack (permite `s3:GetObject` público) y que el bucket tiene la *Public access block* con `BlockPublicPolicy=false`/`RestrictPublicBuckets=false` (lo fija el template). Si el bucket fue creado antes por otro camino, revisa su configuración contra `infra/template.yaml`. |
| Fallo `BucketName` al crear el bucket | El nombre es único global: elige otro distinto (p. ej. añade tu usuario) y re-despliega. |

---

Archivos: `infra/template.yaml` (IaC SAM), `.github/workflows/deploy.yml`
(CI/CD). Estados y criterios de la fase: `docs/specs/09-infra-sam/spec.md`.
