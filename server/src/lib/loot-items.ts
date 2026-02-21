/**
 * Monster loot item drop resolution.
 *
 * Processes loot table entries that have `itemTemplateName` set,
 * creating Item + Inventory records for the winning character.
 * Stacks with existing inventory when possible.
 */

interface LootEntry {
  dropChance: number;
  minQty: number;
  maxQty: number;
  gold: number;
  itemTemplateName?: string;
}

export interface DroppedItem {
  name: string;
  quantity: number;
  templateId: string;
}

/**
 * Process item drops from a monster's loot table.
 * Call this AFTER rolling gold for each entry that has `itemTemplateName`.
 *
 * @param db - Prisma client or transaction client
 * @param characterId - The character receiving the items
 * @param lootTable - The monster's loot table (JSON from DB)
 * @returns Array of items that were actually dropped
 */
export async function processItemDrops(
  db: any, // PrismaClient or transaction client — both have .itemTemplate/.item/.inventory
  characterId: string,
  lootTable: LootEntry[],
): Promise<DroppedItem[]> {
  const droppedItems: DroppedItem[] = [];

  for (const entry of lootTable) {
    if (!entry.itemTemplateName) continue;
    if (Math.random() > entry.dropChance) continue;

    const template = await db.itemTemplate.findFirst({
      where: { name: entry.itemTemplateName },
    });

    if (!template) {
      console.warn(`[LOOT] ItemTemplate "${entry.itemTemplateName}" not found for monster drop`);
      continue;
    }

    const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;

    // Check for existing inventory stack of this template
    const existingSlot = await db.inventory.findFirst({
      where: { characterId, item: { templateId: template.id } },
    });

    if (existingSlot) {
      await db.inventory.update({
        where: { id: existingSlot.id },
        data: { quantity: existingSlot.quantity + qty },
      });
    } else {
      const item = await db.item.create({
        data: {
          templateId: template.id,
          ownerId: characterId,
          quality: 'COMMON',
        },
      });
      await db.inventory.create({
        data: {
          characterId,
          itemId: item.id,
          quantity: qty,
        },
      });
    }

    droppedItems.push({ name: template.name, quantity: qty, templateId: template.id });
  }

  return droppedItems;
}
