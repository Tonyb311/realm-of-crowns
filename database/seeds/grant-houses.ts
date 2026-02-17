/**
 * One-time migration seed: Grant basic cottages to all existing characters
 * who don't already have a house in their home town.
 *
 * Usage: npx tsx database/seeds/grant-houses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const characters = await prisma.character.findMany({
    where: { houses: { none: {} } },
    select: { id: true, name: true, homeTownId: true },
  });

  console.log(`Found ${characters.length} characters without houses`);

  let created = 0;
  let skipped = 0;

  for (const char of characters) {
    if (!char.homeTownId) {
      skipped++;
      continue;
    }

    await prisma.house.upsert({
      where: {
        characterId_townId: {
          characterId: char.id,
          townId: char.homeTownId,
        },
      },
      update: {},
      create: {
        characterId: char.id,
        townId: char.homeTownId,
        tier: 1,
        name: `${char.name}'s Cottage`,
        storageSlots: 20,
      },
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
  .finally(() => prisma.$disconnect());
