const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const logs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax0nba0000tw0s7gyv7i61' LIMIT 1"
  );
  const rounds = logs[0].rounds;

  // Check context for monster abilities
  const ctx = rounds[0]?._encounterContext;
  if (ctx) {
    const monster = ctx.combatants?.find(c => c.entityType === 'monster');
    console.log('=== MONSTER COMBATANT ===');
    console.log('Name:', monster?.name);
    console.log('Has monsterAbilities:', !!monster?.monsterAbilities, 'count:', monster?.monsterAbilities?.length);
    console.log('Has resistances:', !!monster?.resistances);
    console.log('Has critImmunity:', monster?.critImmunity);
    console.log('Weapon damageType:', monster?.weapon?.damageType);
    console.log('Full monster:', JSON.stringify(monster, null, 2).substring(0, 800));
  }

  // Dump all entries
  console.log('\n=== ALL LOG ENTRIES ===');
  rounds.forEach((entry, i) => {
    if (entry._encounterContext) return; // skip context
    const keys = Object.keys(entry);
    console.log(`Entry ${i}: type=${entry.action || entry.type || 'unknown'} actor=${entry.actor || '?'} keys=[${keys.join(',')}]`);
    // Check for any field containing "crit" "fumble" "damage" "ability"
    keys.forEach(k => {
      if (k.toLowerCase().includes('crit') || k.toLowerCase().includes('fumble') ||
          k.toLowerCase().includes('damagetype') || k === 'type' || k === 'abilityName') {
        console.log(`  ${k}:`, JSON.stringify(entry[k]).substring(0, 200));
      }
    });
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
