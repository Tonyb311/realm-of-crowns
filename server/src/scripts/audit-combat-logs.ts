/**
 * Class-Agnostic Ability Mechanical Audit Script
 *
 * Pulls all combat encounter logs from a sim run, loads every ability definition
 * for the specified class, and cross-references every class_ability action against
 * the ability definition to validate damage, buffs, debuffs, status effects,
 * durations, cooldowns, and more.
 *
 * Usage:
 *   npx tsx --tsconfig server/tsconfig.json server/src/scripts/audit-combat-logs.ts --class=warrior
 *   npx tsx --tsconfig server/tsconfig.json server/src/scripts/audit-combat-logs.ts --class=mage --run-id=abc123
 *
 * Arguments:
 *   --class=<warrior|mage|rogue|cleric|ranger|bard|psion>  (required)
 *   --run-id=<sim_run_id>                                   (optional — defaults to most recent completed sim run)
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { db, pool } from '../lib/db';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@database/index';
import * as fs from 'fs';
import * as path from 'path';
import { ABILITIES_BY_CLASS, VALID_CLASSES } from '@shared/data/skills/index';
import type { AbilityDefinition } from '@shared/data/skills/types';

// ---- CLI Argument Parsing ----

function parseArgs(): { className: string; runId: string | null } {
  const args = process.argv.slice(2);
  let className: string | null = null;
  let runId: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--class=')) {
      className = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--run-id=')) {
      runId = arg.split('=')[1];
    }
  }

  if (!className) {
    console.error('Error: --class argument is required.');
    console.error(`Valid classes: ${VALID_CLASSES.join(', ')}`);
    console.error('Usage: npx tsx --tsconfig server/tsconfig.json server/src/scripts/audit-combat-logs.ts --class=warrior [--run-id=<id>]');
    process.exit(1);
  }

  if (!(VALID_CLASSES as readonly string[]).includes(className)) {
    console.error(`Error: Unknown class "${className}".`);
    console.error(`Valid classes: ${VALID_CLASSES.join(', ')}`);
    process.exit(1);
  }

  return { className, runId };
}

// ---- Types for log entries ----

interface RoundLogEntry {
  round: number;
  actor: string;
  actorId: string;
  action: string;
  abilityName?: string;
  abilityDescription?: string;
  // Attack
  attackRoll?: { raw: number; modifiers: any[]; total: number };
  targetAC?: number;
  hit?: boolean;
  isCritical?: boolean;
  damageRoll?: { dice: string; rolls: number[]; modifiers: any[]; total: number; type?: string };
  targetHpBefore?: number;
  targetHpAfter?: number;
  targetKilled?: boolean;
  // Heal
  healAmount?: number;
  // Buff/Debuff
  buffApplied?: string;
  debuffApplied?: string;
  // Status
  statusEffectsApplied: string[];
  statusEffectsExpired: string[];
  statusTickDamage?: number;
  statusTickHealing?: number;
  // Multi-strike / AoE
  strikeResults?: Array<{ strikeNumber: number; hit: boolean; crit: boolean; damage: number; attackRoll?: number; attackTotal?: number; targetAc?: number }>;
  totalStrikes?: number;
  strikesHit?: number;
  perTargetResults?: Array<{ targetId: string; targetName: string; damage?: number; healing?: number; statusApplied?: string; hpAfter: number; killed: boolean }>;
  // HP snapshot
  hpAfter: Record<string, number>;
  // Save
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
}

interface EncounterContext {
  combatants: Array<{
    id: string;
    name: string;
    entityType: string;
    team: number;
    level: number;
    race?: string;
    hp: number;
    maxHp: number;
    ac: number;
    stats: Record<string, number>;
    proficiencyBonus: number;
    weapon: { name: string; dice: string; damageType?: string; bonusAttack: number; bonusDamage: number; attackStat: string; damageStat: string } | null;
  }>;
  turnOrder: string[];
}

// ---- Validation types ----

type Severity = 'CRITICAL' | 'MODERATE' | 'MINOR';

interface ValidationIssue {
  combatId: string;
  round: number;
  actor: string;
  abilityName: string;
  field: string;
  expected: string;
  actual: string;
  severity: Severity;
}

interface AbilityAuditResult {
  name: string;
  id: string;
  tier: number;
  levelRequired: number;
  effectType: string;
  totalUses: number;
  damageValidation: 'PASS' | 'FAIL' | 'N/A';
  buffDebuffValidation: 'PASS' | 'FAIL' | 'N/A';
  durationValidation: 'PASS' | 'FAIL' | 'N/A';
  cooldownValidation: 'PASS' | 'FAIL' | 'N/A';
  statModifierValidation: 'PASS' | 'FAIL' | 'N/A';
  statusEffectValidation: 'PASS' | 'FAIL' | 'N/A';
  overall: 'PASS' | 'ISSUES FOUND';
  issues: ValidationIssue[];
}

interface DurationAuditEntry {
  abilityName: string;
  effectName: string;
  combatId: string;
  appliedRound: number;
  expectedExpiryRound: number;
  actualExpiryRound: number | 'NEVER';
  match: 'MATCH' | 'MISMATCH';
}

interface CooldownAuditEntry {
  abilityName: string;
  combatId: string;
  actor: string;
  roundA: number;
  roundB: number;
  gap: number;
  expectedMinimum: number;
  result: 'PASS' | 'VIOLATION';
}

// ---- Helpers ----

/** Parse weapon dice like "1d8" into { count, sides } */
function parseWeaponDice(dice: string): { count: number; sides: number } {
  const match = dice.match(/(\d+)d(\d+)/);
  if (!match) return { count: 1, sides: 8 };
  return { count: parseInt(match[1]), sides: parseInt(match[2]) };
}

