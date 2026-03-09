/** Class → which two saving throws are proficient */
export const CLASS_SAVE_PROFICIENCIES: Record<string, [string, string]> = {
  warrior: ['str', 'con'],
  rogue: ['dex', 'int'],
  ranger: ['str', 'dex'],
  mage: ['int', 'wis'],
  cleric: ['wis', 'cha'],
  bard: ['dex', 'cha'],
  psion: ['int', 'wis'],
};

/**
 * Deterministic save proficiency unlock order at milestone levels 18, 30, 45.
 * Each class starts with 2 saves (CLASS_SAVE_PROFICIENCIES), then gains one
 * additional proficiency at each milestone in this order.
 * Design: fills weakest saves first (WIS for martial, CON for casters).
 */
export const CLASS_MILESTONE_SAVE_ORDER: Record<string, [string, string, string]> = {
  warrior: ['wis', 'dex', 'cha'],  // STR,CON → +WIS(18) +DEX(30) +CHA(45)
  rogue:   ['wis', 'con', 'cha'],  // DEX,INT → +WIS(18) +CON(30) +CHA(45)
  ranger:  ['wis', 'con', 'cha'],  // STR,DEX → +WIS(18) +CON(30) +CHA(45)
  mage:    ['con', 'dex', 'cha'],  // INT,WIS → +CON(18) +DEX(30) +CHA(45)
  cleric:  ['con', 'str', 'dex'],  // WIS,CHA → +CON(18) +STR(30) +DEX(45)
  bard:    ['wis', 'con', 'str'],  // DEX,CHA → +WIS(18) +CON(30) +STR(45)
  psion:   ['con', 'dex', 'cha'],  // INT,WIS → +CON(18) +DEX(30) +CHA(45)
};

/** Milestone levels at which characters gain additional save proficiencies */
export const SAVE_PROFICIENCY_MILESTONES = [18, 30, 45] as const;

/**
 * Extra attacks granted by class at specific character levels.
 * Value = TOTAL attacks per Attack action (1 = no extra, 2 = one extra, etc.)
 * Only applies to the 'attack' action type — not abilities or spells.
 *
 * D&D 5e reference: Fighter gets 2/3/4 attacks, other martial get 2.
 * RoC spreads this over 50 levels to fill dead zones.
 */
export const CLASS_EXTRA_ATTACKS: Record<string, { level: number; totalAttacks: number }[]> = {
  warrior: [
    { level: 13, totalAttacks: 2 },
    { level: 34, totalAttacks: 3 },
    { level: 42, totalAttacks: 4 },
  ],
  ranger: [
    { level: 28, totalAttacks: 2 },
  ],
  cleric: [
    { level: 34, totalAttacks: 2 },
  ],
};

/** Get total attacks per Attack action for a class at a given level */
export function getAttacksPerAction(characterClass: string, level: number): number {
  const classSchedule = CLASS_EXTRA_ATTACKS[characterClass.toLowerCase()];
  if (!classSchedule) return 1;
  let attacks = 1;
  for (const entry of classSchedule) {
    if (level >= entry.level) attacks = entry.totalAttacks;
  }
  return attacks;
}

/** Class → primary casting/attack stat (used for save DCs and spell attack rolls) */
export const CLASS_PRIMARY_STAT: Record<string, string> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
};

// ============================================================
// ARMOR TYPE FOR AC COMPUTATION
// ============================================================

/** Armor type determines how DEX applies to AC */
export type ArmorType = 'heavy' | 'medium' | 'light' | 'none';

/** Each class maps to its best-proficient armor type for AC computation */
export const CLASS_ARMOR_TYPE: Record<string, ArmorType> = {
  warrior: 'heavy',
  cleric:  'heavy',
  ranger:  'medium',
  rogue:   'light',
  bard:    'none',
  mage:    'none',
  psion:   'none',
};

// ============================================================
// EQUIPMENT PROFICIENCY SYSTEM
// ============================================================

/** Proficiency-system armor category (maps to recipe derivation, not visual ArmorCategory) */
export type ProfArmorCategory = 'none' | 'light' | 'medium' | 'heavy' | 'shield';

/** Proficiency-system weapon category */
export type ProfWeaponCategory =
  | 'simple_melee' | 'martial_melee'
  | 'simple_ranged' | 'martial_ranged'
  | 'staff' | 'holy_symbol' | 'instrument' | 'orb' | 'wand';

/** Which armor categories each class is proficient with (cloth/'none' is always proficient) */
export const CLASS_ARMOR_PROFICIENCY: Record<string, ProfArmorCategory[]> = {
  warrior: ['none', 'light', 'medium', 'heavy', 'shield'],
  rogue:   ['none', 'light'],
  ranger:  ['none', 'light', 'medium', 'shield'],
  mage:    ['none'],
  psion:   ['none', 'light'],
  cleric:  ['none', 'light', 'medium', 'heavy', 'shield'],
  bard:    ['none', 'light', 'shield'],
};

/** Which weapon categories each class is proficient with */
export const CLASS_WEAPON_PROFICIENCY: Record<string, ProfWeaponCategory[]> = {
  warrior: ['simple_melee', 'martial_melee', 'simple_ranged', 'martial_ranged'],
  rogue:   ['simple_melee', 'martial_melee', 'simple_ranged'],
  ranger:  ['simple_melee', 'martial_melee', 'simple_ranged', 'martial_ranged'],
  mage:    ['staff', 'wand', 'simple_melee'],
  psion:   ['orb', 'staff', 'simple_melee'],
  cleric:  ['simple_melee', 'holy_symbol'],
  bard:    ['simple_melee', 'instrument', 'simple_ranged'],
};
