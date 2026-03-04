process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026%21@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const ROGUE_RUN_ID = 'cmmcg4yud000013au0dieutvf';
const BARD_RUN_ID = 'cmmcg4zze000013od85tvv8on';

async function dumpChainEntries(runId: string, label: string, setupName: string, payoffName: string) {
  console.log(`\n=== ${label} ===`);
  const logs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: { id: true, rounds: true },
    take: 5,
  });

  let setupCount = 0;
  let payoffCount = 0;
  let payoffReduced = 0;
  let payoffFull = 0;

  for (const [i, log] of logs.entries()) {
    const entries = log.rounds as any[];
    console.log(`\n  Combat ${i + 1}:`);
    for (const entry of entries) {
      if (!entry.abilityName) continue;
      if (entry.abilityName === setupName || entry.abilityName === payoffName) {
        const desc = entry.abilityDescription || entry.description || '';
        const dmg = entry.damage ?? entry.damageRoll ?? '';
        console.log(`    R${entry.round} ${entry.abilityName}: ${desc} [damage=${dmg}]`);

        if (entry.abilityName === setupName) setupCount++;
        if (entry.abilityName === payoffName) {
          payoffCount++;
          if (desc.includes('reduced') || desc.includes('no stealth') || desc.includes('no Analyze')) {
            payoffReduced++;
          } else {
            payoffFull++;
          }
        }
      }
    }
  }

  // Also get totals across ALL combats
  const allLogs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: { rounds: true },
  });
  let totalSetup = 0, totalPayoff = 0, totalPayoffReduced = 0, totalPayoffFull = 0;
  for (const log of allLogs) {
    for (const entry of (log.rounds as any[])) {
      if (!entry.abilityName) continue;
      if (entry.abilityName === setupName) totalSetup++;
      if (entry.abilityName === payoffName) {
        totalPayoff++;
        const desc = entry.abilityDescription || entry.description || '';
        if (desc.includes('reduced') || desc.includes('no stealth') || desc.includes('no Analyze')) {
          totalPayoffReduced++;
        } else {
          totalPayoffFull++;
        }
      }
    }
  }
  console.log(`\n  TOTALS (all ${allLogs.length} combats):`);
  console.log(`    ${setupName}: ${totalSetup} uses`);
  console.log(`    ${payoffName}: ${totalPayoff} uses (${totalPayoffFull} full / ${totalPayoffReduced} reduced)`);
}

async function run() {
  await dumpChainEntries(ROGUE_RUN_ID, 'Rogue Vanish→Ambush', 'Vanish', 'Ambush');
  await dumpChainEntries(BARD_RUN_ID, 'Bard Analyze→Exploit Weakness', 'Analyze', 'Exploit Weakness');
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
