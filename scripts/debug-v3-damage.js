const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Slime v3 — check attack damage values for resistance halving
  console.log('=== SLIME v3 DAMAGE TRACE ===');
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxow5z0000c8izgbro4gs0' LIMIT 3"
  );
  slimeLogs.forEach((log, i) => {
    const entries = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'attack' && e.actor !== 'Slime') {
        console.log(`  Fight ${i+1} R${e.round}: Player atk → dmg=${e.damageRoll?.total} damageType=${e.damageRoll?.type} DT_result=${JSON.stringify(e.damageTypeResult || 'NONE')} hit=${e.hit}`);
      }
    });
  });

  // Skeleton v3 — check player weapon in encounter and attack damage
  console.log('\n=== SKELETON v3 DAMAGE TRACE ===');
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxooiz0000tygwjryg1ax8' LIMIT 3"
  );
  skelLogs.forEach((log, i) => {
    const entries = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'attack' && e.actor !== 'Skeleton Warrior') {
        console.log(`  Fight ${i+1} R${e.round}: Player atk → dmg=${e.damageRoll?.total} type=${e.damageRoll?.type} DT=${JSON.stringify(e.damageTypeResult || 'NONE')} hit=${e.hit}`);
      }
    });
  });

  // Check: is the Slime's combatant data correct from DB perspective?
  const slime = await p.monster.findFirst({ where: { name: 'Slime' } });
  console.log('\n=== SLIME DB ===');
  console.log('  resistances:', JSON.stringify(slime.resistances));
  console.log('  immunities:', JSON.stringify(slime.immunities));
  console.log('  critImmunity:', slime.critImmunity);
  console.log('  damageType:', slime.damageType);

  const skeleton = await p.monster.findFirst({ where: { name: 'Skeleton Warrior' } });
  console.log('\n=== SKELETON DB ===');
  console.log('  vulnerabilities:', JSON.stringify(skeleton.vulnerabilities));
  console.log('  immunities:', JSON.stringify(skeleton.immunities));
  console.log('  damageType:', skeleton.damageType);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
