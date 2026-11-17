# Spec — Fase 01: Modelo de datos

Fase: 01 · Estado: decided · Compuerta: modelo y contrato en verde de revisor + `check.ps1`

## Objetivo

Definir y congelar el modelo de datos de FichaSS: entidades y campos, derivados vs almacenados, metadatos de filtro por bloque, versionado, y el contrato JSON del futuro `POST /characters`. Documentado como referencia vinculante para el scaffold (Fase 02) y los datos en código (Fase 03). **No se implementa backend ni UI.**

## Alcance

- `docs/specs/01-data-model/model.md`: entidades, campos con tipos, política de derivados vs almacenados, taxonomía de bloques con matriz de filtros (modi Combate/Aventura/Descanso/Mesa), `layout` por modo, versionado y migración.
- Contrato del futuro `POST /characters`: forma del body, respuesta, errores, qué NO debe enviar el front (derivados), relación con `sessionState` (contadores cliente, fuera del contrato en v1).
- Fixture de prueba: `docs/data/character-demo.json` (Seren Aldaard con los números validados por el explorador en Fase 00) — instancia completa del modelo, sirve como prueba de que el modelo cubre todos los bloques.
- Decisiones D-16 (modelo) y D-17 (contrato) en `DECISIONS.md`.

## Fuera de alcance

- Backend, tipos TS en código (eso es Fase 02/03), UI, animación, persistencia `localStorage` (Fase 06).
- Cambios de los tokens de diseño (frozen en D-14).

## Deuda heredada que esta fase cierra (de la spec de Fase 00)

- 6 competencias del demo: se formaliza la política (competencia/clase + trasfondo; licencia demo explícita) o se recorta el demo.
- Mapeo de "defensas" (C4): bloque `defense` (salvaciones + salvaciones de muerte) vs los bloques del mockup.
- Visibilidad de `b-spells` en modo descanso: la matriz de filtros la decide aquí y el mockup se ajusta en Fase 02/03 si difiere.
- Nombre canónico del 4.º modo catch-all ("Mesa", usado en el mockup): se congela aquí.

## Criterios de aceptación (verificables)

- C1: `model.md` define TODAS las entidades necesarias para los 13 bloques del mockup (identity, attributes, combat, defense, skills, attacks, traits, spells, equipment, proficiencies, role, allies, rest) sin campos huérfanos: cada campo aparece en alguna entidad y cada bloque del mockup tiene entidad contenedora.
- C2: cada campo clasifica explícitamente como `stored` o `derived`, con el cálculo documentado para cada `derived`.
- C3: matriz de filtros completa: los 13 bloques × 4 modos, con valores booleanos concretos y `layout` cuando corresponda; incluye la decisión de `spells` en `descanso` y del 4.º modo catch-all.
- C4: el contrato `POST /characters` declara: campos del body, respuesta esperada, errores con formatos, lista explícita de campos derivados que el front NO debe enviar.
- C5: `character-demo.json` parsea como JSON válido (comprobado por script) y sus valores coinciden con la validación 5e 2024 de Fase 00 (AC 18 semiplaca, HP 38, slots 4/3/2, preparados 9+6, channel 2, cantrips 4, INT 8/−1, Religión +2 comp.).
- C6: revisor fresh-eyes evalúa model/contract/fixture contra estos criterios y veredicto PASS o PASS con remarks resueltas.
- C7: `check.ps1` PASS y entradas D-16/D-17 en `DECISIONS.md`.

## Riesgos / deviations

- (abierta; aquí se registran bloqueos y desviaciones aceptadas)
- mojibake del fixture (2026-11-09): la escritura inicial de `character-demo.json` corrompió varios textos (cantrips, inventario, `role`); limpiado por el orquestador sin bucles de subagentes. Verificación mecánica de parseo (ConvertFrom-Json) y números (C5) en verde.
- excepción documentada (D-15, vigente): cierre documental (tasks/INDEX/spec) ejecutado por el orquestador.
- cierre (2026-11-09): revisor fresh-eyes = **PASS with remarks** (0 majors): minors §7 sin fila `traits`, sincronía spec/INDEX, cabecera de spec y parseo no re-verificado por el revisor — todos resueltos: fila `traits` añadida al §7, frase ambigua de rechazos precisada en §5, estados alineados a `verified`; el parseo lo ejecutó y evidenció el orquestador en T-04.
