# Modelo de datos de FichaSS — v1 (D-16) · Contrato del futuro `POST /characters` (D-17)

Estado: aprobado por el usuario (propose·validate, 2026-11-08/09). Referencia vinculante para Fase 02 (scaffold), Fase 03 (datos en código) y Fase 06 (contadores/persistencia).
Prueba de completitud: `docs/data/character-demo.json` (instancia completa del modelo con los números 5e 2024 validados en Fase 00).

## 1. Principio rector: dos documentos raíz

| Documento | Qué es | Dónde vive v1 | Viaja al backend |
|---|---|---|---|
| `character` | La ficha canónica, esencialmente estática durante la sesión | Código/datos de la app | **Sí** (`POST /characters`) |
| `sessionState` | El estado mutable de la sesión (contadores) | `localStorage` (Fase 06) | **No** (endpoint futuro, fuera de v1) |

Lógica: la ficha se consulta; los contadores se tocan. Mezclarlos obligaría a reenviar la ficha para guardar una PG.

## 2. Entidad `character` (schemaVersion: 1)

```jsonc
{
  "schemaVersion": 1,
  "identity": {
    "name": string,            // p.ej. "Seren Aldaard"
    "race": string,            // "humana"
    "class": string,           // "clériga"
    "subclass": string,        // "Vía de la Vida" (tomada a nivel 3 en 2024)
    "level": number,           // 5
    "background": string,      // "Erudito"
    "alignment": string        // "Legal Buena" (libre, display)
  },
  "abilities": {               // puntuaciones crudos; los modificadores son DERIVED
    "strength": number, "dexterity": number, "constitution": number,
    "intelligence": number, "wisdom": number, "charisma": number
  },
  "combat": {
    "armorClass": number,      // STORED: depende de equipo (semiplaca 15 + DEX 1 + escudo 2 = 18)
    "speed": number,           // STORED (ft)
    "maxHitPoints": number,    // STORED (38; el cálculo de creación por clase queda fuera)
    "hitDice": { "die": string, "total": number }   // ("d8", 5)
    // initiativeBonus: DERIVED = modifier(dexterity)
  },
  "defense": {
    "saveProficiencies": AbilityId[]   // ["wisdom","charisma"] (fijas de clérigo 2024)
    // los contadores de salvaciones de muerte viven en sessionState (ver §4)
  },
  "skillProficiencies": SkillId[],   // ids del catálogo estático de la app (18 skills)
  "skillExpertise": SkillId[],       // pericias: a nivel de modelo EXISTE; el demo clérigo no lleva ninguna
  "attacks": Attack[],
  "traits": Trait[],           // rasgos/capacidades; los recursos que gasta enlazan por id con sessionState
  "spells": {
    "castingAbility": AbilityId,           // "wisdom"
    "slotsMax": { "1": number, "2": number, "3": number },   // 4/3/2; los USADOS van en sessionState
    "cantrips": SpellRef[],                // SpellRef sin level
    "prepared": PreparedSpell[]            // free + domain, ver abajo
  },
  "equipment": {
    "equipped": Item[],        // llevado puesto/mano ("semiplaca", "escudo", "maza +1", "símbolo sagrado")
    "inventory": Item[],       // {name, qty, weightLb?} — el PESO vive aquí (bloque Mesa)
    "coins": { "gp": number, "sp": number }
  },
  "proficiencies": {           // catálogo de competencias no de habilidad
    "armor": string[], "weapons": string[], "tools": string[], "languages": string[]
  },
  "role": {                    // bloque Mesa
    "summary": string,         // párrafo de rol
    "tableNotes": string[],    // notas de mesa
    "questions": string[]      // "puntos pendientes" de mesa
  },
  "allies": { "name": string, "relationship": string }[],
  "x_demoNotes": string[]      // prefijo reservada "x-": el schema la ignora; solo fixtures demo
}
```

