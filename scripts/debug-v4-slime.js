const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const logs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxvg9u0000iaa1otgtv7xl' LIMIT 2"
  );
  logs.forEach((log, i) => {
    const entries = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
    console.log(`=== FIGHT ${i+1} ===`);
    entries.forEach((e, j) => {
      if (e._encounterContext) {
        const combatants = e._encounterContext.combatants;
        combatants.forEach(c => {
          console.log(`  ${c.name}: HP=${c.hp} AC=${c.ac}`);
        });
        return;
      }
      const dt = e.damageTypeResult ? `DT:${e.damageTypeResult.interaction}(${e.damageTypeResult.originalDamage}->${e.damageTypeResult.finalDamage})` : '';
      console.log(`  R${e.round} ${e.action} by ${e.actor}: dmg=${e.damageRoll?.total || '-'} hit=${e.hit !== undefined ? e.hit : '-'} ${dt} HP=${JSON.stringify(e.hpAfter)}`);
    });
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
