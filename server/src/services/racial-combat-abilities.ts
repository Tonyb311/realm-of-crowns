/**
 * Racial Combat Abilities — resolves active and passive racial abilities in combat.
 * Pure functions: takes combat state in, returns modified combat state out.
 */

import type {
  CombatState,
  Combatant,
  StatusEffectName,
  CharacterStats,
  TurnResult,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { damageRoll, roll, advantage, savingThrow, attackRoll } from '@shared/utils/dice';
import { applyStatusEffect, calculateDamage, resolveAttack } from '../lib/combat-engine';
import type { RacialAbility } from '@shared/types/race';

// ---- Types ----

export interface RacialAbilityResult {
  success: boolean;
  abilityName: string;
  description: string;
  state: CombatState;
  combatLog: RacialCombatLogEntry[];
}

export interface RacialCombatLogEntry {
  type: 'racial_ability';
  actorId: string;
  abilityName: string;
  targetIds?: string[];
  damage?: number;
  healing?: number;
  statusApplied?: string;
  statusDuration?: number;
  message: string;
}

/** Per-combat tracking for uses-per-combat abilities and triggered passives. */
export interface RacialCombatTracker {
  /** abilityKey -> uses remaining this combat */
  usesRemaining: Record<string, number>;
  /** Tracks one-time triggers like Relentless Endurance */
  triggeredThisCombat: Set<string>;
  /** Tracks active buffs like Soul Bargain */
  activeBuffs: Record<string, { remainingRounds: number; data: Record<string, unknown> }>;
}

export function createRacialCombatTracker(): RacialCombatTracker {
  return {
    usesRemaining: {},
    triggeredThisCombat: new Set(),
    activeBuffs: {},
  };
}

// ---- Passive Stat Modifiers ----

export interface PassiveModifiers {
  acBonus: number;
  attackBonus: number;
  damageMultiplier: number;  // 1.0 = no change, 1.25 = +25%
  damageFlatBonus: number;
  extraCritDice: number;
  saveBonus: number;
  /** If true, use advantage on ranged attacks */
  rangedAdvantage: boolean;
  /** If true, melee attackers take reflected damage */
  reflectMeleeDamage: number;
  /** Specific stat bonuses */
  statBonuses: Partial<CharacterStats>;
}

function emptyModifiers(): PassiveModifiers {
  return {
    acBonus: 0,
    attackBonus: 0,
    damageMultiplier: 1.0,
    damageFlatBonus: 0,
    extraCritDice: 0,
    saveBonus: 0,
    rangedAdvantage: false,
    reflectMeleeDamage: 0,
    statBonuses: {},
  };
}

/**
 * Calculate all passive racial modifiers for a combatant based on race, level, HP, etc.
 * Called once per turn to determine stat modifications.
 */
export function getPassiveModifiers(
  combatant: Combatant,
  race: string,
  level: number,
  subRace?: { id: string; element?: string } | null,
  tracker?: RacialCombatTracker,
): PassiveModifiers {
  const mods = emptyModifiers();
  const hpPercent = combatant.currentHp / combatant.maxHp;

  switch (race) {
    case 'human':
      // Indomitable Will — tracked via reroll, not a stat modifier
      break;

    case 'elf':
      // Elven Accuracy (level 5): advantage on ranged attacks
      if (level >= 5) {
        mods.rangedAdvantage = true;
      }
      break;

    case 'dwarf':
      // Dwarven Resilience (level 5): +3 poison saves — handled in save resolution
      if (level >= 5) {
        mods.saveBonus += 3; // Applies specifically vs poison, simplified to general save bonus
      }
      // Ancestral Fury (level 40): below 25% HP -> +5 STR, +5 CON
      if (level >= 40 && hpPercent <= 0.25) {
        mods.statBonuses.str = (mods.statBonuses.str ?? 0) + 5;
        mods.statBonuses.con = (mods.statBonuses.con ?? 0) + 5;
      }
      break;

    case 'orc':
      // Intimidating Presence (level 1): -1 enemy first attack — tracked per-target in tracker
      // Blood Fury (level 10): +25% damage below 50% HP
      if (level >= 10 && hpPercent <= 0.50) {
        mods.damageMultiplier *= 1.25;
      }
      break;

    case 'nethkin':
      // Hellish Resistance (level 1): fire resist 50% — handled in damage resolution by type
      // Infernal Rebuke (level 25): melee attackers take 1d6 fire damage
      if (level >= 25) {
        mods.reflectMeleeDamage = 6; // 1d6 average=3.5, stored as max die size
      }
      break;

    case 'drakonid':
      // Draconic Scales (level 5): +2 AC
      if (level >= 5) {
        mods.acBonus += 2;
      }
      break;

    case 'half_elf':
      // Fey Ancestry (level 1): charm immunity — handled in status effect application
      break;

    case 'half_orc':
      // Savage Attacks (level 1): extra die on crit
      if (level >= 1) {
        mods.extraCritDice = 1;
      }
      break;

    case 'gnome':
      // Gnome Cunning (level 5): advantage on INT/WIS/CHA saves vs magic — handled in save resolution
      break;

    case 'beastfolk':
      // Natural Weapons (level 5): 1d6+STR unarmed — handled in weapon resolution as fallback
      // Apex Predator (level 40): +30% damage to beasts/monsters
      if (level >= 40 && combatant.entityType === 'character') {
        // We apply this as a general damage bonus; the combat controller
        // should only apply it vs monster-type combatants
        mods.damageMultiplier *= 1.30;
      }
      break;

    case 'faefolk':
      // Flutter (level 1): dodge ground attacks — simplified to +1 AC
      if (level >= 1) {
        mods.acBonus += 1;
      }
      break;

    case 'goliath':
      // Powerful Build (level 5): 2H weapons in 1H — handled in weapon equip
      // Titan's Grip (level 40): +1d8 melee damage
      if (level >= 40) {
        mods.damageFlatBonus += 4; // Average of 1d8, applied as flat bonus; actual roll in resolveAttack
      }
      break;

    case 'nightborne':
      // Poison Mastery (level 10): +25% poison damage — handled per damage type
      break;

    case 'forgeborn':
      // Integrated Armor (level 5): +1 AC
      if (level >= 5) {
        mods.acBonus += 1;
      }
      // Constructed Resilience (level 1): poison immunity — handled in status effect
      break;

    case 'elementari':
      // Elemental Resistance (level 1): half damage from own element — per damage type
      break;

    case 'revenant':
      // Necrotic Resistance (level 5): necrotic immunity — per damage type
      break;

    case 'changeling':
      // Thousand Faces (level 40): +3 AC for 1 turn after shift
      if (level >= 40 && tracker?.activeBuffs['thousand_faces']) {
        mods.acBonus += 3;
      }
      break;

    case 'mosskin':
      // Druidic Magic (level 10): +20% nature spell damage — per spell type
      break;
  }

  // Apply active buff modifiers from tracker
  if (tracker?.activeBuffs) {
    // Soul Bargain (Nethkin)
    if (tracker.activeBuffs['soul_bargain']) {
      mods.damageMultiplier *= 2.0;
    }
    // Siege Mode (Forgeborn)
    if (tracker.activeBuffs['siege_mode']) {
      mods.acBonus += 5;
      mods.damageMultiplier *= 1.50;
    }
    // Beast Form (Beastfolk)
    if (tracker.activeBuffs['beast_form']) {
      mods.statBonuses.str = (mods.statBonuses.str ?? 0) + 5;
      mods.acBonus += 2; // natural armor in beast form
    }
    // Guardian Form (Mosskin)
    if (tracker.activeBuffs['guardian_form']) {
      mods.statBonuses.str = (mods.statBonuses.str ?? 0) + 6;
      mods.statBonuses.con = (mods.statBonuses.con ?? 0) + 4;
      mods.acBonus += 3;
    }
    // Primordial Awakening (Elementari)
    if (tracker.activeBuffs['primordial_awakening']) {
      // Physical immunity simplified to massive AC bonus
      mods.acBonus += 10;
    }
    // Unstoppable Force (Half-Orc) — auto-hit tracked separately
  }

  return mods;
}

// ---- Active Ability Resolution ----

/**
 * Main resolver: dispatches to race-specific ability handler.
 * Returns updated combat state and log entries.
 */
export function resolveRacialAbility(
  state: CombatState,
  actorId: string,
  abilityName: string,
  race: string,
  level: number,
  tracker: RacialCombatTracker,
  targetIds?: string[],
  subRace?: { id: string; element?: string } | null,
): RacialAbilityResult {
  const actor = state.combatants.find(c => c.id === actorId);
  if (!actor || !actor.isAlive) {
    return {
      success: false,
      abilityName,
      description: 'Actor not found or dead',
      state,
      combatLog: [],
    };
  }

  switch (race) {
    case 'human': return resolveHumanAbility(state, actor, abilityName, level, tracker);
    case 'elf': return resolveElfAbility(state, actor, abilityName, level, tracker);
    case 'dwarf': return resolveDwarfAbility(state, actor, abilityName, level, tracker);
    case 'harthfolk': return resolveHarthfolkAbility(state, actor, abilityName, level, tracker);
    case 'orc': return resolveOrcAbility(state, actor, abilityName, level, tracker);
    case 'nethkin': return resolveNethkinAbility(state, actor, abilityName, level, tracker);
    case 'drakonid': return resolveDrakonidAbility(state, actor, abilityName, level, tracker, targetIds, subRace);
    case 'half_elf': return resolveHalfElfAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'half_orc': return resolveHalfOrcAbility(state, actor, abilityName, level, tracker);
    case 'gnome': return resolveGnomeAbility(state, actor, abilityName, level, tracker);
    case 'merfolk': return resolveMerfolkAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'beastfolk': return resolveBeastfolkAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'faefolk': return resolveFaefolkAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'goliath': return resolveGoliathAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'nightborne': return resolveNightborneAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'mosskin': return resolveMosskinAbility(state, actor, abilityName, level, tracker);
    case 'forgeborn': return resolveForgebornAbility(state, actor, abilityName, level, tracker);
    case 'elementari': return resolveElementariAbility(state, actor, abilityName, level, tracker, targetIds, subRace);
    case 'revenant': return resolveRevenantAbility(state, actor, abilityName, level, tracker, targetIds);
    case 'changeling': return resolveChangelingAbility(state, actor, abilityName, level, tracker, targetIds);
    default:
      return {
        success: false,
        abilityName,
        description: `Unknown race: ${race}`,
        state,
        combatLog: [],
      };
  }
}

// ---- Helper Functions ----

function makeLog(
  actorId: string,
  abilityName: string,
  message: string,
  extra?: Partial<RacialCombatLogEntry>,
): RacialCombatLogEntry {
  return { type: 'racial_ability', actorId, abilityName, message, ...extra };
}

function updateCombatant(state: CombatState, id: string, updates: Partial<Combatant>): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c => c.id === id ? { ...c, ...updates } : c),
  };
}

