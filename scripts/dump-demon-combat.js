const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dump() {
  for (const name of ['Demon', 'Young Dragon']) {
    const m = await prisma.monster.findFirst({ where: { name } });
    console.log(`\n=== ${name} ===`);
    console.log(`Level: ${m.level}, HP: ${m.hp}, AC: ${m.ac}`);
    console.log(`Attack: ${m.attack}, Damage: ${m.damage}`);
    console.log(`LA: ${m.legendaryActions}, LR: ${m.legendaryResistances}`);
    console.log(`Abilities: ${JSON.stringify((m.abilities || []).map(a => ({id: a.id, type: a.type, damage: a.damage})))}`);
    console.log(`Resistances: ${JSON.stringify(m.resistances)}`);
    console.log(`Immunities: ${JSON.stringify(m.immunities)}`);
    console.log(`PhaseTransitions: ${(m.phaseTransitions || []).length} entries`);

    // Get a L40 fight to see what's happening
    const fight = await prisma.$queryRawUnsafe(`
      SELECT rounds::text, outcome, total_rounds, character_start_hp, character_end_hp,
             opponent_start_hp, opponent_end_hp
      FROM combat_encounter_logs
      WHERE notes LIKE '%Fix-verify%' AND opponent_name = $1
      ORDER BY started_at DESC LIMIT 1
    `, name);

    if (fight.length > 0) {
      const f = fight[0];
      console.log(`\nSample fight: ${f.outcome} | ${f.total_rounds} rds | P:${f.character_start_hp}→${f.character_end_hp} M:${f.opponent_start_hp}→${f.opponent_end_hp}`);
      const rounds = JSON.parse(f.rounds);
      // Show first 6 actions
      for (let i = 1; i < Math.min(rounds.length, 8); i++) {
        const r = rounds[i];
        const hpAfter = r.hpAfter ? JSON.stringify(r.hpAfter) : '';
        const aura = r.auraResults ? r.auraResults.map(a => `${a.auraType}:${a.savePassed?'pass':'fail'}${a.damage ? ' dmg:'+a.damage : ''}`).join(',') : '';
        const la = r.legendaryActions ? `LA:${r.legendaryActions.length}` : '';
        console.log(`  [${i}] R${r.round} ${r.actor}: ${r.action}${r.abilityName ? ' ('+r.abilityName+')' : ''} | hp=${hpAfter} ${aura} ${la}`);
      }
    }
  }

  await prisma.$disconnect();
}

dump().catch(e => { console.error(e); process.exit(1); });
