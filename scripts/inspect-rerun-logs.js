const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Rerun-fixed:%'
    ORDER BY sr.started_at DESC
    LIMIT 5
  `);

  for (const r of runs) {
    console.log(`\n========== ${r.notes} ==========`);

    // Get ALL fights for this run
    const fights = await prisma.$queryRawUnsafe(`
      SELECT rounds::text, outcome, total_rounds,
             opponent_start_hp, opponent_end_hp
      FROM combat_encounter_logs
      WHERE simulation_run_id = $1
    `, r.id);

    let totalDT = 0, totalPT = 0, totalFights = fights.length;
    let dtFights = 0, ptFights = 0;
    let minMonsterHp = Infinity;

    for (const f of fights) {
      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { continue; }
      if (!Array.isArray(rounds)) continue;

      let fightDT = false, fightPT = false;
      for (const round of rounds) {
        if (round.deathThroesResult) { totalDT++; fightDT = true; }
        if (round.phaseTransition) { totalPT++; fightPT = true; }
      }
      if (fightDT) dtFights++;
      if (fightPT) ptFights++;
      if (f.opponent_end_hp < minMonsterHp) minMonsterHp = f.opponent_end_hp;
    }

    const wins = fights.filter(f => f.outcome === 'win').length;
    console.log(`  ${wins}/${totalFights} wins | DT:${totalDT} (${dtFights} fights) | PT:${totalPT} (${ptFights} fights) | Min monster HP:${minMonsterHp}`);
  }

  // Also check the Lich L30 fix-verify for comparison
  const lichRun = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes FROM simulation_runs sr
    WHERE sr.notes LIKE 'Fix-verify: Lich phases L30%'
    ORDER BY sr.started_at DESC LIMIT 1
  `);

  if (lichRun.length > 0) {
    const r = lichRun[0];
    console.log(`\n========== ${r.notes} ==========`);
    const fights = await prisma.$queryRawUnsafe(`
      SELECT rounds::text, outcome, opponent_end_hp FROM combat_encounter_logs WHERE simulation_run_id = $1
    `, r.id);
    let totalDT = 0, totalPT = 0, dtFights = 0, ptFights = 0;
    for (const f of fights) {
      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { continue; }
      if (!Array.isArray(rounds)) continue;
      let fDT = false, fPT = false;
      for (const round of rounds) {
        if (round.deathThroesResult) { totalDT++; fDT = true; }
        if (round.phaseTransition) { totalPT++; fPT = true; }
      }
      if (fDT) dtFights++;
      if (fPT) ptFights++;
    }
    const wins = fights.filter(f => f.outcome === 'win').length;
    console.log(`  ${wins}/${fights.length} wins | DT:${totalDT} (${dtFights} fights) | PT:${totalPT} (${ptFights} fights)`);
  }

  await prisma.$disconnect();
}

inspect().catch(e => { console.error(e); process.exit(1); });