```jsonc
// sub-objetos
Attack  = { "id": string, "name": string, "bonus"?: number, "damage"?: string,
            "damageType"?: string, "kind": "melee"|"ranged"|"spell", "note"?: string }
// kind "spell": sin bonus/damage almacenados si son DERIVED (ver §3)
Trait   = { "id": string, "name": string, "source": string, "description": string }
Item    = { "name": string, "qty"?: number, "weightLb"?: number }
SpellRef= { "id": string, "name": string, "description"?: string }
PreparedSpell = SpellRef & { "level": 1|2|3, "source": "free"|"domain",
            "concentration"?: boolean, "castTime"?: string }
// Los 6 de dominio (source "domain") NO cuentan contra el límite de 9 (regla 2024)
```

## 3. Política derivados vs almacenados

| Derivado | Cálculo | Dónde se calcula |
|---|---|---|
| modificadores de atributo | `floor((score - 10) / 2)` | cliente, en carga |
| total de salvación | `prof + mod` (`prof = 2 + floor((level-1)/4)`) | cliente |
| total de habilidad | `mod + (expertise ? 2 : proficient ? 1 : 0) * prof` | cliente |
| CD de conjuro | `8 + prof + mod(castingAbility)` (14 en el demo) | cliente |
| ataque de conjuro | `prof + mod(castingAbility)` (+6 en el demo) | cliente |
| iniciativa | `mod(dexterity)` | cliente |
| `preparedCount` | `prepared.filter(source=="free").length` (validado = 9) | cliente |
| iniciales de retrato | primeras letras de `identity.name` | cliente |

Regla del contrato: **nunca se envían derivados** (§5).

## 4. Entidad `sessionState` (schemaVersion: 1, solo cliente)

```jsonc
{
  "schemaVersion": 1,
  "characterId": string,
  "hp": { "current": number, "temp": number },
  "hitDice": { "used": number },                  // vs combat.hitDice.total
  "spellSlotsUsed": { "1": number, "2": number, "3": number },
  "channelDivinity": { "used": number },          // máx 2 (nivel 5, 2024)
  "inspiration": boolean,                         // checkbox (decisión del usuario en Fase 00, D-13/D-14)
  "deathSaves": { "successes": number, "failures": number },
  "conditions": string[],
  "resourcesUsed": { [traitId]: number }          // p.ej. Fortuna del Erudito 0/1
}
```

Reset: el botón de reset (Fase 06) restaura los defaults derivados del `character` y borra la clave de `localStorage`. Migración: `schemaVersion` + tabla forward-only; campos desconocidos se ignoran.

## 5. Contrato del futuro `POST /characters` (D-17) — documentado, NO implementado

- **Request:** `POST /characters`, `Content-Type: application/json`. Body = objeto `character` completo (con `schemaVersion`).
- **Response 201:** `{ "characterId": string, "character": <eco canónico> }`.
- **Errores 400:** `{ "error": "validation_failed", "fields": { "<ruta.campo>": "mensaje" } }`.
- **Rechazos explícitos:** campos derivados o desconocidos (incl. cualquier `x-*` salvo `x_demoNotes` en fixtures), `sessionState`, y campos requeridos vacíos o mal tipados (string vacío, array sin datos, tipo no declarado). El servidor NO calcula derivados: recibe solo almacenados.
- **415** content-type inválido. Autenticación: fuera del alcance v1 (se añadirá antes de desplegar).
- **Qué NO debe enviar el front:** todos los derivados de §3, ningún estado de sesión (§4), ni fechas de sesión ni metadatos de UI.

## 6. Taxonomía de bloques y matriz de filtros (config única)

Los bloques son configuración editada en **un único sitio** (un array en Fase 02/03); el modelo no cambia por UI. Orden = menor `weight` primero; `layout` solo indicaciones de tamaño.

| # | Bloque | combate | aventura | descanso | mesa | layout | weight |
|---|---|---|---|---|---|---|---|
| 1 | `identity` | ✓ (compacto) | ✓ | ✓ (compacto) | ✓ | full/compact | 10 |
| 2 | `combat` | ✓ | ✓ | — | — | full | 15 |
| 3 | `attributes` | — | ✓ | — | ✓ | full | 20 |
| 4 | `defense` (salvaciones + muerte*) | ✓ | ✓ | — | — | full | 25 |
| 5 | `skills` | — | ✓ | — | — | full | 30 |
| 6 | `attacks` | ✓ | ✓ | — | — | full | 35 |
| 7 | `spells` | ✓ | ✓ | **✓** (decisión usuario) | — | full | 40 |
| 8 | `rest` (PG/dados/espacios/canal/condiciones/recursos) | — | — | ✓ | — | full | 45 |
| 9 | `equipment` (+inventario+monedas+peso) | — | ✓ | — | ✓ | full | 50 |
| 10 | `traits` | — | ✓ | — | ✓ | full | 55 |
| 11 | `proficiencies` | — | ✓ | — | ✓ | full | 60 |
| 12 | `role` (rol/notas/dudas) | — | ✓ | — | ✓ (destacado) | full | 65 |
| 13 | `allies` | — | ✓ | — | ✓ | full | 70 |

