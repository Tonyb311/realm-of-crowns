import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { ProfessionType, ItemType } from '@prisma/client';
import { calculateItemStats } from '../services/item-stats';

const router = Router();

const repairSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

// Maps item types to the professions that can repair them
const REPAIR_PROFESSION_MAP: Partial<Record<ItemType, ProfessionType[]>> = {
  WEAPON: ['BLACKSMITH'],
  ARMOR: ['BLACKSMITH', 'LEATHERWORKER', 'TAILOR'],
  TOOL: ['BLACKSMITH', 'WOODWORKER'],
  ACCESSORY: ['JEWELER'],
};

// Gold cost per durability point to repair
const REPAIR_GOLD_PER_POINT = 2;

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

// -------------------------------------------------------------------------
// POST /api/items/repair — Repair an item
// -------------------------------------------------------------------------
router.post('/repair', authGuard, validate(repairSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Find the item
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { template: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your possession' });
    }

    // Check if already at full durability
    if (item.currentDurability >= item.template.durability) {
      return res.status(400).json({ error: 'Item is already at full durability' });
    }

    // Check if character has a matching crafting profession
    const requiredProfessions = REPAIR_PROFESSION_MAP[item.template.type];
    if (!requiredProfessions) {
      return res.status(400).json({ error: 'This item type cannot be repaired' });
    }

    const matchingProfession = await prisma.playerProfession.findFirst({
      where: {
        characterId: character.id,
        professionType: { in: requiredProfessions },
        isActive: true,
      },
    });

    if (!matchingProfession) {
      return res.status(400).json({
        error: `Requires one of these professions: ${requiredProfessions.join(', ')}`,
      });
    }

    // Calculate repair cost
    const durabilityToRepair = item.template.durability - item.currentDurability;
    const goldCost = durabilityToRepair * REPAIR_GOLD_PER_POINT;

    if (character.gold < goldCost) {
      return res.status(400).json({
        error: `Not enough gold. Repair costs ${goldCost}g, you have ${character.gold}g`,
      });
    }

    // Perform repair
    await prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: itemId },
        data: { currentDurability: item.template.durability },
      });

      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: goldCost } },
      });
    });

    return res.json({
      repaired: {
        itemId: item.id,
        name: item.template.name,
        previousDurability: item.currentDurability,
        currentDurability: item.template.durability,
        maxDurability: item.template.durability,
        goldSpent: goldCost,
        repairedBy: matchingProfession.professionType,
      },
    });
  } catch (error) {
    console.error('Repair item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/items/details/:itemId — Full item with calculated stats
// -------------------------------------------------------------------------
router.get('/details/:itemId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        template: true,
        craftedBy: { select: { id: true, name: true } },
      },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const calculated = calculateItemStats(item);

    // Check if item is currently equipped
    const equipped = await prisma.characterEquipment.findFirst({
      where: { characterId: character.id, itemId },
    });

    return res.json({
      item: {
        id: item.id,
        name: item.template.name,
        type: item.template.type,
        rarity: item.template.rarity,
        quality: item.quality,
        description: item.template.description,
        currentDurability: item.currentDurability,
        maxDurability: item.template.durability,
        levelRequired: item.template.levelRequired,
        requirements: item.template.requirements,
        enchantments: item.enchantments,
        craftedBy: item.craftedBy ? { id: item.craftedBy.id, name: item.craftedBy.name } : null,
        equippedSlot: equipped?.slot ?? null,
        stats: {
          base: calculated.baseStats,
          qualityMultiplier: calculated.qualityMultiplier,
          enchantmentBonuses: calculated.enchantmentBonuses,
          final: calculated.finalStats,
        },
      },
    });
  } catch (error) {
    console.error('Item details error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/items/compare?equipped=id1&candidate=id2 — Side-by-side comparison
// -------------------------------------------------------------------------
router.get('/compare', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { equipped: equippedId, candidate: candidateId } = req.query;
    const character = await getCharacterForUser(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (!equippedId || !candidateId || typeof equippedId !== 'string' || typeof candidateId !== 'string') {
      return res.status(400).json({ error: 'Both equipped and candidate item IDs are required' });
    }

    const [equippedItem, candidateItem] = await Promise.all([
      prisma.item.findUnique({
        where: { id: equippedId },
        include: { template: true },
      }),
      prisma.item.findUnique({
        where: { id: candidateId },
        include: { template: true },
      }),
    ]);

    if (!equippedItem || equippedItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Equipped item not found' });
    }
    if (!candidateItem || candidateItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Candidate item not found' });
    }

    const equippedStats = calculateItemStats(equippedItem);
    const candidateStats = calculateItemStats(candidateItem);

    // Build diff: positive means candidate is better, negative means worse
    const diff: Record<string, number> = {};
    const allKeys = new Set([
      ...Object.keys(equippedStats.finalStats),
      ...Object.keys(candidateStats.finalStats),
    ]);

    for (const key of allKeys) {
      if (key === 'resistance') continue;
      const equippedVal = (equippedStats.finalStats[key] as number) ?? 0;
      const candidateVal = (candidateStats.finalStats[key] as number) ?? 0;
      if (equippedVal !== candidateVal) {
        diff[key] = Math.round((candidateVal - equippedVal) * 100) / 100;
      }
    }

    // Compare resistances
    const resistanceDiff: Record<string, number> = {};
    const equippedRes = equippedStats.finalStats.resistance ?? {};
    const candidateRes = candidateStats.finalStats.resistance ?? {};
    const allResKeys = new Set([...Object.keys(equippedRes), ...Object.keys(candidateRes)]);

    for (const key of allResKeys) {
      const eVal = equippedRes[key] ?? 0;
      const cVal = candidateRes[key] ?? 0;
      if (eVal !== cVal) {
        resistanceDiff[key] = Math.round((cVal - eVal) * 100) / 100;
      }
    }

    return res.json({
      comparison: {
        equipped: {
          id: equippedItem.id,
          name: equippedItem.template.name,
          type: equippedItem.template.type,
          quality: equippedItem.quality,
          currentDurability: equippedItem.currentDurability,
          maxDurability: equippedItem.template.durability,
          stats: equippedStats.finalStats,
        },
        candidate: {
          id: candidateItem.id,
          name: candidateItem.template.name,
          type: candidateItem.template.type,
          quality: candidateItem.quality,
          currentDurability: candidateItem.currentDurability,
          maxDurability: candidateItem.template.durability,
          stats: candidateStats.finalStats,
        },
        diff,
        resistanceDiff,
      },
    });
  } catch (error) {
    console.error('Item compare error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
