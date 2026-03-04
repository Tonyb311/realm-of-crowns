const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  // Check a Troll fight for regen evidence - trace HP changes
  console.log('=== TROLL HP TRACE ===');
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6aa4000042mrxco5snvs' LIMIT 1"
  );
  const trollEntries = parseRounds(trollLogs[0]);
  trollEntries.forEach((e, i) => {
    if (e._encounterContext) return;
    console.log(`  Entry ${i}: action=${e.action} actor=${e.actor} round=${e.round} hpAfter=${JSON.stringify(e.hpAfter)}`);
  });

  // Check Dragon fight for recharge mechanics
  console.log('\n=== DRAGON ABILITY TRACE (full fight) ===');
  const dragonLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax7hl00000aumlludi81ux' LIMIT 1"
  );
  const dragonEntries = parseRounds(dragonLogs[0]);
  dragonEntries.forEach((e, i) => {
    if (e._encounterContext) return;
    console.log(`  Entry ${i}: action=${e.action} actor=${e.actor} round=${e.round} abilityName=${e.abilityName || '-'} hpAfter=${JSON.stringify(e.hpAfter)}`);
  });

  // Check weapon damageType in encounter context for Skeleton test
  console.log('\n=== SKELETON FULL CONTEXT ===');
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax6zzo0000mceclmf0ypab' LIMIT 1"
  );
  const skelEntries = parseRounds(skelLogs[0]);
  const skelCtx = skelEntries.find(e => e._encounterContext);
  if (skelCtx) {
    console.log('  Full context:', JSON.stringify(skelCtx._encounterContext).substring(0, 1500));
  }

  // Check Slime crit immunity - trace the crits
  console.log('\n=== SLIME FULL CONTEXT + CRITS ===');
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmax78iq00002wevfha9x9j2' LIMIT 5"
  );
  slimeLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult || e.critical) {
        console.log(`  Fight ${i+1} R${e.round}: crit=${e.critical} critResult=${JSON.stringify(e.critResult || 'NONE').substring(0, 200)} actor=${e.actor}`);
      }
    });
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
