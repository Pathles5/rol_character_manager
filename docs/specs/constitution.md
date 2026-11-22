# Constitución — FichaSS

Inmutables del proyecto. Ninguna spec ni implementación puede contradecir esto.
Si hay conflicto entre una spec y la constitución, gana la constitución y la spec se reescribe.

## I1. Alcance
- Solo D&D 5e (2024). Un jugador, sus personajes (múltiples, vía JSON autoriado), navegación entre vista de personajes y vista de ficha.
- Sí hay (desde la Fase 10/11, petición expresa del usuario): selector de personajes y tirada de dados.
- Sí hay (desde la Fase 15, petición expresa del usuario): backend mínimo de sesión — persistencia de estados en DynamoDB vía Lambda — invariablemente sujeto al invariante I2 (coste €0) y limitado a estados de sesión (no hay edición de ficha ni almacenamiento de personajes personales ahí).
- Sigue sin haber: edición completa de ficha, PDF, PWA, i18n, tema claro.

## I2. Build y despliegue
- Build 100 % estático, subible a S3 sin servidor.
- Sin recursos externos: sin fuentes remotas, sin imágenes remotas, sin CDNs.
- Compatible con infraestructura futura: AWS, Node/JS backend, DynamoDB on-demand, CloudFormation, GitHub Actions.
- **Coste €0 (inmutable, decisión D-11):** la infraestructura AWS, el CI/CD y el repositorio **no pueden incurrir en ningún gasto, nunca**. Solo servicios en Free Tier de AWS (S3, DynamoDB on-demand dentro de su cuota gratuita, CloudFormation que no factura por plantillas, sin CloudFront); GitHub Actions solo con repositorio público (minutos ilimitados gratis) o dentro de la cuota gratuita; alerta de facturación en $0 habilitada desde el primer despliegue; sin servicios de pago, sin reservas, sin dominios gestionados por la infra (el dominio, si algún día existe, sería gasto opcional del usuario fuera de este proyecto). Cualquier excepción de coste exige aprobación explícita del usuario y registro en `DECISIONS.md`.

## I3. Contrato
- El modelo de datos de la Fase 1 es el contrato del futuro `POST /characters`. Cambiarlo exige registrar el cambio y su motivo en `DECISIONS.md`.

## I4. Producto
- Los filtros deben producir reflujo animado real, no ocultar/mostrar en seco.
- Cada bloque lleva metadatos de filtro (booleano por modo, mínimo) editables en un único sitio.
- UI en español; código e identificadores en inglés.
- Solo lectura en la ficha salvo contadores (que persisten en `localStorage`).

## I5. Accesibilidad
- Teclado, foco visible, focus trap en diálogos, `prefers-reduced-motion`, contraste suficiente.

## I6. Proceso (SDD + AI Harness)
- **Spec-first:** no se implementa nada sin spec previa en `docs/specs/NN-<nombre>/spec.md` que incluya criterios de aceptación verificables.
- **Verify-after:** toda fase termina con las compuertas de verificación en verde (`scripts/check.ps1`; desde Fase 2 también `npm run lint` y `npm run build`).
- **Revisor fresh-eyes:** al cierre de cada fase un subagente revisor evalúa la entrega contra los criterios de la spec.
- **Decisions:** toda decisión de diseño/arquitectura queda escrita en `DECISIONS.md` (append-only, con IDs) con opciones, elección, motivo y riesgo.
- Si una preferencia del brief original resulta cuestionable, se puede cambiar: se documenta el cambio y por qué.
- **Enmiendas:** esta constitución solo se modifica con aprobación explícita del usuario; toda enmienda se registra en `DECISIONS.md`.

## I7. Verificación
- Mínimo: `npm run lint` y `npm run build` en cada compuerta de fase.
- Tests: solo los que aporten valor real y se decidan en la spec de la fase (derivados, matriz de filtros, migración de persistencia). No tests cosméticos ni de captura.

## Guía de decisiones rápidas
| Pregunta | Respuesta canónica |
|---|---|
| ¿Puedo añadir una dependencia? | Sí, si no rompe I2 y queda anotada en `DECISIONS.md`. |
| ¿Puedo añadir un campo al modelo? | Sí, en la Fase 1 o como spec de parche; sin inflar. |
| ¿Puedo saltarme una compuerta? | No. |
