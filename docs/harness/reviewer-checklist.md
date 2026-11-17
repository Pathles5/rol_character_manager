# Checklist — Subagente revisor fresh-eyes

Contexto que da el orquestador al revisor: ruta de la constitución, ruta de la spec, ruta de la entrega, y qué NO saber (revisor no sabe quién escribió el código ni detalles de la conversación).

El revisor compara la entrega contra `spec.md` y los criterios de aceptación, y devuelve un informe estructurado. Nunca escribe código.

## Procedimiento del revisor

1. Lee `docs/specs/constitution.md` y la spec de la fase.
2. Ejecuta o revisa la salida de las compuertas: `scripts/check.ps1` (y `npm run lint` / `npm run build` si existe proyecto).
3. Recorre el código/entrega y la spec con la checklist de abajo.
4. Informe:

```
## Informe de revisión — Fase NN
Estado: PASS | PASS con observaciones | FAIL

### Criterios de aceptación
- [x/—] C1: <criterio> → <evidencia>
- [–] C2: <criterio> → no verificable porque <motivo>

### Desviaciones
<severidad: crítico/mayor/menor> — <descripción> — <evidencia/archivo>

### Riesgos para fases siguientes
<breve>
```

## Checklist fija

- [ ] Constitución: ningún criterio violado (I1–I7).
- [ ] Cada criterio de aceptación de la spec: verificado o marcado explícitamente como no verificable (nunca silenciado).
- [ ] Alcance: nada implementado fuera del alcance de la fase.
- [ ] Índice (`INDEX.md`): estado coherente con la entrega.
- [ ] `DECISIONS.md`: decisiones nuevas de esta fase registradas con IDs.
- [ ] Español en UI/textos; inglés en código e identificadores.
- [ ] Sin recursos externos (fuentes, imágenes, CDNs).
- [ ] Accesibilidad donde aplique a la fase (teclado, foco, reduced motion).
- [ ] Deuda y deltas documentados como riesgo, no escondidos.
