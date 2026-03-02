/**
 * CombatNarrator — transforms mechanical combat events into narrative text.
 *
 * Pure function module. No DB calls, no side effects.
 * Template resolution priority: monster-specific > ability > class+weapon > class > weapon > generic.
 */

import {
  ATTACK_HIT_WEAPON,
  ATTACK_HIT_CLASS,
  ATTACK_MISS,
  ATTACK_MISS_CLASS,
  CRITICAL_HIT,
  CRITICAL_HIT_CLASS,
  FUMBLE,
  FUMBLE_CLASS,
  ABILITY_TEMPLATES,
  DEFEND_TEMPLATES,
  FLEE_SUCCESS,
  FLEE_FAILURE,
  STATUS_APPLY,
  STATUS_EXPIRE,
  MONSTER_FLAVOR,
  HP_MOD_STRAINED,
  HP_MOD_DESPERATE,
  HP_MOD_LAST_STAND,
  KILL_PLAYER_WINS,
  KILL_PLAYER_DIES,
  ITEM_TEMPLATES,
  OPENING_GENERIC,
  MONSTER_ATTACK_GENERIC,
  MONSTER_MISS_GENERIC,
  PVP_OPENING_DUEL,
  PVP_OPENING_SPAR,
  PVP_VICTORY,
  PVP_DEFEAT,
} from './templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NarrationContext {
  actorName: string;
  actorRace?: string;
  actorClass?: string;
  actorEntityType: 'character' | 'monster';
  actorHpPercent: number; // 0-100

  targetName?: string;
  targetEntityType?: 'character' | 'monster';
  targetHpPercent?: number;
  targetKilled?: boolean;

  weaponName?: string;
}

/** Minimal result shape shared across result types. */
interface BaseResult {
  type: string;
  actorId: string;
  [key: string]: unknown;
}

