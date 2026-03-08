import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { items, inventories, characterEquipment } from '@database/tables';
import { equipSlot as equipSlotEnum } from '@database/enums';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { calculateItemStats, calculateEquipmentTotals } from '../services/item-stats';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { onEquipItem } from '../services/quest-triggers';
import crypto from 'crypto';
import { getEnchantmentEffect } from '@shared/data/enchantment-effects';
import { checkEquipmentProficiency } from '@shared/utils/proficiency';

type EquipSlot = typeof equipSlotEnum.enumValues[number];

const router = Router();

const equipSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  slot: z.enum(equipSlotEnum.enumValues),
});

const unequipSchema = z.object({
  slot: z.enum(equipSlotEnum.enumValues),
});

const enchantSchema = z.object({
  scrollItemId: z.string().min(1, 'Scroll item ID is required'),
  targetItemId: z.string().min(1, 'Target item ID is required'),
});

// Maps item type to valid equipment slots
const ITEM_TYPE_SLOT_MAP: Record<string, EquipSlot[]> = {
  WEAPON: ['MAIN_HAND', 'OFF_HAND'],
  ARMOR: ['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'BACK'],
  ACCESSORY: ['RING_1', 'RING_2', 'NECK'],
  TOOL: ['TOOL'],
};

// -------------------------------------------------------------------------
// POST /api/equipment/equip — Equip an item to a slot
// -------------------------------------------------------------------------
router.post('/equip', authGuard, characterGuard, validate(equipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId, slot } = req.body as { itemId: string; slot: EquipSlot };
    const character = req.character!;

    // Verify item exists and is owned by character
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: { itemTemplate: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    // Verify item is in inventory (not just owned — must be in inventory table)
    const inventoryEntry = await db.query.inventories.findFirst({
      where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, itemId)),
    });

    if (!inventoryEntry) {
      return res.status(400).json({ error: 'Item is not in your inventory' });
    }

    // Validate slot matches item type
    const validSlots = ITEM_TYPE_SLOT_MAP[item.itemTemplate.type];
    if (!validSlots || !validSlots.includes(slot)) {
      return res.status(400).json({
        error: `Cannot equip ${item.itemTemplate.type} items in the ${slot} slot`,
      });
    }

    // Check durability — cannot equip a broken item
    if (item.currentDurability <= 0) {
      return res.status(400).json({ error: 'This item is broken and cannot be equipped' });
    }

    // Check level requirement
    const requirements = item.itemTemplate.requirements as Record<string, unknown>;
    const levelReq = (typeof requirements?.level === 'number') ? requirements.level : item.itemTemplate.levelRequired;
    if (character.level < levelReq) {
      return res.status(400).json({
        error: `Requires level ${levelReq}, you are level ${character.level}`,
      });
    }

    // Check class restrictions
    const classRestrictions = (requirements?.classRestrictions ?? []) as string[];
    if (classRestrictions.length > 0 && character.class) {
      if (!classRestrictions.includes(character.class)) {
        return res.status(400).json({
          error: `This item can only be equipped by: ${classRestrictions.join(', ')}`,
        });
      }
    }

    // Handle swap if slot is already occupied
    const existingEquip = await db.query.characterEquipment.findFirst({
      where: and(
        eq(characterEquipment.characterId, character.id),
        eq(characterEquipment.slot, slot),
      ),
      with: { item: true },
    });

    await db.transaction(async (tx) => {
      // Unequip existing item if slot is occupied
      if (existingEquip) {
        await tx.delete(characterEquipment).where(eq(characterEquipment.id, existingEquip.id));

        // Return old item to inventory
        const existingInv = await tx.query.inventories.findFirst({
          where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, existingEquip.itemId)),
        });

        if (existingInv) {
          await tx.update(inventories).set({ quantity: existingInv.quantity + 1 }).where(eq(inventories.id, existingInv.id));
        } else {
          await tx.insert(inventories).values({
            id: crypto.randomUUID(),
            characterId: character.id,
            itemId: existingEquip.itemId,
            quantity: 1,
          });
        }
      }

      // Equip the new item
      await tx.insert(characterEquipment).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        slot,
        itemId: item.id,
      });

      // Remove from inventory
      if (inventoryEntry.quantity <= 1) {
        await tx.delete(inventories).where(eq(inventories.id, inventoryEntry.id));
      } else {
        await tx.update(inventories).set({ quantity: inventoryEntry.quantity - 1 }).where(eq(inventories.id, inventoryEntry.id));
      }
    });

    const calculated = calculateItemStats({ ...item, template: item.itemTemplate });

    onEquipItem(character.id).catch(() => {}); // fire-and-forget

    // Check proficiency after equip — fetch all equipped items for full check
    let proficiencyWarnings: string[] = [];
    if (character.class) {
      const allEquipped = await db.query.characterEquipment.findMany({
        where: eq(characterEquipment.characterId, character.id),
        with: { item: { with: { itemTemplate: true } } },
      });
      const itemsForCheck = allEquipped.map(eq => ({
        slot: eq.slot,
        stats: (eq.item.itemTemplate.stats as Record<string, any>) ?? {},
        itemName: eq.item.itemTemplate.name,
      }));
      const profCheck = checkEquipmentProficiency(character.class, itemsForCheck);
      proficiencyWarnings = profCheck.warnings;
    }

    return res.json({
      equipped: {
        slot,
        item: {
          id: item.id,
          name: item.itemTemplate.name,
          type: item.itemTemplate.type,
          quality: item.quality,
          currentDurability: item.currentDurability,
          maxDurability: item.itemTemplate.durability,
          stats: calculated.finalStats,
        },
        swapped: existingEquip ? {
          itemId: existingEquip.itemId,
          returnedToInventory: true,
        } : null,
      },
      proficiencyWarnings,
    });
  } catch (error) {
    if (handleDbError(error, res, 'equip-item', req)) return;
    logRouteError(req, 500, 'Equip item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/equipment/unequip — Unequip an item from a slot
// -------------------------------------------------------------------------
router.post('/unequip', authGuard, characterGuard, validate(unequipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slot } = req.body as { slot: EquipSlot };
    const character = req.character!;

    const equip = await db.query.characterEquipment.findFirst({
      where: and(
        eq(characterEquipment.characterId, character.id),
        eq(characterEquipment.slot, slot),
      ),
      with: { item: { with: { itemTemplate: true } } },
    });

    if (!equip) {
      return res.status(400).json({ error: `Nothing equipped in ${slot} slot` });
    }

    await db.transaction(async (tx) => {
      await tx.delete(characterEquipment).where(eq(characterEquipment.id, equip.id));

      // Return item to inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, equip.itemId)),
      });

      if (existingInv) {
        await tx.update(inventories).set({ quantity: existingInv.quantity + 1 }).where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: equip.itemId,
          quantity: 1,
        });
      }
    });

    return res.json({
      unequipped: {
        slot,
        itemId: equip.itemId,
        name: equip.item.itemTemplate.name,
        returnedToInventory: true,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'unequip-item', req)) return;
    logRouteError(req, 500, 'Unequip item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/equipment/equipped — List all equipped items with full stats
// -------------------------------------------------------------------------
router.get('/equipped', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const equipped = await db.query.characterEquipment.findMany({
      where: eq(characterEquipment.characterId, character.id),
      with: {
        item: { with: { itemTemplate: true } },
      },
      orderBy: (ce, { asc }) => [asc(ce.slot)],
    });

    const itemsList = equipped.map((equip) => {
      const calculated = calculateItemStats({ ...equip.item, template: equip.item.itemTemplate });
      return {
        slot: equip.slot,
        item: {
          id: equip.item.id,
          name: equip.item.itemTemplate.name,
          type: equip.item.itemTemplate.type,
          quality: equip.item.quality,
          currentDurability: equip.item.currentDurability,
          maxDurability: equip.item.itemTemplate.durability,
          enchantments: equip.item.enchantments,
          stats: calculated.finalStats,
          baseStats: calculated.baseStats,
          qualityMultiplier: calculated.qualityMultiplier,
          enchantmentBonuses: calculated.enchantmentBonuses,
        },
      };
    });

    return res.json({ equipped: itemsList });
  } catch (error) {
    if (handleDbError(error, res, 'equipment-list', req)) return;
    logRouteError(req, 500, 'Get equipped items error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/equipment/stats — Aggregate stat bonuses from all equipment
// -------------------------------------------------------------------------
router.get('/stats', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const totals = await calculateEquipmentTotals(character.id);

    return res.json({
      totalAC: totals.totalAC,
      totalDamage: totals.totalDamage,
      totalStatBonuses: totals.totalStatBonuses,
      totalResistances: totals.totalResistances,
      equippedCount: totals.items.length,
    });
  } catch (error) {
    if (handleDbError(error, res, 'equipment-stats', req)) return;
    logRouteError(req, 500, 'Get equipment stats error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/equipment/enchant — Apply an enchantment scroll to an item
// -------------------------------------------------------------------------
router.post('/enchant', authGuard, characterGuard, validate(enchantSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scrollItemId, targetItemId } = req.body as { scrollItemId: string; targetItemId: string };
    const character = req.character!;

    // Fetch both items with templates
    const [scrollItem, targetItem] = await Promise.all([
      db.query.items.findFirst({ where: eq(items.id, scrollItemId), with: { itemTemplate: true } }),
      db.query.items.findFirst({ where: eq(items.id, targetItemId), with: { itemTemplate: true } }),
    ]);

    if (!scrollItem || scrollItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Scroll not found in your inventory' });
    }
    if (!targetItem || targetItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Target item not found in your inventory' });
    }

    // Scroll must be in inventory (not equipped)
    const scrollInv = await db.query.inventories.findFirst({
      where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, scrollItemId)),
    });
    if (!scrollInv) {
      return res.status(400).json({ error: 'Scroll is not in your inventory' });
    }

    // Validate scroll is an enchantment scroll
    if (!scrollItem.itemTemplate.name.includes('Enchantment Scroll')) {
      return res.status(400).json({ error: 'Item is not an enchantment scroll' });
    }

    // Target must be WEAPON or ARMOR
    if (targetItem.itemTemplate.type !== 'WEAPON' && targetItem.itemTemplate.type !== 'ARMOR') {
      return res.status(400).json({ error: 'Can only enchant weapons and armor' });
    }

    // Look up enchantment effect
    const effect = getEnchantmentEffect(scrollItem.itemTemplate.name);
    if (!effect) {
      return res.status(400).json({ error: 'Unknown enchantment scroll type' });
    }

    // Validate target type constraint
    if (effect.targetType === 'weapon' && targetItem.itemTemplate.type !== 'WEAPON') {
      return res.status(400).json({ error: 'This scroll can only be applied to weapons' });
    }
    if (effect.targetType === 'armor' && targetItem.itemTemplate.type !== 'ARMOR') {
      return res.status(400).json({ error: 'This scroll can only be applied to armor' });
    }

    // Check existing enchantments
    const existingEnchantments = (targetItem.enchantments as Array<{ scrollName: string }>) || [];

    // No duplicate same-type enchantments
    if (existingEnchantments.some(e => e.scrollName === scrollItem.itemTemplate.name)) {
      return res.status(400).json({ error: 'This enchantment is already applied to this item' });
    }

    // Max 2 enchantments per item
    if (existingEnchantments.length >= 2) {
      return res.status(400).json({ error: 'This item already has the maximum of 2 enchantments' });
    }

    // Build enchantment record
    const enchantmentRecord = {
      scrollName: scrollItem.itemTemplate.name,
      bonuses: effect.bonuses,
      ...(effect.elementalDamage ? { elementalDamage: effect.elementalDamage } : {}),
      appliedAt: new Date().toISOString(),
    };

    // Apply in transaction
    const updatedItem = await db.transaction(async (tx) => {
      // Append enchantment to target item
      const [updated] = await tx.update(items).set({
        enchantments: [...existingEnchantments, enchantmentRecord],
      }).where(eq(items.id, targetItemId)).returning();

      // Consume the scroll
      if (scrollInv.quantity <= 1) {
        await tx.delete(inventories).where(eq(inventories.id, scrollInv.id));
        await tx.delete(items).where(eq(items.id, scrollItemId));
      } else {
        await tx.update(inventories).set({ quantity: scrollInv.quantity - 1 }).where(eq(inventories.id, scrollInv.id));
      }

      // Re-fetch with template for stats calculation
      const itemWithTemplate = await tx.query.items.findFirst({
        where: eq(items.id, targetItemId),
        with: { itemTemplate: true },
      });
      return itemWithTemplate!;
    });

    const calculatedStats = calculateItemStats({ ...updatedItem, template: updatedItem.itemTemplate });

    return res.json({
      success: true,
      item: {
        id: updatedItem.id,
        name: updatedItem.itemTemplate.name,
        type: updatedItem.itemTemplate.type,
        quality: updatedItem.quality,
        enchantments: updatedItem.enchantments,
        stats: calculatedStats.finalStats,
        enchantmentBonuses: calculatedStats.enchantmentBonuses,
      },
      message: `Applied ${scrollItem.itemTemplate.name} to ${updatedItem.itemTemplate.name}`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'enchant-item', req)) return;
    logRouteError(req, 500, 'Enchant item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