function getEnemies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team !== actor.team && c.isAlive);
}

function getAllies(state: CombatState, actor: Combatant): Combatant[] {
  return state.combatants.filter(c => c.team === actor.team && c.isAlive && c.id !== actor.id);
}

function checkUsesRemaining(tracker: RacialCombatTracker, key: string, maxUses: number): boolean {
  if (tracker.usesRemaining[key] === undefined) {
    tracker.usesRemaining[key] = maxUses;
  }
  return tracker.usesRemaining[key] > 0;
}

function consumeUse(tracker: RacialCombatTracker, key: string): void {
  if (tracker.usesRemaining[key] !== undefined) {
    tracker.usesRemaining[key]--;
  }
}

function fail(state: CombatState, abilityName: string, reason: string): RacialAbilityResult {
  return { success: false, abilityName, description: reason, state, combatLog: [] };
}

// ---- Race-Specific Resolvers ----

// ==== HUMAN ====
function resolveHumanAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Rally the People': {
      if (level < 10) return fail(state, abilityName, 'Requires level 10');
      // Party buff: +2 all stats (applied as blessed status for simplicity)
      const allies = getAllies(state, actor);
      let current = state;
      const logs: RacialCombatLogEntry[] = [];

      // Apply blessed to all allies and self
      const targets = [actor, ...allies];
      for (const target of targets) {
        current = updateCombatant(current, target.id, {
          statusEffects: [
            ...target.statusEffects.filter(e => e.name !== 'blessed'),
            { id: `rally-${actor.id}-${Date.now()}`, name: 'blessed', remainingRounds: 5, sourceId: actor.id },
          ],
        });
      }

      logs.push(makeLog(actor.id, abilityName, `${actor.name} rallies the party! All allies gain +2 attack and saves for 5 rounds.`, {
        targetIds: targets.map(t => t.id),
        statusApplied: 'blessed',
        statusDuration: 5,
      }));

      return { success: true, abilityName, description: 'Party buff: +2 all stats', state: current, combatLog: logs };
    }

    case 'Indomitable Will': {
      // Passive: tracked as a reroll charge. The combat engine checks this.
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'indomitable_will', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'indomitable_will');
      return {
        success: true,
        abilityName,
        description: 'Save reroll consumed',
        state,
        combatLog: [makeLog(actor.id, abilityName, `${actor.name}'s indomitable will allows a saving throw reroll!`)],
      };
    }

    default:
      return fail(state, abilityName, `Unknown Human ability: ${abilityName}`);
  }
}

