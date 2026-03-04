const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Fix-verify:%'
    ORDER BY sr.started_at DESC
    LIMIT 5
  `);

  for (const r of runs) {
    console.log(`\n========== ${r.notes} ==========\n`);

    const fights = await prisma.$queryRawUnsafe(`
      SELECT id, rounds::text, outcome, total_rounds,
             character_start_hp, character_end_hp, opponent_start_hp, opponent_end_hp
      FROM combat_encounter_logs
      WHERE simulation_run_id = $1
      ORDER BY started_at LIMIT 5
    `, r.id);

    let totalDT = 0, totalPT = 0;

    for (const f of fights) {
      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { continue; }
      if (!Array.isArray(rounds)) continue;

      let fDT = 0, fPT = 0;

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        if (round.deathThroesResult) {
          fDT++;
          const dt = round.deathThroesResult;
          console.log(`  💀 DT R${round.round||i}: ${dt.damageRoll} ${dt.damageType} → ${dt.finalDamage}dmg save:${dt.savePassed?'PASS':'FAIL'} DC${dt.saveDC} HP:${dt.playerHpBefore}→${dt.playerHpAfter} mutual:${dt.mutualKill}`);
        }
        if (round.phaseTransition) {
          fPT++;
          const pt = round.phaseTransition;
          console.log(`  ⚡ PT R${round.round||i}: "${pt.transitionName}" at ${pt.actualHpPercent?.toFixed(1)}% (thr:${pt.hpThresholdPercent}%) [${(pt.effects||[]).join('; ')}]${pt.aoeDamage !== undefined ? ` burst:${pt.aoeDamage}` : ''}`);
        }
      }

      totalDT += fDT;
      totalPT += fPT;
      console.log(`  Fight ${f.id.substring(0,8)} | ${f.outcome} | ${f.total_rounds}rds | P:${f.character_start_hp}→${f.character_end_hp} M:${f.opponent_start_hp}→${f.opponent_end_hp} | DT=${fDT} PT=${fPT}`);
    }
    console.log(`\n  TOTALS across ${fights.length} fights: DT=${totalDT} PT=${totalPT}`);
  }

  await prisma.$disconnect();
}

inspect().catch(e => { console.error(e); process.exit(1); });
