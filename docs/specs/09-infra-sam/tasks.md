# Tasks — Fase 09 Infra AWS con SAM + CI/CD

Estado de fase: implement (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Revisión de permisos del subagente devops contra las herramientas reales (D-12: primera tarea obligatoria) | done | orquestador | — | permisos OK para SAM: escribe `.github/**` + `infra/**`, shell solo inspección, denegaciones destructivas intactas; sin ajustes necesarios |
| T-02 | Template SAM: bucket hosting estático + rol OIDC para Actions + params de stack | done | devops | OK usuario 2026-11-19 (D-34/D-39) | `infra/template.yaml`: bucket con website config + BucketPolicy pública de solo GetObject, OIDC condicional (UseExistingOidcProvider), rol con trust sub-exacta de repo/rama y mínimo privilegio S3; tags I2 en todos; DeletionPolicy Retain; **`sam validate` PASS (C1 verificado, SAM CLI 1.173.0 local)**; `--lint` marca falso positivo E3006 sobre OpenIdConnectProvider (global/válido — documentado) |
| T-03 | Workflow Actions: gates (lint/test/build) → sync S3 con Cache-Control | done | devops + orquestador | OK usuario 2026-11-19 (D-39/D-40) | `.github/workflows/deploy.yml`: quality-gate (node 20, npm ci/lint/test/build con prebuild) → deploy OIDC → **bucket leído de SSM `/fichass/bucket-name` (D-40, ya no es secret)** → 2× sync (assets immutable + resto must-revalidate), concurrency, solo en master |
| T-04 | Documentación one-time en `infra/README.md` + actualización de README/ENTREGA | done | devops + orquestador | — | guía de 4 pasos con tabla de respuestas de `sam deploy --guided`, **2 secrets** (D-40), troubleshooting (6 casos incl. falso positivo E3006); README enlazado a infra/README |
| WebsiteURL | http://fichass-site.s3-website-eu-west-1.amazonaws.com | Verificado: el endpoint responde (404 hasta el primer deploy de contenido) |
| OidcRoleArn | arn:aws:iam::159177056493:role/fichass-github-actions-rol_character_manager | Para el secret AWS_OIDC_ROLE_ARN |
| BucketName | fichass-site | Publicado también en SSM /fichass/bucket-name (D-40) |
| T-05 | Despliegue real verificado + alerta $0 + revisor + INDEX al cierre | pending-user | orquestador + usuario + revisor | — | stack fichass-infra CREATE_COMPLETE (4 recursos); **pendiente del usuario**: 2 secrets (AWS_OIDC_ROLE_ARN + AWS_REGION) + alerta $0 + push → workflow → luego verifico C3 y cierro con revisor |
