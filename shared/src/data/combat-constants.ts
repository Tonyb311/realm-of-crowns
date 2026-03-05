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
