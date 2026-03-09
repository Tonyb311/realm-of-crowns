/**
 * Combat Rating Formula — Monster-Intrinsic Power Index
 *
 * CR is computed purely from monster stats on a 1-50 scale.
 * No player lookup tables. Two-axis approach:
 *   Offensive Power (OP) × Defensive Power (DP) → geometric mean → log mapping
 *
 * Source: docs/design/combat-rating-system.md
 */

// ---- Helper: Parse damage string ----

function parseAvgDamage(damageStr: string): number {
  // "2d6+4" → avg = count * (sides+1)/2 + bonus
  const match = damageStr.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return 5; // fallback
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3], 10) : 0;
  return count * (sides + 1) / 2 + bonus;
}

// ---- CR Formula Input ----

export type CRAbilityType = 'damage' | 'status' | 'aoe' | 'multiattack' | 'on_hit' | 'heal' | 'buff';

export interface CRInput {
  hp: number;
  ac: number;
  attack: number;
  damage: string;
  level: number; // monster's assigned level (reference only, not used in formula)
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  conditionImmunities?: string[];
  regenPerTurn?: number;
  regenDisableable?: boolean;
  abilities?: {
    type: CRAbilityType;
    damage?: string;
    saveDC?: number;
    saveType?: string;
    attacks?: number;
    statusEffect?: string;
    statusDuration?: number;
    recharge?: number;
    cooldown?: number;
  }[];
  legendaryActions?: number;
  legendaryResistances?: number;
  fearAura?: boolean;
  damageAura?: { damage: string };
  deathThroesDamage?: string;
  phaseTransitions?: {
    hpThresholdPercent: number;
    effects: {
      type: string;
      statBoost?: { attack?: number; damage?: number };
      aoeBurst?: { damage: string };
      ability?: { damage?: string };
    }[];
  }[];
}

// ---- Offensive Power (OP) ----
// How much effective DPR this monster outputs

function computeOP(input: CRInput): number {
  const avgDmg = parseAvgDamage(input.damage);

  // Base DPR with multiattack
  let attacksPerRound = 1;
  const ma = (input.abilities ?? []).find(a => a.type === 'multiattack');
  if (ma?.attacks) attacksPerRound = ma.attacks;
  const baseDPR = avgDmg * attacksPerRound;

  // Ability DPR: AoE, damage, on_hit
  let abilityDPR = 0;
  for (const a of input.abilities ?? []) {
    if (a.type === 'aoe' && a.damage) {
      const freq = a.recharge ? 1 / 3 : 1 / Math.max(1, (a.cooldown ?? 1) + 1);
      abilityDPR += parseAvgDamage(a.damage) * 0.65 * freq;
    } else if (a.type === 'damage' && a.damage) {
      const freq = 1 / Math.max(1, (a.cooldown ?? 1) + 1);
      abilityDPR += parseAvgDamage(a.damage) * 0.7 * freq;
    } else if (a.type === 'on_hit') {
      if (a.damage) abilityDPR += parseAvgDamage(a.damage) * 0.5;
      if (a.statusEffect) {
        const dur = a.statusDuration ?? 1;
        if (['stunned', 'paralyzed'].includes(a.statusEffect)) abilityDPR += avgDmg * 0.3 * dur;
        else if (['poisoned', 'weakened'].includes(a.statusEffect)) abilityDPR += avgDmg * 0.15 * dur;
        else abilityDPR += avgDmg * 0.1 * dur;
      }
    }
  }

  // Damage aura, death throes, fear aura
  if (input.damageAura?.damage) abilityDPR += parseAvgDamage(input.damageAura.damage);
  if (input.deathThroesDamage) abilityDPR += parseAvgDamage(input.deathThroesDamage) * 0.5 / 5;
  if (input.fearAura) abilityDPR += avgDmg * 0.15;

  // Status lethality (stun/paralyze from dedicated status abilities)
  let statusDPR = 0;
  for (const a of input.abilities ?? []) {
    if (a.type === 'status' && a.statusEffect) {
      const dur = a.statusDuration ?? 1;
      if (['stunned', 'paralyzed'].includes(a.statusEffect)) statusDPR += avgDmg * 0.5 * dur;
      else if (a.statusEffect === 'frightened') statusDPR += avgDmg * 0.2 * dur;
    }
  }
  abilityDPR += statusDPR / 5;

  // Legendary action multiplier: +50% per LA slot
  const laMult = 1 + (input.legendaryActions ?? 0) * 0.5;

  // Attack bonus: cubic accelerating curve
  // ATK +3 = baseline 1.0, each point adds 12%, cubed
  const atkFactor = Math.pow(1 + Math.max(0, input.attack - 3) * 0.12, 3.0);

  return (baseDPR + abilityDPR) * laMult * atkFactor;
}

