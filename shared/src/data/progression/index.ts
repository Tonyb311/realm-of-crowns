export {
  xpToNextLevel,
  totalXpForLevel,
  levelForXp,
  MAX_LEVEL,
  PROFESSION_UNLOCK_LEVEL,
  XP_TABLE,
  ACTION_XP,
  LEVEL_UP_REWARDS,
  DEATH_PENALTY,
  // Scaled death penalty
  DEATH_XP_BY_LEVEL,
  DEATH_DURABILITY_BY_LEVEL,
  getDeathXpPenalty,
  getDeathDurabilityPenalty,
  // Front-loaded monster XP
  LOW_TIER_KILL_XP,
  getMonsterKillXp,
  // Encounter chance scaling
  ENCOUNTER_CHANCE_CAP_BY_LEVEL,
  HIGH_LEVEL_ENCOUNTER_MULTIPLIER,
  // Encounter level ranges
  ENCOUNTER_LEVEL_RANGE,
} from './xp-curve';

export type { XpTableEntry } from './xp-curve';
