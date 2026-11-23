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

## Decisiones (validadas con el usuario, 2026-11-23)

1. **EDITABLE** (decisión del usuario): el master puede modificar contadores
   de los jugadores — PG (±1/±10), PG temporales (±1), inspiración
   (toggle) y espacios de conjuro (±1). Muerte saves y condiciones: solo
   lectura en v1 (las gestiona el jugador; las condiciones se muestran).
2. **Sin sobrescribir a ciegas**: como el master y el jugador pueden
   escribir a la vez, las ediciones del master son **deltas** (±N) que se
   aplican sobre el estado remoto FRESCO con reintento: si el PATCH llega
   con versión obsoleta (409), la vista re-lee el estado remoto, aplica el
   MISMO delta encima y re-PATCHea (hasta 3 intentos; si agota, la fila
   marca error y el master reintenta a mano). Así el master nunca pisa un
   cambio concurrente del jugador. Cero cambios de backend (sin modo
   delta en la API — si en el futuro hiciera falta, sería enmienda).
3. **Polling 15 s + refresco manual** (validado): la web es estática;
   realtime fuera de alcance. El polling NO pisa ediciones del master con
   envío pendiente (local-first por personaje).
4. **Grupos y minimización en localStorage del master** (validado): es
   estado de UI del master; cambiar de dispositivo → re-configurar en 10 s.
5. **Todos los personajes del manifest** (validado): sin sesión remota →
   fila "sin sesión iniciada".

## Muerte saves y resto de datos (solo lectura, decisión del usuario)

Cada fila muestra además las **salvaciones de muerte** del jugador
(éxitos/fracasos, p. ej. "✔ 1 · ✖ 2") y las **condiciones activas** —
información clave para el master en el combate; editables solo desde la
ficha del jugador.

## Criterios de aceptación

- **C1**: botón "Vista del Master" en la lista (`#/`) → `#/master`; y
  navegación de vuelta.
- **C2**: una fila por personaje con: nombre/clase/nivel, PG actual/máx,
  PG temp, inspiración (dot), espacios usados/máx (niveles con slotsMax > 0),
  condiciones activas, **salvaciones de muerte (éxitos/fracasos)** y dot de
  sincronización ("visto hace Xs").
- **C3**: los datos provienen de la API remota; personaje sin sesión →
  fila "sin sesión iniciada".
- **C4**: arrastrar filas para formar/renombrar grupos; la composición
  persiste tras recargar (localStorage del master).
- **C5**: minimizar/maximizar cada fila; persiste tras recargar.
- **C6**: refresco manual instantáneo + polling automático cada 15 s
  (sin bloquear la UI; indicación visual de "actualizado hace Xs"). El
  polling no pisa ediciones del master pendientes de envío.
- **C7**: accesibilidad: alternativa de teclado/botones al drag, focus
  visible, roles/labels en las zonas interactivas.
- **C8**: sin cambios de backend/infra/contrato (reutiliza la API de la
  Fase 15); I2 intacto; compuertas lint/test/build/check en verde.
- **C9 (edición)**: los contadores editables (PG ±1/±10, temp ±1,
  inspiración, slots ±1) aplican DELTAS sobre el estado remoto fresco con
  reintento ante 409 (hasta 3) — el master nunca sobrescribe un cambio
  concurrente del jugador; una fila con conflicto agotado queda marcada
  error con reintento manual.

## Fuera de alcance

- Muerte saves y condiciones EDITABLES por el master (solo lectura en v1;
  las gestiona el jugador).
- Realtime push (SSE/WebSocket), iniciativo/orden de turno, fotos de
  retrato, multi-mesa.

## Amendments

### Amendment 1 — Layout del master en la BD de sesión (2026-11-23, QA del usuario)

- **Petición**: el layout del master (grupos, orden de contenedores, minimizados) debe persistir en la BD de sesión (DynamoDB vía la Lambda), "como los daños y demás", no solo en localStorage.
- **Cambio de contrato**: NUEVO registro reservado `characterId = "master-layout"` en la MISMA tabla de sesiones: `GET /session?characterId=master-layout` → `{layout, version}` y `PATCH /session {characterId, layout, baseVersion}` con el mismo optimistic locking (409 + re-base: la última escritura gana entre masters, es estado de UI absoluto). NO es un personaje: el backend ramifica en ese id y nunca aplica el contrato SessionState. Sanitizador compartido `sanitizeMasterLayout` en src/session-schema.ts (única fuente, límites: ≤20 grupos, ≤50 miembros, nombres ≤60 chars).
- **Qué NO cambia**: el contrato de sesiones de jugador (D-55) queda intacto byte a byte; localStorage pasa a ser caché/offline y siembra el registro remoto la primera vez; cero infra nueva (misma tabla, misma Lambda, despliegue por pipeline).
