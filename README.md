# FichaSS

App web estática (solo front, v1) para que un jugador consulte la ficha de su personaje de **D&D 5e (2024)** durante la partida: ficha completa, filtros por modo con reflujo animado y contadores editables con persistencia local.

- Un personaje (demo: Seren Aldaard, clériga de la Vía de la Vida, nivel 5).
- Sin backend, sin recursos externos (fuentes auto-hospedadas), build 100 % estático subible a S3 sin CloudFront.
- UI en español; código e identificadores en inglés.

## Requisitos

- **Node.js 18+** (desarrollado con Node 22 y npm 10).

## Levantar la app

```bash
npm install        # primera vez (solo devDependencies, coste 0)
npm run dev        # servidor de desarrollo → http://localhost:5173
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite, hot reload) |
| `npm run build` | Build de producción: `tsc` + Vite → carpeta `dist/` de estáticos planos |
| `npm run preview` | Sirve `dist/` localmente para comprobar el build |
| `npm run lint` | ESLint (flat config, typescript-eslint) |
| `npm run test` | Tests unitarios (Vitest, dev-only) |
| `npm run check` | Compuerta documental del harness (`scripts/check.ps1`) |

## Desplegar

El build produce `dist/` con rutas **relativas** (`vite.config.ts` → `base: "./"`): sube el contenido de la carpeta a la raíz de un bucket S3 (o cualquier hosting estático) y funciona sin configuración adicional. No hay CDNs, fuentes remotas ni llamadas de red: todo viaja en el bundle.

## Persistencia

Los contadores de partida (PG, slots, dados, canalizar, inspiración, salvaciones de muerte, condiciones) viven en `localStorage` bajo la clave `fichass-session-v1` y se restauran al recargar. El botón **Reset** restaura los valores por defecto y borra la clave.

## Estructura

```
index.html               raíz (appbar + contenedor de la ficha)
src/
  main.ts                orquesta: render inicial, session, filtros, hoja de detalle
  types.ts               tipos 1:1 con el modelo de datos (D-16)
  data/character.ts      personaje demo (transcripción del fixture)
  data/blockConfig.ts    matriz de filtros de 13 bloques × 4 modos (fuente única)
  data/skills.ts         catálogo de 18 skills (id/label/ability)
  derived.ts             derivados calculados en cliente (mods, CD, iniciativa…)
  validate.ts            validador cliente espejo del contrato POST /characters (D-17)
  session.ts             sessionState editable + persistencia + reset
  filters.ts             modos (combate/aventura/descanso/mesa) con reflujo FLIP
  render/                renderers por bloque + orquestador del sheet
  styles/                tokens.css (variables) + base.css (componentes)
  assets/fonts/          Inter auto-hospedada (OFL)
mockup/                  mockup aprobado en Fase 00 (referencia, no es la app)
docs/                    specs por fase, decisiones, tokens congelados, fixture
scripts/check.ps1        compuerta documental del harness
```

## Documentación del proyecto

- **Estado y proceso:** [`docs/specs/INDEX.md`](docs/specs/INDEX.md) (fuente de verdad del progreso) y [`AGENTS.md`](AGENTS.md) (contrato operativo del harness).
- **Modelo de datos y contrato del futuro `POST /characters`:** [`docs/specs/01-data-model/model.md`](docs/specs/01-data-model/model.md).
- **Decisiones (log append-only):** [`DECISIONS.md`](DECISIONS.md).
- **Design tokens congelados:** [`docs/design/tokens.md`](docs/design/tokens.md) · **Fuente Inter:** [`docs/design/fonts.md`](docs/design/fonts.md) · **Capturas:** [`docs/design/capturas/`](docs/design/capturas/).
- **Constitución (invariantes):** [`docs/specs/constitution.md`](docs/specs/constitution.md) — incluye el invariante de **coste €0** (I2).
