/**
 * Profession system constants — extracted from server/src/routes/professions.ts
 */

import type { ProfessionCategory } from './professions/types';
import { computeFeatBonus } from './feats';

/** Default maximum professions per character. */
export const BASE_MAX_PROFESSIONS = 3;

/** Level at which Humans unlock their 4th profession slot (P1 #27). */
export const HUMAN_BONUS_PROFESSION_LEVEL = 15;

/** Maximum professions allowed per category. */
export const CATEGORY_LIMITS: Record<ProfessionCategory, number> = {
  GATHERING: 2,
  CRAFTING: 2,
  SERVICE: 1,
};

/** Returns the maximum profession count for a given race, level, and feats. */
export function getMaxProfessions(race: string, level: number, featIds?: string[]): number {
  let max = BASE_MAX_PROFESSIONS;
  if (race === 'HUMAN' && level >= HUMAN_BONUS_PROFESSION_LEVEL) max++;
  max += computeFeatBonus(featIds, 'professionSlotBonus');
  return max;
}