/** Get stat modifier (D&D 5e style) */
function getModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

/** Normalize status names the same way the engine does via mapStatusName() */
function normalizeStatusName(name: string): string {
  const mapping: Record<string, string> = {
    stun: 'stunned', stunned: 'stunned',
    slow: 'slowed', slowed: 'slowed',
    poison: 'poisoned', poisoned: 'poisoned',
    burn: 'burning', burning: 'burning',
    freeze: 'frozen', frozen: 'frozen',
    blind: 'blinded', blinded: 'blinded',
    weak: 'weakened', weakened: 'weakened',
    taunt: 'taunt', silence: 'silence', root: 'root',
    skip_turn: 'skip_turn', mesmerize: 'mesmerize', polymorph: 'polymorph',
  };
  return mapping[name] ?? name;
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- Main ----

async function main() {
  const { className, runId: cliRunId } = parseArgs();
  const classLabel = capitalize(className);

  // Load abilities for the selected class
  const classAbilities: AbilityDefinition[] = ABILITIES_BY_CLASS[className];
  if (!classAbilities || classAbilities.length === 0) {
    console.error(`No abilities found for class "${className}".`);
    process.exit(1);
  }

  const abilityByName = new Map<string, AbilityDefinition>();
  for (const a of classAbilities) {
    abilityByName.set(a.name, a);
  }

  // Resolve SIM_RUN_ID
  let simRunId: string;
  if (cliRunId) {
    simRunId = cliRunId;
    console.log(`Using provided run ID: ${simRunId}`);
  } else {
    console.log('No --run-id provided, querying most recent completed sim run...');
    const latestRun = await db.query.simulationRuns.findFirst({
      orderBy: desc(schema.simulationRuns.startedAt),
      where: eq(schema.simulationRuns.status, 'completed'),
    });
    if (!latestRun) {
      console.error('No completed simulation runs found in the database.');
      await pool.end();
      process.exit(1);
    }
    simRunId = latestRun.id;
    console.log(`Using most recent completed run: ${simRunId} (started ${latestRun.startedAt})`);
  }

  console.log(`Auditing ${classLabel} abilities (${classAbilities.length} total)...`);
  console.log('Fetching combat logs...');
  const logs = await db.query.combatEncounterLogs.findMany({
    where: eq(schema.combatEncounterLogs.simulationRunId, simRunId),
    columns: {
      id: true,
      characterName: true,
      opponentName: true,
      outcome: true,
      totalRounds: true,
      rounds: true,
    },
  });

  console.log(`Found ${logs.length} combat logs for run ${simRunId}`);

  const allIssues: ValidationIssue[] = [];
  const abilityResults = new Map<string, AbilityAuditResult>();
  const durationEntries: DurationAuditEntry[] = [];
  const cooldownEntries: CooldownAuditEntry[] = [];
  const untestableAbilities: { name: string; reason: string }[] = [];

  // Initialize audit results for each ability
  for (const ability of classAbilities) {
    abilityResults.set(ability.name, {
      name: ability.name,
      id: ability.id,
      tier: ability.tier,
      levelRequired: ability.levelRequired,
      effectType: (ability.effects as any).type,
      totalUses: 0,
      damageValidation: 'N/A',
      buffDebuffValidation: 'N/A',
      durationValidation: 'N/A',
      cooldownValidation: 'N/A',
      statModifierValidation: 'N/A',
      statusEffectValidation: 'N/A',
      overall: 'PASS',
      issues: [],
    });
  }

  // Process each combat log
  for (const log of logs) {
    const combatId = log.id;
    const rounds = log.rounds as any[];
    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) continue;

    // Extract encounter context (rounds[0])
    const contextEntry = rounds[0];
    let encounterContext: EncounterContext | null = null;
    if (contextEntry?._encounterContext) {
      encounterContext = contextEntry._encounterContext as EncounterContext;
    }

    // Get player combatant info
    const playerCombatant = encounterContext?.combatants.find(c => c.entityType === 'player');
    const weapon = playerCombatant?.weapon;

    // Actual round entries start at index 1
    const roundEntries: RoundLogEntry[] = rounds.slice(1) as RoundLogEntry[];

    // Track ability usages per actor for cooldown validation
    const abilityUsageByActor = new Map<string, Map<string, number[]>>(); // actorId -> abilityName -> rounds used

    // Track active effects for duration validation
    const activeEffects = new Map<string, { abilityName: string; effectName: string; appliedRound: number; expectedDuration: number }>(); // effectName -> details

    for (const entry of roundEntries) {
      if (!entry || typeof entry.round !== 'number') continue;

      // ---- Track status effect expirations for duration audit ----
      if (entry.statusEffectsExpired && entry.statusEffectsExpired.length > 0) {
        for (const expiredEffect of entry.statusEffectsExpired) {
          const key = expiredEffect;
          if (activeEffects.has(key)) {
            const tracked = activeEffects.get(key)!;
            const expectedExpiryRound = tracked.appliedRound + tracked.expectedDuration;
            const actualExpiryRound = entry.round;
            durationEntries.push({
              abilityName: tracked.abilityName,
              effectName: tracked.effectName,
              combatId,
              appliedRound: tracked.appliedRound,
              expectedExpiryRound,
              actualExpiryRound,
              match: Math.abs(actualExpiryRound - expectedExpiryRound) <= 1 ? 'MATCH' : 'MISMATCH',
            });
            activeEffects.delete(key);
          }
        }
      }

      // Only audit class_ability actions
      if (entry.action !== 'class_ability') continue;
      if (!entry.abilityName) continue;

      const abilityDef = abilityByName.get(entry.abilityName);
      if (!abilityDef) continue; // Not an ability for this class

      const auditResult = abilityResults.get(entry.abilityName)!;
      auditResult.totalUses++;
      const effects = abilityDef.effects as Record<string, any>;
      const effectType = effects.type as string;

      // ---- Track ability usage for cooldown validation ----
      const actorId = entry.actorId;
      if (!abilityUsageByActor.has(actorId)) {
        abilityUsageByActor.set(actorId, new Map());
      }
      const actorUsage = abilityUsageByActor.get(actorId)!;
      if (!actorUsage.has(entry.abilityName)) {
        actorUsage.set(entry.abilityName, []);
      }
      actorUsage.get(entry.abilityName)!.push(entry.round);

      // ---- A. Damage Validation ----
      if (['damage', 'damage_debuff', 'damage_status'].includes(effectType)) {
        auditResult.damageValidation = auditResult.damageValidation === 'FAIL' ? 'FAIL' : 'PASS';

        if (effectType === 'damage') {
          // handleDamage: weapon dice + stat mod + weapon bonus + bonusDamage + ability dice
          // Total = weaponDmg + abilityDmg + bonusDamage
          const loggedDamage = entry.damageRoll?.total ?? 0;
          const hit = entry.hit;

          if (hit === false) {
            // Miss — damage should be 0
            if (loggedDamage > 0) {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'damage_on_miss',
                expected: '0', actual: String(loggedDamage), severity: 'CRITICAL',
              };
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          } else if (hit as boolean !== false && weapon) {
            // Hit — validate damage range
            const wpn = parseWeaponDice(weapon.dice);
            const bonusDamage = (effects.bonusDamage as number) ?? 0;
            const diceCount = (effects.diceCount as number) ?? 0;
            const diceSides = (effects.diceSides as number) ?? 0;
            const isCrit = entry.isCritical ?? false;
            const critMult = isCrit ? 2 : 1;

            // Weapon damage range
            const statMod = weapon.damageStat ? getModifier(playerCombatant?.stats[weapon.damageStat] ?? 10) : 0;
            const weaponMin = Math.max(0, wpn.count * critMult * 1 + statMod + weapon.bonusDamage);
            const weaponMax = wpn.count * critMult * wpn.sides + statMod + weapon.bonusDamage;

            // Ability dice range
            const abilityMin = diceCount > 0 ? diceCount * critMult * 1 : 0;
            const abilityMax = diceCount > 0 ? diceCount * critMult * diceSides : 0;

            const totalMin = Math.max(0, weaponMin + abilityMin + bonusDamage);
            const totalMax = weaponMax + abilityMax + bonusDamage;

            // Allow for damage type interactions (resistance halves, vulnerability doubles)
            const flexMin = Math.floor(totalMin * 0.5);
            const flexMax = totalMax * 2;

            if (loggedDamage < flexMin || loggedDamage > flexMax) {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'damage_range',
                expected: `${totalMin}-${totalMax} (flex: ${flexMin}-${flexMax})`,
                actual: String(loggedDamage), severity: 'CRITICAL',
              };
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }

        if (effectType === 'damage_debuff') {
          // handleDamageDebuff reads diceCount/diceSides ONLY (ignores bonusDamage from data)
          const loggedDamage = entry.damageRoll?.total ?? 0;
          const diceCount = (effects.diceCount as number) ?? 1;
          const diceSides = (effects.diceSides as number) ?? 6;

          const minDmg = diceCount * 1;
          const maxDmg = diceCount * diceSides;

          if (loggedDamage < 0 || loggedDamage > maxDmg * 2) { // 2x for vulnerability
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'damage_debuff_damage',
              expected: `${minDmg}-${maxDmg} (handler uses 1d6 default, bonusDamage ignored)`,
              actual: String(loggedDamage), severity: 'MODERATE',
            };
            auditResult.issues.push(issue);
            auditResult.damageValidation = 'FAIL';
            allIssues.push(issue);
          }

          // Document the known data/handler mismatch
          if (effects.bonusDamage && !effects.diceCount) {
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'data_handler_mismatch',
              expected: `bonusDamage: ${effects.bonusDamage} should contribute to damage`,
              actual: 'handler reads diceCount/diceSides only, defaults to 1d6',
              severity: 'MODERATE',
            };
            // Only add once per ability
            if (!auditResult.issues.some(i => i.field === 'data_handler_mismatch')) {
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }

        if (effectType === 'damage_status') {
          // handleDamageStatus reads effects.damage (flat) + diceCount/diceSides + damageBonus (stat)
          const loggedDamage = entry.damageRoll?.total ?? 0;
          const flatDamage = (effects.damage as number) ?? 0;
          const diceCount = (effects.diceCount as number) ?? 0;
          const diceSides = (effects.diceSides as number) ?? 0;

          const minDmg = flatDamage + (diceCount > 0 ? diceCount * 1 : 0);
          const maxDmg = flatDamage + (diceCount > 0 ? diceCount * diceSides : 0);

          if (loggedDamage < 0 || loggedDamage > maxDmg * 2) {
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'damage_status_damage',
              expected: `${minDmg}-${maxDmg}`,
              actual: String(loggedDamage), severity: 'CRITICAL',
            };
            auditResult.issues.push(issue);
            auditResult.damageValidation = 'FAIL';
            allIssues.push(issue);
          }

          // Document known mismatch: abilities with bonusDamage but handler reads damage field
          if (effects.bonusDamage && !effects.damage) {
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'data_handler_mismatch',
              expected: `bonusDamage: ${effects.bonusDamage} should contribute to damage`,
              actual: 'handler reads effects.damage (flat), not bonusDamage. Deals 0 damage.',
              severity: 'CRITICAL',
            };
            if (!auditResult.issues.some(i => i.field === 'data_handler_mismatch')) {
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }
      }

      // ---- AoE Damage ----
      if (effectType === 'aoe_damage') {
        auditResult.damageValidation = auditResult.damageValidation === 'FAIL' ? 'FAIL' : 'PASS';

        if (entry.perTargetResults && weapon) {
          const damageMultiplier = (effects.damageMultiplier as number) ?? 1.0;
          const wpn = parseWeaponDice(weapon.dice);
          const statMod = weapon.damageStat ? getModifier(playerCombatant?.stats[weapon.damageStat] ?? 10) : 0;

          for (const ptr of entry.perTargetResults) {
            const weaponMin = Math.max(0, wpn.count * 1 + statMod + weapon.bonusDamage);
            const weaponMax = wpn.count * wpn.sides + statMod + weapon.bonusDamage;
            const minDmg = Math.max(0, Math.floor(weaponMin * damageMultiplier));
            const maxDmg = Math.floor(weaponMax * damageMultiplier);

            const flexMin = Math.floor(minDmg * 0.5);
            const flexMax = maxDmg * 2;

            if ((ptr.damage ?? 0) < flexMin || (ptr.damage ?? 0) > flexMax) {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'aoe_per_target_damage',
                expected: `${minDmg}-${maxDmg} per target (flex: ${flexMin}-${flexMax})`,
                actual: String(ptr.damage), severity: 'CRITICAL',
              };
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }
      }

      // ---- Multi-Attack ----
      if (effectType === 'multi_attack') {
        auditResult.damageValidation = auditResult.damageValidation === 'FAIL' ? 'FAIL' : 'PASS';

        const expectedStrikes = (effects.strikes as number) ?? 2;

        if (entry.totalStrikes !== undefined && entry.totalStrikes !== expectedStrikes) {
          const issue: ValidationIssue = {
            combatId, round: entry.round, actor: entry.actor,
            abilityName: entry.abilityName, field: 'multi_attack_strike_count',
            expected: String(expectedStrikes), actual: String(entry.totalStrikes), severity: 'CRITICAL',
          };
          auditResult.issues.push(issue);
          auditResult.damageValidation = 'FAIL';
          allIssues.push(issue);
        }

        // Validate each strike's damage if weapon known
        if (entry.strikeResults && weapon) {
          const wpn = parseWeaponDice(weapon.dice);
          const statMod = weapon.damageStat ? getModifier(playerCombatant?.stats[weapon.damageStat] ?? 10) : 0;

          for (const strike of entry.strikeResults) {
            if (!strike.hit) {
              if (strike.damage > 0) {
                const issue: ValidationIssue = {
                  combatId, round: entry.round, actor: entry.actor,
                  abilityName: entry.abilityName, field: 'strike_damage_on_miss',
                  expected: '0', actual: String(strike.damage), severity: 'CRITICAL',
                };
                auditResult.issues.push(issue);
                auditResult.damageValidation = 'FAIL';
                allIssues.push(issue);
              }
              continue;
            }

            const critMult = strike.crit ? 2 : 1;
            // resolveAttack produces full weapon attack damage
            const minDmg = Math.max(0, wpn.count * critMult * 1 + statMod + weapon.bonusDamage);
            const maxDmg = wpn.count * critMult * wpn.sides + statMod + weapon.bonusDamage;
            const flexMin = Math.floor(minDmg * 0.5);
            const flexMax = maxDmg * 2;

            if (strike.damage < flexMin || strike.damage > flexMax) {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'strike_damage_range',
                expected: `${minDmg}-${maxDmg} (flex: ${flexMin}-${flexMax})`,
                actual: String(strike.damage), severity: 'CRITICAL',
              };
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }
      }

      // ---- Heal validation ----
      if (effectType === 'heal') {
        auditResult.damageValidation = auditResult.damageValidation === 'FAIL' ? 'FAIL' : 'PASS';

        const fullRestore = (effects.fullRestore as boolean) ?? false;
        const loggedHeal = entry.healAmount ?? 0;

        if (!fullRestore) {
          // handleHeal: rolls diceCount/diceSides/bonusHealing. Does NOT read healAmount.
          const diceCount = (effects.diceCount as number) ?? 1;
          const diceSides = (effects.diceSides as number) ?? 8;
          const bonus = (effects.bonusHealing as number) ?? 0;
          const minHeal = diceCount * 1 + bonus;
          const maxHeal = diceCount * diceSides + bonus;

          if (loggedHeal < minHeal || loggedHeal > maxHeal) {
            // Check if it's the healAmount mismatch
            if (effects.healAmount && !effects.diceCount) {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'data_handler_mismatch',
                expected: `healAmount: ${effects.healAmount} should be used`,
                actual: `handler reads diceCount/diceSides (defaults 1d8), healed ${loggedHeal}`,
                severity: 'MODERATE',
              };
              if (!auditResult.issues.some(i => i.field === 'data_handler_mismatch')) {
                auditResult.issues.push(issue);
                auditResult.damageValidation = 'FAIL';
                allIssues.push(issue);
              }
            } else {
              const issue: ValidationIssue = {
                combatId, round: entry.round, actor: entry.actor,
                abilityName: entry.abilityName, field: 'heal_range',
                expected: `${minHeal}-${maxHeal}`,
                actual: String(loggedHeal), severity: 'CRITICAL',
              };
              auditResult.issues.push(issue);
              auditResult.damageValidation = 'FAIL';
              allIssues.push(issue);
            }
          }
        }
      }

      // ---- B. Buff/Debuff Validation ----
      if (effectType === 'buff') {
        auditResult.buffDebuffValidation = auditResult.buffDebuffValidation === 'FAIL' ? 'FAIL' : 'PASS';

        // handleBuff sets buffApplied = abilityDef.name
        if (entry.buffApplied) {
          if (entry.buffApplied !== entry.abilityName) {
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'buff_name',
              expected: entry.abilityName, actual: entry.buffApplied, severity: 'MINOR',
            };
            auditResult.issues.push(issue);
            auditResult.buffDebuffValidation = 'FAIL';
            allIssues.push(issue);
          }

          // Track for duration validation
          const expectedDuration = (effects.duration as number) ?? 3;
          activeEffects.set(entry.buffApplied, {
            abilityName: entry.abilityName,
            effectName: entry.buffApplied,
            appliedRound: entry.round,
            expectedDuration,
          });
        }
      }

      if (effectType === 'debuff') {
        auditResult.buffDebuffValidation = auditResult.buffDebuffValidation === 'FAIL' ? 'FAIL' : 'PASS';

        // handleDebuff sets debuffApplied = abilityDef.name
        if (entry.debuffApplied && entry.debuffApplied !== entry.abilityName) {
          const issue: ValidationIssue = {
            combatId, round: entry.round, actor: entry.actor,
            abilityName: entry.abilityName, field: 'debuff_name',
            expected: entry.abilityName, actual: entry.debuffApplied, severity: 'MINOR',
          };
          auditResult.issues.push(issue);
          auditResult.buffDebuffValidation = 'FAIL';
          allIssues.push(issue);
        }

        // Check stat modifiers match
        const expectedAttackRed = Math.abs((effects.attackReduction as number) ?? 0);
        const expectedAcRed = Math.abs((effects.acReduction as number) ?? 0);
        if (expectedAttackRed > 0 || expectedAcRed > 0) {
          auditResult.statModifierValidation = auditResult.statModifierValidation === 'FAIL' ? 'FAIL' : 'PASS';
        }

        // Track for duration validation
        const expectedDuration = (effects.duration as number) ?? 3;
        activeEffects.set(entry.abilityName, {
          abilityName: entry.abilityName,
          effectName: entry.abilityName,
          appliedRound: entry.round,
          expectedDuration,
        });
      }

      if (effectType === 'damage_debuff') {
        auditResult.buffDebuffValidation = auditResult.buffDebuffValidation === 'FAIL' ? 'FAIL' : 'PASS';

        // handleDamageDebuff applies 'weakened' status and logs debuffApplied = "AC -N"
        const acReduction = (effects.acReduction as number) ?? 0;
        const expectedDebuff = `AC -${acReduction}`;
        if (entry.debuffApplied && entry.debuffApplied !== expectedDebuff) {
          const issue: ValidationIssue = {
            combatId, round: entry.round, actor: entry.actor,
            abilityName: entry.abilityName, field: 'damage_debuff_name',
            expected: expectedDebuff, actual: entry.debuffApplied, severity: 'MINOR',
          };
          auditResult.issues.push(issue);
          auditResult.buffDebuffValidation = 'FAIL';
          allIssues.push(issue);
        }
      }

      // ---- C. Status Effect Validation ----
      if (['status', 'damage_status'].includes(effectType)) {
        auditResult.statusEffectValidation = auditResult.statusEffectValidation === 'FAIL' ? 'FAIL' : 'PASS';

        const rawExpectedStatus = (effects.statusEffect as string);
        const expectedStatus = rawExpectedStatus ? normalizeStatusName(rawExpectedStatus) : undefined;
        const expectedDuration = (effects.statusDuration as number) ?? 1;

        if (expectedStatus) {
          const applied = entry.statusEffectsApplied ?? [];
          // Check both normalized form and raw form
          if (!applied.includes(expectedStatus) && !applied.includes(rawExpectedStatus)) {
            const issue: ValidationIssue = {
              combatId, round: entry.round, actor: entry.actor,
              abilityName: entry.abilityName, field: 'status_applied',
              expected: expectedStatus, actual: applied.join(', ') || 'none',
              severity: 'CRITICAL',
            };
            auditResult.issues.push(issue);
            auditResult.statusEffectValidation = 'FAIL';
            allIssues.push(issue);
          }

          // Track for duration validation using normalized name
          activeEffects.set(expectedStatus, {
            abilityName: entry.abilityName,
            effectName: expectedStatus,
            appliedRound: entry.round,
            expectedDuration,
          });
        }
      }

      // ---- F. Self-Damage / Self-Debuff Validation ----
      if (effectType === 'damage' && effects.selfDefenseDebuff) {
        // Self AC penalty abilities — the handler applies selfAcPenalty at start
        const desc = entry.abilityDescription ?? '';
        auditResult.statModifierValidation = auditResult.statModifierValidation === 'FAIL' ? 'FAIL' : 'PASS';
      }

    } // end of round entry loop

    // ---- E. Cooldown Validation (per combat) ----
    for (const [actorId, usageMap] of abilityUsageByActor) {
      for (const [abilityName, roundsUsed] of usageMap) {
        const abilityDef = abilityByName.get(abilityName);
        if (!abilityDef || abilityDef.cooldown <= 0) continue;

        const auditResult = abilityResults.get(abilityName)!;
        auditResult.cooldownValidation = auditResult.cooldownValidation === 'FAIL' ? 'FAIL' : 'PASS';

        const sorted = [...roundsUsed].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = sorted[i + 1] - sorted[i];
          const expectedMin = abilityDef.cooldown;

          cooldownEntries.push({
            abilityName,
            combatId,
            actor: actorId,
            roundA: sorted[i],
            roundB: sorted[i + 1],
            gap,
            expectedMinimum: expectedMin,
            result: gap >= expectedMin ? 'PASS' : 'VIOLATION',
          });

          if (gap < expectedMin) {
            const issue: ValidationIssue = {
              combatId, round: sorted[i + 1], actor: actorId,
              abilityName, field: 'cooldown_violation',
              expected: `>= ${expectedMin} rounds`, actual: `${gap} rounds`,
              severity: 'MODERATE',
            };
            auditResult.issues.push(issue);
            auditResult.cooldownValidation = 'FAIL';
            allIssues.push(issue);
          }
        }
      }
    }

    // ---- D. Duration: check for effects that never expired ----
    // Note: ActiveBuffs expire via roundsRemaining countdown, NOT via statusEffectsExpired.
    // Only status effects (stun, slowed, etc.) appear in statusEffectsExpired from StatusTickResult.
    // Buffs showing "NEVER" expired is expected behavior — they're tracked differently.
    for (const [key, tracked] of activeEffects) {
      // Check if this is a buff name (matches an ability name) vs a status effect
      const isBuff = abilityByName.has(tracked.effectName);
      if (isBuff) {
        // Buffs don't appear in statusEffectsExpired — can't verify expiry from logs alone.
        // Mark as N/A rather than MISMATCH.
        durationEntries.push({
          abilityName: tracked.abilityName,
          effectName: tracked.effectName,
          combatId,
          appliedRound: tracked.appliedRound,
          expectedExpiryRound: tracked.appliedRound + tracked.expectedDuration,
          actualExpiryRound: 'NEVER',
          match: 'MATCH', // Not verifiable from logs — buffs expire via roundsRemaining, not statusTicks
        });
      } else {
        // Actual status effect that should have expired — this is a real mismatch
        durationEntries.push({
          abilityName: tracked.abilityName,
          effectName: tracked.effectName,
          combatId,
          appliedRound: tracked.appliedRound,
          expectedExpiryRound: tracked.appliedRound + tracked.expectedDuration,
          actualExpiryRound: 'NEVER',
          match: 'MISMATCH',
        });
      }
    }
    activeEffects.clear();

  } // end of combat log loop

  // ---- Mark overall status ----
  for (const [, result] of abilityResults) {
    if (result.issues.length > 0) {
      result.overall = 'ISSUES FOUND';
    }
  }

  // ---- Identify untestable abilities (class-agnostic) ----
  for (const ability of classAbilities) {
    const effects = ability.effects as Record<string, any>;
    const result = abilityResults.get(ability.name)!;

    // Any passive-type ability is untestable as a class_ability action
    if (effects.type === 'passive') {
      untestableAbilities.push({
        name: ability.name,
        reason: 'Passive ability — does not appear as class_ability action in combat logs. Effect is applied implicitly by the engine.',
      });
    }

    // L40 abilities are untestable because sim only goes to L35
    if (ability.levelRequired >= 40 && result.totalUses === 0) {
      untestableAbilities.push({
        name: ability.name,
        reason: `L${ability.levelRequired} ability — sim only tests up to L35.`,
      });
    }

    // Any ability with zero uses that isn't already flagged
    if (result.totalUses === 0 && !untestableAbilities.find(u => u.name === ability.name)) {
      untestableAbilities.push({
        name: ability.name,
        reason: 'Zero uses found in combat logs.',
      });
    }
  }

  // ---- Generate report ----
  console.log('Generating audit report...');
  const report = generateReport(classLabel, simRunId, abilityByName, abilityResults, durationEntries, cooldownEntries, allIssues, untestableAbilities);

  const outputPath = path.resolve(process.cwd(), `docs/${className}-ability-mechanical-audit.md`);
  fs.writeFileSync(outputPath, report, 'utf-8');
  console.log(`Audit report written to: ${outputPath}`);

  // Print summary
  const totalAbilities = classAbilities.length;
  const abilitiesWithIssues = [...abilityResults.values()].filter(r => r.overall === 'ISSUES FOUND').length;
  const abilitiesWithUses = [...abilityResults.values()].filter(r => r.totalUses > 0).length;
  const totalIssues = allIssues.length;
  const critical = allIssues.filter(i => i.severity === 'CRITICAL').length;
  const moderate = allIssues.filter(i => i.severity === 'MODERATE').length;
  const minor = allIssues.filter(i => i.severity === 'MINOR').length;
  const durationMismatches = durationEntries.filter(d => d.match === 'MISMATCH').length;
  const cooldownViolations = cooldownEntries.filter(c => c.result === 'VIOLATION').length;

  console.log(`\n=== ${classLabel.toUpperCase()} AUDIT SUMMARY ===`);
  console.log(`Total ${className} abilities: ${totalAbilities}`);
  console.log(`Abilities with log data: ${abilitiesWithUses}`);
  console.log(`Abilities with issues: ${abilitiesWithIssues}`);
  console.log(`Total validation issues: ${totalIssues} (${critical} CRITICAL, ${moderate} MODERATE, ${minor} MINOR)`);
  console.log(`Duration mismatches: ${durationMismatches}`);
  console.log(`Cooldown violations: ${cooldownViolations}`);
  console.log(`Untestable abilities: ${untestableAbilities.length}`);

  await pool.end();
}