// ==== ELF ====
function resolveElfAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Spirit Walk': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      // Invisibility for combat: enemies have disadvantage to attack (hasted + shielded approximation)
      const updated = applyStatusEffect(actor, 'shielded', 3, actor.id);
      const current = updateCombatant(state, actor.id, { statusEffects: updated.statusEffects });
      return {
        success: true,
        abilityName,
        description: 'Invisibility: +4 AC for 3 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName, `${actor.name} fades from sight, becoming invisible!`, {
          statusApplied: 'shielded',
          statusDuration: 3,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Unknown Elf ability: ${abilityName}`);
  }
}

// ==== DWARF ====
function resolveDwarfAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, _tracker: RacialCombatTracker,
): RacialAbilityResult {
  // Dwarven Resilience and Ancestral Fury are both passives handled in getPassiveModifiers
  return fail(state, abilityName, `Dwarf ability '${abilityName}' is passive or unknown`);
}

// ==== HARTHFOLK ====
function resolveHarthfolkAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Harthfolk Luck': {
      if (level < 1) return fail(state, abilityName, 'Requires level 1');
      if (!checkUsesRemaining(tracker, 'harthfolk_luck', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'harthfolk_luck');
      return {
        success: true,
        abilityName,
        description: 'D20 reroll consumed',
        state,
        combatLog: [makeLog(actor.id, abilityName, `${actor.name}'s harthfolk luck allows a d20 reroll!`)],
      };
    }

    default:
      return fail(state, abilityName, `Unknown Harthfolk ability: ${abilityName}`);
  }
}

// ==== ORC ====
function resolveOrcAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Clan Warhorn': {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      // Party buff: +3 STR approximated as blessed + hasted
      const allies = getAllies(state, actor);
      let current = state;
      const targets = [actor, ...allies];
      for (const target of targets) {
        current = updateCombatant(current, target.id, {
          statusEffects: [
            ...target.statusEffects.filter(e => e.name !== 'blessed'),
            { id: `warhorn-${actor.id}-${Date.now()}`, name: 'blessed', remainingRounds: 5, sourceId: actor.id },
          ],
        });
      }
      return {
        success: true,
        abilityName,
        description: 'Party buff: +2 attack/saves for 5 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName, `${actor.name} sounds the Clan Warhorn! All allies are emboldened.`, {
          targetIds: targets.map(t => t.id),
          statusApplied: 'blessed',
          statusDuration: 5,
        })],
      };
    }

    default:
      // Intimidating Presence, Relentless Endurance, Blood Fury, Orcish Rampage are passives
      return fail(state, abilityName, `Orc ability '${abilityName}' is passive or unknown`);
  }
}

// ==== NETHKIN ====
function resolveNethkinAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Whispers of the Damned': {
      if (level < 15) return fail(state, abilityName, 'Requires level 15');
      return {
        success: true,
        abilityName,
        description: 'Inspects target stats and equipment',
        state,
        combatLog: [makeLog(actor.id, abilityName, `${actor.name} whispers a dark incantation, revealing enemy secrets.`)],
      };
    }

    case 'Soul Bargain': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'soul_bargain', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'soul_bargain');

      // Sacrifice 25% HP
      const hpCost = Math.floor(actor.maxHp * 0.25);
      const newHp = Math.max(1, actor.currentHp - hpCost);
      let current = updateCombatant(state, actor.id, { currentHp: newHp });

      // Activate double damage buff for 3 rounds
      tracker.activeBuffs['soul_bargain'] = { remainingRounds: 3, data: {} };

      return {
        success: true,
        abilityName,
        description: `Sacrificed ${hpCost} HP for 2x spell damage for 3 rounds`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} strikes a soul bargain! Sacrifices ${hpCost} HP for devastating power.`, {
          damage: hpCost,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Nethkin ability '${abilityName}' is passive or unknown`);
  }
}

// ==== DRAKONID ====
function resolveDrakonidAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[], subRace?: { id: string; element?: string } | null,
): RacialAbilityResult {
  const element = subRace?.element ?? 'fire';

  switch (abilityName) {
    case 'Breath Weapon': {
      // Base: 2d6 at level 1, upgraded to 4d8 at level 40 (Ancient Wrath)
      const maxUses = level >= 40 ? 2 : 1;
      const key = 'breath_weapon';
      if (!checkUsesRemaining(tracker, key, maxUses)) {
        return fail(state, abilityName, 'No uses remaining this combat');
      }
      consumeUse(tracker, key);

      const diceCount = level >= 40 ? 4 : 2;
      const diceSides = level >= 40 ? 8 : 6;
      const dmg = damageRoll(diceCount, diceSides);
      const totalDamage = dmg.total;

      const enemies = getEnemies(state, actor);
      let current = state;
      const logs: RacialCombatLogEntry[] = [];
      const hitTargets: string[] = [];

      for (const enemy of enemies) {
        // DEX save DC = 8 + CON mod + proficiency
        const conMod = getModifier(actor.stats.con);
        const proficiency = Math.floor(actor.level / 4) + 2;
        const saveDC = 8 + conMod + proficiency;
        const dexMod = getModifier(enemy.stats.dex);
        const save = savingThrow(dexMod, saveDC);

        const actualDamage = save.success ? Math.floor(totalDamage / 2) : totalDamage;
        const newHp = Math.max(0, enemy.currentHp - actualDamage);

        current = updateCombatant(current, enemy.id, {
          currentHp: newHp,
          isAlive: newHp > 0,
        });
        hitTargets.push(enemy.id);
      }

      logs.push(makeLog(actor.id, abilityName,
        `${actor.name} unleashes a ${element} breath weapon for ${totalDamage} damage!`, {
        targetIds: hitTargets,
        damage: totalDamage,
      }));

      return { success: true, abilityName, description: `${element} breath: ${diceCount}d${diceSides}`, state: current, combatLog: logs };
    }

    case 'Frightful Presence': {
      if (level < 15) return fail(state, abilityName, 'Requires level 15');
      if (!checkUsesRemaining(tracker, 'frightful_presence', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'frightful_presence');

      const enemies = getEnemies(state, actor);
      let current = state;
      const logs: RacialCombatLogEntry[] = [];

      const wisMod = getModifier(actor.stats.wis);
      const proficiency = Math.floor(actor.level / 4) + 2;
      const saveDC = 8 + wisMod + proficiency;

      for (const enemy of enemies) {
        const save = savingThrow(getModifier(enemy.stats.wis), saveDC);
        if (!save.success) {
          // Frightened = weakened (attack and save penalties)
          const updated = applyStatusEffect(enemy, 'weakened', 2, actor.id);
          current = updateCombatant(current, enemy.id, { statusEffects: updated.statusEffects });
        }
      }

      logs.push(makeLog(actor.id, abilityName,
        `${actor.name}'s frightful presence terrifies enemies! (DC ${saveDC} WIS save)`, {
        targetIds: enemies.map(e => e.id),
        statusApplied: 'weakened',
        statusDuration: 2,
      }));

      return { success: true, abilityName, description: 'AoE fear effect', state: current, combatLog: logs };
    }

    default:
      return fail(state, abilityName, `Drakonid ability '${abilityName}' is passive or unknown`);
  }
}

// ==== HALF-ELF ====
function resolveHalfElfAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  _targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Inspiring Presence': {
      if (level < 10) return fail(state, abilityName, 'Requires level 10');
      const allies = getAllies(state, actor);
      let current = state;
      const targets = [actor, ...allies];

      for (const target of targets) {
        current = updateCombatant(current, target.id, {
          statusEffects: [
            ...target.statusEffects.filter(e => e.name !== 'blessed'),
            { id: `inspire-${actor.id}-${Date.now()}`, name: 'blessed', remainingRounds: 5, sourceId: actor.id },
          ],
        });
      }

      return {
        success: true,
        abilityName,
        description: 'Party: +2 attack and saves for 5 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name}'s inspiring presence bolsters all allies!`, {
          targetIds: targets.map(t => t.id),
          statusApplied: 'blessed',
          statusDuration: 5,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Half-Elf ability '${abilityName}' is passive or unknown`);
  }
}

