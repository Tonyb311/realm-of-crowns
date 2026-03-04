/**
 * Standalone Shield Bash stun verification script.
 * Runs 10 Guardian Warrior vs Orc Warrior combats and counts:
 *   - Stuns applied (Shield Bash usage)
 *   - Turns actually skipped due to stun (monster forced to defend)
 *
 * Uses pure combat-engine functions — no DB required.
 *
 * Usage: npx tsx --tsconfig server/tsconfig.json scripts/verify-shield-bash-stun.ts
 */

import {
  createCharacterCombatant,
  createMonsterCombatant,
  createCombatState,
  rollAllInitiative,
  resolveTurn,
} from '../server/src/lib/combat-engine';
import {
  buildSyntheticPlayer,
  buildSyntheticMonster,
  buildPlayerCombatParams,
} from '../server/src/services/combat-simulator';
import type { CombatState, CombatAction, WeaponInfo } from '../shared/src/types/combat';
import { createRacialCombatTracker } from '../server/src/services/racial-combat-abilities';
import { ALL_ABILITIES } from '../shared/src/data/skills';

const MAX_ROUNDS = 50;
const ITERATIONS = 10;

// Monster data for Orc Warrior (from seeds — speed removed)
const ORC_WARRIOR_STATS = {
  hp: 35, ac: 14, attack: 5, damage: '1d8+3',
  str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8,
};

// Build a set of all class ability IDs for detection
const CLASS_ABILITY_IDS = new Set(ALL_ABILITIES.map(a => a.id));

function runFight(fightNum: number): {
  rounds: number;
  shieldBashUses: number;
  monsterTurnsSkipped: number;
  outcome: string;
  log: string[];
} {
  // Build player
  const player = buildSyntheticPlayer({ race: 'human', class: 'warrior', level: 10 });
  if (!player) throw new Error('Failed to build player');

  const playerParams = buildPlayerCombatParams(player, {
    specialization: 'guardian',
    tier0Selections: { 3: 'a', 5: 'a', 8: 'a' },
  });

  const charId = `test-player-${fightNum}`;
  const monsterId = `test-monster-${fightNum}`;

  const playerCombatant = createCharacterCombatant(
    charId, player.name, 0,
    player.stats, player.level,
    player.hp, player.maxHp,
    player.equipmentAC, player.weapon,
    player.spellSlots, player.proficiencyBonus,
  );
  (playerCombatant as any).characterClass = player.class;
  (playerCombatant as any).race = player.race;

  // Build Orc Warrior monster
  const monster = buildSyntheticMonster('Orc Warrior', 6, ORC_WARRIOR_STATS as any, {});
  const monsterCombatant = createMonsterCombatant(
    monsterId, monster.name, 1,
    monster.stats, monster.level,
    monster.hp, monster.ac,
    monster.weapon, 0,
  );

  let state = createCombatState(`verify-${fightNum}`, 'PVE', [playerCombatant, monsterCombatant]);
  state = rollAllInitiative(state);

  const abilityQueue = playerParams.presets.abilityQueue;
  const weapon = playerParams.weapon;
  const log: string[] = [];
  let shieldBashUses = 0;
  let monsterTurnsSkipped = 0;

  log.push(`  Ability queue: ${abilityQueue.map(a => `${a.abilityName}(${a.useWhen})`).join(', ')}`);

  while (state.status === 'ACTIVE' && state.round <= MAX_ROUNDS) {
    const actorId = state.turnOrder[state.turnIndex];
    const actor = state.combatants.find(c => c.id === actorId);

    if (!actor || !actor.isAlive) {
      state = resolveTurn(state, { type: 'defend', actorId }, {});
      continue;
    }

    const enemies = state.combatants.filter(c => c.team !== actor.team && c.isAlive && !c.hasFled);
    if (enemies.length === 0) {
      state = resolveTurn(state, { type: 'defend', actorId }, {});
      continue;
    }

    const target = enemies[0];
    let action: CombatAction;
    let context: any;

    if (actor.entityType === 'character') {
      // Player: use ability queue logic matching tick-combat-resolver's decideAction
      let abilityChosen = false;

      for (const entry of abilityQueue) {
        const hpPercent = (actor.currentHp / actor.maxHp) * 100;
        let shouldUse = false;

        switch (entry.useWhen) {
          case 'always': shouldUse = true; break;
          case 'low_hp': shouldUse = hpPercent <= (entry.hpThreshold ?? 50); break;
          case 'high_hp': shouldUse = hpPercent >= (entry.hpThreshold ?? 75); break;
          case 'first_round': shouldUse = state.round <= 1; break;
          default: shouldUse = true;
        }

        if (shouldUse && entry.abilityId && CLASS_ABILITY_IDS.has(entry.abilityId)) {
          // Check cooldown — match tick-combat-resolver pattern
          const cooldownRemaining = actor.abilityCooldowns?.[entry.abilityId] ?? 0;
          if (cooldownRemaining > 0) continue;

          action = {
            type: 'class_ability',
            actorId,
            classAbilityId: entry.abilityId,
            targetId: target.id,
            targetIds: enemies.map(e => e.id),
          };
          context = { weapon: weapon ?? undefined };
          abilityChosen = true;

          if (entry.abilityId === 'war-gua-1') {
            shieldBashUses++;
            log.push(`  R${state.round}: Player uses Shield Bash on ${target.name}`);
          } else {
            log.push(`  R${state.round}: Player uses ${entry.abilityName} on ${target.name}`);
          }
          break;
        }
      }

      if (!abilityChosen) {
        action = { type: 'attack', actorId, targetId: target.id };
        context = { weapon: weapon ?? undefined };
      }

      const racialContext = {
        tracker: playerParams.racialTracker,
        race: player.race.toLowerCase(),
        level: player.level,
      };
      state = resolveTurn(state, action!, context!, racialContext);
    } else {
      // Monster: basic attack
      action = { type: 'attack', actorId, targetId: target.id };
      context = { weapon: actor.weapon };

      // Check if monster is stunned BEFORE the turn resolves
      // (our fix moved the check before processStatusEffects)
      const hasStun = actor.statusEffects.some(e => e.name === 'stunned');

      const logBefore = state.log.length;
      state = resolveTurn(state, action, context);

      // Check what actually happened — if monster was stunned, resolveTurn returns a defend
      const newEntries = state.log.slice(logBefore);
      for (const entry of newEntries) {
        if (entry.actorId === monsterId && entry.result?.type === 'defend' && hasStun) {
          monsterTurnsSkipped++;
          log.push(`  R${entry.round}: Monster STUNNED → turn skipped (defend)`);
        }
      }
    }
  }

  const playerAlive = state.combatants.find(c => c.id === charId)?.isAlive ?? false;
  const outcome = playerAlive ? 'WIN' : 'LOSS';

  return { rounds: state.round, shieldBashUses, monsterTurnsSkipped, outcome, log };
}

