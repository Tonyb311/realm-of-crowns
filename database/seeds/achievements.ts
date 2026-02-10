/**
 * Achievement seed for Realm of Crowns
 *
 * P1 #17 / Database MAJOR-05: Seeds all achievements from shared data
 * into the achievements table. Previously only available as a standalone
 * server script at server/src/scripts/seed-achievements.ts.
 */

import { PrismaClient } from '@prisma/client';
import { ACHIEVEMENTS } from '@shared/data/achievements';

export async function seedAchievements(prisma: PrismaClient) {
  console.log('  Seeding achievements...');

  let created = 0;
  let skipped = 0;

  for (const achievement of ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({
      where: { name: achievement.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.achievement.create({
      data: {
        name: achievement.name,
        description: achievement.description,
        criteria: achievement.criteria as any,
        reward: achievement.reward as any,
      },
    });
    created++;
  }

  console.log(`  Seeded ${created} achievements (${skipped} already existed).`);
}
