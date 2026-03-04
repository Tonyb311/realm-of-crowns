/**
 * Phase 5 — Full Mechanical Verification Sim
 *
 * Runs 51 monsters × 7 classes × 10 iterations = 3,570 fights in-memory.
 * Parses combat logs for ability activations, engine features, and 0-damage bugs.
 * Writes report to docs/investigations/phase5-mechanical-verification.md
 *
 * Usage: npx tsx --tsconfig server/tsconfig.json scripts/verify-combat-mechanics.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

import {
  MONSTERS,
  type MonsterDef,
  type MonsterAbilityDef,
} from '../database/seeds/monsters';

import {
  buildSyntheticPlayer,
  buildSyntheticMonster,
  buildPlayerCombatParams,
  type MonsterCombatData,
} from '../server/src/services/combat-simulator';

import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
} from '../server/src/lib/combat-engine';

import {
  resolveTickCombat,
  type CombatantParams,
} from '../server/src/services/tick-combat-resolver';

import type {
  MonsterAbility,
  MonsterAbilityInstance,
  CombatDamageType,
  TurnLogEntry,
} from '../shared/src/types/combat';

import { ABILITIES_BY_CLASS, VALID_CLASSES } from '../shared/src/data/skills';

// ---- Constants ----

const ITERATIONS = 10;
const CLASSES = [...VALID_CLASSES];

// ---- Helpers ----

function buildMonsterAbilityInstances(abilities: any[]): MonsterAbilityInstance[] {
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  return abilities.map((a: any) => ({
    def: a as MonsterAbility,
    cooldownRemaining: 0,
    usesRemaining: a.usesPerCombat ?? null,
    isRecharged: false,
  }));
}

function buildMonsterCombatOptions(cd: MonsterCombatData) {
  const abilities = buildMonsterAbilityInstances(cd.abilities ?? []);
  const resistances = (cd.resistances ?? []) as CombatDamageType[];
  const immunities = (cd.immunities ?? []) as CombatDamageType[];
  const vulnerabilities = (cd.vulnerabilities ?? []) as CombatDamageType[];
  const conditionImmunities = cd.conditionImmunities ?? [];
  return {
    monsterAbilities: abilities,
    resistances,
    immunities,
    vulnerabilities,
    conditionImmunities,
    critImmunity: cd.critImmunity,
    critResistance: cd.critResistance,
    legendaryActions: cd.legendaryActions,
    legendaryResistances: cd.legendaryResistances,
    phaseTransitions: cd.phaseTransitions,
  };
}

function monsterToCombatData(m: MonsterDef): MonsterCombatData {
  return {
    damageType: m.damageType,
    abilities: m.abilities,
    resistances: m.resistances,
    immunities: m.immunities,
    vulnerabilities: m.vulnerabilities,
    conditionImmunities: m.conditionImmunities,
    critImmunity: m.critImmunity,
    critResistance: m.critResistance,
    legendaryActions: m.legendaryActions,
    legendaryResistances: m.legendaryResistances,
    phaseTransitions: m.phaseTransitions,
  };
}

// ---- Tracking Structures ----

interface MonsterAbilityTracker {
  id: string;
  name: string;
  type: string;
  firedCount: number;
  totalFights: number;
  totalDamage: number;
  zeroDamageCount: number; // fired but dealt 0 damage (for damage-dealing types)
}

interface ClassAbilityTracker {
  id: string;
  name: string;
  className: string;
  levelRequired: number;
  firedCount: number;
  totalFights: number;
  totalDamage: number;
}

interface EngineFeatureTracker {
  triggered: boolean;
  monsters: Set<string>;
  totalCount: number;
}

// Ability types that should deal damage when they fire
// Note: swallow deals damage via swallowResults (per-round acid), not the ability result itself
const DAMAGE_DEALING_TYPES = new Set([
  'damage', 'aoe', 'multiattack', 'death_throes', 'damage_aura',
]);

// ---- Global Trackers ----

// monster name → ability id → tracker
const monsterAbilityTrackers = new Map<string, Map<string, MonsterAbilityTracker>>();

// class name → ability id → tracker
const classAbilityTrackers = new Map<string, Map<string, ClassAbilityTracker>>();

// engine feature name → tracker
const engineFeatures: Record<string, EngineFeatureTracker> = {
  'Legendary Actions': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Legendary Resistances': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Phase Transitions': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Death Throes': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Swallow': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Damage Aura': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Fear Aura': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Multiattack': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Heal/Regen': { triggered: false, monsters: new Set(), totalCount: 0 },
  'On-Hit Effects': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Status Effects': { triggered: false, monsters: new Set(), totalCount: 0 },
  'AoE Attacks': { triggered: false, monsters: new Set(), totalCount: 0 },
  'Buff': { triggered: false, monsters: new Set(), totalCount: 0 },
};

let totalFights = 0;
let totalErrors: string[] = [];
const zeroDamageBugs: { monster: string; ability: string; type: string; fights: number }[] = [];

// ---- Initialize Trackers ----

function initializeTrackers() {
  // Monster ability trackers
  for (const m of MONSTERS) {
    const abilityMap = new Map<string, MonsterAbilityTracker>();
    if (m.abilities) {
      for (const a of m.abilities) {
        abilityMap.set(a.id, {
          id: a.id,
          name: a.name,
          type: a.type,
          firedCount: 0,
          totalFights: 0,
          totalDamage: 0,
          zeroDamageCount: 0,
        });
      }
    }
    monsterAbilityTrackers.set(m.name, abilityMap);
  }

  // Class ability trackers
  for (const className of CLASSES) {
    const abilities = ABILITIES_BY_CLASS[className] ?? [];
    const abilityMap = new Map<string, ClassAbilityTracker>();
    for (const a of abilities) {
      abilityMap.set(a.id, {
        id: a.id,
        name: a.name,
        className,
        levelRequired: a.levelRequired,
        firedCount: 0,
        totalFights: 0,
        totalDamage: 0,
      });
    }
    classAbilityTrackers.set(className, abilityMap);
  }
}

// ---- Log Parser ----

function parseLog(
  log: TurnLogEntry[],
  monsterName: string,
  className: string,
  monsterAbilities: MonsterAbilityDef[],
) {
  const monsterTrackers = monsterAbilityTrackers.get(monsterName);
  const classTrackers = classAbilityTrackers.get(className);

  // Increment totalFights for all abilities of this monster + class
  if (monsterTrackers) {
    for (const t of monsterTrackers.values()) t.totalFights++;
  }
  if (classTrackers) {
    for (const t of classTrackers.values()) t.totalFights++;
  }

  for (const entry of log) {
    const res = entry.result as any;

    // ---- Monster ability activations ----
    if (res?.type === 'monster_ability' && monsterTrackers) {
      const abilityId = res.abilityId;
      const tracker = monsterTrackers.get(abilityId);
      if (tracker) {
        tracker.firedCount++;
        const dmg = res.damage ?? 0;
        tracker.totalDamage += dmg;
        if (DAMAGE_DEALING_TYPES.has(tracker.type) && dmg === 0) {
          // Check if multiattack — look at strikeResults
          if (tracker.type === 'multiattack' && res.strikeResults) {
            const totalStrikeDmg = res.strikeResults.reduce((sum: number, s: any) => sum + (s.damage ?? 0), 0);
            tracker.totalDamage += totalStrikeDmg;
            if (totalStrikeDmg === 0) tracker.zeroDamageCount++;
          } else {
            tracker.zeroDamageCount++;
          }
        }
        // Track multiattack total damage from strikeResults
        if (tracker.type === 'multiattack' && res.strikeResults && dmg === 0) {
          // Already handled above
        }

        // Track engine feature by ability type
        const aDef = monsterAbilities.find(a => a.id === abilityId);
        if (aDef) {
          switch (aDef.type) {
            case 'multiattack':
              engineFeatures['Multiattack'].triggered = true;
              engineFeatures['Multiattack'].monsters.add(monsterName);
              engineFeatures['Multiattack'].totalCount++;
              break;
            case 'aoe':
              engineFeatures['AoE Attacks'].triggered = true;
              engineFeatures['AoE Attacks'].monsters.add(monsterName);
              engineFeatures['AoE Attacks'].totalCount++;
              break;
            case 'heal':
              engineFeatures['Heal/Regen'].triggered = true;
              engineFeatures['Heal/Regen'].monsters.add(monsterName);
              engineFeatures['Heal/Regen'].totalCount++;
              break;
            case 'buff':
              engineFeatures['Buff'].triggered = true;
              engineFeatures['Buff'].monsters.add(monsterName);
              engineFeatures['Buff'].totalCount++;
              break;
            case 'status':
              engineFeatures['Status Effects'].triggered = true;
              engineFeatures['Status Effects'].monsters.add(monsterName);
              engineFeatures['Status Effects'].totalCount++;
              break;
          }
        }
      }

      // Check for status applied via monster ability result
      if (res.statusApplied) {
        engineFeatures['Status Effects'].triggered = true;
        engineFeatures['Status Effects'].monsters.add(monsterName);
      }
    }

    // ---- Class ability activations ----
    if (res?.type === 'class_ability' && classTrackers) {
      const abilityId = res.abilityId;
      const tracker = classTrackers.get(abilityId);
      if (tracker) {
        tracker.firedCount++;
        tracker.totalDamage += res.damage ?? 0;
      }
    }

    // ---- On-Hit tracking via basic attack statusEffectsApplied ----
    if (res?.type === 'attack' && res.statusEffectsApplied?.length > 0) {
      // This means on_hit abilities triggered
      engineFeatures['On-Hit Effects'].triggered = true;
      engineFeatures['On-Hit Effects'].monsters.add(monsterName);
      engineFeatures['On-Hit Effects'].totalCount++;

      // Mark on_hit abilities as fired for this monster
      if (monsterTrackers) {
        for (const aDef of monsterAbilities) {
          if (aDef.type === 'on_hit') {
            const t = monsterTrackers.get(aDef.id);
            if (t) t.firedCount++;
          }
        }
      }
    }

    // ---- Legendary Actions ----
    if (entry.legendaryActions && entry.legendaryActions.length > 0) {
      engineFeatures['Legendary Actions'].triggered = true;
      engineFeatures['Legendary Actions'].monsters.add(monsterName);
      engineFeatures['Legendary Actions'].totalCount += entry.legendaryActions.length;

      // Track abilities fired WITHIN legendary actions
      if (monsterTrackers) {
        for (const la of entry.legendaryActions) {
          const laAction = la.action as any;
          if (laAction?.type === 'monster_ability' && laAction.abilityId) {
            const tracker = monsterTrackers.get(laAction.abilityId);
            if (tracker) {
              tracker.firedCount++;
              tracker.totalDamage += laAction.damage ?? 0;
            }
          }
        }
      }
    }

    // ---- Legendary Resistances ----
    if (entry.legendaryResistance?.resistanceUsed) {
      engineFeatures['Legendary Resistances'].triggered = true;
      engineFeatures['Legendary Resistances'].monsters.add(monsterName);
      engineFeatures['Legendary Resistances'].totalCount++;
    }

    // ---- Phase Transitions ----
    if (entry.phaseTransition) {
      engineFeatures['Phase Transitions'].triggered = true;
      engineFeatures['Phase Transitions'].monsters.add(monsterName);
      engineFeatures['Phase Transitions'].totalCount++;
    }

    // ---- Death Throes ----
    if (entry.deathThroesResult) {
      engineFeatures['Death Throes'].triggered = true;
      engineFeatures['Death Throes'].monsters.add(monsterName);
      engineFeatures['Death Throes'].totalCount++;

      // Mark death_throes ability as fired
      if (monsterTrackers) {
        for (const aDef of monsterAbilities) {
          if (aDef.type === 'death_throes') {
            const t = monsterTrackers.get(aDef.id);
            if (t) t.firedCount++;
          }
        }
      }
    }

    // ---- Swallow ----
    if (entry.swallowResults && entry.swallowResults.length > 0) {
      engineFeatures['Swallow'].triggered = true;
      engineFeatures['Swallow'].monsters.add(monsterName);
      engineFeatures['Swallow'].totalCount += entry.swallowResults.length;
    }

    // ---- Aura Results (fear + damage) ----
    if (entry.auraResults) {
      for (const aura of entry.auraResults) {
        if (aura.auraType === 'damage') {
          engineFeatures['Damage Aura'].triggered = true;
          engineFeatures['Damage Aura'].monsters.add(monsterName);
          engineFeatures['Damage Aura'].totalCount++;

          // Mark damage_aura ability as fired
          if (monsterTrackers) {
            for (const aDef of monsterAbilities) {
              if (aDef.type === 'damage_aura') {
                const t = monsterTrackers.get(aDef.id);
                if (t) {
                  t.firedCount++;
                  t.totalDamage += aura.damage ?? 0;
                  if ((aura.damage ?? 0) === 0) t.zeroDamageCount++;
                }
              }
            }
          }
        }
        if (aura.auraType === 'fear') {
          engineFeatures['Fear Aura'].triggered = true;
          engineFeatures['Fear Aura'].monsters.add(monsterName);
          engineFeatures['Fear Aura'].totalCount++;

          // Mark fear_aura ability as fired
          if (monsterTrackers) {
            for (const aDef of monsterAbilities) {
              if (aDef.type === 'fear_aura') {
                const t = monsterTrackers.get(aDef.id);
                if (t) t.firedCount++;
              }
            }
          }
        }
      }
    }

    // ---- Swallow attempt tracked via monster_ability result (swallow type) ----
    if (res?.type === 'monster_ability' && monsterTrackers) {
      const aDef = monsterAbilities.find(a => a.id === res.abilityId);
      if (aDef?.type === 'swallow') {
        engineFeatures['Swallow'].triggered = true;
        engineFeatures['Swallow'].monsters.add(monsterName);
      }
    }
  }
}

// ---- Fight Runner ----

function runFight(
  monsterDef: MonsterDef,
  className: string,
  iteration: number,
): { error?: string } {
  try {
    const player = buildSyntheticPlayer({ race: 'human', class: className, level: monsterDef.level });
    if (!player) return { error: `Failed to build ${className} L${monsterDef.level}` };

    const combatData = monsterToCombatData(monsterDef);
    const monster = buildSyntheticMonster(monsterDef.name, monsterDef.level, monsterDef.stats as any, combatData);
    const playerParams = buildPlayerCombatParams(player);

    const playerCombatant = createCharacterCombatant(
      `player-${iteration}`, player.name, 0,
      player.stats, player.level,
      player.hp, player.maxHp,
      player.equipmentAC, player.weapon,
      player.spellSlots, player.proficiencyBonus,
    );
    (playerCombatant as any).characterClass = player.class;
    (playerCombatant as any).race = player.race;

    const monsterCombatant = createMonsterCombatant(
      `monster-${iteration}`, monster.name, 1,
      monster.stats, monster.level,
      monster.hp, monster.ac,
      monster.weapon, 0,
      monster.combatData ? buildMonsterCombatOptions(monster.combatData) : undefined,
    );

    const state = createCombatState(`verify-${iteration}`, 'PVE', [playerCombatant, monsterCombatant]);
    const paramsMap = new Map<string, CombatantParams>();
    paramsMap.set(`player-${iteration}`, { ...playerParams, id: `player-${iteration}` });

    const outcome = resolveTickCombat(state, paramsMap);

    parseLog(
      outcome.combatLog,
      monsterDef.name,
      className,
      monsterDef.abilities ?? [],
    );

    return {};
  } catch (err: any) {
    return { error: `${monsterDef.name} vs ${className} L${monsterDef.level} iter ${iteration}: ${err.message}` };
  }
}

// ---- Main ----

function main() {
  console.log('=== PHASE 5 — FULL MECHANICAL VERIFICATION ===\n');
  console.log(`Monsters: ${MONSTERS.length}`);
  console.log(`Classes: ${CLASSES.length}`);
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Total fights: ${MONSTERS.length * CLASSES.length * ITERATIONS}\n`);

  initializeTrackers();

  const startTime = Date.now();

  for (let mi = 0; mi < MONSTERS.length; mi++) {
    const m = MONSTERS[mi];
    process.stdout.write(`[${mi + 1}/${MONSTERS.length}] ${m.name} (L${m.level})...`);

    for (const cls of CLASSES) {
      for (let i = 0; i < ITERATIONS; i++) {
        totalFights++;
        const result = runFight(m, cls, totalFights);
        if (result.error) {
          totalErrors.push(result.error);
        }
      }
    }

    process.stdout.write(' done\n');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted ${totalFights} fights in ${elapsed}s`);
  console.log(`Errors: ${totalErrors.length}`);

  generateReport(elapsed);
}

// ---- Report Generator ----

function generateReport(elapsed: string) {
  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  // ---- Summary ----
  const totalMonsterAbilities = Array.from(monsterAbilityTrackers.values())
    .reduce((sum, m) => sum + m.size, 0);
  const firedMonsterAbilities = Array.from(monsterAbilityTrackers.values())
    .reduce((sum, m) => {
      let count = 0;
      for (const t of m.values()) if (t.firedCount > 0) count++;
      return sum + count;
    }, 0);

  const totalClassAbilities = Array.from(classAbilityTrackers.values())
    .reduce((sum, m) => sum + m.size, 0);
  const firedClassAbilities = Array.from(classAbilityTrackers.values())
    .reduce((sum, m) => {
      let count = 0;
      for (const t of m.values()) if (t.firedCount > 0) count++;
      return sum + count;
    }, 0);

  const engineFeaturesVerified = Object.values(engineFeatures).filter(f => f.triggered).length;
  const engineFeaturesTotal = Object.keys(engineFeatures).length;

  w('# Phase 5 — Mechanical Verification Report');
  w('');
  w(`Generated: ${new Date().toISOString()}`);
  w(`Runtime: ${elapsed}s`);
  w('');
  w('## Summary');
  w(`- Total fights: ${totalFights}`);
  w(`- Total errors: ${totalErrors.length}`);
  w(`- Monster abilities verified: ${firedMonsterAbilities}/${totalMonsterAbilities} (${totalMonsterAbilities > 0 ? ((firedMonsterAbilities / totalMonsterAbilities) * 100).toFixed(1) : 0}%)`);
  w(`- Class abilities verified: ${firedClassAbilities}/${totalClassAbilities} (${totalClassAbilities > 0 ? ((firedClassAbilities / totalClassAbilities) * 100).toFixed(1) : 0}%)`);
  w(`- Engine features verified: ${engineFeaturesVerified}/${engineFeaturesTotal}`);
  w('');

  // ---- Engine Feature Coverage ----
  w('## Engine Feature Coverage');
  w('');
  w('| Feature | Triggered? | Count | Monsters |');
  w('|---------|-----------|-------|----------|');
  for (const [name, f] of Object.entries(engineFeatures)) {
    const triggered = f.triggered ? 'YES' : 'NO';
    const monsters = f.monsters.size > 0 ? Array.from(f.monsters).join(', ') : '-';
    w(`| ${name} | ${triggered} | ${f.totalCount} | ${monsters} |`);
  }
  w('');

  // ---- Monster Ability Coverage ----
  w('## Monster Ability Coverage');
  w('');

  const fullyVerified: string[] = [];
  const partialCoverage: { monster: string; ability: string; type: string; totalFights: number }[] = [];
  const neverFired: { monster: string; ability: string; type: string; totalFights: number; possibleReason: string }[] = [];

  for (const [monsterName, abilities] of monsterAbilityTrackers) {
    if (abilities.size === 0) continue;
    let allFired = true;
    for (const [, t] of abilities) {
      if (t.firedCount === 0) {
        allFired = false;
        // Determine possible reason
        const monsterDef = MONSTERS.find(m => m.name === monsterName);
        const aDef = monsterDef?.abilities?.find(a => a.id === t.id);
        let reason = 'unknown';
        if (aDef) {
          if (aDef.type === 'death_throes') reason = 'Monster never died (fights too short or player dies first)';
          else if (aDef.type === 'fear_aura') reason = 'Fear aura may be resisted by save or condition immunity';
          else if (aDef.type === 'damage_aura') reason = 'No melee attacks hit this monster (class uses ranged?)';
          else if (aDef.type === 'on_hit') reason = 'Monster basic attack never landed (abilities used instead)';
          else if (aDef.type === 'heal' && aDef.disabledBy) reason = `Heal disabled by ${aDef.disabledBy.join('/')} or fight too short`;
          else if (aDef.type === 'swallow') reason = 'Save always passes or attack misses';
          else if ((aDef.cooldown ?? 0) >= 3) reason = `High cooldown (${aDef.cooldown}) + fight too short`;
          else if ((aDef.priority ?? 0) < 3) reason = `Low priority (${aDef.priority ?? 0}) — higher priority abilities used instead`;
          else if (aDef.usesPerCombat === 1) reason = 'Single use — may fire but tracked elsewhere or fight ended first';
          else if (aDef.isLegendaryAction) reason = 'Legendary action — only fires via LA slots';
          else reason = `Cooldown: ${aDef.cooldown ?? 0}, Priority: ${aDef.priority ?? 0}`;
        }
        neverFired.push({
          monster: monsterName,
          ability: t.name,
          type: t.type,
          totalFights: t.totalFights,
          possibleReason: reason,
        });
      }
    }
    if (allFired) {
      fullyVerified.push(monsterName);
    }
  }

  w('### FULLY VERIFIED (all abilities fired at least once)');
  w('');
  if (fullyVerified.length > 0) {
    for (const m of fullyVerified) w(`- ${m}`);
  } else {
    w('(none)');
  }
  w('');

  w('### ABILITIES THAT NEVER FIRED');
  w('');
  if (neverFired.length > 0) {
    w('| Monster | Ability | Type | Total Fights | Possible Reason |');
    w('|---------|---------|------|-------------|-----------------|');
    for (const nf of neverFired) {
      w(`| ${nf.monster} | ${nf.ability} | ${nf.type} | ${nf.totalFights} | ${nf.possibleReason} |`);
    }
  } else {
    w('All monster abilities fired at least once!');
  }
  w('');

  // ---- Class Ability Coverage ----
  w('## Class Ability Coverage');
  w('');
  w('### By Class');
  w('');
  w('| Class | Total Abilities | Abilities Fired | Coverage |');
  w('|-------|----------------|-----------------|----------|');
  for (const cls of CLASSES) {
    const abilities = classAbilityTrackers.get(cls);
    if (!abilities) continue;
    const total = abilities.size;
    let fired = 0;
    for (const t of abilities.values()) if (t.firedCount > 0) fired++;
    const pct = total > 0 ? ((fired / total) * 100).toFixed(1) : '0.0';
    w(`| ${cls} | ${total} | ${fired} | ${pct}% |`);
  }
  w('');

  // Class abilities that never fired
  const classNeverFired: { className: string; ability: string; levelRequired: number; reason: string }[] = [];
  for (const cls of CLASSES) {
    const abilities = classAbilityTrackers.get(cls);
    if (!abilities) continue;
    for (const [, t] of abilities) {
      if (t.firedCount === 0) {
        // Determine reason
        const maxMonsterLevel = Math.max(...MONSTERS.map(m => m.level));
        let reason = 'Not selected by ability queue AI';
        if (t.levelRequired > maxMonsterLevel) {
          reason = `Level ${t.levelRequired} required but max monster level is ${maxMonsterLevel}`;
        }
        const abilityDef = ABILITIES_BY_CLASS[cls]?.find(a => a.id === t.id);
        if (abilityDef) {
          const effects = abilityDef.effects as any;
          if (effects?.type === 'passive') reason = 'Passive ability (not actively used in combat)';
          else if (effects?.type === 'flee') reason = 'Flee abilities only used at low HP + AI decision';
          else if (effects?.type === 'steal') reason = 'Utility ability — low priority in queue';
          else if (effects?.type === 'reaction' || effects?.type === 'counter') reason = 'Reactive ability — triggers on being hit, not actively queued';
        }
        classNeverFired.push({
          className: cls,
          ability: t.name,
          levelRequired: t.levelRequired,
          reason,
        });
      }
    }
  }

  w('### Abilities That Never Fired');
  w('');
  if (classNeverFired.length > 0) {
    w('| Class | Ability | Level Req | Possible Reason |');
    w('|-------|---------|-----------|-----------------|');
    for (const cf of classNeverFired) {
      w(`| ${cf.className} | ${cf.ability} | ${cf.levelRequired} | ${cf.reason} |`);
    }
  } else {
    w('All class abilities fired at least once!');
  }
  w('');

  // ---- Damage Verification ----
  w('## Damage Verification');
  w('');

  // Find 0-damage bugs: abilities that should deal damage but dealt 0 every time they fired
  const zeroDmg: { monster: string; ability: string; type: string; firedCount: number; zeroDmgCount: number }[] = [];
  for (const [monsterName, abilities] of monsterAbilityTrackers) {
    for (const [, t] of abilities) {
      if (DAMAGE_DEALING_TYPES.has(t.type) && t.firedCount > 0 && t.totalDamage === 0) {
        zeroDmg.push({
          monster: monsterName,
          ability: t.name,
          type: t.type,
          firedCount: t.firedCount,
          zeroDmgCount: t.zeroDamageCount,
        });
      }
    }
  }

  if (zeroDmg.length > 0) {
    w('### 0-Damage Bugs (abilities that fired but dealt 0 total damage)');
    w('');
    w('| Monster | Ability | Type | Times Fired | Status |');
    w('|---------|---------|------|-------------|--------|');
    for (const z of zeroDmg) {
      w(`| ${z.monster} | ${z.ability} | ${z.type} | ${z.firedCount} | **BUG** |`);
    }
  } else {
    w('No 0-damage bugs found. All damage-dealing abilities that fired dealt >0 damage.');
  }
  w('');

  // ---- Errors ----
  w('## Errors');
  w('');
  if (totalErrors.length > 0) {
    for (const err of totalErrors) {
      w(`- ${err}`);
    }
  } else {
    w('No runtime errors.');
  }
  w('');

  // ---- Write report ----
  const reportPath = join(__dirname, '..', 'docs', 'investigations', 'phase5-mechanical-verification.md');
  const report = lines.join('\n');
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\nReport written to: docs/investigations/phase5-mechanical-verification.md`);

  // Print summary to console
  console.log('\n=== QUICK SUMMARY ===');
  console.log(`Monster abilities: ${firedMonsterAbilities}/${totalMonsterAbilities} (${totalMonsterAbilities > 0 ? ((firedMonsterAbilities / totalMonsterAbilities) * 100).toFixed(1) : 0}%)`);
  console.log(`Class abilities: ${firedClassAbilities}/${totalClassAbilities} (${totalClassAbilities > 0 ? ((firedClassAbilities / totalClassAbilities) * 100).toFixed(1) : 0}%)`);
  console.log(`Engine features: ${engineFeaturesVerified}/${engineFeaturesTotal}`);
  console.log(`Errors: ${totalErrors.length}`);
  console.log(`0-damage bugs: ${zeroDmg.length}`);

  if (neverFired.length > 0) {
    console.log(`\nMonster abilities never fired: ${neverFired.length}`);
    for (const nf of neverFired.slice(0, 10)) {
      console.log(`  ${nf.monster}: ${nf.ability} (${nf.type}) — ${nf.possibleReason}`);
    }
    if (neverFired.length > 10) console.log(`  ... and ${neverFired.length - 10} more (see report)`);
  }

  if (zeroDmg.length > 0) {
    console.log(`\n*** 0-DAMAGE BUGS ***`);
    for (const z of zeroDmg) {
      console.log(`  ${z.monster}: ${z.ability} (${z.type}) fired ${z.firedCount}x with 0 total damage`);
    }
  }
}

main();
