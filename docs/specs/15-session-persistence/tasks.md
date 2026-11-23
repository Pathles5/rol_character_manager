# Tasks — Fase 15 (sub-fases 15a / 15b / 15c)

## 15a — Infra y contrato de backend

- [x] T-01 Enmienda D-17 en `model.md` (contrato de sesión: GET/PATCH, version, 409).
- [x] T-02 `infra/template.yaml` + **separación de stacks (decisión del usuario 2026-11-23)**: tabla en `infra/data.yaml` (stack `fichass-data`, Retain, sobrevive a recreaciones) y cómputo en `infra/session.yaml` (stack `fichass-session`, Lambda Node 22 ARM + Function URL con CORS al origin + policy de invocación doble `InvokeFunctionUrl`/`InvokeFunction` con `InvokedViaFunctionUrl`).
- [x] T-03 Handler `backend/session.ts`: GET (404 si no existe) / PATCH (validación con la MISMA lógica pura del cliente `src/session-schema.ts` + concurrencia optimista + 409 con estado remoto) + endurecimiento (ids del manifest, cuerpo ≤ 16 KB, schemaVersion, characterId mismatch). SDK **externo** con node_modules propio (los exports perezosos del SDK rompen bajo esbuild; 3.1175 usa GetCommand/PutCommand).
- [x] T-04 Job `infra` en `.github/workflows/deploy.yml`: build CJS→ESM del bundle + `sam build`/`sam package` + deploy explícito por CloudFormation con **self-healing** (create-stack directo; shells ROLLBACK/REVIEW se borran y recrean; changesets pendientes obsoletos se BORRAN — nunca se ejecutan; changesets vacíos = no-op) + policy del rol OIDC ampliada acotada a `fichass-*`. **En local no se despliega.**
- [x] T-05 Verificación C1–C5 contra producción: tabla+Lambda+URL en el stack ✓ · round-trip real (GET 404/200, PATCH 200 v1, 409 conflicto con versión obsoleta, 400 validación) ✓ · CORS: origin del site permitido, origin extraño SIN cabecera ✓ · compuertas lint/109 tests/build/check ✓ · Amendment 4 en `model.md` ✓.

## 15b — Capa de sincronización en el cliente

- [x] T-06 `src/sync.ts`: observación de cambios de sesión, debounce ~1,5 s, cola con reintentos, indicador de estado.
- [x] T-07 Carga en `character.ts`: GET remoto en paralelo con localStorage; remoto válido manda; local = respaldo.
- [x] T-08 Indicador pequeño en la appbar (sincronizado / pendiente / error) — sin tocar la ficha.
- [x] T-09 Tests del módulo de sync (9 nuevos, 118/118) + compuertas ✓ + **QA multi-dispositivo: verificación del remote-wins en producción EN CURSO (PATCH de prueba hp=28 hecho desde la API; revisión visual del usuario pendiente)**.

## 15c — Conflicto y pulido

- [x] T-10 Toast de conflicto 409 (dos botones: cargar remoto / sobrescribir el mío; Esc y backdrop = cargar remoto, patrón a11y del Reset con trapTab) + sync PAUSADO durante el conflicto (los changesets pendientes obsoletos se borran, nunca se ejecutan) — 12 tests del sync, 120/120.
- [ ] T-11 QA manual móvil/escritorio (dos dispositivos + Reset + offline + conflicto) (C10) — **pendiente del usuario (partida real)**.
- [ ] T-12 Revisor fresh-eyes de la fase (C11) + docs finales + tag (C12).
