/**
 * Ability seed for Realm of Crowns
 *
 * P1 #17 / Database MAJOR-05: Seeds all class abilities from shared data
 * into the abilities table. Previously only available as a standalone
 * server script at server/src/scripts/seed-abilities.ts.
 */

import { PrismaClient } from '@prisma/client';
import { ALL_ABILITIES } from '@shared/data/skills';

export async function seedAbilities(prisma: PrismaClient) {
  console.log('  Seeding abilities...');

  let created = 0;
  let skipped = 0;

  for (const ability of ALL_ABILITIES) {
    const existing = await prisma.ability.findFirst({
      where: { name: ability.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Resolve prerequisite DB id if needed
    let prereqId: string | null = null;
    if (ability.prerequisiteAbilityId) {
      const prereqDef = ALL_ABILITIES.find((a) => a.id === ability.prerequisiteAbilityId);
      if (prereqDef) {
        const prereqDb = await prisma.ability.findFirst({
          where: { name: prereqDef.name },
        });
        prereqId = prereqDb?.id ?? null;
      }
    }

    await prisma.ability.create({
      data: {
        id: ability.id,
        name: ability.name,
        description: ability.description,
        class: ability.class,
        specialization: ability.specialization,
        tier: ability.tier,
        effects: ability.effects as any,
        cooldown: ability.cooldown,
        manaCost: ability.manaCost,
        prerequisiteAbilityId: prereqId,
        levelRequired: ability.levelRequired,
      },
    });
    created++;
  }

  console.log(`  Seeded ${created} abilities (${skipped} already existed).`);
}
