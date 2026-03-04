/**
 * Direct functional test for Phase 3: Death Throes + Phase Transitions
 * Tests the engine functions directly with fabricated combat state.
 */
import {
  resolveDeathThroes, checkPhaseTransitions,
  createMonsterCombatant, createCharacterCombatant, createCombatState,
  type CombatState,
} from '../server/src/lib/combat-engine';
import type { PhaseTransition, MonsterAbility, MonsterAbilityInstance } from '@shared/types/combat';

// --- Helper ---
function assert(condition: boolean, msg: string) {
  if (!condition) { console.error(`  FAIL: ${msg}`); process.exit(1); }
  console.log(`  PASS: ${msg}`);
}

// --- Test 1: Death Throes ---
console.log('\n=== TEST 1: Death Throes ===\n');
{
  const dtAbility: MonsterAbility = {
    id: 'demon_death_throes', name: 'Infernal Explosion', type: 'death_throes',
    deathDamage: '8d6', deathDamageType: 'FIRE', deathSaveDC: 15, deathSaveType: 'dex',
    description: 'Explodes on death',
  };
  const dtInstance: MonsterAbilityInstance = {
    def: dtAbility, cooldownRemaining: 0, usesRemaining: null, isRecharged: false,
  };

  const player = createCharacterCombatant(
    'player1', 'TestWarrior', 0,
    { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 },
    16, 100, 100, 18,
    { id: 'sword', name: 'Sword', dice: '1d8', attackStat: 'str', damageStat: 'str', damageType: 'SLASHING', bonusAttack: 0, bonusDamage: 0 },
    {}, 5
  );

  const monster = createMonsterCombatant(
    'demon1', 'Demon', 1,
    { str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18 },
    16, 130, 17,
    { id: 'claw', name: 'Claw', dice: '2d8', attackStat: 'str', damageStat: 'str', damageType: 'FIRE', bonusAttack: 10, bonusDamage: 6 },
    0,
    { monsterAbilities: [dtInstance] }
  );

  // Kill the monster
  const deadMonster = { ...monster, currentHp: 0, isAlive: false };
  let state = createCombatState('test-dt', 'PVE', [player, deadMonster]);

  const result = resolveDeathThroes(state, 'demon1');

  assert(result.result !== null, 'Death throes result should not be null');
  assert(result.result!.monsterName === 'Demon', `Monster name: ${result.result!.monsterName}`);
  assert(result.result!.damageType === 'FIRE', `Damage type: ${result.result!.damageType}`);
  assert(result.result!.damage > 0, `Damage rolled: ${result.result!.damage}`);
  assert(result.result!.saveDC === 15, `Save DC: ${result.result!.saveDC}`);
  assert(result.result!.saveType === 'dex', `Save type: ${result.result!.saveType}`);
  assert(result.result!.playerHpBefore === 100, `Player HP before: ${result.result!.playerHpBefore}`);
  assert(result.result!.playerHpAfter < 100, `Player HP after: ${result.result!.playerHpAfter} (took damage)`);
  assert(typeof result.result!.savePassed === 'boolean', `Save result: ${result.result!.savePassed ? 'passed' : 'failed'}`);
  assert(typeof result.result!.mutualKill === 'boolean', `Mutual kill flag: ${result.result!.mutualKill}`);
  assert(result.result!.finalDamage > 0, `Final damage: ${result.result!.finalDamage}`);

  console.log(`\n  Death Throes Summary: ${result.result!.damageRoll} ${result.result!.damageType} → ${result.result!.finalDamage}dmg`);
  console.log(`  Save: ${result.result!.saveRoll} + mods = ${result.result!.saveTotal} vs DC${result.result!.saveDC} → ${result.result!.savePassed ? 'PASS (half)' : 'FAIL (full)'}`);
  console.log(`  HP: ${result.result!.playerHpBefore} → ${result.result!.playerHpAfter}, survived: ${result.result!.playerSurvived}, mutual kill: ${result.result!.mutualKill}`);

  // Verify deathThroesProcessed flag
  const processedMonster = result.state.combatants.find(c => c.id === 'demon1');
  assert(processedMonster?.deathThroesProcessed === true, 'deathThroesProcessed flag set');

  // Test double-fire prevention
  const secondResult = resolveDeathThroes(result.state, 'demon1');
  assert(secondResult.result === null, 'Death throes should NOT fire twice');
}

