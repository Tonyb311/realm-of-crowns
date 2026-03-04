const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const lich = await p.monster.findFirst({
    where: { name: 'Lich' },
    select: { name: true, phaseTransitions: true, legendaryActions: true, legendaryResistances: true }
  });
  console.log('Lich:', JSON.stringify(lich, null, 2));

  const demon = await p.monster.findFirst({
    where: { name: 'Demon' },
    select: { name: true, abilities: true, phaseTransitions: true }
  });
  console.log('\nDemon abilities:', JSON.stringify((demon.abilities || []).map(a => `${a.id}(${a.type})`)));
  console.log('Demon phases:', JSON.stringify(demon.phaseTransitions));

  await p.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
