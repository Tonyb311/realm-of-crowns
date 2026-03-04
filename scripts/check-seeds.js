const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const monsters = await p.$queryRawUnsafe(`
    SELECT name, level, legendary_actions, legendary_resistances, abilities::text
    FROM monsters
    WHERE name IN ('Lich', 'Demon', 'Young Dragon', 'Ancient Golem', 'Elder Fey Guardian', 'Wolf', 'Troll', 'Goblin', 'Hydra', 'Void Stalker')
    ORDER BY level
  `);
  console.log('\n=== MONSTER LEGENDARY DATA ===');
  for (const m of monsters) {
    const abils = JSON.parse(m.abilities || '[]');
    const abilSummary = abils.map(a => {
      let tag = a.id;
      if (a.isLegendaryAction) tag += ' [LA:' + a.legendaryCost + ']';
      if (a.type === 'fear_aura') tag += ' [fear DC' + a.saveDC + ']';
      if (a.type === 'damage_aura') tag += ' [dmg_aura ' + a.auraDamage + ' ' + a.auraDamageType + ']';
      return tag;
    }).join(', ');
    console.log(
      m.name.padEnd(22),
      'L' + String(m.level).padEnd(3),
      'LA=' + m.legendary_actions,
      'LR=' + m.legendary_resistances,
      '|', abilSummary || '(none)'
    );
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
