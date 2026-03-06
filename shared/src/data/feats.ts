export interface FeatEffects {
  bonusHp?: number;
  statBonus?: { stat: string; value: number };
  professionQualityBonus?: number;
  buyDiscount?: number;
  sellBonus?: number;
  bonusSaveProficiency?: boolean;
  allSaveBonus?: number;
  attackBonus?: number;
  acBonus?: number;
  initiativeBonus?: number;
  deathPenaltyReduction?: number;
  goldBonus?: number;
  xpBonus?: number;
  hpPerLevel?: number;
  luckyReroll?: boolean;
  critDamageBonus?: number;
}

export interface FeatDefinition {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'defense' | 'utility' | 'crafting';
  effects: FeatEffects;
  excludedClasses?: string[];
}

export const FEAT_DEFINITIONS: FeatDefinition[] = [
  // ---- COMBAT ----
  {
    id: 'feat-precise-strikes',
    name: 'Precise Strikes',
    description: '+1 to all attack rolls. Simple but effective — every swing connects more often.',
    category: 'combat',
    effects: { attackBonus: 1 },
  },
  {
    id: 'feat-brutal-critical',
    name: 'Brutal Critical',
    description: 'Critical hits deal 50% more damage. Devastating when they land.',
    category: 'combat',
    effects: { critDamageBonus: 0.5 },
  },
  {
    id: 'feat-combat-reflexes',
    name: 'Combat Reflexes',
    description: '+3 to initiative. Act first, strike first.',
    category: 'combat',
    effects: { initiativeBonus: 3 },
  },

  // ---- DEFENSE ----
  {
    id: 'feat-tough',
    name: 'Tough',
    description: '+2 HP per character level (retroactive). At level 50, that is +100 HP.',
    category: 'defense',
    effects: { hpPerLevel: 2 },
  },
  {
    id: 'feat-resilient',
    name: 'Resilient',
    description: 'Gain proficiency in one additional saving throw of your choice.',
    category: 'defense',
    effects: { bonusSaveProficiency: true },
  },
  {
    id: 'feat-iron-will',
    name: 'Iron Will',
    description: '+1 to ALL saving throws. Small but applies to everything.',
    category: 'defense',
    effects: { allSaveBonus: 1 },
  },
  {
    id: 'feat-natural-armor',
    name: 'Natural Armor',
    description: '+1 AC permanently. Stacks with all equipment.',
    category: 'defense',
    effects: { acBonus: 1 },
  },

  // ---- UTILITY ----
  {
    id: 'feat-lucky',
    name: 'Lucky',
    description: 'Once per combat, reroll any d20 roll (attack, save, or enemy attack against you).',
    category: 'utility',
    effects: { luckyReroll: true },
  },
  {
    id: 'feat-undying',
    name: 'Undying',
    description: 'Death XP and gold penalties reduced by 50%. Die smarter.',
    category: 'defense',
    effects: { deathPenaltyReduction: 0.5 },
  },
  {
    id: 'feat-quick-learner',
    name: 'Quick Learner',
    description: '+10% XP from all sources. Compounds over time.',
    category: 'utility',
    effects: { xpBonus: 0.10 },
  },

  // ---- CRAFTING / ECONOMY ----
  {
    id: 'feat-master-artisan',
    name: 'Master Artisan',
    description: '+3 to all profession quality rolls. Better gear, better prices.',
    category: 'crafting',
    effects: { professionQualityBonus: 3 },
  },
  {
    id: 'feat-merchant-prince',
    name: 'Merchant Prince',
    description: 'Buy for 10% less, sell for 10% more at all markets.',
    category: 'crafting',
    effects: { buyDiscount: 0.10, sellBonus: 0.10 },
  },
  {
    id: 'feat-fortune-favored',
    name: 'Fortune Favored',
    description: '+15% gold from all sources (combat loot, trading, political stipends).',
    category: 'crafting',
    effects: { goldBonus: 0.15 },
  },
];

export function getFeatById(id: string): FeatDefinition | undefined {
  return FEAT_DEFINITIONS.find(f => f.id === id);
}

/** Aggregate a numeric feat effect across a list of feat IDs. Returns 0 if no feats or no matching effect. */
export function computeFeatBonus(featIds: string[] | undefined, key: keyof FeatEffects): number {
  if (!featIds || featIds.length === 0) return 0;
  let total = 0;
  for (const fid of featIds) {
    const feat = getFeatById(fid);
    const val = feat?.effects[key];
    if (typeof val === 'number') total += val;
  }
  return total;
}

/** Feat unlock levels */
export const FEAT_UNLOCK_LEVELS = [38, 48] as const;

/** Max feats a character can have */
export const MAX_FEATS = FEAT_UNLOCK_LEVELS.length;
