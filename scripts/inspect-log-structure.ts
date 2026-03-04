process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const log = await p.combatEncounterLog.findFirst({
    where: { simulationRunId: 'cmmcahxrm000088rz91h3m8nt' },
    select: { rounds: true },
  });
  const rounds = (log?.rounds as any[]) ?? [];
  console.log('Rounds count:', rounds.length);
  if (rounds.length > 0) {
    console.log('Round 0 keys:', Object.keys(rounds[0]));
    console.log('Round 0:', JSON.stringify(rounds[0], null, 2).slice(0, 3000));
  }
  if (rounds.length > 1) {
    console.log('\nRound 1:', JSON.stringify(rounds[1], null, 2).slice(0, 3000));
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
