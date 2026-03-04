process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const logs = await p.combatEncounterLog.findMany({
    where: { simulationRunId: 'cmmcahxrm000088rz91h3m8nt' },
    select: { rounds: true },
    take: 50,
  });

  // Find class_ability entries
  let foundAbility = 0;
  let foundDrain = 0;
  let foundAutoHit = 0;
  let foundFallback = 0;
  let foundAbsorb = 0;

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      if (entry.action === 'class_ability') {
        if (foundAbility < 3) {
          console.log(`\n=== CLASS ABILITY (${entry.classAbilityId}) ===`);
          console.log(JSON.stringify(entry, null, 2).slice(0, 2000));
          foundAbility++;
        }
        if (entry.fallbackToAttack) foundFallback++;
        if (entry.classAbilityId === 'mag-enc-1') foundAutoHit++;
        if (['mag-nec-1', 'mag-t0-8c', 'mag-nec-5'].includes(entry.classAbilityId)) foundDrain++;
        // Check for absorb in activeBuffs
        if (entry.activeBuffsApplied?.some((b: any) => b.absorbDamage)) foundAbsorb++;
      }
    }
  }

  console.log('\n\n=== COUNTS (first 50 logs) ===');
  console.log('Class ability entries found:', foundAbility);
  console.log('Auto-hit (Arcane Bolt) entries:', foundAutoHit);
  console.log('Drain entries:', foundDrain);
  console.log('Fallback-to-attack entries:', foundFallback);
  console.log('Absorb buff entries:', foundAbsorb);

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
