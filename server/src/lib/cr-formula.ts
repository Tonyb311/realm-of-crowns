/**
 * Combat Rating Formula
 *
 * CR = (EHP_Level + EDPR_Level + Lethality_Adjustment) / 2
 *
 * Where:
 * - EHP_Level = player level whose avg DPR kills this monster in ~5 rounds
 * - EDPR_Level = player level whose avg HP is killed by this monster in ~5 rounds
 * - Lethality_Adjustment = bonus for save-or-suck abilities
 *
 * Source: docs/design/combat-rating-system.md
 */

// ---- Lookup Tables (extrapolated to level 50) ----

/** Average player attack bonus by level (across all 7 classes) */
const PLAYER_ATTACK_BONUS: Record<number, number> = {
  1: 5, 2: 5, 3: 5, 4: 6, 5: 6,
  6: 7, 7: 7, 8: 8, 9: 8, 10: 9,
  11: 9, 12: 10, 13: 10, 14: 10, 15: 11,
  16: 11, 17: 11, 18: 12, 19: 12, 20: 12,
  21: 13, 22: 13, 23: 13, 24: 13, 25: 14,
  26: 14, 27: 14, 28: 14, 29: 15, 30: 14,
  31: 15, 32: 15, 33: 15, 34: 15, 35: 16,
  36: 16, 37: 16, 38: 16, 39: 16, 40: 16,
  41: 17, 42: 17, 43: 17, 44: 17, 45: 18,
  46: 18, 47: 18, 48: 18, 49: 18, 50: 18,
};

/** Average player AC by level */
const PLAYER_AC: Record<number, number> = {
  1: 13, 2: 13, 3: 13, 4: 14, 5: 14,
  6: 14, 7: 15, 8: 15, 9: 16, 10: 16,
  11: 16, 12: 17, 13: 17, 14: 17, 15: 18,
  16: 18, 17: 18, 18: 18, 19: 19, 20: 19,
  21: 19, 22: 19, 23: 19, 24: 20, 25: 20,
  26: 20, 27: 20, 28: 20, 29: 20, 30: 20,
  31: 20, 32: 21, 33: 21, 34: 21, 35: 21,
  36: 21, 37: 21, 38: 21, 39: 21, 40: 21,
  41: 22, 42: 22, 43: 22, 44: 22, 45: 22,
  46: 22, 47: 22, 48: 22, 49: 22, 50: 22,
};

/** Average player HP by level */
const PLAYER_HP: Record<number, number> = {
  1: 16, 2: 22, 3: 28, 4: 34, 5: 40,
  6: 46, 7: 52, 8: 58, 9: 64, 10: 70,
  11: 76, 12: 82, 13: 88, 14: 94, 15: 100,
  16: 106, 17: 112, 18: 118, 19: 124, 20: 130,
  21: 136, 22: 142, 23: 148, 24: 154, 25: 160,
  26: 166, 27: 172, 28: 178, 29: 184, 30: 190,
  31: 196, 32: 202, 33: 208, 34: 214, 35: 220,
  36: 226, 37: 232, 38: 238, 39: 244, 40: 250,
  41: 256, 42: 262, 43: 268, 44: 274, 45: 280,
  46: 286, 47: 292, 48: 298, 49: 304, 50: 310,
};

/** Average player DPR by level (weapon damage * hit rate + ability contributions) */
const PLAYER_DPR: Record<number, number> = {
  1: 5.5, 2: 6.0, 3: 6.5, 4: 7.0, 5: 8.0,
  6: 9.0, 7: 9.5, 8: 10.0, 9: 11.0, 10: 12.0,
  11: 13.0, 12: 14.0, 13: 14.5, 14: 15.0, 15: 16.0,
  16: 17.0, 17: 18.0, 18: 19.0, 19: 20.0, 20: 21.0,
  21: 22.0, 22: 23.0, 23: 24.0, 24: 25.0, 25: 26.0,
  26: 27.0, 27: 28.0, 28: 29.0, 29: 30.0, 30: 31.0,
  31: 32.0, 32: 33.0, 33: 34.0, 34: 35.0, 35: 36.0,
  36: 37.0, 37: 38.0, 38: 39.0, 39: 40.0, 40: 41.0,
  41: 42.0, 42: 43.0, 43: 44.0, 44: 45.0, 45: 46.0,
  46: 47.0, 47: 48.0, 48: 49.0, 49: 50.0, 50: 51.0,
};

function getTableValue(table: Record<number, number>, level: number): number {
  const clamped = Math.max(1, Math.min(50, Math.round(level)));
  return table[clamped] ?? table[50];
}

function clampProb(p: number): number {
  return Math.max(0.05, Math.min(0.95, p));
}

// ---- Helper: Parse damage string ----

function parseAvgDamage(damageStr: string): number {
  // "2d6+4" → avg = count * (sides+1)/2 + bonus
  const match = damageStr.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 5; // fallback
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;
  return count * (sides + 1) / 2 + bonus;
}

// ---- CR Formula Input ----

