const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dump() {
  // Get one winning Lich fight from L30 verify run
  const fight = await prisma.$queryRawUnsafe(`
    SELECT rounds::text
    FROM combat_encounter_logs
    WHERE simulation_run_id = 'cmmb3zsva0000ztebfnrpgg6n'
    AND outcome = 'win'
    ORDER BY started_at LIMIT 1
  `);

  const rounds = JSON.parse(fight[0].rounds);
  const ctx = rounds[0]._encounterContext;

  // Show monster combatant
  const monster = ctx.combatants.find(c => c.entityType === 'monster');
  console.log('=== Monster Combatant ===');
  console.log(JSON.stringify(monster, null, 2));

  await prisma.$disconnect();
}

dump().catch(e => { console.error(e); process.exit(1); });
