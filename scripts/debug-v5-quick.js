const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Slime v5 — quick check
  const logs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxxtug0000hx4cu07u1acn' LIMIT 1"
  );
  const entries = typeof logs[0].rounds === 'string' ? JSON.parse(logs[0].rounds) : logs[0].rounds;
  entries.forEach((e, i) => {
    if (e._encounterContext) return;
    const dt = e.damageTypeResult ? `DT:${e.damageTypeResult.interaction}(${e.damageTypeResult.originalDamage}->${e.damageTypeResult.finalDamage})` : '';
    console.log(`R${e.round} ${e.action} by ${e.actor}: dmg=${e.damageRoll?.total || '-'} ${dt} HP=${JSON.stringify(e.hpAfter)}`);
  });
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
