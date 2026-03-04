const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  // 1. Check Wolf on-hit abilities in DB
  const wolf = await p.monster.findFirst({ where: { name: 'Wolf' } });
  console.log('=== WOLF DB CHECK ===');
  console.log('  abilities:', JSON.stringify(wolf.abilities));
  console.log('  damageType:', wolf.damageType);

  // 2. Check Wolf combatant context in logs - does it have monsterAbilities?
  const wolfLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax60qf0000ftyvtgzdnlt3' LIMIT 1"
  );
  const wolfEntries = parseRounds(wolfLogs[0]);
  const wolfCtx = wolfEntries.find(e => e._encounterContext);
  if (wolfCtx) {
    const mCombatant = wolfCtx._encounterContext.combatants?.find(c => c.entityType === 'monster');
    console.log('  Combatant monsterAbilities:', mCombatant?.monsterAbilities?.length ?? 'NONE');
  }
  // Check all wolf entries for on_hit or status
  let wolfOnHit = 0;
  wolfEntries.forEach(e => {
    if (e._encounterContext) return;
    if (e.statusEffectsApplied && e.statusEffectsApplied.length > 0) {
      wolfOnHit++;
      console.log('  Wolf status applied:', JSON.stringify(e.statusEffectsApplied));
    }
    if (e.onHitResult) {
      console.log('  Wolf onHitResult:', JSON.stringify(e.onHitResult));
    }
  });
  console.log('  Wolf on-hit triggers found:', wolfOnHit);

  // 3. Check Troll regen - look for heal entries
  console.log('\n=== TROLL REGEN CHECK ===');
  const troll = await p.monster.findFirst({ where: { name: 'Troll' } });
  const trollAbilities = troll.abilities;
  console.log('  Troll abilities:', JSON.stringify(trollAbilities));
  
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6aa4000042mrxco5snvs' LIMIT 3"
  );
  trollLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'heal' || e.healing > 0 || e.action === 'regen' || e.action === 'regeneration') {
        console.log(`  Fight ${i+1}: HEAL entry:`, JSON.stringify(e).substring(0, 300));
      }
      // Check if Troll HP increases between rounds
      if (e.actor === 'Troll' && e.hpAfter) {
        const trollHp = e.hpAfter['Troll'];
        if (trollHp) console.log(`  Fight ${i+1} R${e.round}: Troll HP=${trollHp}`);
      }
    });
  });

  // 4. Check Skeleton - what weapon does the test character have?
  console.log('\n=== SKELETON VULNERABILITY CHECK ===');
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6zzo0000mceclmf0ypab' LIMIT 2"
  );
  skelLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    const ctx = entries.find(e => e._encounterContext);
    if (ctx && i === 0) {
      const player = ctx._encounterContext.combatants?.find(c => c.entityType !== 'monster');
      console.log('  Player weapon:', JSON.stringify(player?.weapon));
      const monster = ctx._encounterContext.combatants?.find(c => c.entityType === 'monster');
      console.log('  Monster vulnerabilities:', JSON.stringify(monster?.vulnerabilities));
    }
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.damageTypeResult) {
        console.log(`  Fight ${i+1} R${e.round}: DT result:`, JSON.stringify(e.damageTypeResult));
      }
    });
  });

  // 5. Check Slime - what damage types in play?
  console.log('\n=== SLIME CRIT IMMUNITY CHECK ===');
  const slime = await p.monster.findFirst({ where: { name: 'Slime' } });
  console.log('  Slime critImmunity:', slime.critImmunity);
  console.log('  Slime resistances:', JSON.stringify(slime.resistances));
  console.log('  Slime immunities:', JSON.stringify(slime.immunities));
  
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax78iq00002wevfha9x9j2' LIMIT 2"
  );
  slimeLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    const ctx = entries.find(e => e._encounterContext);
    if (ctx && i === 0) {
      const player = ctx._encounterContext.combatants?.find(c => c.entityType !== 'monster');
      console.log('  Player weapon damageType:', player?.weapon?.damageType);
      const monster = ctx._encounterContext.combatants?.find(c => c.entityType === 'monster');
      console.log('  Monster combatant critImmunity:', monster?.critImmunity);
      console.log('  Monster combatant resistances:', JSON.stringify(monster?.resistances));
    }
    // Look at all attack entries for damage info
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) {
        console.log(`  Fight ${i+1}: CRIT on slime:`, JSON.stringify(e.critResult).substring(0, 200));
      }
    });
  });

  // 6. Dragon multiattack check
  console.log('\n=== DRAGON MULTIATTACK CHECK ===');
  const dragon = await p.monster.findFirst({ where: { name: 'Young Dragon' } });
  console.log('  Dragon abilities:', JSON.stringify(dragon.abilities));
  
  const dragonLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax7hl00000aumlludi81ux' LIMIT 2"
  );
  dragonLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        console.log(`  Fight ${i+1} R${e.round}: ${e.abilityName} priority=${e.priority || '?'} strikesHit=${e.strikesHit || '?'}`);
      }
    });
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
