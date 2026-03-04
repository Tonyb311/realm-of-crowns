const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('=== Phase 3 Seed Verification ===\n');

  // Use raw SQL to avoid typed client issues with new fields
  const monsters = await prisma.$queryRawUnsafe(`
    SELECT name, level, abilities::text, phase_transitions::text
    FROM "monsters"
    WHERE name IN ('Demon', 'Lich', 'Young Dragon')
    ORDER BY level ASC
  `);

  for (const m of monsters) {
    const abilities = JSON.parse(m.abilities || '[]');
    const phases = JSON.parse(m.phase_transitions || '[]');
    const abilityNames = abilities.map(a => `${a.id} (${a.type})`).join(', ');
    const phaseNames = phases.map(p => `${p.name} at ${p.hpThresholdPercent}%`).join(', ');
    console.log(`--- ${m.name} (L${m.level}) ---`);
    console.log(`  Abilities: ${abilityNames}`);
    console.log(`  Phases: ${phaseNames || '(none)'}`);
    const dt = abilities.find(a => a.type === 'death_throes');
    if (dt) console.log(`  Death Throes: ${dt.deathDamage} ${dt.deathDamageType} DC ${dt.deathSaveDC} ${dt.deathSaveType}`);
    console.log();
  }

  // Check non-upgraded monsters
  console.log('=== Non-Upgraded Monsters (should have empty phase_transitions) ===\n');
  const others = await prisma.$queryRawUnsafe(`
    SELECT name, level, phase_transitions::text
    FROM "monsters"
    WHERE name IN ('Wolf', 'Troll', 'Hydra', 'Ancient Golem', 'Elder Fey Guardian')
    ORDER BY level ASC
  `);

  for (const m of others) {
    const phases = JSON.parse(m.phase_transitions || '[]');
    const status = phases.length === 0 ? 'PASS (empty)' : `FAIL (${phases.length} transitions!)`;
    console.log(`  ${m.name} (L${m.level}): ${status}`);
  }

  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
