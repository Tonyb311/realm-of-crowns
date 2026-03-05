/**
 * Enchantment Effects — canonical mapping of scroll name → bonuses + constraints.
 * Used by the enchant API endpoint and client UI to validate and preview enchantments.
 */

export interface EnchantmentEffect {
  scrollName: string;
  bonuses: Record<string, number>;
  elementalDamage?: string;
  targetType: 'weapon' | 'armor' | 'any';
  maxPerItem: 1;
}

export const ENCHANTMENT_EFFECTS: Record<string, EnchantmentEffect> = {
  'Fortified Enchantment Scroll': {
    scrollName: 'Fortified Enchantment Scroll',
    bonuses: { armor: 2, durability: 20 },
    targetType: 'armor',
    maxPerItem: 1,
  },
  'Flaming Enchantment Scroll': {
    scrollName: 'Flaming Enchantment Scroll',
    bonuses: { bonusDamage: 2 },
    elementalDamage: 'FIRE',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Frost Enchantment Scroll': {
    scrollName: 'Frost Enchantment Scroll',
    bonuses: { bonusDamage: 2 },
    elementalDamage: 'COLD',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Lightning Enchantment Scroll': {
    scrollName: 'Lightning Enchantment Scroll',
    bonuses: { bonusDamage: 2 },
    elementalDamage: 'LIGHTNING',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Poisoned Enchantment Scroll': {
    scrollName: 'Poisoned Enchantment Scroll',
    bonuses: { bonusDamage: 2 },
    elementalDamage: 'POISON',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Swift Enchantment Scroll': {
    scrollName: 'Swift Enchantment Scroll',
    bonuses: { bonusAttack: 2 },
    targetType: 'any',
    maxPerItem: 1,
  },
  'Warding Enchantment Scroll': {
    scrollName: 'Warding Enchantment Scroll',
    bonuses: { armor: 3, magicResist: 2 },
    targetType: 'armor',
    maxPerItem: 1,
  },
  'Holy Enchantment Scroll': {
    scrollName: 'Holy Enchantment Scroll',
    bonuses: { bonusDamage: 3 },
    elementalDamage: 'RADIANT',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Shadow Enchantment Scroll': {
    scrollName: 'Shadow Enchantment Scroll',
    bonuses: { bonusDamage: 3 },
    elementalDamage: 'NECROTIC',
    targetType: 'weapon',
    maxPerItem: 1,
  },
  'Earthen Enchantment Scroll': {
    scrollName: 'Earthen Enchantment Scroll',
    bonuses: { armor: 4 },
    targetType: 'armor',
    maxPerItem: 1,
  },
  'Vitality Enchantment Scroll': {
    scrollName: 'Vitality Enchantment Scroll',
    bonuses: { constitution: 3 },
    targetType: 'any',
    maxPerItem: 1,
  },
  "Nature's Ward Enchantment Scroll": {
    scrollName: "Nature's Ward Enchantment Scroll",
    bonuses: { wisdom: 2, magicResist: 3 },
    targetType: 'any',
    maxPerItem: 1,
  },
  'True Sight Enchantment Scroll': {
    scrollName: 'True Sight Enchantment Scroll',
    bonuses: { intelligence: 3, wisdom: 2 },
    targetType: 'any',
    maxPerItem: 1,
  },
};

export function getEnchantmentEffect(scrollName: string): EnchantmentEffect | undefined {
  return ENCHANTMENT_EFFECTS[scrollName];
}
