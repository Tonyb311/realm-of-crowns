const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dump() {
  // Get L50 Demon fight
  const fight = await prisma.$queryRawUnsafe(`
    SELECT rounds::text, outcome, total_rounds, character_start_hp, opponent_start_hp
    FROM combat_encounter_logs
    WHERE simulation_run_id = 'cmmb483500000kff1t7qp4o7q'
    ORDER BY started_at LIMIT 1
  `);

  if (fight.length === 0) { console.log('No fights'); return; }
  const f = fight[0];
  const rounds = JSON.parse(f.rounds);

  console.log(`L50 Warrior vs Demon: ${f.outcome} | ${f.total_rounds} rds | P HP:${f.character_start_hp} M HP:${f.opponent_start_hp}\n`);

  for (let i = 1; i < rounds.length; i++) {
    const r = rounds[i];
    const hp = r.hpAfter || {};
    const aura = r.auraResults || [];
    const la = r.legendaryActions || [];
    const auratxt = aura.map(a => {
      let s = `${a.auraType}`;
      if (a.damage !== undefined) s += `:${a.damage}dmg`;
      if (a.savePassed !== undefined) s += a.savePassed ? '(pass)' : '(fail)';
      return s;
    }).join(', ');
    const latxt = la.map(l => {
      const a = l.action || {};
      return `${a.abilityName || 'attack'} ${a.hit !== undefined ? (a.hit ? 'HIT' : 'MISS') : ''} ${a.damage || ''} ${a.description ? a.description.substring(0, 60) : ''}`;
    }).join(' | ');

    let details = '';
    if (r.hit !== undefined) details += r.hit ? 'HIT' : 'MISS';
    if (r.damage) details += ` dmg:${r.damage}`;
    if (r.damageRoll) {
      if (typeof r.damageRoll === 'object') details += ` roll:${r.damageRoll.total}`;
      else details += ` roll:${r.damageRoll}`;
    }
    if (r.targetKilled) details += ' KILLED';
    if (r.strikesHit !== undefined) details += ` strikes:${r.strikesHit}/${r.totalStrikes}`;
    if (r.perTargetResults) {
      const ptr = r.perTargetResults[0];
      if (ptr) details += ` aoe:${ptr.damage}dmg save:${ptr.savePassed ? 'pass' : 'fail'}`;
    }

    const hpStr = Object.entries(hp).map(([k,v]) => `${k.substring(0,15)}:${v}`).join(' ');
    console.log(`  R${r.round} ${r.actor?.substring(0,15) || '?'} ${r.action}${r.abilityName ? '(' + r.abilityName + ')' : ''} ${details}`);
    console.log(`    HP: ${hpStr}${auratxt ? ' AURA:[' + auratxt + ']' : ''}${latxt ? ' LA:[' + latxt + ']' : ''}`);
  }

  await prisma.$disconnect();
}

dump().catch(e => { console.error(e); process.exit(1); });
