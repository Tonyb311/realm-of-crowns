/**
 * Equipment Proficiency Check Utility
 *
 * Checks equipped items against class proficiency tables and returns
 * flags + human-readable warnings for combat penalties.
 */

import {
  CLASS_ARMOR_PROFICIENCY,
  CLASS_WEAPON_PROFICIENCY,
  type ProfArmorCategory,
  type ProfWeaponCategory,
} from '../data/combat-constants';

export interface ProficiencyCheckResult {
  nonProficientArmor: boolean;
  nonProficientWeapon: boolean;
  warnings: string[];
}

interface EquippedItemForCheck {
  slot: string;
  stats: Record<string, any>;
  itemName?: string;
}

const ARMOR_SLOTS = new Set(['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'BACK', 'OFF_HAND']);
const WEAPON_SLOTS = new Set(['MAIN_HAND']);

/**
 * Check all equipped items against class proficiency tables.
 * Returns flags indicating non-proficiency and warning messages.
 */
export function checkEquipmentProficiency(
  characterClass: string,
  equippedItems: EquippedItemForCheck[],
): ProficiencyCheckResult {
  const cls = characterClass.toLowerCase();
  const armorProfs = CLASS_ARMOR_PROFICIENCY[cls];
  const weaponProfs = CLASS_WEAPON_PROFICIENCY[cls];

  if (!armorProfs || !weaponProfs) {
    return { nonProficientArmor: false, nonProficientWeapon: false, warnings: [] };
  }

  let nonProficientArmor = false;
  let nonProficientWeapon = false;
  const warnings: string[] = [];

  for (const item of equippedItems) {
    const stats = item.stats ?? {};

    // Check armor proficiency
    if (ARMOR_SLOTS.has(item.slot) && stats.armorCategory) {
      const cat = stats.armorCategory as ProfArmorCategory;
      if (cat !== 'none' && !armorProfs.includes(cat)) {
        nonProficientArmor = true;
        const label = item.itemName ?? item.slot;
        warnings.push(
          `Not proficient with ${cat} armor (${label}). Penalties: cannot cast spells, -3 attack, -3 STR/DEX saves.`
        );
      }
    }

    // Check weapon proficiency
    if (WEAPON_SLOTS.has(item.slot) && stats.weaponCategory) {
      const cat = stats.weaponCategory as ProfWeaponCategory;
      if (!weaponProfs.includes(cat)) {
        nonProficientWeapon = true;
        const label = item.itemName ?? item.slot;
        warnings.push(
          `Not proficient with ${cat} weapon (${label}). Penalty: no proficiency bonus on attack rolls.`
        );
      }
    }
  }

  return { nonProficientArmor, nonProficientWeapon, warnings };
}