/** Minimal TurnLogEntry shape the narrator needs. */
export interface NarratorLogEntry {
  round: number;
  actorId: string;
  action: string;
  result: BaseResult;
  statusTicks?: Array<{
    combatantId: string;
    effectName: string;
    damage?: number;
    healing?: number;
    hpAfter: number;
    expired?: boolean;
    killed?: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick(arr: string[]): string {
  if (arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function sub(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function detectWeaponType(weaponName?: string): string {
  if (!weaponName) return 'generic';
  const name = weaponName.toLowerCase();
  if (name.includes('sword') || name.includes('blade') || name.includes('rapier') || name.includes('scimitar')) return 'sword';
  if (name.includes('axe') || name.includes('hatchet') || name.includes('cleaver')) return 'axe';
  if (name.includes('staff') || name.includes('wand') || name.includes('rod')) return 'staff';
  if (name.includes('bow') || name.includes('crossbow') || name.includes('longbow')) return 'bow';
  if (name.includes('dagger') || name.includes('knife') || name.includes('stiletto') || name.includes('shiv')) return 'dagger';
  if (name.includes('mace') || name.includes('hammer') || name.includes('flail') || name.includes('club') || name.includes('morningstar')) return 'mace';
  if (name === 'unarmed strike' || name === 'unarmed') return 'unarmed';
  return 'generic';
}

function targetLabel(ctx: NarrationContext): string {
  if (!ctx.targetName) return 'the enemy';
  // If actor is monster attacking a player, use "you"
  if (ctx.actorEntityType === 'monster' && ctx.targetEntityType === 'character') return 'you';
  // If actor is player attacking a monster, use "the {name}"
  if (ctx.targetEntityType === 'monster') return `the ${ctx.targetName}`;
  // PvP or other: just use the name
  return ctx.targetName;
}

function applyHpModifier(message: string, hpPercent: number): string {
  if (hpPercent > 75 || hpPercent <= 0) return message;
  let prefix = '';
  if (hpPercent <= 25) {
    prefix = pick(HP_MOD_LAST_STAND);
  } else if (hpPercent <= 50) {
    prefix = pick(HP_MOD_DESPERATE);
  } else {
    prefix = pick(HP_MOD_STRAINED);
  }
  if (!prefix) return message;
  // Lowercase the first letter of the message to chain with the prefix
  const lowered = message.charAt(0).toLowerCase() + message.slice(1);
  return `${prefix} ${lowered}`;
}

function killSuffix(targetKilled: boolean | undefined, ctx: NarrationContext): string {
  if (!targetKilled) return '';
  const targetName = ctx.targetName || 'the enemy';
  if (ctx.targetEntityType === 'monster' || ctx.actorEntityType === 'character') {
    return ' ' + sub(pick(KILL_PLAYER_WINS), { target: targetName });
  }
  return ' ' + pick(KILL_PLAYER_DIES);
}

// ---------------------------------------------------------------------------
// Narration by action type
// ---------------------------------------------------------------------------

function narrateAttack(result: BaseResult, ctx: NarrationContext): string {
  const target = targetLabel(ctx);
  const weapon = ctx.weaponName || 'weapon';
  const weaponType = detectWeaponType(ctx.weaponName);
  const vars = { target, weapon };
  const hit = result.hit as boolean;
  const critical = result.critical as boolean;
  const attackRoll = result.attackRoll as number;
  const targetKilled = result.targetKilled as boolean;

  // Check if actor is a known monster with personality text
  if (ctx.actorEntityType === 'monster') {
    const flavor = MONSTER_FLAVOR[ctx.actorName];
    if (flavor) {
      if (!hit) return pick(MONSTER_MISS_GENERIC);
      let msg = pick(flavor.attack);
      if (targetKilled) msg += ' ' + pick(KILL_PLAYER_DIES);
      return msg;
    }
    // Generic monster attack
    if (!hit) return sub(pick(MONSTER_MISS_GENERIC), vars);
    let msg = sub(pick(MONSTER_ATTACK_GENERIC), vars);
    if (targetKilled) msg += ' ' + pick(KILL_PLAYER_DIES);
    return msg;
  }

  // Player attacks
  // Critical hit (nat 20)
  if (critical) {
    const classTemplates = ctx.actorClass ? CRITICAL_HIT_CLASS[ctx.actorClass] : null;
    const pool = classTemplates && classTemplates.length > 0 ? classTemplates : CRITICAL_HIT;
    let msg = sub(pick(pool), vars);
    msg += killSuffix(targetKilled, ctx);
    return msg;
  }

  // Fumble (nat 1)
  if (!hit && attackRoll === 1) {
    const classTemplates = ctx.actorClass ? FUMBLE_CLASS[ctx.actorClass] : null;
    const pool = classTemplates && classTemplates.length > 0 ? classTemplates : FUMBLE;
    return sub(pick(pool), vars);
  }

  // Miss
  if (!hit) {
    const classTemplates = ctx.actorClass ? ATTACK_MISS_CLASS[ctx.actorClass] : null;
    const pool = classTemplates && classTemplates.length > 0 ? classTemplates : ATTACK_MISS;
    return sub(pick(pool), vars);
  }

  // Regular hit — priority: class > weapon type > generic
  let pool: string[];
  const classTemplates = ctx.actorClass ? ATTACK_HIT_CLASS[ctx.actorClass] : null;
  const weaponTemplates = ATTACK_HIT_WEAPON[weaponType];

  if (classTemplates && classTemplates.length > 0 && Math.random() < 0.5) {
    pool = classTemplates;
  } else if (weaponTemplates && weaponTemplates.length > 0) {
    pool = weaponTemplates;
  } else {
    pool = ATTACK_HIT_WEAPON.generic;
  }

  let msg = sub(pick(pool), vars);
  msg = applyHpModifier(msg, ctx.actorHpPercent);
  msg += killSuffix(targetKilled, ctx);
  return msg;
}

function narrateAbility(result: BaseResult, ctx: NarrationContext): string {
  const abilityName = (result.abilityName as string) || '';
  const target = targetLabel(ctx);
  const weapon = ctx.weaponName || 'weapon';
  const vars = { target, weapon, ability: abilityName };
  const targetKilled = result.targetKilled as boolean;

  // Look up ability-specific templates
  const templates = ABILITY_TEMPLATES[abilityName];
  if (templates && templates.length > 0) {
    let msg = sub(pick(templates), vars);
    msg = applyHpModifier(msg, ctx.actorHpPercent);
    msg += killSuffix(targetKilled, ctx);
    return msg;
  }

  // Fallback: use the description field from the result
  const desc = result.description as string;
  if (desc) {
    let msg = desc.endsWith('.') ? desc : desc + '.';
    // Lowercase first char to chain after actor name
    msg = msg.charAt(0).toLowerCase() + msg.slice(1);
    msg += killSuffix(targetKilled, ctx);
    return msg;
  }

  // Ultimate fallback
  if (abilityName) {
    let msg = `uses ${abilityName}.`;
    msg += killSuffix(targetKilled, ctx);
    return msg;
  }

  return 'takes action.';
}

function narrateCast(result: BaseResult, ctx: NarrationContext): string {
  const spellName = (result.spellName as string) || 'a spell';
  const target = targetLabel(ctx);
  const vars = { target, weapon: ctx.weaponName || 'weapon', ability: spellName };
  const targetKilled = result.targetKilled as boolean;
  const healAmount = result.healAmount as number;

  const templates = ABILITY_TEMPLATES[spellName];
  if (templates && templates.length > 0) {
    let msg = sub(pick(templates), vars);
    msg += killSuffix(targetKilled, ctx);
    return msg;
  }

  if (healAmount && healAmount > 0) {
    return `casts ${spellName}, channeling healing energy.`;
  }

  let msg = `casts ${spellName} at ${target}.`;
  msg += killSuffix(targetKilled, ctx);
  return msg;
}

function narrateDefend(_result: BaseResult, ctx: NarrationContext): string {
  let msg = pick(DEFEND_TEMPLATES);
  msg = applyHpModifier(msg, ctx.actorHpPercent);
  return msg;
}

function narrateFlee(result: BaseResult, ctx: NarrationContext): string {
  const success = result.success as boolean;
  const target = targetLabel(ctx);
  const vars = { target };
  if (success) {
    return sub(pick(FLEE_SUCCESS), vars);
  }
  return sub(pick(FLEE_FAILURE), vars);
}

function narrateItem(result: BaseResult, _ctx: NarrationContext): string {
  const itemName = (result.itemName as string) || 'an item';
  const healAmount = result.healAmount as number;
  const damageAmount = result.damageAmount as number;

  if (healAmount && healAmount > 0) {
    return pick(ITEM_TEMPLATES.heal);
  }
  if (damageAmount && damageAmount > 0) {
    return sub(pick(ITEM_TEMPLATES.damage || ITEM_TEMPLATES.generic), { target: 'the enemy' });
  }
  return `uses ${itemName}.`;
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Generate narrative text for a combat log entry.
 * Returns a verb-first phrase (actor name is displayed separately by the UI).
 */
export function narrateCombatEvent(
  entry: NarratorLogEntry,
  context: NarrationContext,
): string {
  const result = entry.result;

  try {
    switch (result.type) {
      case 'attack':
        return narrateAttack(result, context);
      case 'cast':
        return narrateCast(result, context);
      case 'defend':
        return narrateDefend(result, context);
      case 'flee':
        return narrateFlee(result, context);
      case 'class_ability':
      case 'psion_ability':
      case 'racial_ability':
        return narrateAbility(result, context);
      case 'item':
        return narrateItem(result, context);
      default:
        return 'takes action.';
    }
  } catch {
    // Fallback: never return empty or broken text
    return 'takes action.';
  }
}

/**
 * Generate narrative text for a status effect tick.
 */
export function narrateStatusTick(
  effectName: string,
  damage: number | undefined,
  healing: number | undefined,
  expired: boolean | undefined,
  killed: boolean | undefined,
): string {
  if (expired) {
    const templates = STATUS_EXPIRE[effectName];
    if (templates && templates.length > 0) return pick(templates);
    return `the ${effectName} effect fades.`;
  }

  if (killed) {
    return `succumbs to ${effectName}.`;
  }

  if (damage && damage > 0) {
    const templates = STATUS_APPLY[effectName];
    if (templates && templates.length > 0) return pick(templates);
    return `takes damage from ${effectName}.`;
  }

  if (healing && healing > 0) {
    const templates = STATUS_APPLY[effectName];
    if (templates && templates.length > 0) return pick(templates);
    return `is healed by ${effectName}.`;
  }

  return '';
}

/**
 * Generate a combat opening line for a monster encounter.
 */
export function narrateCombatOpening(monsterName: string): string {
  const flavor = MONSTER_FLAVOR[monsterName];
  if (flavor && flavor.opening.length > 0) {
    return pick(flavor.opening);
  }
  return pick(OPENING_GENERIC);
}

/**
 * Generate wounded flavor text when a monster drops below 50% HP.
 * Returns null if no wounded text is available.
 */
export function narrateMonsterWounded(monsterName: string): string | null {
  const flavor = MONSTER_FLAVOR[monsterName];
  if (flavor && flavor.wounded.length > 0) {
    return pick(flavor.wounded);
  }
  return null;
}

/**
 * Generate a PvP combat opening line.
 */
export function narratePvpOpening(opponentName: string, isSpar: boolean): string {
  const pool = isSpar ? PVP_OPENING_SPAR : PVP_OPENING_DUEL;
  return sub(pick(pool), { opponent: opponentName });
}

/**
 * Generate PvP victory/defeat text.
 */
export function narratePvpKill(opponentName: string, isVictor: boolean): string {
  const pool = isVictor ? PVP_VICTORY : PVP_DEFEAT;
  return sub(pick(pool), { opponent: opponentName });
}
