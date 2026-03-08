import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { items, characterEquipment } from '@database/tables';
import { emitItemLowDurability, emitItemBroken } from '../socket/events';

/**
 * Reduce an item's currentDurability by the given amount.
 * Emits 'item:lowDurability' if durability drops below 20%.
 * Returns the updated durability value.
 */
export async function degradeItem(itemId: string, amount: number = 1): Promise<number> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { itemTemplate: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);
  if (item.currentDurability <= 0) return 0;

  const newDurability = Math.max(0, item.currentDurability - amount);

  await db.update(items).set({ currentDurability: newDurability }).where(eq(items.id, itemId));

  if (newDurability === 0) {
    await breakItem(itemId);
  } else if (item.itemTemplate.durability > 0) {
    const percent = newDurability / item.itemTemplate.durability;
    if (percent < 0.2 && item.ownerId) {
      emitItemLowDurability(item.ownerId, {
        itemId: item.id,
        itemName: item.itemTemplate.name,
        currentDurability: newDurability,
        maxDurability: item.itemTemplate.durability,
        percentRemaining: Math.round(percent * 100),
      });
    }
  }

  return newDurability;
}

/**
 * Mark an item as broken (durability = 0), auto-unequip it, and notify the owner.
 */
export async function breakItem(itemId: string): Promise<void> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: { itemTemplate: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);

  await db.update(items).set({ currentDurability: 0 }).where(eq(items.id, itemId));

  // Auto-unequip if equipped
  const equipped = await db.query.characterEquipment.findFirst({
    where: eq(characterEquipment.itemId, itemId),
  });

  if (equipped) {
    await db.delete(characterEquipment).where(eq(characterEquipment.id, equipped.id));
  }

  if (item.ownerId) {
    emitItemBroken(item.ownerId, {
      itemId: item.id,
      itemName: item.itemTemplate.name,
      wasEquipped: !!equipped,
      slot: equipped?.slot ?? null,
    });
  }
}

/**
 * Check if an item is broken (currentDurability <= 0).
 */
export async function isItemBroken(itemId: string): Promise<boolean> {
  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: { currentDurability: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);
  return item.currentDurability <= 0;
}
