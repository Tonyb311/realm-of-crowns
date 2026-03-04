const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check Slime v3 encounter context
  const logs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxow5z0000c8izgbro4gs0' LIMIT 1"
  );
  const entries = typeof logs[0].rounds === 'string' ? JSON.parse(logs[0].rounds) : logs[0].rounds;
  const ctx = entries.find(e => e._encounterContext);
  if (ctx) {
    const combatants = ctx._encounterContext.combatants;
    combatants.forEach(c => {
      console.log(`${c.name} (${c.entityType}):`);
      console.log('  weapon.damageType:', c.weapon?.damageType);
      console.log('  resistances:', JSON.stringify(c.resistances));
      console.log('  immunities:', JSON.stringify(c.immunities));
      console.log('  critImmunity:', c.critImmunity);
    });
  }

  // Check regen ticks in Troll v3
  console.log('\n=== TROLL v3 RAW LOG STRUCTURE ===');
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxo83i0000zpx9751l7ri8' LIMIT 1"
  );
  const trollEntries = typeof trollLogs[0].rounds === 'string' ? JSON.parse(trollLogs[0].rounds) : trollLogs[0].rounds;
  trollEntries.forEach((e, i) => {
    if (e._encounterContext) return;
    const keys = Object.keys(e);
    console.log(`  Entry ${i}: action=${e.action} actor=${e.actor} round=${e.round}`);
    if (e.statusTicks) console.log('    statusTicks:', JSON.stringify(e.statusTicks));
    // Check for healing-related keys
    keys.forEach(k => {
      if (k.toLowerCase().includes('heal') || k.toLowerCase().includes('regen') || k === 'statusTicks') {
        console.log(`    ${k}:`, JSON.stringify(e[k]).substring(0, 200));
      }
    });
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