// ==== HALF-ORC ====
function resolveHalfOrcAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Unstoppable Force': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'unstoppable_force', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'unstoppable_force');

      // Grant 3 auto-hit attacks
      tracker.activeBuffs['unstoppable_force'] = { remainingRounds: 3, data: { autoHitsRemaining: 3 } };

      return {
        success: true,
        abilityName,
        description: 'Next 3 attacks automatically hit',
        state,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} becomes an unstoppable force! Next 3 attacks cannot miss.`)],
      };
    }

    default:
      return fail(state, abilityName, `Half-Orc ability '${abilityName}' is passive or unknown`);
  }
}

// ==== GNOME ====
function resolveGnomeAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, _tracker: RacialCombatTracker,
): RacialAbilityResult {
  // All Gnome combat abilities are passive (Gnome Cunning)
  return fail(state, abilityName, `Gnome ability '${abilityName}' is passive or unknown`);
}

// ==== MERFOLK ====
function resolveMerfolkAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Tidal Healing': {
      if (level < 5) return fail(state, abilityName, 'Requires level 5');
      const healAmount = Math.floor(actor.maxHp * 0.25);
      const newHp = Math.min(actor.maxHp, actor.currentHp + healAmount);
      const current = updateCombatant(state, actor.id, { currentHp: newHp });

      return {
        success: true,
        abilityName,
        description: `Healed ${healAmount} HP`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} channels the healing power of the tides, restoring ${healAmount} HP.`, {
          healing: healAmount,
        })],
      };
    }

    case 'Call of the Deep': {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      if (!checkUsesRemaining(tracker, 'call_of_the_deep', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'call_of_the_deep');

      // Summon a water elemental as a combatant on the actor's team
      const elemental: Combatant = {
        id: `water-elemental-${actor.id}-${Date.now()}`,
        name: 'Water Elemental',
        entityType: 'monster',
        team: actor.team,
        stats: { str: 14, dex: 12, con: 16, int: 6, wis: 10, cha: 6 },
        level: actor.level,
        currentHp: Math.floor(actor.maxHp * 0.5),
        maxHp: Math.floor(actor.maxHp * 0.5),
        ac: 14,
        initiative: actor.initiative - 1,
        statusEffects: [],
        spellSlots: {},
        weapon: { id: 'slam', name: 'Water Slam', diceCount: 2, diceSides: 6, damageModifierStat: 'str', attackModifierStat: 'str', bonusDamage: 0, bonusAttack: 2 },
        isAlive: true,
        isDefending: false,
        proficiencyBonus: 2,
      };

      const current: CombatState = {
        ...state,
        combatants: [...state.combatants, elemental],
        turnOrder: [...state.turnOrder, elemental.id],
      };

      return {
        success: true,
        abilityName,
        description: 'Summoned a Water Elemental',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} calls upon the deep! A Water Elemental surges forth to fight!`)],
      };
    }

    case 'Tsunami Strike': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'tsunami_strike', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'tsunami_strike');

      const dmg = damageRoll(3, 8);
      const enemies = getEnemies(state, actor);
      let current = state;
      const logs: RacialCombatLogEntry[] = [];

      for (const enemy of enemies) {
        const dexMod = getModifier(enemy.stats.dex);
        const proficiency = Math.floor(actor.level / 4) + 2;
        const saveDC = 8 + getModifier(actor.stats.wis) + proficiency;
        const save = savingThrow(dexMod, saveDC);

        const actualDamage = save.success ? Math.floor(dmg.total / 2) : dmg.total;
        const newHp = Math.max(0, enemy.currentHp - actualDamage);

        let updatedEnemy = { ...enemy, currentHp: newHp, isAlive: newHp > 0 };

        // Knock prone (stunned for 1 round) if save failed
        if (!save.success) {
          const stunned = applyStatusEffect(updatedEnemy, 'stunned', 1, actor.id);
          updatedEnemy = { ...updatedEnemy, statusEffects: stunned.statusEffects };
        }

        current = updateCombatant(current, enemy.id, updatedEnemy);
      }

      logs.push(makeLog(actor.id, abilityName,
        `${actor.name} unleashes a massive tsunami strike for ${dmg.total} water damage!`, {
        targetIds: enemies.map(e => e.id),
        damage: dmg.total,
        statusApplied: 'stunned',
        statusDuration: 1,
      }));

      return { success: true, abilityName, description: `AoE: 3d8 water damage + prone`, state: current, combatLog: logs };
    }

    default:
      return fail(state, abilityName, `Merfolk ability '${abilityName}' is passive or unknown`);
  }
}

// ==== BEASTFOLK ====
function resolveBeastfolkAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Beast Form': {
      if (level < 15) return fail(state, abilityName, 'Requires level 15');
      if (tracker.activeBuffs['beast_form']) return fail(state, abilityName, 'Already in beast form');

      tracker.activeBuffs['beast_form'] = { remainingRounds: 5, data: {} };

      return {
        success: true,
        abilityName,
        description: 'Transformed into beast form: +5 STR, +2 natural AC',
        state,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} transforms into a fearsome beast! Gains massive strength and natural armor.`)],
      };
    }

    case "Alpha's Howl": {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      const allies = getAllies(state, actor);
      let current = state;
      const targets = [actor, ...allies];

      for (const target of targets) {
        // Apply hasted (represents +2 attack / +2 AC)
        const updated = applyStatusEffect(target, 'hasted', 5, actor.id);
        current = updateCombatant(current, target.id, { statusEffects: updated.statusEffects });
      }

      return {
        success: true,
        abilityName,
        description: 'Party: +2 attack, +2 AC for 5 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} lets out a primal howl! The pack is emboldened.`, {
          targetIds: targets.map(t => t.id),
          statusApplied: 'hasted',
          statusDuration: 5,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Beastfolk ability '${abilityName}' is passive or unknown`);
  }
}

// ==== FAEFOLK ====
function resolveFaefolkAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Wild Magic Surge': {
      // Passive: 10% chance on spell cast. Can be triggered externally.
      if (level < 10) return fail(state, abilityName, 'Requires level 10');
      const surgeRoll = roll(10);
      if (surgeRoll !== 1) {
        return { success: false, abilityName, description: 'Wild magic did not trigger', state, combatLog: [] };
      }
      // Random bonus effect: roll 1d4 for type
      const effectRoll = roll(4);
      let current = state;
      let message = '';

      switch (effectRoll) {
        case 1: {
          // Heal self for 2d8
          const heal = damageRoll(2, 8);
          const newHp = Math.min(actor.maxHp, actor.currentHp + heal.total);
          current = updateCombatant(current, actor.id, { currentHp: newHp });
          message = `Wild magic surges! ${actor.name} is healed for ${heal.total} HP.`;
          break;
        }
        case 2: {
          // Deal 3d6 to random enemy
          const enemies = getEnemies(state, actor);
          if (enemies.length > 0) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            const dmg = damageRoll(3, 6);
            const newHp = Math.max(0, target.currentHp - dmg.total);
            current = updateCombatant(current, target.id, { currentHp: newHp, isAlive: newHp > 0 });
            message = `Wild magic surges! ${target.name} is struck by chaos for ${dmg.total} damage.`;
          }
          break;
        }
        case 3: {
          // Shield self
          const updated = applyStatusEffect(actor, 'shielded', 2, actor.id);
          current = updateCombatant(current, actor.id, { statusEffects: updated.statusEffects });
          message = `Wild magic surges! A protective barrier surrounds ${actor.name}.`;
          break;
        }
        case 4: {
          // Haste self
          const updated = applyStatusEffect(actor, 'hasted', 2, actor.id);
          current = updateCombatant(current, actor.id, { statusEffects: updated.statusEffects });
          message = `Wild magic surges! ${actor.name} is filled with fey speed.`;
          break;
        }
      }

      return {
        success: true,
        abilityName,
        description: 'Wild magic surge triggered!',
        state: current,
        combatLog: [makeLog(actor.id, abilityName, message)],
      };
    }

    case "Nature's Wrath": {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      if (!checkUsesRemaining(tracker, 'natures_wrath', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'natures_wrath');

      const enemies = getEnemies(state, actor);
      let current = state;

      for (const enemy of enemies) {
        // Entangle: stunned for 2 rounds (can't move/act)
        const updated = applyStatusEffect(enemy, 'stunned', 2, actor.id);
        current = updateCombatant(current, enemy.id, { statusEffects: updated.statusEffects });
      }

      return {
        success: true,
        abilityName,
        description: 'All enemies entangled for 2 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} calls upon nature's wrath! Roots and vines entangle all enemies.`, {
          targetIds: enemies.map(e => e.id),
          statusApplied: 'stunned',
          statusDuration: 2,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Faefolk ability '${abilityName}' is passive or unknown`);
  }
}

// ==== GOLIATH ====
function resolveGoliathAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case "Stone's Endurance": {
      if (level < 1) return fail(state, abilityName, 'Requires level 1');
      if (!checkUsesRemaining(tracker, 'stones_endurance', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'stones_endurance');

      // Reduce incoming damage by 1d12 + CON mod
      const conMod = getModifier(actor.stats.con);
      const reduction = damageRoll(1, 12, conMod);
      // Apply as temporary shielded effect
      const updated = applyStatusEffect(actor, 'shielded', 1, actor.id);
      const current = updateCombatant(state, actor.id, { statusEffects: updated.statusEffects });

      return {
        success: true,
        abilityName,
        description: `Damage reduced by ${reduction.total}`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name}'s stone-like skin absorbs the blow, reducing damage by ${reduction.total}!`)],
      };
    }

    case 'Earthshaker': {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      if (!checkUsesRemaining(tracker, 'earthshaker', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'earthshaker');

      const dmg = damageRoll(2, 6);
      const enemies = getEnemies(state, actor);
      let current = state;

      const strMod = getModifier(actor.stats.str);
      const proficiency = Math.floor(actor.level / 4) + 2;
      const saveDC = 8 + strMod + proficiency;

      for (const enemy of enemies) {
        const save = savingThrow(getModifier(enemy.stats.dex), saveDC);
        const actualDamage = save.success ? Math.floor(dmg.total / 2) : dmg.total;
        const newHp = Math.max(0, enemy.currentHp - actualDamage);

        let updatedEnemy = { ...enemy, currentHp: newHp, isAlive: newHp > 0 };
        if (!save.success) {
          const stunned = applyStatusEffect(updatedEnemy, 'stunned', 1, actor.id);
          updatedEnemy = { ...updatedEnemy, statusEffects: stunned.statusEffects };
        }
        current = updateCombatant(current, enemy.id, updatedEnemy);
      }

      return {
        success: true,
        abilityName,
        description: `AoE: ${dmg.total} damage + prone`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} slams the ground! The earth shakes for ${dmg.total} damage! (DC ${saveDC} DEX save or prone)`, {
          targetIds: enemies.map(e => e.id),
          damage: dmg.total,
          statusApplied: 'stunned',
          statusDuration: 1,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Goliath ability '${abilityName}' is passive or unknown`);
  }
}