// --- Test 2: Phase Transition (single) ---
console.log('\n=== TEST 2: Phase Transition (single threshold) ===\n');
{
  const demonPhase: PhaseTransition = {
    id: 'demon_phase2', hpThresholdPercent: 30, name: 'Infernal Rage',
    description: 'Demon enters berserk frenzy', triggered: false,
    effects: [{ type: 'stat_boost', statBoost: { attack: 3, damage: 2 } }],
  };

  const monster = createMonsterCombatant(
    'demon2', 'Demon', 1,
    { str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18 },
    16, 130, 17, null, 0,
    { phaseTransitions: [demonPhase] }
  );

  const player = createCharacterCombatant(
    'player2', 'TestWarrior', 0,
    { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 },
    16, 100, 100, 18, null, {}, 5
  );

  // Set monster HP to 25% (below 30% threshold)
  const lowHpMonster = { ...monster, currentHp: 32 }; // 32/130 = 24.6%
  let state = createCombatState('test-pt', 'PVE', [player, lowHpMonster]);

  const result = checkPhaseTransitions(state, 'demon2');

  assert(result.result !== null, 'Phase transition should fire');
  assert(result.result!.transitionName === 'Infernal Rage', `Name: ${result.result!.transitionName}`);
  assert(result.result!.hpThresholdPercent === 30, `Threshold: ${result.result!.hpThresholdPercent}`);
  assert(result.result!.actualHpPercent < 30, `Actual HP%: ${result.result!.actualHpPercent}`);
  assert(result.result!.effects.length > 0, `Effects: ${result.result!.effects.join(', ')}`);
  assert(result.result!.narratorText === 'Demon enters berserk frenzy', `Narrator: ${result.result!.narratorText}`);

  // Verify stat boost buff applied
  const updatedMonster = result.state.combatants.find(c => c.id === 'demon2');
  assert((updatedMonster?.activeBuffs?.length ?? 0) > 0, 'Active buff applied');
  const buff = updatedMonster?.activeBuffs?.[0];
  assert(buff?.attackMod === 3, `Attack mod: ${buff?.attackMod}`);
  assert(buff?.damageMod === 2, `Damage mod: ${buff?.damageMod}`);

  // Verify double-fire prevention
  const secondResult = checkPhaseTransitions(result.state, 'demon2');
  assert(secondResult.result === null, 'Phase transition should NOT fire twice');
}

// --- Test 3: Phase Transition (multi-threshold + AoE burst) ---
console.log('\n=== TEST 3: Phase Transition (multi-threshold + AoE burst) ===\n');
{
  const lichPhases: PhaseTransition[] = [
    {
      id: 'lich_phase2', hpThresholdPercent: 50, name: 'Desperate Arcana',
      description: 'Lich channels forbidden reserves', triggered: false,
      effects: [
        { type: 'stat_boost', statBoost: { attack: 2 } },
        { type: 'aoe_burst', aoeBurst: { damage: '3d6', damageType: 'NECROTIC', saveDC: 18, saveType: 'dex' } },
      ],
    },
    {
      id: 'lich_phase3', hpThresholdPercent: 25, name: 'Phylactery Rage',
      description: 'Lich draws power from phylactery', triggered: false,
      effects: [{ type: 'stat_boost', statBoost: { damage: 3, ac: 2 } }],
    },
  ];

  const monster = createMonsterCombatant(
    'lich1', 'Lich', 1,
    { str: 10, dex: 14, con: 14, int: 22, wis: 16, cha: 16 },
    18, 120, 17, null, 0,
    { phaseTransitions: lichPhases }
  );

  const player = createCharacterCombatant(
    'player3', 'TestWarrior', 0,
    { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 },
    18, 120, 120, 18, null, {}, 5
  );

  // Set Lich to 40% HP (below 50% but above 25%)
  const lowLich = { ...monster, currentHp: 48 }; // 48/120 = 40%
  let state = createCombatState('test-pt-multi', 'PVE', [player, lowLich]);

  // First call: should trigger 50% threshold
  const result1 = checkPhaseTransitions(state, 'lich1');
  assert(result1.result !== null, 'First phase should fire (50%)');
  assert(result1.result!.transitionName === 'Desperate Arcana', `Name: ${result1.result!.transitionName}`);
  assert(result1.result!.aoeDamage !== undefined && result1.result!.aoeDamage > 0, `AoE burst damage: ${result1.result!.aoeDamage}`);

  // AoE burst should have damaged the player
  const playerAfter1 = result1.state.combatants.find(c => c.id === 'player3');
  assert(playerAfter1!.currentHp < 120, `Player took AoE damage: ${120 - playerAfter1!.currentHp}`);

  // Second call: 25% not yet reached (monster still at 40%)
  const result2 = checkPhaseTransitions(result1.state, 'lich1');
  assert(result2.result === null, '25% phase should NOT fire yet (monster at 40%)');

  // Now drop Lich to 20% HP
  const veryLowLich = result1.state.combatants.map(c =>
    c.id === 'lich1' ? { ...c, currentHp: 24 } : c  // 24/120 = 20%
  );
  let state3 = { ...result1.state, combatants: veryLowLich };

  const result3 = checkPhaseTransitions(state3, 'lich1');
  assert(result3.result !== null, 'Second phase should fire (25%)');
  assert(result3.result!.transitionName === 'Phylactery Rage', `Name: ${result3.result!.transitionName}`);

  console.log(`\n  Multi-threshold verified: 50% fires first, 25% fires when reached`);
}

