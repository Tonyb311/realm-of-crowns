const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function checkRun(runId, label) {
  const logs = await p.$queryRawUnsafe(`
    SELECT rounds::text FROM "combat_encounter_logs"
    WHERE "simulation_run_id" = $1 LIMIT 3
  `, runId);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} (${runId.slice(-8)}) — ${logs.length} logs checked`);
  console.log('='.repeat(60));

  let laCount = 0, lrCount = 0, fearCount = 0, fireAuraCount = 0;
  let laDetails = [], lrDetails = [], fearDetails = [], fireDetails = [];

  for (const log of logs) {
    const rounds = JSON.parse(log.rounds);
    for (const entry of rounds) {
      if (entry._encounterContext) continue;

      // Check legendaryActions
      if (entry.legendaryActions && entry.legendaryActions.length > 0) {
        laCount += entry.legendaryActions.length;
        for (const la of entry.legendaryActions) {
          laDetails.push(`  R${entry.round}: LA #${la.actionNumber} cost=${la.cost} remaining=${la.actionsRemaining} type=${la.action?.type} ability=${la.action?.abilityName || la.action?.weaponName || 'basic'}`);
        }
      }

      // Check legendaryResistance
      if (entry.legendaryResistance && entry.legendaryResistance.resistanceUsed) {
        lrCount++;
        const lr = entry.legendaryResistance;
        lrDetails.push(`  R${entry.round}: Save ${lr.originalTotal} vs DC ${lr.saveDC} -> OVERRIDDEN (${lr.resistancesRemaining} left)`);
      }

      // Check auraResults
      if (entry.auraResults) {
        for (const aura of entry.auraResults) {
          if (aura.auraType === 'fear') {
            fearCount++;
            fearDetails.push(`  R${entry.round}: ${aura.auraName} save=${aura.saveRoll}/${aura.saveTotal} vs DC ${aura.saveDC} -> ${aura.savePassed ? 'SAVED (immune)' : 'FAILED (frightened)'}`);
          } else if (aura.auraType === 'damage') {
            fireAuraCount++;
            fireDetails.push(`  R${entry.round}: ${aura.auraName} ${aura.damage} ${aura.damageType} damage`);
          }
        }
      }
    }
  }

  console.log(`Legendary Actions: ${laCount} total across 3 fights`);
  if (laDetails.length > 0) laDetails.slice(0, 8).forEach(d => console.log(d));
  if (laDetails.length > 8) console.log(`  ... and ${laDetails.length - 8} more`);

  console.log(`Legendary Resistance: ${lrCount} triggers`);
  if (lrDetails.length > 0) lrDetails.slice(0, 5).forEach(d => console.log(d));

  console.log(`Fear Aura: ${fearCount} checks`);
  if (fearDetails.length > 0) fearDetails.slice(0, 5).forEach(d => console.log(d));

  console.log(`Fire Aura: ${fireAuraCount} triggers`);
  if (fireDetails.length > 0) fireDetails.slice(0, 5).forEach(d => console.log(d));

  return { laCount, lrCount, fearCount, fireAuraCount };
}

async function main() {
  // Run IDs from our smoke tests
  const tests = [
    ['cmmb0a73k0000vzevpae8oxl3', 'TEST 1: Lich LA (Warrior L18)'],
    ['cmmb0agpd0000ftllzpkt254x', 'TEST 2: Lich LR (Psion L18)'],
    ['cmmb0apxo0000hn7ic57bnhk2', 'TEST 4: Demon Auras (Warrior L16)'],
    ['cmmb0aycj0000gcbkigssohp3', 'TEST 5: Dragon LA+Fear (Warrior L14)'],
    ['cmmb0b6x90000wnfm530ng0gw', 'TEST 6: Golem LR (Psion L14)'],
    ['cmmb0bk320000fo297v9rpczp', 'TEST 7: Elder Fey LA+Fear (Warrior L16)'],
  ];

  const results = {};
  for (const [runId, label] of tests) {
    results[label] = await checkRun(runId, label);
  }

  console.log('\n\n=== SUMMARY ===');
  for (const [label, r] of Object.entries(results)) {
    const status = [];
    if (r.laCount > 0) status.push(`LA:${r.laCount}`);
    if (r.lrCount > 0) status.push(`LR:${r.lrCount}`);
    if (r.fearCount > 0) status.push(`Fear:${r.fearCount}`);
    if (r.fireAuraCount > 0) status.push(`Fire:${r.fireAuraCount}`);
    console.log(`${label}: ${status.length > 0 ? status.join(', ') : 'NO FEATURES FOUND'}`);
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
