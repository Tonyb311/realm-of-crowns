process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026%21@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const RUN_ID = 'cmmci762k000021k3e84sll5u';

async function audit() {
  const logs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { id: true, rounds: true, characterName: true, summary: true },
  });

  console.log(`Found ${logs.length} combat logs\n`);

  for (const [i, log] of logs.entries()) {
    const playerName = log.characterName || 'unknown';
    console.log(`\n=== Combat ${i + 1} (${playerName}) ===`);

    const entries = log.rounds as any[];
    for (const entry of entries) {
      // Search ALL fields recursively for saveDC
      const json = JSON.stringify(entry);
      if (json.includes('saveDC') || json.includes('saveRequired') || json.includes('saveRoll')) {
        console.log(`  R${entry.round} [${entry.action}] ${entry.result?.abilityName || ''}: ${json.substring(0, 300)}`);
      }
    }
    // If no saves found, show first 2 entries to debug structure
    if (!entries.some(e => JSON.stringify(e).includes('saveDC'))) {
      console.log('  (no saves found — dumping first player entry)');
      const playerEntry = entries.find(e => e.action === 'class_ability' || e.action === 'psion_ability');
      if (playerEntry) {
        console.log(`  ${JSON.stringify(playerEntry).substring(0, 500)}`);
      }
    }
  }

  await p.$disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });
