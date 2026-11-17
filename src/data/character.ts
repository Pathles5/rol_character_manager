/* ============================================================
   FichaSS — demo character module (D-21).
   Typed conversion, done by hand, of docs/data/character-demo.json
   (Seren Aldaard). The JSON is the single origin of truth; ANY
   value change must happen there first, this module follows.
   Sync is verified at the phase gate (spec C2).
   ============================================================ */

import type { Character } from '../types';

export const demoCharacter: Character = {
  schemaVersion: 1,
  identity: {
    name: 'Seren Aldaard',
    race: 'humana',
    class: 'clériga',
    subclass: 'Vía de la Vida',
    level: 5,
    background: 'Erudito',
    alignment: 'Legal Buena',
  },
  abilities: {
    strength: 10,
    dexterity: 12,
    constitution: 14,
    intelligence: 8,
    wisdom: 16,
    charisma: 10,
  },
  combat: {
    armorClass: 18,
    speed: 30,
    maxHitPoints: 38,
    hitDice: { die: 'd8', total: 5 },
  },
  defense: {
    saveProficiencies: ['wisdom', 'charisma'],
  },
  skillProficiencies: [
    'medicina',
    'perspicacia',
    'religion',
    'persuasion',
    'arcanos',
    'historia',
  ],
  skillExpertise: [],
  attacks: [
    {
      id: 'maza-plus-1',
      name: 'Maza +1',
      kind: 'melee',
      bonus: 4,
      damage: '1d6+1',
      damageType: 'contundente',
      note: 'arma mágica (+1)',
    },
    {
      id: 'llama-sagrada',
      name: 'Llama sagrada',
      kind: 'spell',
      damage: '2d8',
      damageType: 'radiante',
      note: 'truco · salvación de DES (CD 14, derivada)',
    },
  ],
  traits: [
    {
      id: 'discipulo-de-la-vida',
      name: 'Discípulo de la Vida',
      source: 'Vía de la Vida (nivel 3)',
      description:
        'Las curaciones de conjuros de la lista de clérigo aumentan +2 + (nivel del espacio).',
    },
    {
      id: 'preservar-la-vida',
      name: 'Preservar la Vida (Canalizar Divinidad)',
      source: 'Vía de la Vida',
      description:
        'Reparte 25 PV (5 × nivel) entre criaturas reducidas a la mitad de sus PG (bloodied) a 30 ft; sin superar ½ PG máx. por criatura.',
    },
    {
      id: 'fortuna-del-erudito',
      name: 'Fortuna del Erudito',
      source: 'Erudito (trasfondo)',
      description: '1 × día, repite una tirada fallida de Historia o Religión.',
    },
  ],
  spells: {
    castingAbility: 'wisdom',
    slotsMax: { 1: 4, 2: 3, 3: 2 },
    cantrips: [
      {
        id: 'llama-sagrada',
        name: 'Llama sagrada',
        description: '2d8 radiante; la criatura hace una salvación de DES',
      },
      {
        id: 'guia',
        name: 'Guía',
        description: '+1d4 a la próxima tirada de habilidad del receptor (1 min)',
      },
      {
        id: 'taumaturgia',
        name: 'Taumaturgia',
        description: 'manifestación menor 1 min',
      },
      {
        id: 'resistencia',
        name: 'Resistencia',
        description: '+1d4 a una tirada de salvación',
      },
    ],
    prepared: [
      {
        id: 'bendicion',
        name: 'Bendición',
        level: 1,
        source: 'domain',
        concentration: true,
        castTime: 'acción',
        description: '3 criaturas, +1d4 a ataque y salvación, con duración 1 min',
      },
      {
        id: 'curar-heridas',
        name: 'Curar heridas',
        level: 1,
        source: 'domain',
        castTime: 'acción',
        description: '2d8+3 PG · +2d8 por nivel de espacio superior',
      },
      {
        id: 'palabra-de-curacion-masiva',
        name: 'Palabra de curación masiva',
        level: 1,
        source: 'domain',
        castTime: 'acción adicional',
        description: '2d4+3 PG a distancia (60 ft)',
      },
      {
        id: 'ayuda',
        name: 'Ayuda',
        level: 2,
        source: 'domain',
        castTime: 'acción',
        description: '+5 PG máximos y actuales por criatura (8 h)',
      },
      {
        id: 'restauracion-menor',
        name: 'Restauración menor',
        level: 2,
        source: 'domain',
        castTime: 'acción adicional',
        description: 'termina una condición',
      },
      {
        id: 'revivir',
        name: 'Revivir',
        level: 3,
        source: 'domain',
        castTime: '1 hora',
        description:
          'devuelve la vida a una criatura muerta recientemente (1 min–1 día), 300 GP de coste',
      },
      {
        id: 'palabra-de-curacion',
        name: 'Palabra de curación',
        level: 1,
        source: 'free',
        castTime: 'acción adicional',
        description: '2d4+3 PG a 60 ft',
      },
      {
        id: 'rayo-guia',
        name: 'Rayo guía',
        level: 1,
        source: 'free',
        castTime: 'acción',
        description: '4d6 radiante, ataque de conjuro +6',
      },
      {
        id: 'comando',
        name: 'Comando',
        level: 1,
        source: 'free',
        castTime: 'acción',
        description: 'una palabra de una sílaba que obliga a cumplir',
      },
      {
        id: 'escudo-de-la-fe',
        name: 'Escudo de la fe',
        level: 1,
        source: 'free',
        concentration: true,
        castTime: 'acción adicional',
        description: '+2 a la CA durante 1 min, 10 min a nivel superior',
      },
      {
        id: 'oracion-de-curacion',
        name: 'Oración de curación',
        level: 2,
        source: 'free',
        castTime: '10 min',
        description: '2d8+3 a hasta 6 criaturas en radio 30 ft',
      },
      {
        id: 'arma-espiritual',
        name: 'Arma espiritual',
        level: 2,
        source: 'free',
        concentration: true,
        castTime: 'acción adicional',
        description: 'arma espectral 1d8+3 de fuerza; Concentración (2024)',
      },
      {
        id: 'potenciar-habilidad',
        name: 'Potenciar habilidad',
        level: 2,
        source: 'free',
        concentration: true,
        castTime: 'acción',
        description: 'ventaja en tiradas con una habilidad (duración en revisión en la demo)',
      },
      {
        id: 'espirito-guardian',
        name: 'Espíritu guardián',
        level: 3,
        source: 'free',
        concentration: true,
        castTime: 'acción',
        description: '2d8 de daño de mitad planar +3 curación propia, radio 15 ft',
      },
      {
        id: 'proteccion-contra-energia',
        name: 'Protección contra energía',
        level: 3,
        source: 'free',
        concentration: true,
        castTime: 'acción',
        description: 'resistencia a ácido/crío/fuego/rayo/trueno, 1 h',
      },
    ],
  },
  equipment: {
    equipped: [
      { name: 'semiplaca', qty: 1, weightLb: 40 },
      { name: 'escudo', qty: 1, weightLb: 6 },
      { name: 'maza +1', qty: 1, weightLb: 4 },
      { name: 'símbolo sagrado', qty: 1, weightLb: 1 },
    ],
    inventory: [
      { name: 'kit de viajero', qty: 1, weightLb: 10 },
      { name: 'cuerda de cáñamo (50 ft)', qty: 1, weightLb: 10 },
      { name: 'botas de viajero', qty: 1, weightLb: 1 },
    ],
    coins: { gp: 34, sp: 12 },
  },
  proficiencies: {
    armor: ['ligeras', 'medias', 'escudos'],
    weapons: ['armas sencillas'],
    tools: ['kit de herborista'],
    languages: ['común', 'celestial'],
  },
  role: {
    summary:
      'Protectora y médica del grupo: mantener a la party en pie y al templo de la orden contento.',
    tableNotes: [
      'Debo al gremio de curanderos 14 GP por unos paquetes de hierbas.',
      'La reliquia del templo se entrega tras el último ritual del mes.',
      'No mencionar a Irad ante el supervisor del gremio: Cordelia revisa cada candidatura.',
    ],
    questions: [
      '¿Por qué los espíritus huyen de la lámina de bronce del sepulturero?',
      '¿Habla celestial el guardián del portal? Miris sugiere comprobarlo con un círculo de cuerda.',
    ],
  },
  allies: [
    { name: 'Dahna Voreio', relationship: 'compañera de grupo, guerrera' },
    { name: 'Moss Ferrow', relationship: 'compañero de grupo, pícaro' },
  ],
  x_demoNotes: [
    'Licencias del demo (recogidas de Fase 00): Religión y Persuasión como competencias adicionales con OK del explorador (en un personaje 2024 real serían 2 de clase [Medicina+Perspicacia] + 2 de trasfondo [Arcanos+Historia]); peso de objetos aproximado y decorativo.',
    'Las descripciones de conjuros son resúmenes de mesa, no texto legal completo; algunos valores (duraciones concretas de Ayuda/Potenciar habilidad) quedan para la edición de ficha fuera de la v1.',
  ],
};
