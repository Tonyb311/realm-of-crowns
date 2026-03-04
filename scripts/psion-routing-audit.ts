process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026%21@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const SEER_RUN_ID = 'cmmchs91w0000khf5mp3mgi0z';

async function auditRun(runId: string, label: string) {
  console.log(`\n=== ${label} ===`);
  const logs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: { id: true, rounds: true },
  });

  let psionAbilityCount = 0;
  let classAbilityCount = 0;
  let echoCount = 0;
  let echoEchoed = 0;
  let echoNoOp = 0;
  let attackCount = 0;

  for (const [i, log] of logs.entries()) {
    const entries = log.rounds as any[];
    console.log(`\n  Combat ${i + 1} (${entries.length} entries):`);
    for (const entry of entries) {
      if (!entry.action) continue;

      // Count action types
      if (entry.action === 'psion_ability') psionAbilityCount++;
      if (entry.action === 'class_ability') classAbilityCount++;
      if (entry.action === 'attack') attackCount++;

      // Show all psion_ability actions AND all class_ability actions
      if (entry.action === 'psion_ability' || entry.action === 'class_ability') {
        const name = entry.result?.abilityName || entry.abilityName || '';
        const desc = entry.result?.description || entry.description || '';
        const echoAction = entry.result?.echoAction;
        const damage = entry.result?.damage ?? '';
        const abilityId = entry.result?.abilityId || '';

        console.log(`    R${entry.round} [${entry.action}] ${name} (${abilityId}) ${echoAction ? '(ECHO)' : ''} dmg=${damage}`);
        if (desc && entry.action === 'psion_ability') console.log(`      desc: ${desc.substring(0, 120)}`);

        // Echo tracking
        if (name.startsWith('Temporal Echo')) {
          echoCount++;
          // Check if the echo name includes a specific ability (e.g., "Temporal Echo: Psychic Jab")
          if (name.includes(':') && !desc.includes('no echoable') && !desc.includes('No previous')) {
            echoEchoed++;
          } else {
            echoNoOp++;
          }
        }
      }
    }
  }

  console.log(`\n  SUMMARY (${logs.length} combats):`);
  console.log(`    psion_ability actions: ${psionAbilityCount}`);
  console.log(`    class_ability actions: ${classAbilityCount}`);
  console.log(`    attack actions: ${attackCount}`);
  console.log(`    Temporal Echo uses: ${echoCount} (${echoEchoed} echoed, ${echoNoOp} no-op/no-prev)`);
}

async function run() {
  await auditRun(SEER_RUN_ID, 'Psion Seer L25 — Routing Audit');
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