// ==== NIGHTBORNE ====
function resolveNightborneAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Nightborne Magic': {
      if (level < 5) return fail(state, abilityName, 'Requires level 5');
      if (!checkUsesRemaining(tracker, 'nightborne_magic', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'nightborne_magic');

      // Darkness: all enemies are blinded for 2 rounds
      const enemies = getEnemies(state, actor);
      let current = state;

      for (const enemy of enemies) {
        const updated = applyStatusEffect(enemy, 'blinded', 2, actor.id);
        current = updateCombatant(current, enemy.id, { statusEffects: updated.statusEffects });
      }

      return {
        success: true,
        abilityName,
        description: 'Darkness: all enemies blinded for 2 rounds',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} casts Darkness! All enemies are blinded.`, {
          targetIds: enemies.map(e => e.id),
          statusApplied: 'blinded',
          statusDuration: 2,
        })],
      };
    }

    case 'Shadow Step': {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      if (!checkUsesRemaining(tracker, 'shadow_step', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'shadow_step');

      // Teleport behind enemy: next attack has advantage (hasted for 1 round)
      const updated = applyStatusEffect(actor, 'hasted', 1, actor.id);
      const current = updateCombatant(state, actor.id, { statusEffects: updated.statusEffects });

      return {
        success: true,
        abilityName,
        description: 'Teleported: next attack has advantage',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} steps through the shadows, appearing behind the enemy!`, {
          statusApplied: 'hasted',
          statusDuration: 1,
        })],
      };
    }

    case "Matriarch's/Patriarch's Command": {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'dominate', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'dominate');

      const enemies = getEnemies(state, actor);
      if (enemies.length === 0) return fail(state, abilityName, 'No enemies to dominate');

      // Dominate weakest enemy: switch their team
      const target = targetIds?.[0]
        ? enemies.find(e => e.id === targetIds[0])
        : enemies.reduce((weakest, e) => e.currentHp < weakest.currentHp ? e : weakest);

      if (!target) return fail(state, abilityName, 'Target not found');

      // WIS save to resist
      const chaMod = getModifier(actor.stats.cha);
      const proficiency = Math.floor(actor.level / 4) + 2;
      const saveDC = 8 + chaMod + proficiency;
      const save = savingThrow(getModifier(target.stats.wis), saveDC);

      if (save.success) {
        return {
          success: false,
          abilityName,
          description: `${target.name} resisted domination (saved)`,
          state,
          combatLog: [makeLog(actor.id, abilityName,
            `${actor.name} attempts to dominate ${target.name}, but they resist!`)],
        };
      }

      // Switch team for 2 rounds (represented by applying a special marker)
      const current = updateCombatant(state, target.id, { team: actor.team });

      return {
        success: true,
        abilityName,
        description: `Dominated ${target.name}`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} dominates ${target.name}! They fight for you now.`, {
          targetIds: [target.id],
        })],
      };
    }

    default:
      return fail(state, abilityName, `Nightborne ability '${abilityName}' is passive or unknown`);
  }
}

// ==== MOSSKIN ====
function resolveMosskinAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Hidden Step': {
      if (level < 5) return fail(state, abilityName, 'Requires level 5');
      if (!checkUsesRemaining(tracker, 'hidden_step', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'hidden_step');

      // Invisibility until attack: shielded for 1 round
      const updated = applyStatusEffect(actor, 'shielded', 1, actor.id);
      const current = updateCombatant(state, actor.id, { statusEffects: updated.statusEffects });

      return {
        success: true,
        abilityName,
        description: 'Invisible until next attack',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} turns invisible, blending with the natural world.`, {
          statusApplied: 'shielded',
          statusDuration: 1,
        })],
      };
    }

    case 'Guardian Form': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (tracker.activeBuffs['guardian_form']) return fail(state, abilityName, 'Already in Guardian Form');

      // Transform: +6 STR, +4 CON, +3 AC, massive HP boost
      tracker.activeBuffs['guardian_form'] = { remainingRounds: 5, data: {} };

      // Also grant a HP boost (temporary)
      const hpBoost = Math.floor(actor.maxHp * 0.5);
      const current = updateCombatant(state, actor.id, {
        currentHp: actor.currentHp + hpBoost,
        maxHp: actor.maxHp + hpBoost,
      });

      return {
        success: true,
        abilityName,
        description: 'Transformed into Guardian (Treant) Form',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} transforms into a massive treant! Bark-like armor covers their body.`, {
          healing: hpBoost,
        })],
      };
    }

    default:
      return fail(state, abilityName, `Mosskin ability '${abilityName}' is passive or unknown`);
  }
}

// ==== FORGEBORN ====
function resolveForgebornAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
): RacialAbilityResult {
  switch (abilityName) {
    case 'Self-Repair': {
      if (level < 15) return fail(state, abilityName, 'Requires level 15');
      if (!checkUsesRemaining(tracker, 'self_repair', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'self_repair');

      const healAmount = Math.floor(actor.maxHp * 0.30);
      const newHp = Math.min(actor.maxHp, actor.currentHp + healAmount);
      const current = updateCombatant(state, actor.id, { currentHp: newHp });

      return {
        success: true,
        abilityName,
        description: `Self-repaired for ${healAmount} HP`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} engages self-repair protocols, restoring ${healAmount} HP.`, {
          healing: healAmount,
        })],
      };
    }

    case 'Siege Mode': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'siege_mode', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'siege_mode');

      tracker.activeBuffs['siege_mode'] = { remainingRounds: 3, data: {} };

      return {
        success: true,
        abilityName,
        description: 'Siege Mode: +5 AC, +50% damage for 3 rounds',
        state,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} locks into Siege Mode! Armor hardens, weapons charge to maximum.`)],
      };
    }

    default:
      return fail(state, abilityName, `Forgeborn ability '${abilityName}' is passive or unknown`);
  }
}

// ==== ELEMENTARI ====
function resolveElementariAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[], subRace?: { id: string; element?: string } | null,
): RacialAbilityResult {
  const element = subRace?.element ?? 'fire';

  switch (abilityName) {
    case 'Elemental Cantrip': {
      if (level < 5) return fail(state, abilityName, 'Requires level 5');

      const enemies = getEnemies(state, actor);
      const target = targetIds?.[0]
        ? enemies.find(e => e.id === targetIds[0])
        : enemies[0];

      if (!target) return fail(state, abilityName, 'No valid target');

      const dmg = damageRoll(1, 6);
      const newHp = Math.max(0, target.currentHp - dmg.total);
      const current = updateCombatant(state, target.id, { currentHp: newHp, isAlive: newHp > 0 });

      return {
        success: true,
        abilityName,
        description: `${element} cantrip: ${dmg.total} damage`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} hurls a bolt of ${element} energy for ${dmg.total} damage!`, {
          targetIds: [target.id],
          damage: dmg.total,
        })],
      };
    }

    case 'Elemental Burst': {
      if (level < 25) return fail(state, abilityName, 'Requires level 25');
      if (!checkUsesRemaining(tracker, 'elemental_burst', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'elemental_burst');

      const dmg = damageRoll(3, 8);
      const enemies = getEnemies(state, actor);
      let current = state;

      const intMod = getModifier(actor.stats.int);
      const proficiency = Math.floor(actor.level / 4) + 2;
      const saveDC = 8 + intMod + proficiency;

      for (const enemy of enemies) {
        const save = savingThrow(getModifier(enemy.stats.dex), saveDC);
        const actualDamage = save.success ? Math.floor(dmg.total / 2) : dmg.total;
        const newHp = Math.max(0, enemy.currentHp - actualDamage);
        current = updateCombatant(current, enemy.id, { currentHp: newHp, isAlive: newHp > 0 });
      }

      return {
        success: true,
        abilityName,
        description: `AoE ${element} burst: ${dmg.total} damage`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} unleashes a devastating ${element} burst for ${dmg.total} damage!`, {
          targetIds: enemies.map(e => e.id),
          damage: dmg.total,
        })],
      };
    }

    case 'Primordial Awakening': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (tracker.activeBuffs['primordial_awakening']) return fail(state, abilityName, 'Already awakened');

      tracker.activeBuffs['primordial_awakening'] = { remainingRounds: 3, data: { element } };

      return {
        success: true,
        abilityName,
        description: `Primordial ${element} form: massive AC + 2d10 damage/turn for 3 rounds`,
        state,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} transforms into a being of pure ${element}! Physical attacks pass through harmlessly.`)],
      };
    }

    default:
      return fail(state, abilityName, `Elementari ability '${abilityName}' is passive or unknown`);
  }
}

