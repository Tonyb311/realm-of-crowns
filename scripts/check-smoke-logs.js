const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  // Wolf sim (retest with combat data): check for knockdown on-hit
  const wolfLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax0nba0000tw0s7gyv7i61' LIMIT 5"
  );
  console.log('=== WOLF FIGHTS (checking for knockdown on-hit) ===');
  let knockdownFound = false, critFound = false, dtFound = false;
  wolfLogs.forEach((log, i) => {
    const rounds = parseRounds(log);
    rounds.forEach((round, ri) => {
      (round.entries || []).forEach(e => {
        if (e.critResult) { critFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': CRIT -', JSON.stringify(e.critResult).substring(0, 200)); }
        if (e.fumbleResult) console.log('  Fight', i+1, 'Round', ri+1, ': FUMBLE -', JSON.stringify(e.fumbleResult).substring(0, 200));
        if (e.damageTypeResult) { dtFound = true; }
        if (e.type === 'monster_ability') { knockdownFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': MONSTER_ABILITY -', JSON.stringify(e).substring(0, 250)); }
        if (e.onHitResult) { knockdownFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': ON_HIT -', JSON.stringify(e.onHitResult).substring(0, 200)); }
      });
    });
  });
  console.log('  Knockdown found:', knockdownFound, '| Crit found:', critFound, '| DamageType found:', dtFound);

  // Troll sim: check for regen and multiattack
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmawtmjm00008je7j1sa08d3' LIMIT 3"
  );
  console.log('\n=== TROLL FIGHTS (checking for regen + multiattack) ===');
  let regenFound = false, multiAttackFound = false;
  trollLogs.forEach((log, i) => {
    const rounds = parseRounds(log);
    rounds.forEach((round, ri) => {
      (round.entries || []).forEach(e => {
        if (e.type === 'monster_ability') {
          const name = e.abilityName || '';
          console.log('  Fight', i+1, 'Round', ri+1, ':', name, JSON.stringify(e).substring(0, 200));
          if (name === 'Rend' || (e.strikes && e.strikes.length >= 2)) multiAttackFound = true;
          if (name === 'Regeneration' || e.healing > 0) regenFound = true;
        }
        if (e.type === 'heal') { regenFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': HEAL -', JSON.stringify(e).substring(0, 200)); }
      });
    });
  });
  console.log('  Regen found:', regenFound, '| Multiattack found:', multiAttackFound);

  // Goblin sim: check for crits/fumbles
  const goblinLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmawu44l00001inm3rz9518w' LIMIT 15"
  );
  console.log('\n=== GOBLIN FIGHTS (checking for crits/fumbles in 15 fights) ===');
  let critCount = 0, fumbleCount = 0;
  goblinLogs.forEach((log, i) => {
    const rounds = parseRounds(log);
    rounds.forEach((round, ri) => {
      (round.entries || []).forEach(e => {
        if (e.critResult) { critCount++; if (critCount <= 3) console.log('  Fight', i+1, 'Round', ri+1, ': CRIT -', JSON.stringify(e.critResult).substring(0, 300)); }
        if (e.fumbleResult) { fumbleCount++; if (fumbleCount <= 2) console.log('  Fight', i+1, 'Round', ri+1, ': FUMBLE -', JSON.stringify(e.fumbleResult).substring(0, 300)); }
      });
    });
  });
  console.log('  Total crits in 15 fights:', critCount, '| Total fumbles:', fumbleCount);

  // Dragon sim: check for breath weapon and multiattack
  const dragonLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmawusw90000zutven8ee04r' LIMIT 5"
  );
  console.log('\n=== DRAGON FIGHTS (checking for breath weapon + multiattack) ===');
  let breathFound = false, dragonMultiFound = false;
  dragonLogs.forEach((log, i) => {
    const rounds = parseRounds(log);
    rounds.forEach((round, ri) => {
      (round.entries || []).forEach(e => {
        if (e.type === 'monster_ability') {
          const name = e.abilityName || '';
          if (name.includes('Breath') || name.includes('Cold')) { breathFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': BREATH -', JSON.stringify(e).substring(0, 250)); }
          else if (name === 'Multiattack' || (e.strikes && e.strikes.length >= 2)) { dragonMultiFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': MULTI -', JSON.stringify(e).substring(0, 250)); }
          else { console.log('  Fight', i+1, 'Round', ri+1, ':', name, '-', JSON.stringify(e).substring(0, 200)); }
        }
      });
    });
  });
  console.log('  Breath weapon found:', breathFound, '| Multiattack found:', dragonMultiFound);

  // Slime sim: check for crit immunity + resistances
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmawukop00005ji63tc7voot' LIMIT 10"
  );
  console.log('\n=== SLIME FIGHTS (checking for crit immunity + resistances) ===');
  let critImmunityFound = false, resistanceFound = false;
  slimeLogs.forEach((log, i) => {
    const rounds = parseRounds(log);
    rounds.forEach((round, ri) => {
      (round.entries || []).forEach(e => {
        if (e.critResult && e.critResult.trigger === 'crit_immunity') { critImmunityFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': CRIT IMMUNITY -', JSON.stringify(e.critResult).substring(0, 200)); }
        if (e.damageTypeResult && e.damageTypeResult.interaction !== 'normal') { resistanceFound = true; console.log('  Fight', i+1, 'Round', ri+1, ': DT -', JSON.stringify(e.damageTypeResult).substring(0, 200)); }
      });
    });
  });
  console.log('  Crit immunity found:', critImmunityFound, '| Resistance found:', resistanceFound);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
