# Fase 16 — Vista del Master (panel de grupo en tiempo de juego)

## Objetivo

Una nueva vista accesible desde la lista de personajes que muestre al Master
el estado **sincronizado de todos los jugadores de la partida** en una sola
pantalla: PG, PG temporales, inspiración, espacios de conjuro, condiciones y
estado de sincronización de cada personaje — organizado en filas, con
**grupos** formados arrastrando y **minimización** de quien no está en
escena.

## Alcance

- Nueva ruta `#/master` + botón de acceso en la vista de lista (`#/`).
- Una **fila por personaje** (6 fichas del manifest): nombre/clase/nivel,
  PG (actual/máx), PG temporales, inspiración (dot), espacios de conjuro
  usados/máx por nivel (1–3), condiciones activas y dot de sincronización.
- Datos desde la **API de sesión existente** (Fase 15): GET por personaje;
  el estado remoto manda (D-55 #6). Personaje sin sesión remota → fila con
  "sin sesión iniciada" y valores por defecto.
- **Grupos**: el master arrastra filas entre grupos (crear/renombrar
  grupos). Persistencia en **localStorage del dispositivo del master** (es
  estado de UI del master, no dato de jugador → I1 intacta, cero backend).
- **Minimizar/maximizar** filas (fuera de escena → tira compacta) — misma
  persistencia.
- **Refresco**: botón manual + polling ligero (15 s) — la web es estática;
  realtime (SSE/WebSocket) queda fuera.
- **Accesibilidad (I5)**: el arrastre tendrá alternativa de teclado/botones
  ("mover a grupo…") — el drag no puede ser el único camino.

## Decisiones previstas (a validar con el usuario)

1. **Solo lectura** (recomendado): el master OBSERVA pero no edita
   contadores — los jugadores gestionan los suyos y así se evitan
   conflictos 409 en cascada. La edición del master sería una enmienda
   futura (necesitaría su propia resolución de conflicto).
2. **Polling 15 s + refresco manual** (recomendado): simple y estático;
   realtime queda fuera de alcance (backend/infra nueva).
3. **Grupos y minimización en localStorage del master** (recomendado): si
   el master cambia de dispositivo re-configura en 10 segundos; cero
   cambios de contrato/infra.
4. **Todos los personajes del manifest, no solo los "con sesión"** (la
   fila informa del estado).

## Criterios de aceptación

- **C1**: botón "Vista del Master" en la lista (`#/`) → `#/master`; y
  navegación de vuelta.
- **C2**: una fila por personaje con: nombre/clase/nivel, PG actual/máx,
  PG temp, inspiración, espacios usados/máx (niveles con slotsMax > 0),
  condiciones activas y dot de sincronización (estado del sync del
  jugador: desconocido para el master → se muestra "visto hace Xs").
- **C3**: los datos provienen de la API remota; personaje sin sesión →
  fila "sin sesión iniciada".
- **C4**: arrastrar filas para formar/renombrar grupos; la composición
  persiste tras recargar (localStorage del master).
- **C5**: minimizar/maximizar cada fila; persiste tras recargar.
- **C6**: refresco manual instantáneo + polling automático cada 15 s
  (sin bloquear la UI; indicación visual de "actualizado hace Xs").
- **C7**: accesibilidad: alternativa de teclado/botones al drag, focus
  visible, roles/labels en las zonas interactivas.
- **C8**: sin cambios de backend/infra/contrato (reutiliza la API de la
  Fase 15); I2 intacto; compuertas lint/test/build/check en verde.

## Fuera de alcance

- Edición de contadores por el master (enmienda futura si se pide).
- Realtime push (SSE/WebSocket), iniciativo/orden de turno, fotos de
  retrato, multi-mesa.
