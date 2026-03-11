export interface FeatEffects {
  // --- Existing effects ---
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

  // --- New combat effects ---
  /** Flat damage reduction per incoming hit (minimum 1 damage dealt). Applied after all other damage calc. */
  damageReductionFlat?: number;
  /** Bonus to spell attack rolls only (attackType === 'spell'). Stacks with attackBonus. */
  spellAttackBonus?: number;
  /** Bonus to save DCs on caster abilities. Added to 8 + prof + statMod. */
  spellDcBonus?: number;
  /** Auto -5 attack / +10 damage with 2H melee weapons. Uses AC heuristic: only applies when atkMod >= targetAC - 5. */
  gwmTradeoff?: boolean;
  /** Auto -5 attack / +10 damage with ranged weapons. Uses AC heuristic: only applies when atkMod >= targetAC - 5. */
  sharpshooterTradeoff?: boolean;
  /** Once per combat, when a party member takes damage, make a free counterattack against the attacker. */
  sentinelCounter?: boolean;
  /** Absorption shield (temp HP) applied to all party members at combat start via ActiveBuff. */
  partyTempHp?: number;
  /** Once per combat, reroll damage and take the higher result. */
  savageAttackerReroll?: boolean;
  /** Percentage bonus to all healing received. 0.25 = +25%. Multiplied with healingGivenBonus. */
  healingReceivedBonus?: number;
  /** Percentage bonus to healing output from this character's abilities. 0.25 = +25%. */
  healingGivenBonus?: number;
  /** Bonus to saves vs ability/spell effects (all saves triggered by abilities). */
  spellSaveBonus?: number;

  // --- New non-combat effects ---
  /** Percentage reduction to road encounter chance. 0.20 = 20% less likely. */
  encounterAvoidance?: number;
  /** Percentage reduction to travel time. 0.15 = 15% faster. TODO: wire into daily tick. */
  travelSpeedBonus?: number;
  /** Additional profession slot(s). Read dynamically by getMaxProfessions(). */
  professionSlotBonus?: number;
  /** Percentage bonus to food buff duration/potency. 0.25 = +25%. TODO: wire into food system. */
  foodBuffBonus?: number;
  /** Bonus to political/social actions. TODO: wire when political system adds roll-based outcomes. */
  socialBonus?: number;
  /** Bonus to flee save rolls. Stacks with stance, item, and buff bonuses. */
  fleeBonus?: number;
}

export interface FeatDefinition {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'defense' | 'utility' | 'crafting' | 'social' | 'exploration';
  effects: FeatEffects;
  excludedClasses?: string[];
}

