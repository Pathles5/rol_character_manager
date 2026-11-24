# Tasks — Fase 19: Entornos parametrizados (implementación dev)

Solución validada por el usuario (D-68/D-69/D-70/D-70a/D-71, 2026-11-24). Estados: `pendiente → propuesta → validada(en-flight) → impl-done → revisada → done`.

## T-01 · Templates parametrizados por entorno

- Estado: done
- Responsable: devops (propuesta validada: D-69/D-70)
- Archivos: `infra/template.yaml`, `infra/data.yaml`, `infra/session.yaml`
- Detalle:
  - Parámetro `Environment` en los tres templates con **default `''` (legacy-compatible)**: vacío reproduce los nombres actuales de master (sufijo de repo `rol_character_manager`, stacks `fichass-data`/`fichass-session` sin sufijo, bucket `fichass-site`, SSM `/fichass/bucket-name`); `dev` (y futuros pre/pro) produce nombres con sufijo `-<env>` y SIN sufijo de repo: hosting `fichass-hosting-<env>` / bucket `fichass-site-<env>` / SSM `/fichass/<env>/bucket-name`; datos `fichass-data-<env>` / tabla `fichass-sessions-<env>`; cómputo `fichass-session-<env>` / Lambda+rol `fichass-session-<env>` / `fichass-session-role-<env>`. Master usa los defaults (intacto); la ruta dev pasa `Environment=dev` explícitamente.
  - `template.yaml` pasa de referencia huérfana a stack de hosting desplegable por CI (bucket website + policy pública read-only + SSM), Retain en bucket.
  - CORS de la Function URL apuntando a los orígenes del bucket del entorno; `SESSIONS_TABLE`/`MANIFEST_URL`/`SITE_URL` derivados del entorno.
  - Sin cross-stack refs (nombres deterministas + `!Sub`), patrón Fase 15.
- Evidencia: templates con `Environment` default legacy (`''`) + dev con sufijo `-dev` sin repo; `sam validate --lint` OK en los 3 templates

## T-02 · Bootstrap del rol dev dedicado (idempotente, 100% CI)

- Estado: done
- Responsable: devops (propuesta validada: D-70a)
- Archivos: `infra/role-policy-dev.json`, `infra/trust-dev.json`, `scripts/bootstrap-dev-role.sh` (nuevo)
- Detalle:
  - Policy del rol `fichass-github-actions-dev`: gestión S3 (CreateBucket/PutBucketPolicy/PutBucketWebsite/PutPublicAccessBlock/GetBucket*/ListBucket/Get-Put-DeleteObject) sobre `fichass-site-dev` (+ `fichass-*-dev` para futuros), SSM `/fichass/dev/*`, CFN stacks/changesets `fichass-*-dev`, Lambda/Dynamo `fichass-*-dev`, IAM+PassRole `fichass-*-dev`. Mínimo privilegio, I2.
  - Trust: rama `dev` + environment `dev` (ambos formatos de sub con IDs numéricos), aud sts.amazonaws.com.
  - Script idempotente: `aws iam get-role` → si falta, `create-role` + `put-role-policy`; lo ejecuta CI asumiendo el rol actual (que tiene iam:CreateRole/PutRolePolicy/PassRole sobre fichass-*). El rol de producción NO se modifica.
- Evidencia: `infra/role-policy-dev.json` + `infra/trust-dev.json` + `scripts/bootstrap-dev-role.sh` idempotente; JSON válidos, sintaxis bash OK

## T-03 · Workflow: ruta dev paralela, master intacto

- Estado: done
- Responsable: devops (propuesta validada: D-68/D-70a/D-71)
- Archivos: `.github/workflows/deploy.yml`, `scripts/deploy-stack.sh` (si procede)
- Detalle:
  - Trigger push a `[master, dev]` + workflow_dispatch; concurrencia por rama (`fichass-deploy-${{ github.ref_name }}`).
  - Ruta dev: quality-gate → bootstrap del rol dev (idempotente, asume rol actual vía secret) → infra dev (asume rol dev por ARN determinista; sam build/package + create/update de hosting-dev, data-dev, session-dev con el self-heal/create-stack directo existente) → deploy dev (SSM `/fichass/dev/bucket-name`, publica session-url.json desde session-dev, sync a fichass-site-dev con la misma política de cache).
  - Ruta master: CONSERVA stacks/bucket/SSM/rol legacy exactos de hoy (producción intacta, D-71).
  - Los jobs de dev declaran `environment: dev`; el rol dev se referencia por ARN construido (sin secrets nuevos).
- Evidencia: workflow con trigger `[master, dev]`, concurrencia por rama (`fichass-deploy-<ref_name>`), jobs master intactos + `bootstrap-dev-role`/`infra-dev`/`deploy-dev` con `environment: dev`, orden hosting→data→session

## T-04 · Documentación: runbook + estrategia de ramas/entornos

- Estado: done
- Responsable: documentador (por orden del orquestador)
- Archivos: `infra/README.md`, `README.md`, `docs/PROCESS.md` (nuevo), `docs/specs/INDEX.md`
- Detalle:
  - Runbook dev: cómo dispara CI el bootstrap del rol + hosting + data + session; qué verificar (URL del bucket dev, round-trip de sesión dev).
  - Estrategia de ramas/entornos: dev→dev, pre→pre (futura), master→pro (legacy); cómo se añadirán pre/pro (parámetro Environment + ruta de workflow + rol por entorno); recomendación de branch protection (config del usuario).
  - Coste €0 (I2) con dev añadido; alertas existentes.
- Evidencia: `docs/PROCESS.md` + `infra/README.md` + `README.md` + `docs/specs/INDEX.md` sincronizados con la Fase 19

## T-05 · Compuertas, revisión y despliegue dev verificado

- Estado: en-flight
- Responsable: orquestador (compuertas + despliegue con visto) → revisor fresh-eyes → usuario (QA)
- Archivos: los de T-01…T-04
- Detalle:
  - `npm run lint`, `npm run build`, `npm test`, `powershell -File scripts/check.ps1` en verde; `sam validate` de los templates.
  - Revisor fresh-eyes contra C1–C5 (énfasis: master intacto, mínimo privilegio del rol dev, I2).
  - Primer despliegue dev ejecutado por el orquestador con el visto del usuario; verificar URL dev + round-trip de sesión dev sin tocar producción.
  - D-68…D-71 + D-70a registradas en DECISIONS.md; INDEX/tasks sincronizados.
- Evidencia: compuertas verdes (sam validate ×3, lint, build, test 170/170, check.ps1, sintaxis bash) + revisor PASS tras corrección 1 (D1 ARN stack `fichass-*-dev/*`, D3 `ssm:DeleteParameter`); pendiente despliegue dev con visto + QA round-trip C3/C4