// ==== REVENANT ====
function resolveRevenantAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Life Drain': {
      if (level < 15) return fail(state, abilityName, 'Requires level 15');
      if (!checkUsesRemaining(tracker, 'life_drain', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'life_drain');

      const enemies = getEnemies(state, actor);
      const target = targetIds?.[0]
        ? enemies.find(e => e.id === targetIds[0])
        : enemies[0];

      if (!target) return fail(state, abilityName, 'No valid target');

      // Melee attack that heals for 50% of damage dealt
      const weapon = actor.weapon ?? {
        id: 'life_drain', name: 'Life Drain', diceCount: 2, diceSides: 6,
        damageModifierStat: 'str' as const, attackModifierStat: 'str' as const,
        bonusDamage: 0, bonusAttack: 0,
      };

      const atkMod = getModifier(actor.stats[weapon.attackModifierStat]);
      const targetAC = target.ac;
      const atkResult = attackRoll(atkMod, targetAC);

      if (!atkResult.hit) {
        return {
          success: false,
          abilityName,
          description: 'Life Drain attack missed',
          state,
          combatLog: [makeLog(actor.id, abilityName,
            `${actor.name} reaches for ${target.name}'s life force but misses!`)],
        };
      }

      const dmg = damageRoll(weapon.diceCount, weapon.diceSides, getModifier(actor.stats[weapon.damageModifierStat]));
      const totalDamage = atkResult.critical ? dmg.total * 2 : dmg.total;
      const healAmount = Math.floor(totalDamage * 0.50);
      const targetNewHp = Math.max(0, target.currentHp - totalDamage);
      const actorNewHp = Math.min(actor.maxHp, actor.currentHp + healAmount);

      let current = updateCombatant(state, target.id, { currentHp: targetNewHp, isAlive: targetNewHp > 0 });
      current = updateCombatant(current, actor.id, { currentHp: actorNewHp });

      return {
        success: true,
        abilityName,
        description: `Dealt ${totalDamage} damage, healed ${healAmount} HP`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} drains life from ${target.name}! ${totalDamage} damage dealt, ${healAmount} HP restored.`, {
          targetIds: [target.id],
          damage: totalDamage,
          healing: healAmount,
        })],
      };
    }

    case 'Army of the Dead': {
      if (level < 40) return fail(state, abilityName, 'Requires level 40');
      if (!checkUsesRemaining(tracker, 'army_of_the_dead', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'army_of_the_dead');

      // Summon 3 skeletal warriors
      const skeletons: Combatant[] = [];
      for (let i = 0; i < 3; i++) {
        skeletons.push({
          id: `skeleton-${actor.id}-${i}-${Date.now()}`,
          name: `Skeletal Warrior ${i + 1}`,
          entityType: 'monster',
          team: actor.team,
          stats: { str: 12, dex: 10, con: 14, int: 4, wis: 6, cha: 4 },
          level: Math.max(1, actor.level - 5),
          currentHp: Math.floor(actor.maxHp * 0.25),
          maxHp: Math.floor(actor.maxHp * 0.25),
          ac: 12,
          initiative: actor.initiative - 1,
          statusEffects: [],
          spellSlots: {},
          weapon: { id: 'bone_sword', name: 'Bone Sword', diceCount: 1, diceSides: 8, damageModifierStat: 'str', attackModifierStat: 'str', bonusDamage: 0, bonusAttack: 1 },
          isAlive: true,
          isDefending: false,
          proficiencyBonus: 2,
        });
      }

      const current: CombatState = {
        ...state,
        combatants: [...state.combatants, ...skeletons],
        turnOrder: [...state.turnOrder, ...skeletons.map(s => s.id)],
      };

      return {
        success: true,
        abilityName,
        description: 'Summoned 3 Skeletal Warriors',
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} raises the dead! Three skeletal warriors claw their way from the ground.`)],
      };
    }

    default:
      return fail(state, abilityName, `Revenant ability '${abilityName}' is passive or unknown`);
  }
}

