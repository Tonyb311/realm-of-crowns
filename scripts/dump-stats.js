const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function dump() {
  for (const name of ['Demon', 'Young Dragon', 'Lich']) {
    const m = await p.monster.findFirst({ where: { name } });
    const s = m.stats;
    console.log(`\n${name} (L${m.level}): HP=${s.hp} AC=${s.ac} ATK=+${s.attack} DMG=${s.damage}`);
    console.log(`  STR=${s.str} DEX=${s.dex} CON=${s.con} INT=${s.int} WIS=${s.wis} CHA=${s.cha}`);
    console.log(`  LA=${m.legendaryActions} LR=${m.legendaryResistances}`);
    console.log(`  Abilities: ${(m.abilities || []).map(a => `${a.id}(${a.type}${a.damage ? ':' + a.damage : ''})`).join(', ')}`);
  }
  await p.$disconnect();
}

dump().catch(e => { console.error(e); process.exit(1); });
