/**
 * Profession system constants — extracted from server/src/routes/professions.ts
 */

import type { ProfessionCategory } from './professions/types';

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

/** Returns the maximum profession count for a given race and level. */
export function getMaxProfessions(race: string, level: number): number {
  if (race === 'HUMAN' && level >= HUMAN_BONUS_PROFESSION_LEVEL) return 4;
  return BASE_MAX_PROFESSIONS;
}