// ==== CHANGELING ====
function resolveChangelingAbility(
  state: CombatState, actor: Combatant, abilityName: string, level: number, tracker: RacialCombatTracker,
  targetIds?: string[],
): RacialAbilityResult {
  switch (abilityName) {
    case 'Unsettling Visage': {
      if (level < 5) return fail(state, abilityName, 'Requires level 5');
      if (!checkUsesRemaining(tracker, 'unsettling_visage', 1)) {
        return fail(state, abilityName, 'Already used this combat');
      }
      consumeUse(tracker, 'unsettling_visage');

      // Force attacker to reroll a hit: apply weakened to the attacker for 1 round
      const enemies = getEnemies(state, actor);
      const target = targetIds?.[0]
        ? enemies.find(e => e.id === targetIds[0])
        : enemies[0];

      if (!target) return fail(state, abilityName, 'No valid target');

      const updated = applyStatusEffect(target, 'weakened', 1, actor.id);
      const current = updateCombatant(state, target.id, { statusEffects: updated.statusEffects });

      return {
        success: true,
        abilityName,
        description: `${target.name} unsettled for 1 round`,
        state: current,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} shifts their face to mirror ${target.name}'s own visage! ${target.name} is unsettled.`, {
          targetIds: [target.id],
          statusApplied: 'weakened',
          statusDuration: 1,
        })],
      };
    }

    case 'Thousand Faces': {
      // In combat: shift for +3 AC for 1 turn (tracked via activeBuffs)
      if (level < 40) return fail(state, abilityName, 'Requires level 40');

      tracker.activeBuffs['thousand_faces'] = { remainingRounds: 1, data: {} };

      return {
        success: true,
        abilityName,
        description: 'Mid-combat shift: +3 AC for 1 round',
        state,
        combatLog: [makeLog(actor.id, abilityName,
          `${actor.name} shifts form in the blink of an eye, confusing attackers! +3 AC.`)],
      };
    }

    default:
      return fail(state, abilityName, `Changeling ability '${abilityName}' is passive or unknown`);
  }
}

