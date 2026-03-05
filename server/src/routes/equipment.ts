import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { EquipSlot, ItemType } from '@prisma/client';
import { calculateItemStats, calculateEquipmentTotals } from '../services/item-stats';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { onEquipItem } from '../services/quest-triggers';
import { getEnchantmentEffect } from '@shared/data/enchantment-effects';
import { checkEquipmentProficiency } from '@shared/utils/proficiency';

const router = Router();

const equipSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  slot: z.nativeEnum(EquipSlot),
});

const unequipSchema = z.object({
  slot: z.nativeEnum(EquipSlot),
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
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { template: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    // Verify item is in inventory (not just owned — must be in inventory table)
    const inventoryEntry = await prisma.inventory.findFirst({
      where: { characterId: character.id, itemId },
    });

    if (!inventoryEntry) {
      return res.status(400).json({ error: 'Item is not in your inventory' });
    }

    // Validate slot matches item type
    const validSlots = ITEM_TYPE_SLOT_MAP[item.template.type];
    if (!validSlots || !validSlots.includes(slot)) {
      return res.status(400).json({
        error: `Cannot equip ${item.template.type} items in the ${slot} slot`,
      });
    }

    // Check durability — cannot equip a broken item
    if (item.currentDurability <= 0) {
      return res.status(400).json({ error: 'This item is broken and cannot be equipped' });
    }

    // Check level requirement
    const requirements = item.template.requirements as Record<string, unknown>;
    const levelReq = (typeof requirements?.level === 'number') ? requirements.level : item.template.levelRequired;
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
    const existingEquip = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: { characterId: character.id, slot },
      },
      include: { item: true },
    });

    await prisma.$transaction(async (tx) => {
      // Unequip existing item if slot is occupied
      if (existingEquip) {
        await tx.characterEquipment.delete({
          where: { id: existingEquip.id },
        });

        // Return old item to inventory
        const existingInv = await tx.inventory.findFirst({
          where: { characterId: character.id, itemId: existingEquip.itemId },
        });

        if (existingInv) {
          await tx.inventory.update({
            where: { id: existingInv.id },
            data: { quantity: existingInv.quantity + 1 },
          });
        } else {
          await tx.inventory.create({
            data: {
              characterId: character.id,
              itemId: existingEquip.itemId,
              quantity: 1,
            },
          });
        }
      }

      // Equip the new item
      await tx.characterEquipment.create({
        data: {
          characterId: character.id,
          slot,
          itemId: item.id,
        },
      });

      // Remove from inventory
      if (inventoryEntry.quantity <= 1) {
        await tx.inventory.delete({ where: { id: inventoryEntry.id } });
      } else {
        await tx.inventory.update({
          where: { id: inventoryEntry.id },
          data: { quantity: inventoryEntry.quantity - 1 },
        });
      }
    });

    const calculated = calculateItemStats(item);

    onEquipItem(character.id).catch(() => {}); // fire-and-forget

    // Check proficiency after equip — fetch all equipped items for full check
    let proficiencyWarnings: string[] = [];
    if (character.class) {
      const allEquipped = await prisma.characterEquipment.findMany({
        where: { characterId: character.id },
        include: { item: { include: { template: true } } },
      });
      const itemsForCheck = allEquipped.map(eq => ({
        slot: eq.slot,
        stats: (eq.item.template.stats as Record<string, any>) ?? {},
        itemName: eq.item.template.name,
      }));
      const profCheck = checkEquipmentProficiency(character.class, itemsForCheck);
      proficiencyWarnings = profCheck.warnings;
    }

    return res.json({
      equipped: {
        slot,
        item: {
          id: item.id,
          name: item.template.name,
          type: item.template.type,
          quality: item.quality,
          currentDurability: item.currentDurability,
          maxDurability: item.template.durability,
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
    if (handlePrismaError(error, res, 'equip-item', req)) return;
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

    const equip = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: { characterId: character.id, slot },
      },
      include: { item: { include: { template: true } } },
    });

    if (!equip) {
      return res.status(400).json({ error: `Nothing equipped in ${slot} slot` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.characterEquipment.delete({ where: { id: equip.id } });

      // Return item to inventory
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: character.id, itemId: equip.itemId },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: existingInv.quantity + 1 },
        });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId: equip.itemId,
            quantity: 1,
          },
        });
      }
    });

    return res.json({
      unequipped: {
        slot,
        itemId: equip.itemId,
        name: equip.item.template.name,
        returnedToInventory: true,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'unequip-item', req)) return;
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

    const equipped = await prisma.characterEquipment.findMany({
      where: { characterId: character.id },
      include: {
        item: { include: { template: true } },
      },
      orderBy: { slot: 'asc' },
    });

    const items = equipped.map((equip) => {
      const calculated = calculateItemStats(equip.item);
      return {
        slot: equip.slot,
        item: {
          id: equip.item.id,
          name: equip.item.template.name,
          type: equip.item.template.type,
          quality: equip.item.quality,
          currentDurability: equip.item.currentDurability,
          maxDurability: equip.item.template.durability,
          enchantments: equip.item.enchantments,
          stats: calculated.finalStats,
          baseStats: calculated.baseStats,
          qualityMultiplier: calculated.qualityMultiplier,
          enchantmentBonuses: calculated.enchantmentBonuses,
        },
      };
    });

    return res.json({ equipped: items });
  } catch (error) {
    if (handlePrismaError(error, res, 'equipment-list', req)) return;
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
    if (handlePrismaError(error, res, 'equipment-stats', req)) return;
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
      prisma.item.findUnique({ where: { id: scrollItemId }, include: { template: true } }),
      prisma.item.findUnique({ where: { id: targetItemId }, include: { template: true } }),
    ]);

    if (!scrollItem || scrollItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Scroll not found in your inventory' });
    }
    if (!targetItem || targetItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Target item not found in your inventory' });
    }

    // Scroll must be in inventory (not equipped)
    const scrollInv = await prisma.inventory.findFirst({
      where: { characterId: character.id, itemId: scrollItemId },
    });
    if (!scrollInv) {
      return res.status(400).json({ error: 'Scroll is not in your inventory' });
    }

    // Validate scroll is an enchantment scroll
    if (!scrollItem.template.name.includes('Enchantment Scroll')) {
      return res.status(400).json({ error: 'Item is not an enchantment scroll' });
    }

    // Target must be WEAPON or ARMOR
    if (targetItem.template.type !== 'WEAPON' && targetItem.template.type !== 'ARMOR') {
      return res.status(400).json({ error: 'Can only enchant weapons and armor' });
    }

    // Look up enchantment effect
    const effect = getEnchantmentEffect(scrollItem.template.name);
    if (!effect) {
      return res.status(400).json({ error: 'Unknown enchantment scroll type' });
    }

    // Validate target type constraint
    if (effect.targetType === 'weapon' && targetItem.template.type !== 'WEAPON') {
      return res.status(400).json({ error: 'This scroll can only be applied to weapons' });
    }
    if (effect.targetType === 'armor' && targetItem.template.type !== 'ARMOR') {
      return res.status(400).json({ error: 'This scroll can only be applied to armor' });
    }

    // Check existing enchantments
    const existingEnchantments = (targetItem.enchantments as Array<{ scrollName: string }>) || [];

    // No duplicate same-type enchantments
    if (existingEnchantments.some(e => e.scrollName === scrollItem.template.name)) {
      return res.status(400).json({ error: 'This enchantment is already applied to this item' });
    }

    // Max 2 enchantments per item
    if (existingEnchantments.length >= 2) {
      return res.status(400).json({ error: 'This item already has the maximum of 2 enchantments' });
    }

    // Build enchantment record
    const enchantmentRecord = {
      scrollName: scrollItem.template.name,
      bonuses: effect.bonuses,
      ...(effect.elementalDamage ? { elementalDamage: effect.elementalDamage } : {}),
      appliedAt: new Date().toISOString(),
    };

    // Apply in transaction
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Append enchantment to target item
      const updated = await tx.item.update({
        where: { id: targetItemId },
        data: {
          enchantments: [...existingEnchantments, enchantmentRecord],
        },
        include: { template: true },
      });

      // Consume the scroll
      if (scrollInv.quantity <= 1) {
        await tx.inventory.delete({ where: { id: scrollInv.id } });
        await tx.item.delete({ where: { id: scrollItemId } });
      } else {
        await tx.inventory.update({
          where: { id: scrollInv.id },
          data: { quantity: scrollInv.quantity - 1 },
        });
      }

      return updated;
    });

    const calculatedStats = calculateItemStats(updatedItem);

    return res.json({
      success: true,
      item: {
        id: updatedItem.id,
        name: updatedItem.template.name,
        type: updatedItem.template.type,
        quality: updatedItem.quality,
        enchantments: updatedItem.enchantments,
        stats: calculatedStats.finalStats,
        enchantmentBonuses: calculatedStats.enchantmentBonuses,
      },
      message: `Applied ${scrollItem.template.name} to ${updatedItem.template.name}`,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'enchant-item', req)) return;
    logRouteError(req, 500, 'Enchant item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
