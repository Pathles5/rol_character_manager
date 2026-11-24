# PROCESS — Estrategia de ramas y entornos

Documento de proceso (Fase 19; decisiones D-68…D-71 + D-70a). Define el mapa rama→entorno, los recursos de cada entorno, cómo se añadirán `pre`/`pro` en el futuro y el runbook de despliegue de `dev`.

## Mapa rama → entorno

| Rama | Entorno | Estado | Uso |
|---|---|---|---|
| `dev` | dev | implementado (Fase 19) | Desarrollo: cada push despliega el entorno dev |
| `pre` | pre | **futuro** | Preproducción estable para cerrar releases |
| `master` | pro | legacy | Producción (versiones major estables); hoy los recursos van SIN sufijo de entorno; migración a nombres con sufijo = fase futura |

## Recursos por entorno

| Qué | dev (rama `dev`) | pro legacy (rama `master`) |
|---|---|---|
| Bucket hosting | `fichass-site-dev` | `fichass-site` |
| Stack hosting (bucket + policy + SSM) | `fichass-hosting-dev` (lo crea CI) | — (hosting huérfano: sin stack, intervención manual) |
| Stack de datos | `fichass-data-dev` | `fichass-data` |
| Tabla DynamoDB | `fichass-sessions-dev` | `fichass-sessions-rol_character_manager` |
| Stack de cómputo | `fichass-session-dev` | `fichass-session` |
| Lambda + rol de ejecución | Lambda `fichass-session-dev` / rol `fichass-session-role-dev` | Lambda y rol `fichass-session-rol_character_manager` |
| Parámetro SSM del bucket | `/fichass/dev/bucket-name` | `/fichass/bucket-name` |
| Rol OIDC de GitHub Actions | `fichass-github-actions-dev` (crea el bootstrap en CI) | `fichass-github-actions-rol_character_manager` |

Los nombres de dev salen del parámetro `Environment=dev` de los tres templates (`infra/template.yaml`, `infra/data.yaml`, `infra/session.yaml`); el default `''` reproduce exactamente los nombres legacy de pro (master intacto, D-69/D-71).

## Cómo añadir pre/pro en el futuro

- **Templates:** ya parametrizados — pasar `Environment=pre` / `Environment=pro`; sin más cambios de IaC.
- **Workflow:** ruta paralela *gated* a la rama (`pre` / `master`), siguiendo el patrón de la ruta dev (bootstrap → infra → deploy), con concurrencia por rama.
- **Rol OIDC por entorno:** bootstrap análogo (`scripts/bootstrap-dev-role.sh` como plantilla) creando `fichass-github-actions-<env>` con policy acotada a `fichass-*-<env>`.
- **GitHub:** un *environment* por entorno (`pre`/`pro`) con sus secrets `AWS_OIDC_ROLE_ARN` y `AWS_REGION`. Hoy solo existe el environment `dev` (heredado de Fase 09, con nombre engañoso: también lo consumen los jobs de `master`).
- **Trusts:** revisarlos al añadir entornos — el trust del rol dev acepta rama `dev` O environment `dev`, y ese environment está compartido con los jobs de `master` (acotado por permisos: el rol dev solo toca `fichass-*-dev`). Con más entornos, cada trust debe apuntar a su rama/environment sin solapes.
- **Migración de pro:** cuando toque, migrar datos (tabla) y URL de producción a los nombres con sufijo; hasta entonces `master` sigue con los defaults legacy y su URL actual.

## Runbook dev

Un push a `dev` dispara el workflow `deploy` (`.github/workflows/deploy.yml`):

1. **quality-gate** — lint → test → build (sube el artefacto `dist`).
2. **bootstrap-dev-role** — asume el rol ACTUAL (secret `AWS_OIDC_ROLE_ARN`) y ejecuta `scripts/bootstrap-dev-role.sh` (idempotente): crea `fichass-github-actions-dev` si falta y converge su policy. Único job que usa ese secret; el rol de producción no se modifica.
3. **infra-dev** — asume el rol dev por ARN determinista (`arn:aws:iam::159177056493:role/fichass-github-actions-dev`, sin secrets nuevos) y despliega los tres stacks con `Environment=dev`, en orden: **hosting → data → session** (`fichass-hosting-dev` → `fichass-data-dev` → `fichass-session-dev`).
4. **deploy-dev** — publica `session-url.json` desde el output de `fichass-session-dev` y hace `aws s3 sync` a `fichass-site-dev` con la misma política de cache que master.

**Verificar tras el despliegue:**

- URL del bucket dev: <http://fichass-site-dev.s3-website-eu-west-1.amazonaws.com> carga la app.
- Round-trip de sesión en dev (C3/C4): la capa de sync apunta a la API dev; los datos viven en `fichass-sessions-dev` — **sin tocar producción**.
- La ruta de `master` sigue desplegando producción legacy sin cambios.

El **primer despliegue** lo ejecuta el orquestador con el visto del usuario.

## Notas

- **Trust dev sin convergencia:** el rol actual no tiene `iam:UpdateAssumeRolePolicy`, así que el bootstrap solo crea el rol una vez; cambios futuros en el trust (`infra/trust-dev.json`) = intervención manual one-time.
- **Branch protection** en `master`/`pre` recomendada (configuración del usuario; fuera del alcance del repo).
- **Coste €0 (I2):** dev añade bucket + tabla on-demand + Lambda, todo dentro de Free Tier/always-free; alertas de facturación existentes (3€/10€) intactas. Sin servicios pagados.
- **Quirks de la cuenta (no re-abrir):** changeset CREATE roto → creación por `create-stack` directo (el workflow ya lo hace); changesets pendientes se BORRAN, nunca se ejecutan; changeset vacío = no-op; esperas por sondeo manual (AWS CLI v2 sin `--waiter-attempts`).

## Referencias

- Spec de la fase: `docs/specs/19-entornos-dev/spec.md`
- Decisiones: `DECISIONS.md` — D-68, D-69, D-70, D-70a, D-71
- Infra y puesta en marcha: `infra/README.md`
