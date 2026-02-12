/**
 * Racial Passive Tracker — determines which passive racial abilities are currently
 * active for a combatant based on race, level, HP, and combat context.
 */

import type { Combatant, CharacterStats } from '@shared/types/combat';
import type { CombatState } from '@shared/types/combat';
import type { RacialCombatTracker, PassiveModifiers } from './racial-combat-abilities';
import { getPassiveModifiers } from './racial-combat-abilities';

export interface ActivePassive {
  abilityName: string;
  race: string;
  description: string;
  modifiers: Partial<PassiveModifiers>;
  /** True if the passive is conditional and currently active */
  conditional: boolean;
  /** The condition that activates it, if any */
  condition?: string;
}

/**
 * Returns a list of all currently active passive abilities for a combatant.
 * Useful for UI display and combat log transparency.
 */
export function getActivePassives(
  combatant: Combatant,
  race: string,
  level: number,
  subRace?: { id: string; element?: string } | null,
  tracker?: RacialCombatTracker,
): ActivePassive[] {
  const passives: ActivePassive[] = [];
  const hpPercent = combatant.currentHp / combatant.maxHp;

  switch (race) {
    case 'human':
      if (level >= 40) {
        passives.push({
          abilityName: 'Indomitable Will',
          race,
          description: 'Once per combat, reroll a failed saving throw',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'elf':
      if (level >= 5) {
        passives.push({
          abilityName: 'Elven Accuracy',
          race,
          description: 'Advantage on ranged attacks',
          modifiers: { rangedAdvantage: true },
          conditional: false,
        });
      }
      break;

    case 'dwarf':
      if (level >= 5) {
        passives.push({
          abilityName: 'Dwarven Resilience',
          race,
          description: 'Poison resistance, +3 to poison saving throws',
          modifiers: { saveBonus: 3 },
          conditional: false,
        });
      }
      if (level >= 40) {
        const active = hpPercent <= 0.25;
        passives.push({
          abilityName: 'Ancestral Fury',
          race,
          description: 'Below 25% HP: +5 STR and +5 CON',
          modifiers: active ? { statBonuses: { str: 5, con: 5 } } : {},
          conditional: true,
          condition: active ? 'ACTIVE: Below 25% HP' : `Inactive: HP at ${Math.round(hpPercent * 100)}%`,
        });
      }
      break;

    case 'orc':
      if (level >= 1) {
        passives.push({
          abilityName: 'Intimidating Presence',
          race,
          description: 'Enemies -1 to first attack roll against you',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 5) {
        const used = tracker?.triggeredThisCombat.has('relentless_endurance') ?? false;
        passives.push({
          abilityName: 'Relentless Endurance',
          race,
          description: 'Once per combat, survive lethal blow at 1 HP',
          modifiers: {},
          conditional: true,
          condition: used ? 'Already triggered this combat' : 'Ready: will trigger on lethal blow',
        });
      }
      if (level >= 10) {
        const active = hpPercent <= 0.50;
        passives.push({
          abilityName: 'Blood Fury',
          race,
          description: '+25% damage when below 50% HP',
          modifiers: active ? { damageMultiplier: 1.25 } : {},
          conditional: true,
          condition: active ? 'ACTIVE: Below 50% HP' : `Inactive: HP at ${Math.round(hpPercent * 100)}%`,
        });
      }
      if (level >= 40) {
        const used = tracker?.triggeredThisCombat.has('orcish_rampage') ?? false;
        passives.push({
          abilityName: 'Orcish Rampage',
          race,
          description: 'Bonus attack after killing an enemy',
          modifiers: {},
          conditional: true,
          condition: used ? 'Already triggered this combat' : 'Ready: will trigger on kill',
        });
      }
      break;

    case 'nethkin':
      if (level >= 1) {
        passives.push({
          abilityName: 'Hellish Resistance',
          race,
          description: 'Fire damage halved',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 25) {
        passives.push({
          abilityName: 'Infernal Rebuke',
          race,
          description: 'Melee attackers take 1d6 fire damage',
          modifiers: { reflectMeleeDamage: 6 },
          conditional: false,
        });
      }
      break;

    case 'drakonid':
      if (level >= 5) {
        passives.push({
          abilityName: 'Draconic Scales',
          race,
          description: '+2 natural AC',
          modifiers: { acBonus: 2 },
          conditional: false,
        });
      }
      if (level >= 10) {
        passives.push({
          abilityName: 'Elemental Resistance',
          race,
          description: 'Half damage from ancestry element',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 40) {
        passives.push({
          abilityName: 'Ancient Wrath',
          race,
          description: 'Breath Weapon upgraded to 4d8, usable twice per combat',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'half_elf':
      if (level >= 1) {
        passives.push({
          abilityName: 'Fey Ancestry',
          race,
          description: 'Immune to magical sleep, advantage on charm saves',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'half_orc':
      if (level >= 1) {
        passives.push({
          abilityName: 'Savage Attacks',
          race,
          description: 'Critical hits deal an extra weapon damage die',
          modifiers: { extraCritDice: 1 },
          conditional: false,
        });
      }
      break;

    case 'gnome':
      if (level >= 5) {
        passives.push({
          abilityName: 'Gnome Cunning',
          race,
          description: 'Advantage on INT, WIS, CHA saves vs magic',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'beastfolk':
      if (level >= 5) {
        passives.push({
          abilityName: 'Natural Weapons',
          race,
          description: 'Unarmed attacks deal 1d6 + STR',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 40) {
        passives.push({
          abilityName: 'Apex Predator',
          race,
          description: '+30% damage to beasts and monsters',
          modifiers: { damageMultiplier: 1.30 },
          conditional: false,
        });
      }
      break;

    case 'faefolk':
      if (level >= 1) {
        passives.push({
          abilityName: 'Flutter',
          race,
          description: 'Dodge ground attacks (+1 AC)',
          modifiers: { acBonus: 1 },
          conditional: false,
        });
      }
      if (level >= 10) {
        passives.push({
          abilityName: 'Wild Magic Surge',
          race,
          description: '10% chance for random bonus effect on spell cast',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'goliath':
      if (level >= 5) {
        passives.push({
          abilityName: 'Powerful Build',
          race,
          description: 'Can wield two-handed weapons in one hand',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 10) {
        passives.push({
          abilityName: "Mountain's Embrace",
          race,
          description: 'Immune to cold damage',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 40) {
        passives.push({
          abilityName: "Titan's Grip",
          race,
          description: 'Melee damage permanently +1d8',
          modifiers: { damageFlatBonus: 4 },
          conditional: false,
        });
      }
      break;

    case 'nightborne':
      if (level >= 10) {
        passives.push({
          abilityName: 'Poison Mastery',
          race,
          description: '+25% poison damage',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'mosskin':
      if (level >= 10) {
        passives.push({
          abilityName: 'Druidic Magic',
          race,
          description: 'Nature spells have 25% shorter cooldowns and deal 20% more damage',
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'forgeborn':
      if (level >= 1) {
        passives.push({
          abilityName: 'Constructed Resilience',
          race,
          description: 'Immune to poison, disease, and sleep',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 5) {
        passives.push({
          abilityName: 'Integrated Armor',
          race,
          description: '+1 AC, armor cannot be removed',
          modifiers: { acBonus: 1 },
          conditional: false,
        });
      }
      break;

    case 'elementari':
      if (level >= 1) {
        passives.push({
          abilityName: 'Elemental Resistance',
          race,
          description: `Half damage from ${subRace?.element ?? 'own'} element`,
          modifiers: {},
          conditional: false,
        });
      }
      break;

    case 'revenant':
      if (level >= 5) {
        passives.push({
          abilityName: 'Necrotic Resistance',
          race,
          description: 'Immune to necrotic damage and disease',
          modifiers: {},
          conditional: false,
        });
      }
      if (level >= 25) {
        const used = tracker?.triggeredThisCombat.has('undying_fortitude') ?? false;
        passives.push({
          abilityName: 'Undying Fortitude',
          race,
          description: 'Once per combat, negate a killing blow',
          modifiers: {},
          conditional: true,
          condition: used ? 'Already triggered this combat' : 'Ready: will negate next killing blow',
        });
      }
      break;

    case 'changeling':
      if (level >= 40) {
        const active = !!tracker?.activeBuffs['thousand_faces'];
        passives.push({
          abilityName: 'Thousand Faces',
          race,
          description: 'Mid-combat shift grants +3 AC for 1 turn',
          modifiers: active ? { acBonus: 3 } : {},
          conditional: true,
          condition: active ? 'ACTIVE: Shifted this round' : 'Ready: use Thousand Faces action for AC boost',
        });
      }
      break;
  }

  // Add active buff passives from tracker
  if (tracker?.activeBuffs) {
    if (tracker.activeBuffs['beast_form']) {
      passives.push({
        abilityName: 'Beast Form (Active)',
        race: 'beastfolk',
        description: `+5 STR, +2 natural AC — ${tracker.activeBuffs['beast_form'].remainingRounds} rounds remaining`,
        modifiers: { statBonuses: { str: 5 }, acBonus: 2 },
        conditional: true,
        condition: 'ACTIVE',
      });
    }
    if (tracker.activeBuffs['soul_bargain']) {
      passives.push({
        abilityName: 'Soul Bargain (Active)',
        race: 'nethkin',
        description: `2x spell damage — ${tracker.activeBuffs['soul_bargain'].remainingRounds} rounds remaining`,
        modifiers: { damageMultiplier: 2.0 },
        conditional: true,
        condition: 'ACTIVE',
      });
    }
    if (tracker.activeBuffs['siege_mode']) {
      passives.push({
        abilityName: 'Siege Mode (Active)',
        race: 'forgeborn',
        description: `+5 AC, +50% damage — ${tracker.activeBuffs['siege_mode'].remainingRounds} rounds remaining`,
        modifiers: { acBonus: 5, damageMultiplier: 1.50 },
        conditional: true,
        condition: 'ACTIVE',
      });
    }
    if (tracker.activeBuffs['guardian_form']) {
      passives.push({
        abilityName: 'Guardian Form (Active)',
        race: 'mosskin',
        description: `+6 STR, +4 CON, +3 AC — ${tracker.activeBuffs['guardian_form'].remainingRounds} rounds remaining`,
        modifiers: { statBonuses: { str: 6, con: 4 }, acBonus: 3 },
        conditional: true,
        condition: 'ACTIVE',
      });
    }
    if (tracker.activeBuffs['primordial_awakening']) {
      passives.push({
        abilityName: 'Primordial Awakening (Active)',
        race: 'elementari',
        description: `Elemental form: +10 AC, 2d10 AoE/turn — ${tracker.activeBuffs['primordial_awakening'].remainingRounds} rounds remaining`,
        modifiers: { acBonus: 10 },
        conditional: true,
        condition: 'ACTIVE',
      });
    }
    if (tracker.activeBuffs['unstoppable_force']) {
      const hits = (tracker.activeBuffs['unstoppable_force'].data.autoHitsRemaining as number) ?? 0;
      passives.push({
        abilityName: 'Unstoppable Force (Active)',
        race: 'half_orc',
        description: `${hits} auto-hit attacks remaining`,
        modifiers: {},
        conditional: true,
        condition: 'ACTIVE',
      });
    }
  }

  return passives;
}

/**
 * Get the unarmed weapon stats for Beastfolk Natural Weapons.
 * Used as a fallback weapon if no weapon is equipped.
 */
export function getBeastfolkNaturalWeapon(level: number): {
  id: string; name: string; diceCount: number; diceSides: number;
  damageModifierStat: 'str'; attackModifierStat: 'str'; bonusDamage: number; bonusAttack: number;
} | null {
  if (level >= 5) {
    return {
      id: 'natural_weapons',
      name: 'Claws/Bite',
      diceCount: 1,
      diceSides: 6,
      damageModifierStat: 'str',
      attackModifierStat: 'str',
      bonusDamage: 0,
      bonusAttack: 0,
    };
  }
  return null;
}
