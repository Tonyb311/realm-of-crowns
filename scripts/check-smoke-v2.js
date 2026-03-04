const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  // Wolf sim v2
  const wolfLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax60qf0000ftyvtgzdnlt3' LIMIT 10"
  );
  console.log('=== TEST 1: WOLF (on-hit knockdown) ===');
  let knockdownCount = 0, wolfCritCount = 0, wolfFumbleCount = 0;
  wolfLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) wolfCritCount++;
      if (e.fumbleResult) wolfFumbleCount++;
      if (e.statusEffectsApplied?.some(s => s.includes('knocked'))) { knockdownCount++; }
    });
  });
  console.log('  Knockdowns in 10 fights:', knockdownCount, '| Crits:', wolfCritCount, '| Fumbles:', wolfFumbleCount);

  // Troll sim v2
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6aa4000042mrxco5snvs' LIMIT 10"
  );
  console.log('\n=== TEST 2: TROLL (regen + multiattack) ===');
  let regenCount = 0, trollMultiCount = 0, monsterAbilityCount = 0;
  trollLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        monsterAbilityCount++;
        if (i < 2) console.log('  Fight', i+1, ':', e.abilityName, '|', JSON.stringify(e).substring(0, 250));
        if (e.abilityName === 'Rend' || e.strikes?.length >= 2) trollMultiCount++;
        if (e.healing > 0) regenCount++;
      }
      // Also check for heal entries
      if (e.action === 'heal' || (e.healing && e.healing > 0)) regenCount++;
    });
  });
  console.log('  Monster ability entries:', monsterAbilityCount, '| Multiattacks:', trollMultiCount, '| Regen:', regenCount);

  // Goblin sim v2 (50 fights - check for crits)
  const goblinLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6rj30000vr6nx3dnffyh' LIMIT 50"
  );
  console.log('\n=== TEST 4: GOBLIN (crit d100 chain) ===');
  let critCount = 0, fumbleCount = 0;
  goblinLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) {
        critCount++;
        if (critCount <= 3) console.log('  CRIT:', JSON.stringify(e.critResult).substring(0, 300));
      }
      if (e.fumbleResult) {
        fumbleCount++;
        if (fumbleCount <= 2) console.log('  FUMBLE:', JSON.stringify(e.fumbleResult).substring(0, 300));
      }
    });
  });
  console.log('  Crits in 50 fights:', critCount, '| Fumbles:', fumbleCount);

  // Skeleton v2
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6zzo0000mceclmf0ypab' LIMIT 10"
  );
  console.log('\n=== TEST 5: SKELETON (bludgeoning vulnerability) ===');
  let dtVulnCount = 0, dtNormalCount = 0;
  skelLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.damageTypeResult) {
        if (e.damageTypeResult.interaction === 'vulnerable') dtVulnCount++;
        else dtNormalCount++;
        if (dtVulnCount <= 2 || dtNormalCount <= 2) console.log('  DT:', JSON.stringify(e.damageTypeResult));
      }
    });
  });
  console.log('  Vulnerability triggers:', dtVulnCount, '| Other DT:', dtNormalCount);

  // Slime v2
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax78iq00002wevfha9x9j2' LIMIT 10"
  );
  console.log('\n=== TEST 6: SLIME (crit immunity + resistances) ===');
  let critImmCount = 0, resistCount = 0, slimeCrits = 0;
  slimeLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) { slimeCrits++; console.log('  CRIT against Slime:', JSON.stringify(e.critResult).substring(0, 200)); }
      if (e.damageTypeResult) {
        if (e.damageTypeResult.interaction === 'resistant') resistCount++;
        console.log('  DT:', JSON.stringify(e.damageTypeResult));
      }
    });
  });
  console.log('  Crit immunity triggers:', critImmCount, '| Resistance triggers:', resistCount, '| Raw crits:', slimeCrits);

  // Dragon v2
  const dragonLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax7hl00000aumlludi81ux' LIMIT 10"
  );
  console.log('\n=== TEST 7: DRAGON (breath weapon + multiattack) ===');
  let breathCount = 0, dragonMulti = 0, dragonAbilities = 0;
  dragonLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        dragonAbilities++;
        const name = e.abilityName || '';
        if (name.includes('Breath') || name.includes('Cold')) breathCount++;
        if (name === 'Multiattack' || e.strikes?.length >= 2) dragonMulti++;
        if (i < 2) console.log('  Fight', i+1, ':', name, JSON.stringify(e).substring(0, 250));
      }
    });
  });
  console.log('  Dragon abilities:', dragonAbilities, '| Breath weapon:', breathCount, '| Multiattack:', dragonMulti);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
