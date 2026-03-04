process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026%21@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Pass run IDs as args: npx tsx scripts/chain-verify-audit.ts <rogue-run-id> <bard-run-id>
const ROGUE_RUN_ID = process.argv[2] || '';
const BARD_RUN_ID = process.argv[3] || '';

interface RoundEntry {
  round: number;
  action: string;
  actorId: string;
  actorName: string;
  abilityName?: string;
  abilityDescription?: string;
  damage?: number;
  hit?: boolean;
  [key: string]: unknown;
}

async function auditChain(runId: string, label: string, setupName: string, payoffName: string) {
  if (!runId) { console.log(`\n=== ${label}: NO RUN ID PROVIDED ===`); return; }
  console.log(`\n=== ${label} (run: ${runId}) ===`);

  const logs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: { id: true, rounds: true },
  });

  let totalSetup = 0;
  let totalPayoff = 0;
  let payoffWithSetup = 0;
  let payoffWithoutSetup = 0;
  let chainPairs = 0; // setup followed by payoff next turn

  for (const log of logs) {
    const entries = log.rounds as RoundEntry[];
    // Track player setup/payoff by round
    let lastSetupRound = -10;
    let setupActive = false;

    for (const entry of entries) {
      if (!entry.abilityName) continue;

      if (entry.abilityName === setupName) {
        totalSetup++;
        lastSetupRound = entry.round;
        setupActive = true;
      }

      if (entry.abilityName === payoffName) {
        totalPayoff++;
        if (setupActive || entry.round - lastSetupRound <= 2) {
          payoffWithSetup++;
          if (entry.round - lastSetupRound <= 2) chainPairs++;
          setupActive = false; // consumed
        } else {
          payoffWithoutSetup++;
        }
        // Check description for chain indicators
        const desc = (entry.abilityDescription || entry.description || '') as string;
        if (desc.includes('reduced') || desc.includes('no stealth') || desc.includes('no Analyze')) {
          payoffWithoutSetup++; // override if description says reduced
          payoffWithSetup = Math.max(0, payoffWithSetup - 1);
        }
      }
    }
  }

  console.log(`  Combats: ${logs.length}`);
  console.log(`  ${setupName} uses: ${totalSetup}`);
  console.log(`  ${payoffName} uses: ${totalPayoff}`);
  console.log(`  ${payoffName} with setup: ${payoffWithSetup}`);
  console.log(`  ${payoffName} without setup: ${payoffWithoutSetup}`);
  console.log(`  Chain pairs (setup→payoff within 2 rounds): ${chainPairs}`);
  console.log(`  Chain rate: ${totalPayoff > 0 ? Math.round((payoffWithSetup / totalPayoff) * 100) : 0}%`);
}

async function run() {
  await auditChain(ROGUE_RUN_ID, 'Rogue Assassin: Vanish→Ambush', 'Vanish', 'Ambush');
  await auditChain(BARD_RUN_ID, 'Bard Lorekeeper: Analyze→Exploit Weakness', 'Analyze', 'Exploit Weakness');
  await p.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