// ---- Passive Trigger Handlers (called from combat engine) ----

/**
 * Check if Relentless Endurance (Orc) or Undying Fortitude (Revenant) should trigger
 * on lethal damage. Returns modified HP if triggered.
 */
export function checkDeathPrevention(
  combatant: Combatant,
  incomingDamage: number,
  race: string,
  level: number,
  tracker: RacialCombatTracker,
): { prevented: boolean; newHp: number; abilityName?: string } {
  const projectedHp = combatant.currentHp - incomingDamage;
  if (projectedHp > 0) return { prevented: false, newHp: projectedHp };

  // Orc: Relentless Endurance (level 5) — survive at 1 HP
  if (race === 'orc' && level >= 5) {
    const key = 'relentless_endurance';
    if (!tracker.triggeredThisCombat.has(key)) {
      tracker.triggeredThisCombat.add(key);
      return { prevented: true, newHp: 1, abilityName: 'Relentless Endurance' };
    }
  }

  // Revenant: Undying Fortitude (level 25) — negate killing blow
  if (race === 'revenant' && level >= 25) {
    const key = 'undying_fortitude';
    if (!tracker.triggeredThisCombat.has(key)) {
      tracker.triggeredThisCombat.add(key);
      return { prevented: true, newHp: 1, abilityName: 'Undying Fortitude' };
    }
  }

  return { prevented: false, newHp: projectedHp };
}

/**
 * Check if Orcish Rampage should trigger after a kill.
 * Returns true if the actor gets a bonus attack.
 */
export function checkBonusAttackOnKill(
  race: string,
  level: number,
  tracker: RacialCombatTracker,
): boolean {
  if (race === 'orc' && level >= 40) {
    const key = 'orcish_rampage';
    if (!tracker.triggeredThisCombat.has(key)) {
      tracker.triggeredThisCombat.add(key);
      return true;
    }
  }
  return false;
}

/**
 * Check if Nethkin Infernal Rebuke should trigger on melee hit.
 * Returns fire damage to reflect back.
 */
export function checkMeleeReflect(
  race: string,
  level: number,
): number {
  if (race === 'nethkin' && level >= 25) {
    return damageRoll(1, 6).total;
  }
  return 0;
}

/**
 * Tick down active buff durations at end of a combatant's turn.
 * Removes expired buffs.
 */
export function tickActiveBuffs(tracker: RacialCombatTracker): void {
  for (const [key, buff] of Object.entries(tracker.activeBuffs)) {
    buff.remainingRounds--;
    if (buff.remainingRounds <= 0) {
      delete tracker.activeBuffs[key];
    }
  }
}

/**
 * Check if Half-Orc Unstoppable Force auto-hit is active.
 * Consumes one auto-hit charge. Returns true if attack should auto-hit.
 */
export function checkAutoHit(tracker: RacialCombatTracker): boolean {
  const buff = tracker.activeBuffs['unstoppable_force'];
  if (!buff) return false;
  const remaining = buff.data['autoHitsRemaining'];
  if (typeof remaining === 'number' && remaining > 0) {
    buff.data['autoHitsRemaining'] = remaining - 1;
    if (remaining - 1 <= 0) {
      delete tracker.activeBuffs['unstoppable_force'];
    }
    return true;
  }
  return false;
}

/**
 * Process Elementari Primordial Awakening AoE damage at start of turn.
 * Returns modified state if awakening is active.
 */
export function processPrimordialAwakeningDot(
  state: CombatState,
  actorId: string,
  tracker: RacialCombatTracker,
): { state: CombatState; damage: number } {
  const buff = tracker.activeBuffs['primordial_awakening'];
  if (!buff) return { state, damage: 0 };

  const actor = state.combatants.find(c => c.id === actorId);
  if (!actor) return { state, damage: 0 };

  const dmg = damageRoll(2, 10);
  const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive);
  let current = state;

  for (const enemy of enemies) {
    const newHp = Math.max(0, enemy.currentHp - dmg.total);
    current = updateCombatant(current, enemy.id, { currentHp: newHp, isAlive: newHp > 0 });
  }

  return { state: current, damage: dmg.total };
}

/**
 * Check if Half-Elf Fey Ancestry prevents a charm/sleep status.
 * Returns true if the status should be blocked.
 */
export function checkFeyAncestry(
  race: string,
  level: number,
  statusName: StatusEffectName,
): boolean {
  if (race === 'half_elf' && level >= 1) {
    // Immune to magical sleep (no direct status, but blocks stunned from charm effects)
    // For simplicity, block any "sleep-like" status
    return false; // Charm advantage handled via save bonus, not blocking
  }
  return false;
}

/**
 * Get Gnome Cunning save bonus for INT/WIS/CHA saves vs magic.
 * Returns the bonus modifier.
 */
export function getGnomeCunningSaveBonus(
  race: string,
  level: number,
  saveType: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
  vsMagic: boolean,
): number {
  if (race === 'gnome' && level >= 5 && vsMagic) {
    if (saveType === 'int' || saveType === 'wis' || saveType === 'cha') {
      // Advantage approximated as +5 bonus
      return 5;
    }
  }
  return 0;
}
