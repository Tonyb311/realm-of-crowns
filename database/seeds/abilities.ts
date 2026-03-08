/**
 * Ability seed for Realm of Crowns
 *
 * P1 #17 / Database MAJOR-05: Seeds all class abilities from shared data
 * into the abilities table. Previously only available as a standalone
 * server script at server/src/scripts/seed-abilities.ts.
 */

import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { ALL_ABILITIES } from '@shared/data/skills';

export async function seedAbilities(db: any) {
  console.log('  Seeding abilities...');

  let created = 0;
  let skipped = 0;

  for (const ability of ALL_ABILITIES) {
    const existing = await db.query.abilities.findFirst({
      where: eq(schema.abilities.name, ability.name),
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
        const prereqDb = await db.query.abilities.findFirst({
          where: eq(schema.abilities.name, prereqDef.name),
        });
        prereqId = prereqDb?.id ?? null;
      }
    }

    await db.insert(schema.abilities).values({
      id: ability.id,
      name: ability.name,
      description: ability.description,
      class: ability.class,
      specialization: ability.specialization,
      tier: ability.tier,
      effects: ability.effects as any,
      cooldown: ability.cooldown,
      prerequisiteAbilityId: prereqId,
      levelRequired: ability.levelRequired,
    });
    created++;
  }

  console.log(`  Seeded ${created} abilities (${skipped} already existed).`);
}
