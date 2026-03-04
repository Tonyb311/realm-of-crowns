const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dump() {
  // Get one winning Lich fight from the L30 verify run
  const fight = await prisma.$queryRawUnsafe(`
    SELECT id, rounds::text, outcome, total_rounds
    FROM combat_encounter_logs
    WHERE simulation_run_id = 'cmmb3zsva0000ztebfnrpgg6n'
    AND outcome = 'win'
    ORDER BY started_at
    LIMIT 1
  `);

  if (fight.length === 0) {
    console.log('No winning fights found');
    await prisma.$disconnect();
    return;
  }

  const f = fight[0];
  console.log(`Fight ${f.id} | ${f.outcome} | ${f.total_rounds} rounds\n`);

  const rounds = JSON.parse(f.rounds);
  console.log(`Rounds type: ${typeof rounds}, isArray: ${Array.isArray(rounds)}, length: ${rounds.length}`);
  console.log(`\nFirst round keys:`, Object.keys(rounds[0]));
  console.log(`\nSecond round keys:`, rounds[1] ? Object.keys(rounds[1]) : 'N/A');

  // Print each round's key data
  for (let i = 0; i < Math.min(rounds.length, 25); i++) {
    const r = rounds[i];
    const actor = r.actorName || r.actor || '?';
    const action = r.action || r.abilityName || '?';
    const hp = r.hpChanges || r.hpAfter || {};
    const dmg = r.damage || 0;
    const dt = r.deathThroesResult ? 'HAS_DT' : '';
    const pt = r.phaseTransition ? 'HAS_PT' : '';
    const la = r.legendaryActions ? `LA:${JSON.stringify(r.legendaryActions).substring(0,80)}` : '';
    const aura = r.auraResults ? `AURA:${r.auraResults.length}` : '';
    console.log(`  [${i}] round=${r.roundNumber||r.round||'?'} actor=${actor} action=${action} dmg=${dmg} ${dt} ${pt} ${la} ${aura}`);
  }

  // Show full JSON of first few rounds
  console.log('\n--- Full round 0 ---');
  console.log(JSON.stringify(rounds[0], null, 2).substring(0, 1000));

  console.log('\n--- Full round 1 ---');
  if (rounds[1]) console.log(JSON.stringify(rounds[1], null, 2).substring(0, 1000));

  // Look for the last few rounds where monster HP crosses thresholds
  console.log('\n--- Last 5 rounds ---');
  for (let i = Math.max(0, rounds.length - 5); i < rounds.length; i++) {
    console.log(`[${i}] ${JSON.stringify(rounds[i]).substring(0, 300)}`);
  }

  await prisma.$disconnect();
}

dump().catch(e => { console.error(e); process.exit(1); });
