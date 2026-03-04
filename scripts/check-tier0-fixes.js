process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const logs = await p.$queryRawUnsafe(`
    SELECT id, rounds, outcome FROM combat_encounter_logs
    WHERE simulation_run_id = 'cmmc65keu0000or0cgddickj3'
  `);

  console.log('Total logs:', logs.length);

  // Dump raw JSON of first class_ability entry for each ability name
  const seen = new Set();
  for (const log of logs) {
    const rounds = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
    for (let i = 1; i < rounds.length; i++) {
      const r = rounds[i];
      if (r.action === 'class_ability' && !seen.has(r.abilityName)) {
        seen.add(r.abilityName);
        console.log('\n=== RAW:', r.abilityName, '===');
        console.log(JSON.stringify(r, null, 2));
      }
    }
  }

  await p.$disconnect();
}
main().catch(console.error);
