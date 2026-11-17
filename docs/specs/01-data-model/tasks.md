# Tasks — Fase 01 Modelo de datos

Estado de fase: decided (espejo del INDEX.md)

| ID | Tarea | Estado | Responsable | Solución validada | Evidencia |
|---|---|---|---|---|---|
| T-01 | Diseño del modelo propuesto al usuario (propose·validate D-07): entidades, derivados vs almacenados, matriz de filtros, versionado, contrato POST y separación character/sessionState | done | orquestador | OK usuario 2026-11-09 (1–6 + spells en descanso + modo "mesa") | respuestas del usuario: aprueba modelo · spells ✓ en descanso · congelar "Mesa" (D-16) |
| T-02 | Escribir `docs/specs/01-data-model/model.md` completo según la solución validada en T-01 | done | orquestador | OK usuario 2026-11-09 | `model.md` §1–§5 (entidades, derivados §3, sessionState §4, limpieza de erratas) |
| T-03 | Escribir el contrato JSON del `POST /characters` (dentro de model.md) | done | orquestador | OK usuario 2026-11-09 | `model.md` §5 (D-17) |
| T-04 | Fixture `docs/data/character-demo.json` (Seren Aldaard validado) + verificación de parseo y números | done | orquestador | OK usuario 2026-11-09 (modelo aprobado) | JSON parsea (ConvertFrom-Json); AC 18 · HP 38 · slots 4/3/2 · 4 cantrips · 9 free + 6 domain · INT 8 · salv. WIS/CHA; limpieza de mojibake en textos (cantrips, inventario, role) |
| T-05 | Registrar D-16 (modelo) y D-17 (contrato) en `DECISIONS.md`; revisor fresh-eyes contra C1–C7; `check.ps1` PASS; INDEX a `verified` | done | orquestador + revisor | — | D-16/D-17 en DECISIONS.md; check PASS; revisor fresh-eyes PASS with remarks (resueltas por orquestador, presupuesto de bucles libre) |