// ---- Defensive Power (DP) ----
// How hard is this monster to kill

function computeDP(input: CRInput): number {
  let ehp = input.hp;

  // AC: cubic accelerating curve (10% per AC above 10, cubed)
  ehp *= Math.pow(1 + Math.max(0, input.ac - 10) * 0.10, 3.0);

  // Physical resistance/immunity
  const physTypes = ['SLASHING', 'PIERCING', 'BLUDGEONING'];
  const resistPhys = (input.resistances ?? []).filter(r => physTypes.includes(r)).length;
  const immunePhys = (input.immunities ?? []).filter(r => physTypes.includes(r)).length;
  let resistMult = 1.0;
  if (immunePhys >= 2) resistMult = 1.75;
  else if (resistPhys >= 2) resistMult = 1.4;
  else if (resistPhys >= 1) resistMult = 1.2;

  // Elemental resistances and immunities
  const elemResists = (input.resistances ?? []).filter(r => !physTypes.includes(r)).length;
  const elemImmunities = (input.immunities ?? []).filter(r => !physTypes.includes(r)).length;
  resistMult += elemResists * 0.06 + elemImmunities * 0.12;
  if (elemImmunities >= 3) resistMult += 0.12;
  ehp *= resistMult;

  // Vulnerability penalty
  if ((input.vulnerabilities ?? []).length > 0) ehp *= 0.90;

  // Regen (from regenPerTurn OR heal abilities with hpPerTurn)
  const regenPerTurn = input.regenPerTurn ?? 0;
  if (regenPerTurn > 0) {
    let regenMult = Math.min(2.0, 1 + (regenPerTurn * 5) / input.hp);
    if (input.regenDisableable) regenMult = 1 + (regenMult - 1) * 0.5;
    ehp *= regenMult;
  }

  // Legendary resistances: +12% EHP each
  ehp *= 1 + (input.legendaryResistances ?? 0) * 0.12;

  // Phase transitions: base +10%, bonuses for stat boost/AoE burst/added ability
  if (input.phaseTransitions) {
    for (const pt of input.phaseTransitions) {
      let mult = 1.10;
      if (pt.effects?.some((e: any) => e.type === 'stat_boost')) mult += 0.05;
      if (pt.effects?.some((e: any) => e.type === 'aoe_burst')) mult += 0.04;
      if (pt.effects?.some((e: any) => e.type === 'add_ability')) mult += 0.06;
      ehp *= mult;
    }
  }

  // Condition immunities: +5% per major immunity
  const majorImm = (input.conditionImmunities ?? [])
    .filter(c => ['stunned', 'paralyzed', 'frightened', 'charmed'].includes(c)).length;
  ehp *= 1 + majorImm * 0.05;

  return ehp;
}

// ---- Combine and Map ----

// Logarithmic mapping constants
// Calibrated: Goblin (raw ~9.2) → CR 1, Tarrasque (raw ~5022) → CR 49
const LOG_A = 7.61;
const LOG_B = -15.86;

export function computeFormulaCR(input: CRInput): number {
  const op = computeOP(input);
  const dp = computeDP(input);
  let raw = Math.sqrt(op * dp);

  // Lethality adjustment: glass cannons (OP >> DP) slightly more dangerous
  const ratio = op / dp;
  if (ratio > 0.5) raw *= 1 + Math.min(0.15, (ratio - 0.5) * 0.1);

  // Logarithmic mapping: CR = A * ln(raw) + B
  return Math.max(1, Math.round((LOG_A * Math.log(raw) + LOG_B) * 10) / 10);
}

/**
 * Compute both formulaCr and the derived level for a monster.
 * formulaCr is stored on the monster record; level is Math.round(formulaCr)
 * but should NOT override hand-assigned level until monster stats are rebalanced.
 */
export function recomputeMonsterCR(monsterStats: CRInput): { formulaCr: number; level: number } {
  const cr = computeFormulaCR(monsterStats);
  return { formulaCr: cr, level: Math.round(cr) };
}
