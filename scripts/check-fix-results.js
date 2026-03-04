const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const runs = await prisma.$queryRawUnsafe(`
    SELECT sr.id, sr.notes
    FROM simulation_runs sr
    WHERE sr.notes LIKE 'Fix verify:%' OR sr.notes LIKE 'Control:%'
    ORDER BY sr.started_at DESC
    LIMIT 10
  `);

  for (const r of runs) {
    console.log(`\n========== ${r.notes} ==========`);
    // Win rate calculated from fights below

    const fights = await prisma.$queryRawUnsafe(`
      SELECT rounds::text, outcome, total_rounds,
             character_start_hp, opponent_start_hp, opponent_end_hp
      FROM combat_encounter_logs
      WHERE simulation_run_id = $1
    `, r.id);

    let totalPlayerDmg = 0;
    let totalMonsterDmg = 0;
    let minMonsterHp = Infinity;
    let maxMonsterHp = 0;
    let playerAttackCount = 0;
    let playerAbilityCount = 0;
    let playerBuffCount = 0;

    for (const f of fights) {
      const monsterDmg = f.opponent_start_hp - f.opponent_end_hp;
      totalPlayerDmg += monsterDmg;
      if (f.opponent_end_hp < minMonsterHp) minMonsterHp = f.opponent_end_hp;
      if (f.opponent_end_hp > maxMonsterHp) maxMonsterHp = f.opponent_end_hp;

      let rounds;
      try { rounds = JSON.parse(f.rounds); } catch { continue; }
      if (!Array.isArray(rounds)) continue;

      for (const round of rounds) {
        if (round.actor && round.action) {
          // Check if it's the player (team 0 / not monster)
          if (round.action === 'attack') playerAttackCount++;
          if (round.action === 'class_ability') {
            if (round.damage > 0) playerAbilityCount++;
            else playerBuffCount++;
          }
        }
      }
    }

    const avgDmgDealt = totalPlayerDmg / fights.length;
    console.log(`  Fights: ${fights.length} | Avg player damage dealt: ${avgDmgDealt.toFixed(1)}`);
    console.log(`  Monster HP range at end: ${minMonsterHp} - ${maxMonsterHp}`);
    console.log(`  Player actions: ${playerAttackCount} attacks, ${playerAbilityCount} damaging abilities, ${playerBuffCount} non-damage abilities`);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
