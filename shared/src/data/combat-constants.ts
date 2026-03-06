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

/** Class → primary casting/attack stat (used for save DCs and spell attack rolls) */
export const CLASS_PRIMARY_STAT: Record<string, string> = {
  warrior: 'str', rogue: 'dex', ranger: 'dex',
  mage: 'int', psion: 'int', cleric: 'wis', bard: 'cha',
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
