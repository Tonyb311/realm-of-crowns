const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const logs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxybxx00002jwmvjex2bn5' LIMIT 2"
  );
  let vulnCount = 0, immuneCount = 0;
  logs.forEach((log, i) => {
    const entries = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
    console.log(`=== FIGHT ${i+1} ===`);
    entries.forEach(e => {
      if (e._encounterContext) return;
      const dt = e.damageTypeResult ? `DT:${e.damageTypeResult.interaction}(${e.damageTypeResult.originalDamage}->${e.damageTypeResult.finalDamage})` : '';
      if (e.damageTypeResult?.interaction === 'vulnerable') vulnCount++;
      if (e.damageTypeResult?.interaction === 'immune') immuneCount++;
      console.log(`  R${e.round} ${e.action} by ${e.actor}: dmg=${e.damageRoll?.total || '-'} ${dt} HP=${JSON.stringify(e.hpAfter)}`);
    });
  });
  console.log(`\nVulnerability triggers: ${vulnCount} | Immunity triggers: ${immuneCount}`);
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