export interface CRInput {
  hp: number;
  ac: number;
  attack: number;
  damage: string;
  level: number; // monster's assigned level (used as reference)
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  regenPerTurn?: number;
  regenDisableable?: boolean;
  abilities?: {
    type: 'damage' | 'status' | 'aoe' | 'multiattack' | 'on_hit' | 'heal' | 'buff';
    damage?: string;
    saveDC?: number;
    saveType?: string;
    attacks?: number;
    statusEffect?: string;
    statusDuration?: number;
    recharge?: number;
    cooldown?: number;
  }[];
}

// ---- Core Formula ----

export function computeFormulaCR(input: CRInput): number {
  const TARGET_ROUNDS = 5;

  // ---- EHP Calculation ----
  const avgDmg = parseAvgDamage(input.damage);

  // Resistance multiplier
  let resistMultiplier = 1.0;
  const physicalTypes = ['SLASHING', 'PIERCING', 'BLUDGEONING'];
  const resistPhysical = (input.resistances ?? []).filter(r => physicalTypes.includes(r)).length;
  const immunePhysical = (input.immunities ?? []).filter(r => physicalTypes.includes(r)).length;
  if (immunePhysical >= 2) {
    resistMultiplier = input.level <= 10 ? 2.0 : 1.5;
  } else if (resistPhysical >= 2) {
    resistMultiplier = 1.5;
  } else if (resistPhysical >= 1 || (input.resistances ?? []).length > 0) {
    resistMultiplier = 1.25;
  }

  // Regen multiplier
  let regenMultiplier = 1.0;
  if (input.regenPerTurn && input.regenPerTurn > 0) {
    regenMultiplier = Math.min(2.0, 1 + (input.regenPerTurn * TARGET_ROUNDS) / input.hp);
    if (input.regenDisableable) {
      regenMultiplier = 1 + (regenMultiplier - 1) * 0.5; // halve the bonus
    }
  }

  // Find EHP_Level: the level whose avg DPR kills this monster in ~TARGET_ROUNDS
  let ehpLevel = 1;
  for (let lvl = 1; lvl <= 50; lvl++) {
    const atkBonus = getTableValue(PLAYER_ATTACK_BONUS, lvl);
    const hitProb = clampProb((21 - (input.ac - atkBonus)) / 20);
    const acMult = 1 / hitProb;
    const ehp = input.hp * acMult * resistMultiplier * regenMultiplier;
    const playerDpr = getTableValue(PLAYER_DPR, lvl);
    const roundsToKill = ehp / playerDpr;
    if (roundsToKill <= TARGET_ROUNDS) {
      ehpLevel = lvl;
      break;
    }
    ehpLevel = lvl;
  }

  // ---- EDPR Calculation ----
  // Monster's effective DPR against players

  // Base attack DPR
  const baseHitProb = (level: number) => {
    const targetAC = getTableValue(PLAYER_AC, level);
    return clampProb((21 - (targetAC - input.attack)) / 20);
  };

  // Multi-attack multiplier
  let attacksPerRound = 1;
  const multiattack = input.abilities?.find(a => a.type === 'multiattack');
  if (multiattack && multiattack.attacks) {
    attacksPerRound = multiattack.attacks;
  }

  // Ability DPR contribution
  let abilityDprBonus = 0;
  for (const ability of input.abilities ?? []) {
    if (ability.type === 'aoe' && ability.damage) {
      const abilAvg = parseAvgDamage(ability.damage);
      // Use frequency: if recharge, ~33% per round
      const useFreq = ability.recharge ? 1 / 3 : 1 / Math.max(1, (ability.cooldown ?? 1) + 1);
      // Save success halves damage
      abilityDprBonus += abilAvg * 0.65 * useFreq; // 65% avg including saves
    } else if (ability.type === 'damage' && ability.damage) {
      const abilAvg = parseAvgDamage(ability.damage);
      const useFreq = 1 / Math.max(1, (ability.cooldown ?? 1) + 1);
      abilityDprBonus += abilAvg * 0.7 * useFreq;
    }
  }

  // Find EDPR_Level: the level whose avg HP is killed by this monster in ~TARGET_ROUNDS
  let edprLevel = 1;
  for (let lvl = 1; lvl <= 50; lvl++) {
    const hitProb = baseHitProb(lvl);
    const monsterDpr = avgDmg * hitProb * attacksPerRound + abilityDprBonus;
    const playerHp = getTableValue(PLAYER_HP, lvl);
    const roundsToKill = playerHp / monsterDpr;
    if (roundsToKill >= TARGET_ROUNDS) {
      edprLevel = lvl;
      break;
    }
    edprLevel = lvl;
  }

  // ---- Lethality Adjustment ----
  let lethalityAdj = 0;
  for (const ability of input.abilities ?? []) {
    if (ability.type === 'status' && ability.statusEffect) {
      const isStun = ['stunned', 'paralyzed'].includes(ability.statusEffect);
      const isFear = ability.statusEffect === 'frightened';
      const duration = ability.statusDuration ?? 1;
      if (isStun && duration >= 2) {
        lethalityAdj += 1.5;
      } else if (isStun) {
        lethalityAdj += 0.75;
      } else if (isFear) {
        lethalityAdj += 0.5;
      }
    }
  }

  // ---- Final CR ----
  const cr = (ehpLevel + edprLevel + lethalityAdj) / 2;
  return Math.round(cr * 10) / 10; // round to 1 decimal
}