export const FEAT_DEFINITIONS: FeatDefinition[] = [
  // ============================================================
  // COMBAT (7)
  // ============================================================
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
  {
    id: 'feat-devastating-blow',
    name: 'Devastating Blow',
    description: 'With two-handed melee weapons, trade accuracy for power: -5 to hit, +10 damage when the odds favor it.',
    category: 'combat',
    effects: { gwmTradeoff: true },
    excludedClasses: ['mage', 'psion'],
  },
  {
    id: 'feat-deadeye',
    name: 'Deadeye',
    description: 'With ranged weapons, trade accuracy for power: -5 to hit, +10 damage when the odds favor it.',
    category: 'combat',
    effects: { sharpshooterTradeoff: true },
    excludedClasses: ['warrior', 'cleric'],
  },
  {
    id: 'feat-savage-attacker',
    name: 'Savage Attacker',
    description: 'Once per combat, reroll your damage and take the higher result. Makes your best hits brutal.',
    category: 'combat',
    effects: { savageAttackerReroll: true },
  },
  {
    id: 'feat-arcane-focus',
    name: 'Arcane Focus',
    description: '+1 to spell attack rolls and +1 to spell save DCs. Essential for dedicated casters.',
    category: 'combat',
    effects: { spellAttackBonus: 1, spellDcBonus: 1 },
    excludedClasses: ['warrior', 'rogue', 'ranger'],
  },

  // ============================================================
  // DEFENSE (8)
  // ============================================================
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
  {
    id: 'feat-heavy-armor-mastery',
    name: 'Heavy Armor Mastery',
    description: 'Reduce all incoming damage by 3 per hit (minimum 1 damage). Shrugs off light hits.',
    category: 'defense',
    effects: { damageReductionFlat: 3 },
    excludedClasses: ['mage', 'psion', 'bard', 'rogue'],
  },
  {
    id: 'feat-durable',
    name: 'Durable',
    description: 'All healing you receive is 25% more effective. Potions, regeneration, abilities — everything.',
    category: 'defense',
    effects: { healingReceivedBonus: 0.25 },
  },
  {
    id: 'feat-spell-ward',
    name: 'Spell Ward',
    description: '+2 to all saving throws against ability effects. Resists what armor cannot.',
    category: 'defense',
    effects: { spellSaveBonus: 2 },
  },
  {
    id: 'feat-undying',
    name: 'Undying',
    description: 'Death XP and gold penalties reduced by 50%. Die smarter.',
    category: 'defense',
    effects: { deathPenaltyReduction: 0.5 },
  },

  // ============================================================
  // UTILITY (6)
  // ============================================================
  {
    id: 'feat-lucky',
    name: 'Lucky',
    description: 'Once per combat, reroll any d20 roll (attack, save, or enemy attack against you).',
    category: 'utility',
    effects: { luckyReroll: true },
  },
  {
    id: 'feat-quick-learner',
    name: 'Quick Learner',
    description: '+10% XP from all sources. Compounds over time.',
    category: 'utility',
    effects: { xpBonus: 0.10 },
  },
  {
    id: 'feat-inspiring-leader',
    name: 'Inspiring Leader',
    description: 'All party members gain a 10 HP absorption shield at the start of each combat.',
    category: 'utility',
    effects: { partyTempHp: 10 },
  },
  {
    id: 'feat-guardians-vigil',
    name: "Guardian's Vigil",
    description: 'Once per combat, when a party member takes damage, you make a free attack against the attacker.',
    category: 'utility',
    effects: { sentinelCounter: true },
    excludedClasses: ['mage', 'psion'],
  },
  {
    id: 'feat-swift-stride',
    name: 'Swift Stride',
    description: 'Travel takes 15% less time. One fewer tick on long journeys.',
    category: 'exploration',
    effects: { travelSpeedBonus: 0.15 },
  },
  {
    id: 'feat-wary-traveler',
    name: 'Wary Traveler',
    description: '20% less likely to trigger road encounters. See trouble before it sees you.',
    category: 'exploration',
    effects: { encounterAvoidance: 0.20 },
  },

  // ============================================================
  // CRAFTING / ECONOMY (5)
  // ============================================================
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
  {
    id: 'feat-polymath',
    name: 'Polymath',
    description: 'Gain 1 additional profession slot. Master more trades than others.',
    category: 'crafting',
    effects: { professionSlotBonus: 1 },
  },
  {
    id: 'feat-master-chef',
    name: 'Master Chef',
    description: 'Food buffs you consume are 25% stronger. Better meals, better adventures.',
    category: 'crafting',
    effects: { foodBuffBonus: 0.25 },
  },

  // ============================================================
  // SOCIAL (2)
  // ============================================================
  {
    id: 'feat-silver-tongue',
    name: 'Silver Tongue',
    description: '+2 bonus to all social and political actions. Words are weapons too.',
    category: 'social',
    effects: { socialBonus: 2 },
  },
  {
    id: 'feat-field-medic',
    name: 'Field Medic',
    description: 'Your healing abilities and consumables heal 25% more. Allies stay standing longer.',
    category: 'social',
    effects: { healingGivenBonus: 0.25 },
    excludedClasses: ['warrior', 'rogue', 'ranger'],
  },
];

export function getFeatById(id: string): FeatDefinition | undefined {
  return FEAT_DEFINITIONS.find(f => f.id === id);
}

/** Check if a combatant has a specific boolean feat effect */
export function hasFeatEffect(featIds: string[] | undefined, key: keyof FeatEffects): boolean {
  if (!featIds || featIds.length === 0) return false;
  return featIds.some(fid => {
    const feat = getFeatById(fid);
    return feat?.effects[key] === true;
  });
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
