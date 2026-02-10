import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { EquipSlot, ItemType } from '@prisma/client';
import { calculateItemStats, calculateEquipmentTotals } from '../services/item-stats';

const router = Router();

const equipSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  slot: z.nativeEnum(EquipSlot),
});

const unequipSchema = z.object({
  slot: z.nativeEnum(EquipSlot),
});

// Maps item type to valid equipment slots
const ITEM_TYPE_SLOT_MAP: Record<string, EquipSlot[]> = {
  WEAPON: ['MAIN_HAND', 'OFF_HAND'],
  ARMOR: ['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'BACK'],
  ACCESSORY: ['RING_1', 'RING_2', 'NECK'],
  TOOL: ['MAIN_HAND'],
};

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

// -------------------------------------------------------------------------
// POST /api/equipment/equip — Equip an item to a slot
// -------------------------------------------------------------------------
router.post('/equip', authGuard, validate(equipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId, slot } = req.body as { itemId: string; slot: EquipSlot };
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    });
  } catch (error) {
    console.error('Equip item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/equipment/unequip — Unequip an item from a slot
// -------------------------------------------------------------------------
router.post('/unequip', authGuard, validate(unequipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slot } = req.body as { slot: EquipSlot };
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    console.error('Unequip item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/equipment/equipped — List all equipped items with full stats
// -------------------------------------------------------------------------
router.get('/equipped', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

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
    console.error('Get equipped items error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/equipment/stats — Aggregate stat bonuses from all equipment
// -------------------------------------------------------------------------
router.get('/stats', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const totals = await calculateEquipmentTotals(character.id);

    return res.json({
      totalAC: totals.totalAC,
      totalDamage: totals.totalDamage,
      totalStatBonuses: totals.totalStatBonuses,
      totalResistances: totals.totalResistances,
      equippedCount: totals.items.length,
    });
  } catch (error) {
    console.error('Get equipment stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
