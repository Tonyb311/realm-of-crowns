const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Verify:%'
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
      ORDER BY started_at
      LIMIT 5
    `, r.id);

    let totalDT = 0, totalPT = 0;

    for (const f of fights) {
      console.log(`--- ${f.id.substring(0,8)} | ${f.outcome} | ${f.total_rounds}rds | P:${f.character_start_hp}→${f.character_end_hp} M:${f.opponent_start_hp}→${f.opponent_end_hp} ---`);

      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { continue; }
      if (!Array.isArray(rounds)) continue;

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        if (round.deathThroesResult) {
          totalDT++;
          const dt = round.deathThroesResult;
          console.log(`  R${i+1} 💀 DT: ${dt.damageRoll} ${dt.damageType} → ${dt.finalDamage}dmg save:${dt.savePassed?'PASS':'FAIL'} DC${dt.saveDC} HP:${dt.playerHpBefore}→${dt.playerHpAfter} mutual:${dt.mutualKill}`);
        }
        if (round.phaseTransition) {
          totalPT++;
          const pt = round.phaseTransition;
          console.log(`  R${i+1} ⚡ PT: "${pt.transitionName}" at ${pt.actualHpPercent?.toFixed(1)}% (thr:${pt.hpThresholdPercent}%) [${(pt.effects||[]).join('; ')}]${pt.aoeDamage !== undefined ? ` burst:${pt.aoeDamage}` : ''}`);
        }
        // Also check if rounds have deeper structure
        const keys = Object.keys(round);
        const interesting = keys.filter(k => !['roundNumber','actorId','actorName','action','rollDetails','description',
          'damage','damageType','hpChanges','statusEffects','legendaryActions','legendaryResistance','auraResults',
          'deathThroesResult','phaseTransition','critResult','fumbleResult','damageTypeInteraction','combatEnded',
          'winner','combatEndReason'].includes(k));
        if (interesting.length > 0) {
          console.log(`  R${i+1} extra keys: ${interesting.join(', ')}`);
        }
      }
    }
    console.log(`\n  TOTALS across ${fights.length} fights: DT=${totalDT} PT=${totalPT}`);
  }

  await prisma.$disconnect();
}

inspect().catch(e => { console.error(e); process.exit(1); });
