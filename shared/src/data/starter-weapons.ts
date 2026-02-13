/**
 * Starter Weapons by Class
 *
 * Every new character spawns with a class-appropriate starter weapon
 * equipped to MAIN_HAND. These are bottom-tier "Rustic" weapons —
 * the kind you'd walk out of a tavern with.
 */

export interface StarterWeaponDef {
  templateId: string;
  name: string;
  description: string;
  stats: {
    diceCount: number;
    diceSides: number;
    damageModifierStat: string;
    attackModifierStat: string;
    bonusDamage: number;
    bonusAttack: number;
    damageType: string;
  };
}

export const STARTER_WEAPONS: Record<string, StarterWeaponDef> = {
  warrior: {
    templateId: 'starter-rustic-shortsword',
    name: 'Rustic Shortsword',
    description: 'A simple but serviceable shortsword. Good enough for a new adventurer.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'str', attackModifierStat: 'str',
      bonusDamage: 0, bonusAttack: 0, damageType: 'SLASHING',
    },
  },
  ranger: {
    templateId: 'starter-rustic-shortbow',
    name: 'Rustic Shortbow',
    description: 'A worn but functional shortbow. It pulls true enough for a beginner.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 0, bonusAttack: 0, damageType: 'PIERCING',
    },
  },
  rogue: {
    templateId: 'starter-rustic-dagger',
    name: 'Rustic Dagger',
    description: 'A plain iron dagger — light, quick, and easy to conceal.',
    stats: {
      diceCount: 1, diceSides: 4,
      damageModifierStat: 'dex', attackModifierStat: 'dex',
      bonusDamage: 0, bonusAttack: 0, damageType: 'PIERCING',
    },
  },
  mage: {
    templateId: 'starter-rustic-staff',
    name: 'Rustic Staff',
    description: 'A gnarled wooden staff that hums faintly with residual magic.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'int', attackModifierStat: 'int',
      bonusDamage: 0, bonusAttack: 0, damageType: 'BLUDGEONING',
    },
  },
  psion: {
    templateId: 'starter-rustic-crystal-focus',
    name: 'Rustic Crystal Focus',
    description: 'A rough-cut crystal that amplifies psionic energy just enough to matter.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'int', attackModifierStat: 'int',
      bonusDamage: 0, bonusAttack: 0, damageType: 'FORCE',
    },
  },
  bard: {
    templateId: 'starter-rustic-lute-blade',
    name: 'Rustic Lute Blade',
    description: 'A short blade cleverly hidden inside a lute neck. Music and mayhem in one.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'cha', attackModifierStat: 'cha',
      bonusDamage: 0, bonusAttack: 0, damageType: 'SLASHING',
    },
  },
  cleric: {
    templateId: 'starter-rustic-mace',
    name: 'Rustic Mace',
    description: 'A heavy iron mace, blessed by a traveling priest. Crude but righteous.',
    stats: {
      diceCount: 1, diceSides: 6,
      damageModifierStat: 'wis', attackModifierStat: 'wis',
      bonusDamage: 0, bonusAttack: 0, damageType: 'BLUDGEONING',
    },
  },
};

/** Fallback weapon if class not found in mapping */
export const FALLBACK_STARTER_WEAPON = STARTER_WEAPONS.warrior;