// ---- Main ----
console.log('=== Shield Bash Stun Verification (10 fights) ===');
console.log('L10 Human Guardian Warrior vs L6 Orc Warrior\n');

let totalBash = 0;
let totalSkips = 0;
let wins = 0;

for (let i = 0; i < ITERATIONS; i++) {
  const result = runFight(i);
  totalBash += result.shieldBashUses;
  totalSkips += result.monsterTurnsSkipped;
  if (result.outcome === 'WIN') wins++;

  console.log(`Fight ${i + 1}: ${result.outcome} in ${result.rounds} rounds | Shield Bash: ${result.shieldBashUses} | Turns Skipped: ${result.monsterTurnsSkipped}`);
  for (const l of result.log) {
    console.log(l);
  }
  console.log();
}

console.log('=== SUMMARY ===');
console.log(`Wins: ${wins}/${ITERATIONS}`);
console.log(`Total Shield Bash uses: ${totalBash}`);
console.log(`Total monster turns skipped: ${totalSkips}`);
console.log(`Ratio (skipped / bash uses): ${totalBash > 0 ? (totalSkips / totalBash * 100).toFixed(1) : 'N/A'}%`);
console.log();
if (totalSkips === 0 && totalBash > 0) {
  console.log('BUG STILL PRESENT: Stuns applied but no turns skipped!');
} else if (totalSkips > 0 && totalBash > 0) {
  console.log('FIX VERIFIED: Duration-1 stuns are causing turn skips.');
} else if (totalBash === 0) {
  console.log('WARNING: No Shield Bash uses — check ability queue setup.');
}
