const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Cross-class:%'
    ORDER BY sr.started_at DESC
    LIMIT 7
  `);

  for (const r of runs) {
    const fights = await prisma.$queryRawUnsafe(`
      SELECT outcome, opponent_start_hp, opponent_end_hp
      FROM combat_encounter_logs
      WHERE simulation_run_id = $1
    `, r.id);

    const wins = fights.filter(f => f.outcome === 'win').length;
    let totalDmg = 0;
    let minMonsterHp = Infinity;
    for (const f of fights) {
      totalDmg += f.opponent_start_hp - f.opponent_end_hp;
      if (f.opponent_end_hp < minMonsterHp) minMonsterHp = f.opponent_end_hp;
    }
    const avgDmg = totalDmg / fights.length;
    const cls = r.notes.replace('Cross-class: ', '').replace(' L18', '');
    console.log(`${cls.padEnd(10)} ${wins}/${fights.length} wins | avg dmg: ${avgDmg.toFixed(1)} | min monster HP: ${minMonsterHp}`);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
