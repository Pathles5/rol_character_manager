# Spec — Fase 09: Infra AWS con SAM + CI/CD (GitHub Actions)

Fase: 09 · Estado: waiting (se activa tras la Fase 10) · Compuerta: workflow en verde + despliegue verificado + Coste €0

## Objetivo

Despliegue continuo de FichaSS en AWS mediante **AWS SAM** (petición del usuario: es el formato que ya usa en otro proyecto) y **GitHub Actions**, manteniendo el invariante **Coste €0** (D-11). El subagente devops (D-12) se activa aquí; su primera tarea es revisar sus permisos contra las herramientas reales.

## Alcance

- **Template SAM** (`template.yaml` / `infra/`): bucket S3 con hosting estático público (OAC no aplica: sin CloudFront), **rol IAM con OIDC para GitHub Actions** (sin claves longevas en secrets), y lo que el usuario tenga estandarizado en su otro proyecto (convenciones SAM a respetar). Parámetros de stack (nombre de bucket, repo, rama) parametrizados.
- **Workflow de Actions** (`**/.github/workflows/deploy.yml`): en push a `master` → quality gate (`lint` → `test` → `build` → `check`) → `sam build` + `sam deploy` (con confirmación del orquestador o auto según decisión) → sync de `dist/` a S3 (incluye `characters/*.json` y manifest).
- **Caching**: `Cache-Control` corto en `index.html` (los cambios deben verse) y TTL mayor para assets con hash (fuentes/js/css).
- **Documentación de puesta en marcha una-vez** (crear el stack, OIDC role ARN en repo secrets, nombre del bucket).
- Sin CloudFront (invariante y decisión de v1): sin invalidaciones; las páginas son estáticas.

## Fuera de alcance

- Funcionalidad de la app (Fase 10 la cubre); dominio propio; WAF/monitorización avanzada; entornos múltiples.

## Decisiones previstas

- D-34 (ya registrada): SAM como formato IaC, petición del usuario.
- D-37: despliegue automático en push vs. manual con visto (propuesta: automático tras quality gate, con rollback manual = re-run de commit anterior).

## Criterios de aceptación (verificables)

