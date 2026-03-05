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
