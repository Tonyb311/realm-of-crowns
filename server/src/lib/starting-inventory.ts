import crypto from 'crypto';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { itemTemplates, items, inventories } from '@database/tables';
import { logger } from './logger';

let basicRationsTemplateId: string | null = null;

/**
 * Ensures a "Basic Rations" ItemTemplate exists in the database.
 * Returns its ID. Uses a cached lookup after first call.
 */
export async function ensureBasicRationsTemplate(): Promise<string> {
  if (basicRationsTemplateId) return basicRationsTemplateId;

  // Try to find existing — prefer stable ID
  let template = await db.query.itemTemplates.findFirst({
    where: eq(itemTemplates.id, 'consumable-basic-rations'),
  });
  if (!template) {
    template = await db.query.itemTemplates.findFirst({
      where: eq(itemTemplates.name, 'Basic Rations'),
    });
  }

  if (!template) {
    // Create it
    const [created] = await db.insert(itemTemplates).values({
      id: 'consumable-basic-rations',
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
      updatedAt: new Date().toISOString(),
    }).returning();
    template = created;
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
  const [item] = await db.insert(items).values({
    id: crypto.randomUUID(),
    templateId,
    ownerId: characterId,
    quality: 'COMMON',
    updatedAt: new Date().toISOString(),
  }).returning();

  await db.insert(inventories).values({
    id: crypto.randomUUID(),
    characterId,
    itemId: item.id,
    quantity: 5,
    updatedAt: new Date().toISOString(),
  });
}