// --- Test 4: Phase Transition with add_ability ---
console.log('\n=== TEST 4: Phase Transition with add_ability ===\n');
{
  const addAbilityPhase: PhaseTransition = {
    id: 'test_add', hpThresholdPercent: 50, name: 'New Power',
    description: 'Monster gains new ability', triggered: false,
    effects: [{
      type: 'add_ability',
      ability: {
        id: 'new_aoe', name: 'New AoE', type: 'aoe', damage: '4d8+5',
        damageType: 'NECROTIC', saveType: 'con', saveDC: 18, cooldown: 2,
        description: 'A new devastating attack',
      } as MonsterAbility,
    }],
  };

  const existingAbility: MonsterAbilityInstance = {
    def: { id: 'old_bolt', name: 'Old Bolt', type: 'damage', damage: '2d6', description: 'zap' } as MonsterAbility,
    cooldownRemaining: 0, usesRemaining: null, isRecharged: true,
  };

  const monster = createMonsterCombatant(
    'test-m', 'TestBoss', 1,
    { str: 10, dex: 14, con: 14, int: 22, wis: 16, cha: 16 },
    18, 100, 17, null, 0,
    { monsterAbilities: [existingAbility], phaseTransitions: [addAbilityPhase] }
  );

  const player = createCharacterCombatant(
    'test-p', 'TestWarrior', 0,
    { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 },
    18, 120, 120, 18, null, {}, 5
  );

  const lowMonster = { ...monster, currentHp: 40 }; // 40%
  const state = createCombatState('test-add-ability', 'PVE', [player, lowMonster]);
  const result = checkPhaseTransitions(state, 'test-m');

  assert(result.result !== null, 'Phase fires');
  const updatedM = result.state.combatants.find(c => c.id === 'test-m');
  assert((updatedM?.monsterAbilities?.length ?? 0) === 2, `Monster now has 2 abilities (was 1)`);
  const newAbil = updatedM?.monsterAbilities?.find(a => a.def.id === 'new_aoe');
  assert(newAbil !== undefined, 'New ability added');
  assert(newAbil!.cooldownRemaining === 0, 'New ability ready to use');

  console.log(`  add_ability verified: ${updatedM?.monsterAbilities?.map(a => a.def.name).join(', ')}`);
}

// --- Test 5: Death Throes with low HP player (mutual kill) ---
console.log('\n=== TEST 5: Death Throes — Mutual Kill ===\n');
{
  const dtAbility: MonsterAbility = {
    id: 'big_dt', name: 'Massive Explosion', type: 'death_throes',
    deathDamage: '20d6', deathDamageType: 'FIRE', deathSaveDC: 25, deathSaveType: 'dex',
    description: 'Massive explosion',
  };
  const dtInstance: MonsterAbilityInstance = {
    def: dtAbility, cooldownRemaining: 0, usesRemaining: null, isRecharged: false,
  };

  const player = createCharacterCombatant(
    'low-hp-player', 'WeakWarrior', 0,
    { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    1, 5, 5, 10, null, {}, 2
  );

  const monster = createMonsterCombatant(
    'big-boom', 'Boom', 1,
    { str: 18, dex: 14, con: 16, int: 14, wis: 12, cha: 18 },
    20, 200, 17, null, 0,
    { monsterAbilities: [dtInstance] }
  );

  const deadMonster = { ...monster, currentHp: 0, isAlive: false };
  const state = createCombatState('test-mutual', 'PVE', [player, deadMonster]);

  // Run 10 times to see if mutual kill happens
  let mutualKills = 0;
  let survivals = 0;
  for (let i = 0; i < 10; i++) {
    const freshPlayer = { ...player, currentHp: 5, isAlive: true };
    const freshMonster = { ...monster, currentHp: 0, isAlive: false };
    const freshState = createCombatState(`test-mk-${i}`, 'PVE', [freshPlayer, freshMonster]);
    const r = resolveDeathThroes(freshState, 'big-boom');
    if (r.result?.mutualKill) mutualKills++;
    if (r.result?.playerSurvived) survivals++;
  }

  console.log(`  10 death throes with 5HP player vs 20d6 DC25:`);
  console.log(`  Mutual kills: ${mutualKills}/10, Survivals: ${survivals}/10`);
  assert(mutualKills > 0, `Should get at least some mutual kills with 5HP vs 20d6`);
}

console.log('\n=== ALL PHASE 3 TESTS PASSED ===\n');
