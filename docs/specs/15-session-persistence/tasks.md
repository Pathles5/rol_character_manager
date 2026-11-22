# Tasks — Fase 15 (sub-fases 15a / 15b / 15c)

## 15a — Infra y contrato de backend

- [ ] T-01 Enmienda D-17 en `model.md` (contrato de sesión: GET/PATCH, version, 409).
- [ ] T-02 `infra/template.yaml`: tabla `fichass-sessions` (PAY_PER_REQUEST, Retain) + Lambda Node 22 + Function URL con CORS al origin + permisos mínimos.
- [ ] T-03 Handler de la Lambda: GET (404 si no existe) / PATCH (validación de contrato + concurrencia optimista + 409 con estado remoto) + endurecimiento (ids del manifest, tamaño de body).
- [ ] T-04 Job `infra` en `.github/workflows/deploy.yml`: `sam build` + `sam deploy` del stack con la OIDC (environment dev) + ampliación least-privilege de la policy del rol (`infra/role-policy.json`) para CloudFormation/Lambda/DynamoDB/SSM acotada a `fichass-*`; actualización de `infra/README.md`; **en local no se despliega**.
- [ ] T-05 Verificación de los criterios C1–C5 (round-trip real contra la Function URL) tras el despliegue por pipeline + compuertas (lint/build/check) + docs (INDEX, D-56 si hay desvíos).

## 15b — Capa de sincronización en el cliente

- [ ] T-06 `src/sync.ts`: observación de cambios de sesión, debounce ~1,5 s, cola con reintentos, indicador de estado.
- [ ] T-07 Carga en `character.ts`: GET remoto en paralelo con localStorage; remoto válido manda; local = respaldo.
- [ ] T-08 Indicador pequeño en la appbar (sincronizado / pendiente / error) — sin tocar la ficha.
- [ ] T-09 Tests del módulo de sync + compuertas + QA multi-dispositivo (C6–C9).

## 15c — Conflicto y pulido

- [ ] T-10 Toast de conflicto 409 (cargar remoto / sobrescribir), patrón a11y del Reset (trapTab, Esc, foco).
- [ ] T-11 QA manual móvil/escritorio (dos dispositivos + Reset + offline) (C10).
- [ ] T-12 Revisor fresh-eyes de la fase (C11) + docs finales + tag (C12).
