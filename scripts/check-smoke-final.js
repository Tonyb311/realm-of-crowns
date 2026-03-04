const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

const RUNS = {
  wolf:     'cmmaxys080000110a7vejr0x3',
  troll:    'cmmaxyzzn00007nemx9zwns4b',
  goblin:   'cmmaxz7yq0000662kv5fqpvlv',
  skeleton: 'cmmaxybxx00002jwmvjex2bn5',
  slime:    'cmmaxxtug0000hx4cu07u1acn',
  dragon:   'cmmaxzfpq00006dtlo802m1cd',
};

async function main() {
  const results = {};

  // === WOLF ===
  const wolfLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.wolf}' LIMIT 30`);
  let wolfKnockdowns = 0, wolfCrits = 0, wolfFumbles = 0;
  wolfLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) wolfCrits++;
      if (e.fumbleResult) wolfFumbles++;
      if (e.statusEffectsApplied?.some(s => s.includes('knocked') || s.includes('Knockdown'))) wolfKnockdowns++;
    });
  });
  results.wolf = { knockdowns: wolfKnockdowns, crits: wolfCrits, fumbles: wolfFumbles };

  // === TROLL ===
  const trollLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.troll}' LIMIT 30`);
  let trollAbilities = 0, trollMulti = 0, trollRegen = 0;
  trollLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        trollAbilities++;
        if (e.strikesHit >= 2) trollMulti++;
      }
      if (e.statusTickHealing > 0) trollRegen++;
    });
  });
  results.troll = { abilities: trollAbilities, multiattacks: trollMulti, regenTicks: trollRegen };

  // === GOBLIN ===
  const goblinLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.goblin}' LIMIT 50`);
  let gCrits = 0, gFumbles = 0, gCritSeverities = {};
  goblinLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) {
        gCrits++;
        const sev = e.critResult.severity || 'unknown';
        gCritSeverities[sev] = (gCritSeverities[sev] || 0) + 1;
      }
      if (e.fumbleResult) gFumbles++;
    });
  });
  results.goblin = { crits: gCrits, fumbles: gFumbles, critSeverities: gCritSeverities };

  // === SKELETON ===
  const skelLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.skeleton}' LIMIT 30`);
  let skelVuln = 0, skelImmune = 0;
  skelLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.damageTypeResult?.interaction === 'vulnerable') skelVuln++;
      if (e.damageTypeResult?.interaction === 'immune') skelImmune++;
    });
  });
  results.skeleton = { vulnerable: skelVuln, immune: skelImmune };

  // === SLIME ===
  const slimeLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.slime}' LIMIT 30`);
  let slimeResist = 0, slimePlayerCrits = 0, slimeImmune = 0;
  slimeLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.damageTypeResult?.interaction === 'resistant') slimeResist++;
      if (e.damageTypeResult?.interaction === 'immune') slimeImmune++;
      if (e.critResult && e.actor !== 'Slime') slimePlayerCrits++;
    });
  });
  results.slime = { resistant: slimeResist, immune: slimeImmune, playerCritsOnSlime: slimePlayerCrits };

  // === DRAGON ===
  const dragonLogs = await p.$queryRawUnsafe(`SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = '${RUNS.dragon}' LIMIT 30`);
  let dragonBreath = 0, dragonMulti = 0, dragonAbilities = 0;
  dragonLogs.forEach(log => {
    parseRounds(log).forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        dragonAbilities++;
        const name = e.abilityName || '';
        if (name.includes('Breath') || name.includes('Cold')) dragonBreath++;
        if (name === 'Multiattack' || e.strikesHit >= 2) dragonMulti++;
      }
    });
  });
  results.dragon = { abilities: dragonAbilities, breath: dragonBreath, multiattack: dragonMulti };

  // === SUMMARY ===
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         PHASE 1 SMOKE TEST — FINAL RESULTS (v5)         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  const pass = (test, msg) => console.log(`║  ✓ PASS  ${test.padEnd(25)} ${msg.padEnd(22)}║`);
  const fail = (test, msg) => console.log(`║  ✗ FAIL  ${test.padEnd(25)} ${msg.padEnd(22)}║`);
  const check = (cond, test, msg) => cond ? pass(test, msg) : fail(test, msg);

  console.log('║                                                            ║');
  console.log('║  CRIT/FUMBLE d100 SYSTEM                                   ║');
  check(results.goblin.crits > 0, 'Crit d100 chain', `${results.goblin.crits} crits / 50 fights`);
  check(results.goblin.fumbles > 0, 'Fumble d100 chain', `${results.goblin.fumbles} fumbles / 50 fights`);
  check(Object.keys(results.goblin.critSeverities).length > 1, 'Crit severity bands', JSON.stringify(results.goblin.critSeverities));

  console.log('║                                                            ║');
  console.log('║  MONSTER ABILITIES                                          ║');
  check(results.wolf.knockdowns > 0, 'On-hit: Wolf knockdown', `${results.wolf.knockdowns} in 30 fights`);
  check(results.troll.abilities > 0, 'Monster ability AI', `${results.troll.abilities} uses (Troll)`);
  check(results.troll.multiattacks > 0, 'Multiattack (Troll Rend)', `${results.troll.multiattacks} multi-strikes`);
  check(results.troll.regenTicks > 0, 'Regeneration (Troll)', `${results.troll.regenTicks} heal ticks`);
  check(results.dragon.abilities > 0, 'Monster ability AI', `${results.dragon.abilities} uses (Dragon)`);
  check(results.dragon.breath > 0, 'Breath weapon (Dragon)', `${results.dragon.breath} uses`);
  check(results.dragon.multiattack > 0, 'Multiattack (Dragon)', `${results.dragon.multiattack} uses`);
  check(results.dragon.breath < results.dragon.abilities, 'Breath recharge d6', 'not every turn');

  console.log('║                                                            ║');
  console.log('║  DAMAGE TYPE INTERACTIONS                                   ║');
  check(results.slime.resistant > 0, 'Resistance (Slime)', `${results.slime.resistant} triggers`);
  check(results.skeleton.vulnerable > 0, 'Vulnerability (Skeleton)', `${results.skeleton.vulnerable} triggers`);

  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
