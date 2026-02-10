import { TierDefinition } from './types';

export const PROFESSION_TIERS: TierDefinition[] = [
  {
    tier: 'APPRENTICE',
    levelRange: [1, 10],
    title: 'Apprentice',
    perks: [
      'Basic recipes only',
      'Common materials only',
      'Slow work speed',
      'Poor to Common quality range',
    ],
  },
  {
    tier: 'JOURNEYMAN',
    levelRange: [11, 25],
    title: 'Journeyman',
    perks: [
      'Intermediate recipes unlocked',
      'Uncommon materials unlocked',
      'Normal work speed',
      'Can work independently without a workshop',
    ],
  },
  {
    tier: 'CRAFTSMAN',
    levelRange: [26, 50],
    title: 'Craftsman',
    perks: [
      'Advanced recipes unlocked',
      'Rare materials unlocked',
      'Faster work speed',
      '+2 quality bonus on all crafting rolls',
    ],
  },
  {
    tier: 'EXPERT',
    levelRange: [51, 75],
    title: 'Expert',
    perks: [
      'Expert recipes unlocked',
      'Exotic materials unlocked',
      'Much faster work speed',
      '+5 quality bonus on all crafting rolls',
    ],
  },
  {
    tier: 'MASTER',
    levelRange: [76, 90],
    title: 'Master',
    perks: [
      'Master recipes unlocked',
      'Legendary materials unlocked',
      'Can teach apprentices (both gain XP bonus)',
      '+8 quality bonus on all crafting rolls',
    ],
  },
  {
    tier: 'GRANDMASTER',
    levelRange: [91, 100],
    title: 'Grandmaster',
    perks: [
      'Legendary recipes unlocked',
      'Can create custom recipes',
      'Unique title and cosmetic rewards',
      '+12 quality bonus on all crafting rolls',
    ],
  },
];

export function getTierByName(name: string): TierDefinition | undefined {
  return PROFESSION_TIERS.find(t => t.tier === name);
}
