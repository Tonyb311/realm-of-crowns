process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function run() {
  const logs = await p.combatEncounterLog.findMany({ where: { simulationRunId: 'cmmccp49r0000i08pn6v1bsch' }, select: { rounds: true }, take: 5 });
  const actions: Record<string, number> = {};
  for (const log of logs) {
    for (const entry of (log.rounds as any[])) {
      const a = entry.action || 'no_action';
      actions[a] = (actions[a] || 0) + 1;
    }
  }
  console.log('Action type counts:', JSON.stringify(actions, null, 2));
  // Show first few ability entries
  for (const log of logs.slice(0, 2)) {
    for (const entry of (log.rounds as any[])) {
      if (entry.abilityName) {
        console.log(`  action=${entry.action} name=${entry.abilityName} round=${entry.round}`);
      }
    }
  }
  await p.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
