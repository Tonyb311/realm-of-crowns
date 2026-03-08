import 'dotenv/config';
import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { abilities } from '@database/tables';
import { ALL_ABILITIES } from '@shared/data/skills';

async function main() {
  console.log(`Seeding ${ALL_ABILITIES.length} abilities...`);

  let created = 0;
  let skipped = 0;

  for (const ability of ALL_ABILITIES) {
    const existing = await db.query.abilities.findFirst({
      where: eq(abilities.name, ability.name),
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
          where: eq(abilities.name, prereqDef.name),
        });
        prereqId = prereqDb?.id ?? null;
      }
    }

    await db.insert(abilities).values({
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
      updatedAt: new Date().toISOString(),
    });
    created++;
  }

  console.log(`Done. Created: ${created}, Skipped (already exist): ${skipped}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
