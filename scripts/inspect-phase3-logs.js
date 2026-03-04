const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  // Get the 5 smoke test runs
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes, sr.encounter_count, sr.status,
      (SELECT COUNT(*) FROM combat_encounter_logs WHERE simulation_run_id = sr.id AND outcome = 'win') as wins,
      (SELECT COUNT(*) FROM combat_encounter_logs WHERE simulation_run_id = sr.id) as total
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Smoke:%'
    ORDER BY sr.started_at DESC
    LIMIT 5
  `);

  console.log('=== Phase 3 Smoke Test Runs ===\n');
  for (const r of runs) {
    const winRate = r.total > 0 ? ((Number(r.wins) / Number(r.total)) * 100).toFixed(1) : '0';
    console.log(`${r.id}: ${r.notes} | ${r.wins}/${r.total} wins (${winRate}%)`);
  }

  // For each run, inspect 3 fights for Phase 3 features
  for (const r of runs) {
    console.log(`\n\n========== ${r.notes} ==========\n`);

    const fights = await prisma.$queryRawUnsafe(`
      SELECT id, rounds::text, outcome, total_rounds,
             character_start_hp, character_end_hp, opponent_start_hp, opponent_end_hp,
             opponent_name
      FROM combat_encounter_logs
      WHERE simulation_run_id = $1
      ORDER BY started_at
      LIMIT 3
    `, r.id);

    for (const f of fights) {
      console.log(`--- Fight ${f.id.substring(0,8)} | vs ${f.opponent_name} | ${f.outcome} | ${f.total_rounds} rds | Player HP: ${f.character_start_hp}→${f.character_end_hp} | Monster HP: ${f.opponent_start_hp}→${f.opponent_end_hp} ---`);

      if (!f.rounds) { console.log('  (no rounds data)'); continue; }

      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { console.log('  (parse error)'); continue; }

      if (!Array.isArray(rounds)) { console.log('  (rounds not array)'); continue; }

      let dtCount = 0, ptCount = 0, laCount = 0, lrCount = 0, fearCount = 0, auraCount = 0;

      for (const round of rounds) {
        // Check top-level round
        if (round.deathThroesResult) {
          dtCount++;
          const dt = round.deathThroesResult;
          console.log(`  💀 DT: ${dt.damageRoll} ${dt.damageType} → ${dt.finalDamage}dmg (save ${dt.savePassed ? 'PASS' : 'FAIL'} DC${dt.saveDC}) HP:${dt.playerHpBefore}→${dt.playerHpAfter} MutualKill:${dt.mutualKill}`);
        }
        if (round.phaseTransition) {
          ptCount++;
          const pt = round.phaseTransition;
          console.log(`  ⚡ PT: "${pt.transitionName}" at ${pt.actualHpPercent?.toFixed(1)}% (threshold ${pt.hpThresholdPercent}%) Effects:[${(pt.effects||[]).join('; ')}]${pt.aoeDamage ? ` AoE:${pt.aoeDamage}` : ''}`);
        }
        if (round.legendaryActions && round.legendaryActions.length > 0) laCount++;
        if (round.legendaryResistance) lrCount++;
        if (round.auraResults) {
          for (const a of round.auraResults) {
            if (a.type === 'fear') fearCount++;
            else auraCount++;
          }
        }

        // Check turns/entries array inside round
        const entries = round.turns || round.entries || [];
        for (const e of entries) {
          if (e.deathThroesResult) {
            dtCount++;
            const dt = e.deathThroesResult;
            console.log(`  💀 DT(entry): ${dt.damageRoll} ${dt.damageType} → ${dt.finalDamage}dmg (save ${dt.savePassed ? 'PASS' : 'FAIL'}) MutualKill:${dt.mutualKill}`);
          }
          if (e.phaseTransition) {
            ptCount++;
            const pt = e.phaseTransition;
            console.log(`  ⚡ PT(entry): "${pt.transitionName}" at ${pt.actualHpPercent?.toFixed(1)}%`);
          }
          if (e.legendaryActions && e.legendaryActions.length > 0) laCount++;
          if (e.legendaryResistance) lrCount++;
        }
      }

      console.log(`  Summary: DT=${dtCount} PT=${ptCount} LA=${laCount}rds LR=${lrCount} Fear=${fearCount} Aura=${auraCount}`);
      console.log();
    }
  }

  await prisma.$disconnect();
}

inspect().catch(e => { console.error(e); process.exit(1); });
