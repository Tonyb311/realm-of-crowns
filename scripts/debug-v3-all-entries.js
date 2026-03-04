const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Slime v3 — ALL entries
  console.log('=== SLIME v3 ALL ENTRIES (1 fight) ===');
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxow5z0000c8izgbro4gs0' LIMIT 1"
  );
  const entries = typeof slimeLogs[0].rounds === 'string' ? JSON.parse(slimeLogs[0].rounds) : slimeLogs[0].rounds;
  entries.forEach((e, i) => {
    if (e._encounterContext) return;
    console.log(`  Entry ${i}: action=${e.action} actor=${e.actor} round=${e.round} dmg=${e.damageRoll?.total || e.damage || '-'} DT=${JSON.stringify(e.damageTypeResult || null)} hpAfter=${JSON.stringify(e.hpAfter)}`);
  });

  // Skeleton v3 — ALL entries
  console.log('\n=== SKELETON v3 ALL ENTRIES (1 fight) ===');
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxooiz0000tygwjryg1ax8' LIMIT 1"
  );
  const sEntries = typeof skelLogs[0].rounds === 'string' ? JSON.parse(skelLogs[0].rounds) : skelLogs[0].rounds;
  sEntries.forEach((e, i) => {
    if (e._encounterContext) return;
    console.log(`  Entry ${i}: action=${e.action} actor=${e.actor} round=${e.round} dmg=${e.damageRoll?.total || '-'} DT=${JSON.stringify(e.damageTypeResult || null)} hit=${e.hit !== undefined ? e.hit : '-'} hpAfter=${JSON.stringify(e.hpAfter)}`);
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
