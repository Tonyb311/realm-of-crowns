/**
 * One-time migration seed: Grant basic cottages to all existing characters
 * who don't already have a house in their home town.
 *
 * Usage: npx tsx database/seeds/grant-houses.ts
 */

import 'dotenv/config';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  // Find characters without any house (relation filter via raw SQL subquery)
  const characters = await db.query.characters.findMany({
    where: sql`${schema.characters.id} NOT IN (SELECT character_id FROM houses)`,
    columns: { id: true, name: true, homeTownId: true },
  });

  console.log(`Found ${characters.length} characters without houses`);

  let created = 0;
  let skipped = 0;

  for (const char of characters) {
    if (!char.homeTownId) {
      skipped++;
      continue;
    }

    await db.insert(schema.houses).values({
      id: crypto.randomUUID(),
      characterId: char.id,
      townId: char.homeTownId,
      tier: 1,
      name: `${char.name}'s Cottage`,
      storageSlots: 20,
    }).onConflictDoUpdate({
      target: [schema.houses.characterId, schema.houses.townId],
      set: {},
    });
    created++;
  }

  console.log(`Done: ${created} houses created, ${skipped} skipped (no homeTownId)`);
}

main()
  .catch((e) => {
    console.error('Error granting houses:', e);
    process.exit(1);
  })
  .finally(() => pool.end());
