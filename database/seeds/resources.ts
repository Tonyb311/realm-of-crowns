/**
 * Resource seed for Realm of Crowns
 *
 * Seeds all 51 resources from the shared data definitions.
 * Uses upsert to avoid duplicates on re-runs.
 *
 * The Resource model stores one "primary" biome per resource row.
 * The shared data has a biomes[] array — we use the first entry as the DB biome.
 */

import { PrismaClient } from '@prisma/client';
import { ALL_RESOURCES } from '@shared/data/resources';

export async function seedResources(prisma: PrismaClient) {
  console.log('  Seeding resources...');

  for (const res of ALL_RESOURCES) {
    await prisma.resource.upsert({
      where: { name: res.name },
      update: {
        type: res.type as any,
        biome: res.biomes[0] as any,
        tier: res.tier,
        description: res.description,
        baseGatherTime: res.baseGatherTime,
      },
      create: {
        name: res.name,
        type: res.type as any,
        biome: res.biomes[0] as any,
        tier: res.tier,
        description: res.description,
        baseGatherTime: res.baseGatherTime,
      },
    });
  }

  console.log(`  Seeded ${ALL_RESOURCES.length} resources.`);
}