- `aventura` es el modo por defecto y muestra la **ficha completa** (los 13) — así lo exige el brief; combate/descanso/mesa son recortes con reflujo real.
- `*` salvaciones de muerte: bloque `defense` muestra los contadores de `sessionState`.
- Cierre de deudas de Fase 00: "defensas" = `defense`; `spells` visible también en `descanso`; nombre canónico del modo catch-all = **"mesa"** (congelado, ya usado en el mockup). Si la matriz difiere del mockup archivado, el mockup NO se toca (era provisorio); lo que manda es esta matriz.

## Amendment 1 · 2026-11-19 · `hiddenBlocks` por personaje (D-37)

La matriz §6 sigue siendo el **default** para todos los personajes. Enmienda (con OK del usuario, propose·validate): el `character` acepta un campo opcional **`hiddenBlocks?: BlockId[]`** — ids de bloques que NO se renderizan para ese personaje en NINGÚN modo (default `[]`), p. ej. un no-caster con `"hiddenBlocks": ["spells"]`. Es dato autoriado (viaja en el contrato D-17); el validador acepta solo ids de §6 sin duplicados. La sección oculta sigue siendo requerida en el JSON (la ficha declara sus datos; la vista decide qué mostrar). Motivado por el QA multi-personaje: la guerrera demo no debe ver el bloque Conjuros.

## 7. Mapeo bloques → entidades

`identity`→identity · `combat`→combat · `attributes`→abilities · `defense`→defense+sessionState.deathSaves · `skills`→skillProficiencies/skillExpertise+catálogo · `attacks`→attacks (+DC/ataque de conjuro derivados) · `spells`→spells · `rest`→combat.hitDice+spells.slotsMax+traits(recursos)+sessionState · `traits`→traits (+sessionState.resourcesUsed para sus contadores) · `equipment`→equipment · `proficiencies`→proficiencies · `role`→role · `allies`→allies.

## Amendment 3 · 2026-11-20 · `damage` en conjuros y tirada de acertar (D-46)

Tercera enmienda (propuesta del usuario tras estrenar los dados): **`SpellRef`/`PreparedSpell` aceptan `damage?: string`** — la notación de la tirada principal del conjuro (daño o curación, p. ej. "2d8+3"), validada contra el parser de Fase 11. Los chips de conjuro con `damage` muestran su botón de dado (7 conjuros de Seren). Los ataques ganan además el **botón [d20] de acertar** con la notación `1d20+bonus` del ataque (el natural 20 muestra "¡CRÍTICO!" en el diálogo). La curación usa el mismo diálogo (el jugador sabe si el resultado suma o resta PG).

## Amendment 2 · 2026-11-19 · `trait.uses`: rasgos activables (D-38)

Segunda enmienda (con OK del usuario, propose·validate): `Trait` acepta **`uses?: number`** (usos por descanso, dato autoriado). Un rasgo con `uses` es **activable**: la ficha pinta un contador `0/uses` en la propia línea del rasgo, conectado a `sessionState.resourcesUsed[<trait id>]` (el mecanismo §4 existente — la excepción especial de Fortuna del Erudito se generaliza). El clamp de sesión respeta el `uses` del rasgo mientras el personaje lo conserve. Ejemplos: Furia `uses: 2`, Segundo aliento `uses: 1`, Fortuna `uses: 1`, Afortunado `uses: 2`, Aguante implacable `uses: 1`.

## 8. Traducciones de catálogo

Catálogos estáticos (18 skills, condiciones, atributos) viven en config con `id` inglés + `label` español. Los datos de personaja (nombres) van en español en sus campos `name`/descripciones (es la UI del jugador).
