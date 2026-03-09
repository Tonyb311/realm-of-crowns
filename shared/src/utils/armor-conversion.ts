/**
 * Armor-to-AC Conversion Pipeline
 *
 * Converts raw armor sums (0-224 scale from recipes) into D&D-scale AC (10-26).
 * Uses a type-aware power curve: floor(K[type] * raw^(2/3))
 *
 * K values calibrated against target AC ranges:
 *   Heavy (Warrior/Cleric): AC 14→16→19→22-24
 *   Medium (Ranger):        AC 13-14→15-16→17-18→19-21
 *   Light (Rogue):          AC 12-13→15-16→17-18→19-21 (DEX-dependent)
 *   None (Mage/Psion/Bard): AC 11→12-13→13-14→14-15
 */

import type { ArmorType } from '../data/combat-constants';

const ARMOR_CONVERSION_K: Record<ArmorType, number> = {
  heavy:  0.45,
  medium: 0.40,
  light:  0.30,
  none:   0.35,
};

const POWER = 2 / 3;

/**
 * Convert raw armor sum to a D&D-scale AC bonus (the number added to base 10).
 * Uses a per-armor-type power curve for diminishing returns.
 */
export function convertRawArmorToBonus(rawArmor: number, armorType: ArmorType): number {
  if (rawArmor <= 0) return 0;
  const K = ARMOR_CONVERSION_K[armorType];
  return Math.floor(K * Math.pow(rawArmor, POWER));
}

/**
 * Compute final AC from raw armor, DEX modifier, and armor type.
 * Heavy: no DEX. Medium: DEX capped at +2. Light/None: full DEX.
 */
export function computeFinalAC(rawArmorSum: number, dexMod: number, armorType: ArmorType): number {
  const armorBonus = convertRawArmorToBonus(rawArmorSum, armorType);
  const baseAC = 10 + armorBonus;
  switch (armorType) {
    case 'heavy':  return baseAC;
    case 'medium': return baseAC + Math.min(dexMod, 2);
    case 'light':  return baseAC + dexMod;
    case 'none':   return baseAC + dexMod;
  }
}
