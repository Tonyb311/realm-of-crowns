const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const logs = await p.$queryRawUnsafe(`
    SELECT rounds::text, summary FROM "combat_encounter_logs"
    WHERE "simulation_run_id" = $1 LIMIT 3
  `, 'cmmb0qtgq00002stg69ywse7n');

  for (let i = 0; i < logs.length; i++) {
    console.log(`\n=== FIGHT ${i+1} ===`);
    console.log('Summary:', logs[i].summary);
    const rounds = JSON.parse(logs[i].rounds);

    for (const entry of rounds) {
      if (entry._encounterContext) {
        console.log('  [context] Monster:', entry.monster?.name, 'LR:', entry.monster?.legendaryResistancesMax);
        continue;
      }

      console.log(`\nR${entry.round} | Action: ${entry.action} | Actor: ${entry.actor}`);

      // Check for saves
      if (entry.saveDC != null) {
        console.log(`  Save: roll=${entry.saveRoll} total=${entry.saveTotal} vs DC ${entry.saveDC} -> ${entry.saveSucceeded ? 'SUCCESS' : 'FAIL'}`);
      }

      // Check LR field
      if (entry.legendaryResistance) {
        console.log(`  LR: used=${entry.legendaryResistance.resistanceUsed} remaining=${entry.legendaryResistance.resistancesRemaining}`);
      }

      // Dump interesting keys
      const keys = Object.keys(entry).filter(k => entry[k] != null && entry[k] !== '' && !(Array.isArray(entry[k]) && entry[k].length === 0));
      console.log(`  Keys: ${keys.join(', ')}`);
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
