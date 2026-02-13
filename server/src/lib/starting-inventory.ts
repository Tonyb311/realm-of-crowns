import { prisma } from './prisma';
import { logger } from './logger';

let basicRationsTemplateId: string | null = null;

/**
 * Ensures a "Basic Rations" ItemTemplate exists in the database.
 * Returns its ID. Uses a cached lookup after first call.
 */
export async function ensureBasicRationsTemplate(): Promise<string> {
  if (basicRationsTemplateId) return basicRationsTemplateId;

  // Try to find existing
  let template = await prisma.itemTemplate.findFirst({
    where: { name: 'Basic Rations' },
  });

  if (!template) {
    // Create it
    template = await prisma.itemTemplate.create({
      data: {
        name: 'Basic Rations',
        type: 'CONSUMABLE',
        rarity: 'COMMON',
        description: 'Simple travel food — dried meat, hardtack, and a few berries. Enough to keep you going for a day.',
        durability: 1,
        isFood: true,
        isPerishable: false,
        isBeverage: false,
        shelfLifeDays: 30,
        foodBuff: JSON.stringify({ stat: 'con', value: 1 }),
        stats: JSON.stringify({ hpRestore: 5 }),
      },
    });
    logger.info({ templateId: template.id }, 'Created Basic Rations item template');
  }

  basicRationsTemplateId = template.id;
  return template.id;
}

/**
 * Give a character 5 Basic Rations as starting inventory.
 * Creates an Item from the template, then an Inventory entry.
 */
export async function giveStartingInventory(characterId: string): Promise<void> {
  const templateId = await ensureBasicRationsTemplate();

  // Create a single item instance and give quantity 5
  const item = await prisma.item.create({
    data: {
      templateId,
      ownerId: characterId,
      quality: 'COMMON',
    },
  });

  await prisma.inventory.create({
    data: {
      characterId,
      itemId: item.id,
      quantity: 5,
    },
  });
}
