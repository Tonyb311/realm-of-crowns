process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const outcomes = await prisma.combatEncounterLog.groupBy({
    by: ['outcome'],
    where: { simulationRunId: 'cmmc4vui200007jyzsfptkuqc' },
    _count: true,
  });
  console.log('Outcome distribution:', JSON.stringify(outcomes, null, 2));

  // Sample a victory
  const wins = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: 'cmmc4vui200007jyzsfptkuqc', outcome: 'VICTORY' },
    select: { characterName: true, opponentName: true, totalRounds: true },
    take: 5,
  });
  console.log('Sample VICTORY:', JSON.stringify(wins));

  const winsLower = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: 'cmmc4vui200007jyzsfptkuqc', outcome: 'victory' },
    select: { characterName: true, opponentName: true, totalRounds: true },
    take: 5,
  });
  console.log('Sample victory:', JSON.stringify(winsLower));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