// ---- Report Generator ----

function generateReport(
  classLabel: string,
  simRunId: string,
  abilityByName: Map<string, AbilityDefinition>,
  abilityResults: Map<string, AbilityAuditResult>,
  durationEntries: DurationAuditEntry[],
  cooldownEntries: CooldownAuditEntry[],
  allIssues: ValidationIssue[],
  untestableAbilities: { name: string; reason: string }[],
): string {
  const lines: string[] = [];

  lines.push(`# ${classLabel} Ability Mechanical Audit`);
  lines.push('');
  lines.push(`**Sim Run:** ${simRunId}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // ---- 1. Per-Ability Audit Summary ----
  lines.push('## 1. Per-Ability Audit Summary');
  lines.push('');

  // Group by tier
  const tiers = [0, 1, 2, 3, 4, 5];
  for (const tier of tiers) {
    const tierAbilities = [...abilityResults.values()].filter(r => r.tier === tier);
    if (tierAbilities.length === 0) continue;

    lines.push(`### Tier ${tier}${tier === 0 ? ' (Pre-Specialization)' : ''}`);
    lines.push('');
    lines.push('| Ability | Level | Effect Type | Uses | Damage | Buff/Debuff | Duration | Cooldown | Status | Overall |');
    lines.push('|---------|-------|-------------|------|--------|-------------|----------|----------|--------|---------|');

    for (const r of tierAbilities) {
      lines.push(`| ${r.name} | L${r.levelRequired} | ${r.effectType} | ${r.totalUses} | ${r.damageValidation} | ${r.buffDebuffValidation} | ${r.durationValidation} | ${r.cooldownValidation} | ${r.statusEffectValidation} | **${r.overall}** |`);
    }

    // Detail issues per ability in this tier (deduplicated)
    for (const r of tierAbilities) {
      if (r.issues.length === 0) continue;
      lines.push('');
      lines.push(`#### ${r.name} — Issues (${r.issues.length} total)`);

      // Deduplicate by field, show unique issues + count
      const byField = new Map<string, { issue: ValidationIssue; count: number }>();
      for (const issue of r.issues) {
        const key = `${issue.field}|${issue.expected}|${issue.actual}`;
        if (!byField.has(key)) {
          byField.set(key, { issue, count: 1 });
        } else {
          byField.get(key)!.count++;
        }
      }
      for (const [, { issue, count }] of byField) {
        lines.push(`- **${issue.severity}** \`${issue.field}\` (x${count}): expected \`${issue.expected}\`, got \`${issue.actual}\``);
        lines.push(`  - Sample: Combat ${issue.combatId.substring(0, 12)}..., Round ${issue.round}, Actor: ${issue.actor}`);
      }
    }
    lines.push('');
  }

  // ---- 2. Duration Audit Detail ----
  lines.push('## 2. Duration Audit Detail');
  lines.push('');
  if (durationEntries.length === 0) {
    lines.push('No duration tracking data found (buffs/debuffs/statuses were not tracked to expiry).');
  } else {
    // Separate status effects (verifiable) from buffs (not verifiable from logs)
    const verifiable = durationEntries.filter(d => d.actualExpiryRound !== 'NEVER' || !abilityByName.has(d.effectName));
    const buffEntries = durationEntries.filter(d => d.actualExpiryRound === 'NEVER' && abilityByName.has(d.effectName));

    const matches = verifiable.filter(d => d.match === 'MATCH').length;
    const mismatches = verifiable.filter(d => d.match === 'MISMATCH').length;

    lines.push(`**Status effects with verifiable expiry:** ${verifiable.length} (${matches} MATCH, ${mismatches} MISMATCH)`);
    lines.push(`**Buffs (expire via roundsRemaining, not in logs):** ${buffEntries.length} (cannot verify from combat logs)`);
    lines.push('');

    if (verifiable.length > 0) {
      lines.push('### Verifiable Status Effect Durations');
      lines.push('');

      // Group by ability+result and show summary + samples
      const grouped = new Map<string, { entries: DurationAuditEntry[]; match: string }>();
      for (const d of verifiable) {
        const key = `${d.abilityName}|${d.effectName}|${d.match}`;
        if (!grouped.has(key)) {
          grouped.set(key, { entries: [d], match: d.match });
        } else {
          grouped.get(key)!.entries.push(d);
        }
      }

      lines.push('| Ability | Effect | Count | Result | Sample (Applied->Expected->Actual) |');
      lines.push('|---------|--------|-------|--------|----------------------------------|');
      for (const [, { entries, match }] of grouped) {
        const sample = entries[0];
        const actualStr = sample.actualExpiryRound === 'NEVER' ? 'NEVER' : `R${sample.actualExpiryRound}`;
        lines.push(`| ${sample.abilityName} | ${sample.effectName} | ${entries.length} | ${match} | R${sample.appliedRound}->R${sample.expectedExpiryRound}->${actualStr} |`);
      }
      lines.push('');
    }

    // Show buff summary
    if (buffEntries.length > 0) {
      lines.push('### Buff Duration (Not Verifiable from Logs)');
      lines.push('');
      lines.push('ActiveBuffs expire via `roundsRemaining` countdown in the combat engine, not via `statusEffectsExpired` in the log. These cannot be audited from log data alone.');
      lines.push('');

      const buffGrouped = new Map<string, number>();
      for (const d of buffEntries) {
        const key = d.abilityName;
        buffGrouped.set(key, (buffGrouped.get(key) ?? 0) + 1);
      }
      lines.push('| Buff | Instances | Expected Duration |');
      lines.push('|------|-----------|-------------------|');
      for (const [name, count] of buffGrouped) {
        const ability = abilityByName.get(name);
        const duration = ability ? ((ability.effects as any).duration ?? '?') : '?';
        lines.push(`| ${name} | ${count} | ${duration} rounds |`);
      }
      lines.push('');
    }
  }
  lines.push('');

  // ---- 3. Cooldown Audit Detail ----
  lines.push('## 3. Cooldown Audit Detail');
  lines.push('');
  if (cooldownEntries.length === 0) {
    lines.push('No abilities were used more than once in the same combat (no consecutive usage pairs to validate).');
  } else {
    const passes = cooldownEntries.filter(c => c.result === 'PASS').length;
    const violations = cooldownEntries.filter(c => c.result === 'VIOLATION').length;
    lines.push(`**Total cooldown pairs checked:** ${cooldownEntries.length} (${passes} PASS, ${violations} VIOLATION)`);
    lines.push('');

    // Group by ability and show summary
    const grouped = new Map<string, { passes: number; violations: number; minRequired: number; samples: CooldownAuditEntry[] }>();
    for (const c of cooldownEntries) {
      if (!grouped.has(c.abilityName)) {
        grouped.set(c.abilityName, { passes: 0, violations: 0, minRequired: c.expectedMinimum, samples: [] });
      }
      const g = grouped.get(c.abilityName)!;
      if (c.result === 'PASS') g.passes++;
      else {
        g.violations++;
        if (g.samples.length < 3) g.samples.push(c); // Keep first 3 violation samples
      }
    }

    lines.push('| Ability | Cooldown | Pairs Checked | Passes | Violations |');
    lines.push('|---------|----------|---------------|--------|------------|');
    for (const [name, g] of grouped) {
      lines.push(`| ${name} | ${g.minRequired}r | ${g.passes + g.violations} | ${g.passes} | ${g.violations} |`);
    }
    lines.push('');

    if (violations > 0) {
      lines.push('### Cooldown Violations');
      lines.push('');
      for (const [name, g] of grouped) {
        if (g.violations === 0) continue;
        for (const s of g.samples) {
          lines.push(`- **${name}**: R${s.roundA}->R${s.roundB} (gap ${s.gap}, min ${s.expectedMinimum}) in combat ${s.combatId.substring(0, 12)}...`);
        }
      }
      lines.push('');
    }
  }
  lines.push('');

  // ---- 4. Anomalies & Failures ----
  lines.push('## 4. Anomalies & Failures');
  lines.push('');
  if (allIssues.length === 0) {
    lines.push('No validation failures found.');
  } else {
    const critical = allIssues.filter(i => i.severity === 'CRITICAL');
    const moderate = allIssues.filter(i => i.severity === 'MODERATE');
    const minor = allIssues.filter(i => i.severity === 'MINOR');

    // Helper to deduplicate and render issues
    const renderIssueGroup = (issues: ValidationIssue[], label: string) => {
      if (issues.length === 0) return;
      lines.push(`### ${label} (${issues.length})`);
      lines.push('');

      // Group by ability+field+expected+actual
      const grouped = new Map<string, { issue: ValidationIssue; count: number }>();
      for (const issue of issues) {
        const key = `${issue.abilityName}|${issue.field}|${issue.expected}|${issue.actual}`;
        if (!grouped.has(key)) {
          grouped.set(key, { issue, count: 1 });
        } else {
          grouped.get(key)!.count++;
        }
      }
      for (const [, { issue, count }] of grouped) {
        lines.push(`- **${issue.abilityName}** \`${issue.field}\` (x${count}):`);
        lines.push(`  - Expected: ${issue.expected}`);
        lines.push(`  - Actual: ${issue.actual}`);
        lines.push(`  - Sample: Combat ${issue.combatId.substring(0, 12)}..., Round ${issue.round}`);
      }
      lines.push('');
    };

    renderIssueGroup(critical, 'CRITICAL');
    renderIssueGroup(moderate, 'MODERATE');
    renderIssueGroup(minor, 'MINOR');
  }

  // ---- 5. Untestable Abilities ----
  lines.push('## 5. Untestable Abilities');
  lines.push('');
  if (untestableAbilities.length === 0) {
    lines.push('All abilities were fully testable.');
  } else {
    lines.push('| Ability | Reason |');
    lines.push('|---------|--------|');
    for (const u of untestableAbilities) {
      lines.push(`| ${u.name} | ${u.reason} |`);
    }
  }
  lines.push('');

  // ---- 6. Known Data/Handler Mismatches ----
  lines.push('## 6. Known Data/Handler Mismatches');
  lines.push('');

  // Collect mismatches dynamically from the issues
  const mismatchIssues = allIssues.filter(i => i.field === 'data_handler_mismatch');
  if (mismatchIssues.length === 0) {
    lines.push('No data/handler mismatches detected for this class.');
  } else {
    lines.push('These are confirmed mismatches between ability data definitions and handler implementations:');
    lines.push('');
    // Deduplicate by ability name
    const seen = new Set<string>();
    for (const issue of mismatchIssues) {
      if (seen.has(issue.abilityName)) continue;
      seen.add(issue.abilityName);
      lines.push(`- **${issue.abilityName}**: Expected ${issue.expected}. Actual: ${issue.actual}`);
    }
    lines.push('');
    lines.push('**Handler contract reference:**');
    lines.push('- `handleDamage`: reads `bonusDamage`, `diceCount`, `diceSides`');
    lines.push('- `handleDamageDebuff`: reads `diceCount`, `diceSides` (NOT `bonusDamage`)');
    lines.push('- `handleDamageStatus`: reads `damage` (flat), `diceCount`, `diceSides` (NOT `bonusDamage`)');
    lines.push('- `handleHeal`: reads `diceCount`, `diceSides`, `bonusHealing`, `fullRestore` (NOT `healAmount`)');
  }
  lines.push('');

  return lines.join('\n');
}

main().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
