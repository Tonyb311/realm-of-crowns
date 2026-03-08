/**
 * Monster loot item drop resolution.
 *
 * Processes loot table entries that have `itemTemplateName` set,
 * creating Item + Inventory records for the winning character.
 * Stacks with existing inventory when possible.
 */
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { items, itemTemplates, inventories } from '@database/tables';

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
 * @param tx - Drizzle transaction or db instance
 * @param characterId - The character receiving the items
 * @param lootTable - The monster's loot table (JSON from DB)
 * @returns Array of items that were actually dropped
 */
export async function processItemDrops(
  tx: any, // Drizzle transaction or db instance
  characterId: string,
  lootTable: LootEntry[],
): Promise<DroppedItem[]> {
  const droppedItems: DroppedItem[] = [];

  for (const entry of lootTable) {
    if (!entry.itemTemplateName) continue;
    if (Math.random() > entry.dropChance) continue;

    const template = await tx.query.itemTemplates.findFirst({
      where: eq(itemTemplates.name, entry.itemTemplateName),
    });

    if (!template) {
      console.warn(`[LOOT] ItemTemplate "${entry.itemTemplateName}" not found for monster drop`);
      continue;
    }

    const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;

    // Check for existing inventory stack of this template
    const allInv = await tx.query.inventories.findMany({
      where: eq(inventories.characterId, characterId),
      with: { item: true },
    });
    const existingSlot = allInv.find((inv: any) => inv.item?.templateId === template.id);

    if (existingSlot) {
      await tx.update(inventories).set({ quantity: existingSlot.quantity + qty }).where(eq(inventories.id, existingSlot.id));
    } else {
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: template.id,
        ownerId: characterId,
        quality: 'COMMON',
      }).returning();
      await tx.insert(inventories).values({
        id: crypto.randomUUID(),
        characterId,
        itemId: item.id,
        quantity: qty,
      });
    }

    droppedItems.push({ name: template.name, quantity: qty, templateId: template.id });
  }

  return droppedItems;
}
