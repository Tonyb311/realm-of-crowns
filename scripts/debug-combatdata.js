const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const monsters = await p.$queryRawUnsafe(
    "SELECT name, abilities, resistances, immunities, vulnerabilities, condition_immunities, crit_immunity, crit_resistance FROM monsters WHERE name = 'Wolf'"
  );
  console.log('Raw DB Wolf:', JSON.stringify(monsters[0], null, 2));

  // Check what Prisma client returns
  const wolf = await p.monster.findFirst({ where: { name: 'Wolf' } });
  console.log('\nPrisma client Wolf:');
  console.log('  abilities type:', typeof wolf.abilities, 'isArray:', Array.isArray(wolf.abilities));
  console.log('  abilities:', JSON.stringify(wolf.abilities));
  console.log('  damageType:', wolf.damageType);
  console.log('  resistances:', JSON.stringify(wolf.resistances));
  console.log('  critImmunity:', wolf.critImmunity);
  console.log('  critResistance:', wolf.critResistance);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
