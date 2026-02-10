export { warriorAbilities } from './warrior';
export { mageAbilities } from './mage';
export { rogueAbilities } from './rogue';
export { clericAbilities } from './cleric';
export { rangerAbilities } from './ranger';
export { bardAbilities } from './bard';
export { psionAbilities } from './psion';
export type { AbilityDefinition, SpecializationDefinition, ClassDefinition } from './types';

import { warriorAbilities } from './warrior';
import { mageAbilities } from './mage';
import { rogueAbilities } from './rogue';
import { clericAbilities } from './cleric';
import { rangerAbilities } from './ranger';
import { bardAbilities } from './bard';
import { psionAbilities } from './psion';
import { AbilityDefinition } from './types';

export const ALL_ABILITIES: AbilityDefinition[] = [
  ...warriorAbilities,
  ...mageAbilities,
  ...rogueAbilities,
  ...clericAbilities,
  ...rangerAbilities,
  ...bardAbilities,
  ...psionAbilities,
];

export const ABILITIES_BY_CLASS: Record<string, AbilityDefinition[]> = {
  warrior: warriorAbilities,
  mage: mageAbilities,
  rogue: rogueAbilities,
  cleric: clericAbilities,
  ranger: rangerAbilities,
  bard: bardAbilities,
  psion: psionAbilities,
};

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
