import type { BiomeType } from '../enums';

// ---------------------------------------------------------------------------
// Encounter Template System
// ---------------------------------------------------------------------------
// Defines multi-monster encounter compositions grouped by family.
// Each template specifies which monsters appear together, how their stats
// scale, and in which biomes / level ranges the encounter can trigger.
// ---------------------------------------------------------------------------

export interface EncounterComposition {
  monsterName: string;
  count: number;
  statScale?: number; // 0.6-1.0 multiplier for minion variants (default 1.0)
}

export interface EncounterTemplate {
  id: string;
  name: string;
  family: string;
  familyTags: string[];
  biomes: BiomeType[];
  levelRange: { min: number; max: number };
  composition: EncounterComposition[];
  weight: number;
  soloAppropriate: boolean;
  description: string;
}

export const ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  // ==========================================================================
  // Family 1: Wolves (FOREST, TUNDRA)
  // ==========================================================================
  {
    id: 'wolf-lone-pup',
    name: 'Lone Wolf Pup',
    family: 'wolves',
    familyTags: ['wolves'],
    biomes: ['FOREST', 'TUNDRA'] as BiomeType[],
    levelRange: { min: 1, max: 2 },
    composition: [{ monsterName: 'Timber Wolf Pup', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A young wolf snarls at you from the undergrowth.',
  },
  {
    id: 'wolf-lone',
    name: 'Lone Wolf',
    family: 'wolves',
    familyTags: ['wolves'],
    biomes: ['FOREST'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Wolf', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A wolf emerges from the trees, hackles raised.',
  },
  {
    id: 'wolf-pair',
    name: 'Wolf Pair',
    family: 'wolves',
    familyTags: ['wolves'],
    biomes: ['FOREST', 'TUNDRA'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Wolf', count: 2, statScale: 0.7 }],
    weight: 6,
    soloAppropriate: true,
    description: 'Two wolves circle you, working in tandem.',
  },
  {
    id: 'wolf-pack-alpha',
    name: 'Pack with Alpha',
    family: 'wolves',
    familyTags: ['wolves'],
    biomes: ['FOREST', 'TUNDRA'] as BiomeType[],
    levelRange: { min: 4, max: 7 },
    composition: [
      { monsterName: 'Wolf', count: 2, statScale: 0.65 },
      { monsterName: 'Alpha Wolf', count: 1 },
    ],
    weight: 3,
    soloAppropriate: false,
    description: 'A wolf pack surrounds you, led by a massive alpha.',
  },

  // ==========================================================================
  // Family 2: Goblins (HILLS, BADLANDS)
  // ==========================================================================
  {
    id: 'goblin-scout',
    name: 'Lone Scout',
    family: 'goblins',
    familyTags: ['goblins'],
    biomes: ['HILLS', 'BADLANDS'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Goblin', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A goblin scout darts from the bushes!',
  },
  {
    id: 'goblin-archer',
    name: 'Goblin Lookout',
    family: 'goblins',
    familyTags: ['goblins'],
    biomes: ['HILLS', 'BADLANDS'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Goblin Archer', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'A goblin archer nocks an arrow from behind a rock.',
  },
  {
    id: 'goblin-raid',
    name: 'Raiding Party',
    family: 'goblins',
    familyTags: ['goblins'],
    biomes: ['HILLS', 'BADLANDS'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [
      { monsterName: 'Goblin', count: 2, statScale: 0.7 },
      { monsterName: 'Goblin Archer', count: 1 },
    ],
    weight: 4,
    soloAppropriate: false,
    description: 'A goblin raiding party blocks the road!',
  },
  {
    id: 'goblin-warband',
    name: 'Warband',
    family: 'goblins',
    familyTags: ['goblins', 'beasts'],
    biomes: ['HILLS', 'BADLANDS'] as BiomeType[],
    levelRange: { min: 4, max: 6 },
    composition: [
      { monsterName: 'Goblin', count: 2, statScale: 0.65 },
      { monsterName: 'Goblin Shaman', count: 1 },
      { monsterName: 'Worg', count: 1 },
    ],
    weight: 2,
    soloAppropriate: false,
    description: 'A goblin warband with a shaman and worg mount charges!',
  },

  // ==========================================================================
  // Family 3: Bandits (PLAINS, FOREST)
  // ==========================================================================
  {
    id: 'bandit-lone',
    name: 'Lone Highwayman',
    family: 'bandits',
    familyTags: ['bandits'],
    biomes: ['PLAINS', 'FOREST'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Bandit', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A hooded figure steps from the treeline, blade drawn.',
  },
  {
    id: 'bandit-ambush',
    name: 'Ambush',
    family: 'bandits',
    familyTags: ['bandits'],
    biomes: ['PLAINS', 'FOREST'] as BiomeType[],
    levelRange: { min: 4, max: 6 },
    composition: [
      { monsterName: 'Bandit', count: 1 },
      { monsterName: 'Bandit Marksman', count: 1 },
    ],
    weight: 5,
    soloAppropriate: false,
    description: 'Bandits spring an ambush from both sides of the road!',
  },
  {
    id: 'bandit-gang',
    name: 'Gang',
    family: 'bandits',
    familyTags: ['bandits'],
    biomes: ['PLAINS', 'FOREST'] as BiomeType[],
    levelRange: { min: 5, max: 8 },
    composition: [
      { monsterName: 'Bandit', count: 2, statScale: 0.7 },
      { monsterName: 'Bandit Captain', count: 1 },
    ],
    weight: 3,
    soloAppropriate: false,
    description: 'A bandit gang led by a scarred captain demands your gold.',
  },

  // ==========================================================================
  // Family 4: Undead (SWAMP, UNDERGROUND)
  // ==========================================================================
  {
    id: 'undead-shambler',
    name: 'Shambler',
    family: 'undead',
    familyTags: ['undead'],
    biomes: ['SWAMP'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Shambling Corpse', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A rotting corpse lurches toward you, groaning.',
  },
  {
    id: 'undead-bones',
    name: 'Bone Patrol',
    family: 'undead',
    familyTags: ['undead'],
    biomes: ['SWAMP', 'UNDERGROUND'] as BiomeType[],
    levelRange: { min: 4, max: 6 },
    composition: [
      { monsterName: 'Skeleton Warrior', count: 1 },
      { monsterName: 'Ghoul Stalker', count: 1 },
    ],
    weight: 5,
    soloAppropriate: false,
    description: 'Undead sentinels guard this stretch of road.',
  },
  {
    id: 'undead-pack',
    name: 'Ghoul Pack',
    family: 'undead',
    familyTags: ['undead'],
    biomes: ['UNDERGROUND'] as BiomeType[],
    levelRange: { min: 5, max: 7 },
    composition: [
      { monsterName: 'Ghoul Stalker', count: 2, statScale: 0.7 },
      { monsterName: 'Ghoul Pack Leader', count: 1 },
    ],
    weight: 3,
    soloAppropriate: false,
    description: 'Ghouls surge from the darkness, led by a hulking pack leader.',
  },

  // ==========================================================================
  // Family 5: Beasts (FOREST, PLAINS, SWAMP)
  // ==========================================================================
  {
    id: 'beast-boar',
    name: 'Wild Boar',
    family: 'beasts',
    familyTags: ['beasts'],
    biomes: ['FOREST', 'PLAINS'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Wild Boar', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A wild boar snorts and charges from the brush!',
  },
  {
    id: 'beast-rat',
    name: 'Marsh Rat',
    family: 'beasts',
    familyTags: ['beasts'],
    biomes: ['SWAMP'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Marsh Rat', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A bloated rat hisses at you from the reeds.',
  },
  {
    id: 'beast-stalker',
    name: 'Prairie Stalker',
    family: 'beasts',
    familyTags: ['beasts'],
    biomes: ['PLAINS'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Prairie Stalker', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'A sleek predator has been tracking your movement.',
  },

  // ==========================================================================
  // Family 6: Elementals (MOUNTAIN, VOLCANIC, TUNDRA, COASTAL)
  // ==========================================================================
  {
    id: 'elem-dust',
    name: 'Dust Sprite',
    family: 'elementals',
    familyTags: ['elementals'],
    biomes: ['MOUNTAIN'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Dust Sprite', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A whirling mote of dust and stone buzzes toward you.',
  },
  {
    id: 'elem-cinder',
    name: 'Cinder Wisp',
    family: 'elementals',
    familyTags: ['elementals'],
    biomes: ['VOLCANIC'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Cinder Wisp', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A flickering ember detaches from a lava flow and darts at you.',
  },
  {
    id: 'elem-frost',
    name: 'Frost Sprite',
    family: 'elementals',
    familyTags: ['elementals'],
    biomes: ['TUNDRA'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Frost Sprite', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A shard of living ice spins through the frigid air.',
  },
  {
    id: 'elem-spray',
    name: 'Sea Spray',
    family: 'elementals',
    familyTags: ['elementals'],
    biomes: ['COASTAL'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Sea Spray', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'Salt water coalesces into a hostile shape along the shore.',
  },
  {
    id: 'elem-storm',
    name: 'Elemental Pair',
    family: 'elementals',
    familyTags: ['elementals'],
    biomes: ['MOUNTAIN', 'COASTAL'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [
      { monsterName: 'Frost Mote', count: 1 },
      { monsterName: 'Dust Sprite', count: 1, statScale: 0.7 },
    ],
    weight: 4,
    soloAppropriate: false,
    description: 'Elemental fragments swirl in hostile formation.',
  },

  // ==========================================================================
  // Family 7: Fey (FEYWILD, FOREST)
  // ==========================================================================
  {
    id: 'fey-pixie',
    name: 'Pixie Trickster',
    family: 'fey',
    familyTags: ['fey'],
    biomes: ['FEYWILD', 'FOREST'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Pixie Trickster', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A giggling pixie appears in a burst of glitter.',
  },
  {
    id: 'fey-satyr',
    name: 'Satyr Prankster',
    family: 'fey',
    familyTags: ['fey'],
    biomes: ['FEYWILD', 'FOREST'] as BiomeType[],
    levelRange: { min: 4, max: 6 },
    composition: [{ monsterName: 'Satyr Prankster', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'A satyr blocks the path, playing a discordant tune.',
  },
  {
    id: 'fey-court',
    name: 'Fey Court',
    family: 'fey',
    familyTags: ['fey'],
    biomes: ['FEYWILD'] as BiomeType[],
    levelRange: { min: 4, max: 7 },
    composition: [
      { monsterName: 'Pixie Trickster', count: 1 },
      { monsterName: 'Glimmerfae', count: 1 },
      { monsterName: 'Satyr Prankster', count: 1 },
    ],
    weight: 2,
    soloAppropriate: false,
    description: 'A fey court has gathered on the path, mischief in their eyes.',
  },

  // ==========================================================================
  // Family 8: Desert (DESERT, BADLANDS)
  // ==========================================================================
  {
    id: 'desert-beetle',
    name: 'Sand Beetle',
    family: 'desert',
    familyTags: ['insects'],
    biomes: ['BADLANDS', 'DESERT'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'Sand Beetle', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A large beetle scuttles from beneath the sand.',
  },
  {
    id: 'desert-swarm',
    name: 'Scorpion Swarm',
    family: 'desert',
    familyTags: ['insects'],
    biomes: ['DESERT'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Scorpion Swarm', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'Scorpions pour from a crack in the rock.',
  },
  {
    id: 'desert-lurker',
    name: 'Sand Lurker',
    family: 'desert',
    familyTags: ['reptiles'],
    biomes: ['DESERT'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Sand Lurker', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'Something shifts beneath the sand ahead of you.',
  },
  {
    id: 'desert-pack',
    name: 'Desert Ambush',
    family: 'desert',
    familyTags: ['reptiles'],
    biomes: ['DESERT', 'BADLANDS'] as BiomeType[],
    levelRange: { min: 3, max: 6 },
    composition: [
      { monsterName: 'Sand Lurker', count: 1 },
      { monsterName: 'Sand Viper', count: 1 },
    ],
    weight: 4,
    soloAppropriate: false,
    description: 'Reptilian predators strike from the dunes in tandem.',
  },

  // ==========================================================================
  // Family 9: River / Aquatic (RIVER)
  // ==========================================================================
  // NOTE: RIVER biome has no TERRAIN_TO_BIOME mapping in road-encounter.ts.
  // These templates will not trigger until a RIVER terrain pattern is added
  // to the TERRAIN_TO_BIOME array. They exist as future-proofing for when
  // river routes are implemented.
  {
    id: 'river-pike',
    name: 'River Pike',
    family: 'aquatic',
    familyTags: ['aquatic'],
    biomes: ['RIVER'] as BiomeType[],
    levelRange: { min: 1, max: 3 },
    composition: [{ monsterName: 'River Pike', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A pike lunges from the shallows, jaws snapping.',
  },
  {
    id: 'river-turtle',
    name: 'Snapping Turtle',
    family: 'aquatic',
    familyTags: ['aquatic'],
    biomes: ['RIVER'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Snapping Turtle', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'A massive turtle surfaces, its beak-like jaws open wide.',
  },
  {
    id: 'river-crayfish',
    name: 'Giant Crayfish',
    family: 'aquatic',
    familyTags: ['aquatic'],
    biomes: ['RIVER'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Giant Crayfish', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'An enormous crayfish rises from the riverbed, claws clacking.',
  },
  {
    id: 'river-serpent',
    name: 'River Serpent',
    family: 'aquatic',
    familyTags: ['aquatic'],
    biomes: ['RIVER'] as BiomeType[],
    levelRange: { min: 5, max: 7 },
    composition: [{ monsterName: 'River Serpent', count: 1 }],
    weight: 6,
    soloAppropriate: true,
    description: "A sinuous serpent breaks the water's surface.",
  },

  // ==========================================================================
  // Family 10: Insects (FOREST, UNDERGROUND)
  // ==========================================================================
  {
    id: 'insect-ant',
    name: 'Giant Ant',
    family: 'insects',
    familyTags: ['insects'],
    biomes: ['FOREST', 'UNDERGROUND'] as BiomeType[],
    levelRange: { min: 2, max: 4 },
    composition: [{ monsterName: 'Giant Ant', count: 1 }],
    weight: 10,
    soloAppropriate: true,
    description: 'A dog-sized ant mandibles its way toward you.',
  },
  {
    id: 'insect-hatchling',
    name: 'Spider Hatchling',
    family: 'insects',
    familyTags: ['insects'],
    biomes: ['FOREST', 'UNDERGROUND'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Spider Hatchling', count: 1 }],
    weight: 8,
    soloAppropriate: true,
    description: 'A young spider drops from the canopy on a silk thread.',
  },
  {
    id: 'insect-nest',
    name: 'Ant Colony Patrol',
    family: 'insects',
    familyTags: ['insects'],
    biomes: ['UNDERGROUND'] as BiomeType[],
    levelRange: { min: 3, max: 5 },
    composition: [{ monsterName: 'Giant Ant', count: 3, statScale: 0.6 }],
    weight: 3,
    soloAppropriate: false,
    description: 'A patrol of giant ants swarms from a tunnel.',
  },
];
