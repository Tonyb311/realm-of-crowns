export { warriorAbilities, warriorTier0Abilities } from './warrior';
export { mageAbilities, mageTier0Abilities } from './mage';
export { rogueAbilities, rogueTier0Abilities } from './rogue';
export { clericAbilities, clericTier0Abilities } from './cleric';
export { rangerAbilities, rangerTier0Abilities } from './ranger';
export { bardAbilities, bardTier0Abilities } from './bard';
export { psionAbilities, psionTier0Abilities } from './psion';
export type { AbilityDefinition, SpecializationDefinition, ClassDefinition } from './types';

import { warriorAbilities, warriorTier0Abilities } from './warrior';
import { mageAbilities, mageTier0Abilities } from './mage';
import { rogueAbilities, rogueTier0Abilities } from './rogue';
import { clericAbilities, clericTier0Abilities } from './cleric';
import { rangerAbilities, rangerTier0Abilities } from './ranger';
import { bardAbilities, bardTier0Abilities } from './bard';
import { psionAbilities, psionTier0Abilities } from './psion';
import { AbilityDefinition } from './types';

export const ALL_ABILITIES: AbilityDefinition[] = [
  ...warriorAbilities,
  ...mageAbilities,
  ...rogueAbilities,
  ...clericAbilities,
  ...rangerAbilities,
  ...bardAbilities,
  ...psionAbilities,
  ...warriorTier0Abilities,
  ...mageTier0Abilities,
  ...rogueTier0Abilities,
  ...clericTier0Abilities,
  ...rangerTier0Abilities,
  ...bardTier0Abilities,
  ...psionTier0Abilities,
];

export const ABILITIES_BY_CLASS: Record<string, AbilityDefinition[]> = {
  warrior: [...warriorAbilities, ...warriorTier0Abilities],
  mage: [...mageAbilities, ...mageTier0Abilities],
  rogue: [...rogueAbilities, ...rogueTier0Abilities],
  cleric: [...clericAbilities, ...clericTier0Abilities],
  ranger: [...rangerAbilities, ...rangerTier0Abilities],
  bard: [...bardAbilities, ...bardTier0Abilities],
  psion: [...psionAbilities, ...psionTier0Abilities],
};

/** All tier 0 abilities grouped by class */
export const TIER0_ABILITIES_BY_CLASS: Record<string, AbilityDefinition[]> = {
  warrior: warriorTier0Abilities,
  mage: mageTier0Abilities,
  rogue: rogueTier0Abilities,
  cleric: clericTier0Abilities,
  ranger: rangerTier0Abilities,
  bard: bardTier0Abilities,
  psion: psionTier0Abilities,
};

/** Tier 0 choice levels */
export const TIER0_CHOICE_LEVELS = [3, 5, 8] as const;

export const VALID_CLASSES = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'] as const;

export const SPECIALIZATIONS: Record<string, string[]> = {
  warrior: ['berserker', 'guardian', 'warlord'],
  mage: ['elementalist', 'necromancer', 'enchanter'],
  rogue: ['assassin', 'thief', 'swashbuckler'],
  cleric: ['healer', 'paladin', 'inquisitor'],
  ranger: ['beastmaster', 'sharpshooter', 'tracker'],
  bard: ['diplomat', 'battlechanter', 'lorekeeper'],
  psion: ['telepath', 'seer', 'nomad'],
};
