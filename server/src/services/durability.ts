import { prisma } from '../lib/prisma';
import { emitItemLowDurability, emitItemBroken } from '../socket/events';

/**
 * Reduce an item's currentDurability by the given amount.
 * Emits 'item:lowDurability' if durability drops below 20%.
 * Returns the updated durability value.
 */
export async function degradeItem(itemId: string, amount: number = 1): Promise<number> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { template: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);
  if (item.currentDurability <= 0) return 0;

  const newDurability = Math.max(0, item.currentDurability - amount);

  await prisma.item.update({
    where: { id: itemId },
    data: { currentDurability: newDurability },
  });

  if (newDurability === 0) {
    await breakItem(itemId);
  } else if (item.template.durability > 0) {
    const percent = newDurability / item.template.durability;
    if (percent < 0.2 && item.ownerId) {
      emitItemLowDurability(item.ownerId, {
        itemId: item.id,
        itemName: item.template.name,
        currentDurability: newDurability,
        maxDurability: item.template.durability,
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
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { template: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);

  await prisma.item.update({
    where: { id: itemId },
    data: { currentDurability: 0 },
  });

  // Auto-unequip if equipped
  const equipped = await prisma.characterEquipment.findFirst({
    where: { itemId },
  });

  if (equipped) {
    await prisma.characterEquipment.delete({
      where: { id: equipped.id },
    });
  }

  if (item.ownerId) {
    emitItemBroken(item.ownerId, {
      itemId: item.id,
      itemName: item.template.name,
      wasEquipped: !!equipped,
      slot: equipped?.slot ?? null,
    });
  }
}

/**
 * Check if an item is broken (currentDurability <= 0).
 */
export async function isItemBroken(itemId: string): Promise<boolean> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { currentDurability: true },
  });

  if (!item) throw new Error(`Item not found: ${itemId}`);
  return item.currentDurability <= 0;
}
