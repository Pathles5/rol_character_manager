# FichaSS

App web estática (solo front) para que un jugador consulte las fichas de sus personajes de **D&D 5e (2024)** durante la partida: vista raíz con el listado de personajes, ficha completa, filtros por modo con reflujo animado y contadores editables con persistencia local por personaje.

- N personajes servidos como JSON estáticos (`public/characters/*.json`); el nombre del archivo es el id.
- Sin backend, sin recursos externos (fuentes auto-hospedadas), build 100 % estático subible a S3 sin CloudFront.
- Dados custom rápidos: constructor de fórmula en el appbar de ficha y master (botones d4…d100 que alimentan un input editable + notación manual), animación por grupo y regla de percentil 5e 2024 (doble 0 → 100).
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
| `npm run build` | Build de producción: genera el manifest (`prebuild`) → `tsc` + Vite → carpeta `dist/` de estáticos planos |
| `npm run preview` | Sirve `dist/` localmente para comprobar el build |
| `npm run lint` | ESLint (flat config, typescript-eslint) |
| `npm run test` | Tests unitarios (Vitest, dev-only) |
| `npm run check` | Compuerta documental del harness (`scripts/check.ps1`) |

## Desplegar

El build produce `dist/` con rutas **relativas** (`vite.config.ts` → `base: "./"`): sube el contenido de la carpeta a la raíz de un bucket S3 (o cualquier hosting estático) y funciona sin configuración adicional. No hay CDNs, fuentes remotas ni llamadas de red: todo viaja en el bundle.

**Despliegue continuo (AWS + GitHub Actions):** la infra como código vive en [`infra/`](infra/) — plantilla SAM + workflow de Actions con OIDC. La guía de puesta en marcha one-time (crear el stack, configurar los secrets de GitHub y la alerta de facturación $0) está en [`infra/README.md`](infra/README.md).

## Añadir un personaje

1. Crea un JSON que cumpla el modelo de datos (ver [`docs/specs/01-data-model/model.md`](docs/specs/01-data-model/model.md)) con `schemaVersion: 1` y un objeto `identity` completo.
2. Guárdalo como `public/characters/<id>.json`: **el nombre del archivo es el id** (minúsculas, dígitos y guiones, p. ej. `tax-demonion-goblin.json`).
3. Haz push. En el build, `npm run prebuild` (`scripts/generate-manifest.mjs`) valida cada JSON, regenera `public/characters-manifest.json` y un JSON inválido rompe el build con mensaje claro. El personaje aparece en la raíz (`#/`).

## Persistencia

Los contadores de partida (PG, slots, dados, canalizar, inspiración, salvaciones de muerte, condiciones) viven en `localStorage` bajo una clave **por personaje** — `fichass-session-v1:<id>` — y se restauran al recargar esa ficha. El botón **Reset** restaura los valores por defecto y borra la clave del personaje. Las claves de personajes eliminados quedan huérfanas y se ignoran (D-36).

## Estructura

```
index.html               raíz: solo <main id="app"> (el router monta cada vista)
public/
  characters/            un JSON por personaje; nombre de archivo = id
scripts/
  generate-manifest.mjs  genera public/characters-manifest.json en el build (prebuild)
src/
  app.ts                 entrada: host del hash router (#app)
  router.ts              parseHash puro ('#/', '#/c/<id>', not-found)
  views/overview.ts      vista raíz: listado del manifest (loading/empty/error/success)
  views/character.ts     vista detalle: fetch → validate → render → sesión → listeners
  lib/manifest.ts        tipos + validación + fetch del manifest
  types.ts               tipos 1:1 con el modelo de datos (D-16)
  data/blockConfig.ts    matriz de filtros de 13 bloques × 4 modos (fuente única)
  data/skills.ts         catálogo de 18 skills (id/label/ability)
  derived.ts             derivados calculados en cliente (mods, CD, iniciativa…)
  validate.ts            validador cliente espejo del contrato POST /characters (D-17)
  session.ts             sessionState editable + persistencia por personaje + reset
  filters.ts             modos (combate/aventura/descanso/mesa) con reflujo FLIP
  render/                renderers por bloque + orquestador del sheet
  styles/                tokens.css (variables) + base.css (componentes)
  assets/fonts/          Inter auto-hospedada (OFL)
mockup/                  mockup aprobado en Fase 00 (referencia, no es la app)
docs/                    specs por fase, decisiones, tokens congelados, fixture histórico
scripts/check.ps1        compuerta documental del harness
```

## Documentación del proyecto

- **Estado y proceso:** [`docs/specs/INDEX.md`](docs/specs/INDEX.md) (fuente de verdad del progreso) y [`AGENTS.md`](AGENTS.md) (contrato operativo del harness).
- **Modelo de datos y contrato del futuro `POST /characters`:** [`docs/specs/01-data-model/model.md`](docs/specs/01-data-model/model.md).
- **Ingesta de personajes (ficha original → JSON):** [`docs/ingest/PROMPT.md`](docs/ingest/PROMPT.md) — prompt maestro versionado con el procedimiento completo (vía agente, revisión humana obligatoria).
- **Decisiones (log append-only):** [`DECISIONS.md`](DECISIONS.md).
- **Design tokens congelados:** [`docs/design/tokens.md`](docs/design/tokens.md) · **Fuente Inter:** [`docs/design/fonts.md`](docs/design/fonts.md) · **Capturas:** [`docs/design/capturas/`](docs/design/capturas/).
- **Constitución (invariantes):** [`docs/specs/constitution.md`](docs/specs/constitution.md) — incluye el invariante de **coste €0** (I2).
