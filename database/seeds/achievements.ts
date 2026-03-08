/**
 * Achievement seed for Realm of Crowns
 *
 * P1 #17 / Database MAJOR-05: Seeds all achievements from shared data
 * into the achievements table. Previously only available as a standalone
 * server script at server/src/scripts/seed-achievements.ts.
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { ACHIEVEMENTS } from '@shared/data/achievements';

export async function seedAchievements(db: any) {
  console.log('  Seeding achievements...');

  let created = 0;
  let skipped = 0;

  for (const achievement of ACHIEVEMENTS) {
    const existing = await db.query.achievements.findFirst({
      where: eq(schema.achievements.name, achievement.name),
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(schema.achievements).values({
      id: crypto.randomUUID(),
      name: achievement.name,
      description: achievement.description,
      criteria: achievement.criteria as any,
      reward: achievement.reward as any,
    });
    created++;
  }

  console.log(`  Seeded ${created} achievements (${skipped} already existed).`);
}
