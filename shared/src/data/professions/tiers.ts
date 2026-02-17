import { TierDefinition } from './types';

export const PROFESSION_TIERS: TierDefinition[] = [
  {
    tier: 'APPRENTICE',
    levelRange: [3, 4],
    title: 'Apprentice',
    perks: [
      'Basic recipes and materials',
      '+0% gathering yield bonus',
      '+0 crafting quality bonus',
      'T1 fields only',
    ],
  },
  {
    tier: 'JOURNEYMAN',
    levelRange: [5, 6],
    title: 'Journeyman',
    perks: [
      'Intermediate recipes unlocked',
      '+25% gathering yield bonus',
      '+1 crafting quality bonus',
      'T1 fields',
    ],
  },
  {
    tier: 'CRAFTSMAN',
    levelRange: [7, 8],
    title: 'Craftsman',
    perks: [
      'Advanced recipes unlocked',
      '+50% gathering yield bonus',
      '+2 crafting quality bonus',
      'T1 + T2 fields',
    ],
  },
  {
    tier: 'EXPERT',
    levelRange: [9, 10],
    title: 'Expert',
    perks: [
      'Expert recipes unlocked',
      '+75% gathering yield bonus',
      '+3 crafting quality bonus',
      'T2 fields',
    ],
  },
  {
    tier: 'MASTER',
    levelRange: [11, 12],
    title: 'Master',
    perks: [
      'Master recipes unlocked',
      '+100% gathering yield bonus',
      '+4 crafting quality bonus',
      'T2 + T3 fields',
    ],
  },
  {
    tier: 'GRANDMASTER',
    levelRange: [13, 100],
    title: 'Grandmaster',
    perks: [
      'Legendary recipes unlocked',
      '+150% gathering yield bonus',
      '+5 crafting quality bonus',
      'T3 fields',
    ],
  },
];

export function getTierByName(name: string): TierDefinition | undefined {
  return PROFESSION_TIERS.find(t => t.tier === name);
}