- C1: `sam build` + `sam validate` sin errores; el template describe SOLO recursos Free Tier (grep de tipos de recurso; sin CloudFront/ALB).
- C2: workflow ejecuta las 4 compuertas y despliega en push a `master`; usa OIDC (sin `AWS_ACCESS_KEY_ID` en secrets).
- C3: la URL del endpoint S3 sirve la v1 (raíz + ficha por hash + characters/*.json); `Cache-Control` aplicado según política.
- C4: alerta de facturación $0 configurada; ningún recurso pagado en el stack (revisión en compuerta).
- C5: revisor fresh-eyes + devops (si disponible) contra C1–C5; D-37 registrada; documentación one-time en `infra/README.md`.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- Enmienda D-39 (2026-11-19): el workflow es **sync-only** (la spec original incluía `sam deploy` en el workflow). El stack es one-time manual del usuario; el rol OIDC queda con mínimo privilegio S3. Motivo y riesgo en DECISIONS.md.
- `sam validate/build` NO ejecutados aún: ni el agente devops (su shell es solo inspección, D-12) ni el orquestador tienen SAM CLI local instalado. **C1 queda pendiente del paso 1 de `infra/README.md`** (el usuario corre `sam validate && sam build` antes de desplegar). Verificación alternativa: lectura del template por orquestador + revisor.
- C3 (URL real sirviendo + cabeceras) queda pendiente del deploy real del usuario — la fase no cierra hasta ese paso (T-05).
- Thumbprints OIDC: incluidos los vigentes 2025 + históricos de GitHub (2023); AWS valida GitHub por su librería de CAs — el campo es obligatorio pero no operativo.
- **Diagnóstico del fallo silencioso de validación (2026-11-20):** la causa raíz era el formato de `Tags` en el `AWS::SSM::Parameter` — CloudFormation exige un **mapa objeto**, no una lista (cfn-lint oficial E3012 lo destapó; el error del servicio era opaco: `AWS::EarlyValidation::PropertyValidation` sin detalle por recurso). Corregido a forma mapa; 4 recursos CREATE_COMPLETE.
- **Precisión del trust (revisor 09, 2026-11-20):** el trust **real en IAM** es `infra/trust.json` — UNA statement con `StringLike` y 4 subs (viejo formato con nombres + nuevo formato GitHub 2025 con `@org-id/@repo-id`, confirmado vía CloudTrail). El `template.yaml` declara DOS statements con `StringEquals` escalar (rama + environment dev) — la statement 2 es subconjunto de la 1 (redundante pero inofensiva; semánticamente OR en ambos casos). El stack vive con nombre `fichass-infra`.
- **Cadena de depuración del pipeline (2026-11-20, en orden de aparición y resolución):**
  1. `package.json` con **BOM** (reintroducido por el bump v0.1.0 con `Set-Content -Encoding UTF8`) → build fallaba en Linux (`PostCSS JSON.parse`). Fix: reescritura sin BOM.
  2. Secrets en el **environment "dev"** en vez de a nivel repo → `Input required and not supplied: aws-region`. Fix: `environment: dev` declarado en el job deploy.
  3. **El sub del token OIDC de GitHub cambió de formato en 2025** (incluye IDs numéricos: `repo:Pathles5@<org-id>/rol_character_manager@<repo-id>:environment:dev` — confirmado vía CloudTrail) → el trust con nombres quedaba denegado. Fix: `StringLike` con comodines `@*/@*` cubriendo ambos formatos.
  4. Los pasos de sync pisaban `AWS_S3_BUCKET` con `env: ${{ secrets.AWS_S3_BUCKET }}` (secret eliminado por D-40) → vacío. Fix: leerlo del `GITHUB_ENV` del paso SSM.
- **Estado real de la infra:** el stack `fichass-infra` quedó creado vía `create-stack` (el changeset tipo CREATE está roto en esta cuenta: "Stack does not exist" engañoso); los updates futuros via `sam deploy` (changesets UPDATE, vía probada). El `template.yaml` refleja fielmente lo desplegado salvo el trust, que en IAM usa **dos statements separados** con `StringEquals` escalar (la forma con lista en `StringEquals` tripotaba la validación temprana); equivalente semánticamente (OR entre statements). El drift registrado en `infra/trust.json` + `infra/role-policy.json` (ficheros de la creación directa).
- Verificación final: index/manifest/personajes HTTP 200; `Cache-Control` según política; 86/86 tests; lint/build/check PASS.
- Alerta de facturación (2026-11-20): configurada por el usuario con umbrales **3€ y 10€** en vez de $0 exacto — variante aceptada explícitamente ("dalo por válido"): avisa antes de que exista gasto real, cumple el espíritu del invariante I2. El guard mecánico de la constitución (cláusula Coste €0 en check.ps1) no cambia.
- **Revisor fresh-eyes (D-49, 2026-11-20): PASS with remarks** — 1 major procesal (resuelto: enmienda I1, D-48) y minors aplicados: README sincronizado con el template real (fuera el parámetro fantasma), spec precisa la forma real del trust (`infra/trust.json`), d20 negativo corregido, focus trap genérico en Reset y roll dialog, escapeHtml completo. Verificaciones fuera de su alcance asumidas por orquestador/evidencia (test 96/96, cache-control verificado por orquestadora).
- **Quirks documentados del proceso:** (1) `CreateChangeSet` con `ChangeSetType=CREATE` falla con "Stack does not exist" engañoso en esta cuenta (vía CLI y boto3, ambas regiones) — el bootstrap se hizo con `create-stack` directo; los updates futuros por `sam deploy` usan changesets UPDATE (vía probada). (2) `sam build` cachea `.aws-sam/build/template.yaml`: **ejecutar `sam build` antes de cada `sam deploy`** tras cambiar el template. (3) Diagnóstico posible gracias a **cfn-lint oficial de Python** instalado en el runtime de SAM (`python -m pip install cfn-lint`).
