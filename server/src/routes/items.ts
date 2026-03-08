import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { items, itemTemplates, playerProfessions, characters, characterEquipment } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import type { ProfessionType, ItemType } from '@shared/enums';
import { calculateItemStats } from '../services/item-stats';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

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

// -------------------------------------------------------------------------
// POST /api/items/repair — Repair an item
// -------------------------------------------------------------------------
router.post('/repair', authGuard, characterGuard, validate(repairSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const character = req.character!;

    // Find the item
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: { itemTemplate: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your possession' });
    }

    // Check if already at full durability
    if (item.currentDurability >= item.itemTemplate.durability) {
      return res.status(400).json({ error: 'Item is already at full durability' });
    }

    // Check if character has a matching crafting profession
    const requiredProfessions = REPAIR_PROFESSION_MAP[item.itemTemplate.type as ItemType];
    if (!requiredProfessions) {
      return res.status(400).json({ error: 'This item type cannot be repaired' });
    }

    const matchingProfession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, character.id),
        inArray(playerProfessions.professionType, requiredProfessions),
        eq(playerProfessions.isActive, true),
      ),
    });

    if (!matchingProfession) {
      return res.status(400).json({
        error: `Requires one of these professions: ${requiredProfessions.join(', ')}`,
      });
    }

    // Calculate repair cost
    const durabilityToRepair = item.itemTemplate.durability - item.currentDurability;
    const goldCost = durabilityToRepair * REPAIR_GOLD_PER_POINT;

    if (character.gold < goldCost) {
      return res.status(400).json({
        error: `Not enough gold. Repair costs ${goldCost}g, you have ${character.gold}g`,
      });
    }

    // Perform repair
    await db.transaction(async (tx) => {
      await tx.update(items)
        .set({ currentDurability: item.itemTemplate.durability })
        .where(eq(items.id, itemId));

      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${goldCost}` })
        .where(eq(characters.id, character.id));
    });

    return res.json({
      repaired: {
        itemId: item.id,
        name: item.itemTemplate.name,
        previousDurability: item.currentDurability,
        currentDurability: item.itemTemplate.durability,
        maxDurability: item.itemTemplate.durability,
        goldSpent: goldCost,
        repairedBy: matchingProfession.professionType,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'item-repair', req)) return;
    logRouteError(req, 500, 'Repair item error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/items/details/:itemId — Full item with calculated stats
// -------------------------------------------------------------------------
router.get('/details/:itemId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const character = req.character!;

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        itemTemplate: true,
        character_craftedById: { columns: { id: true, name: true } },
      },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const calculated = calculateItemStats({ ...item, template: item.itemTemplate });

    // Check if item is currently equipped
    const equipped = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.itemId, itemId)),
    });

    return res.json({
      item: {
        id: item.id,
        name: item.itemTemplate.name,
        type: item.itemTemplate.type,
        rarity: item.itemTemplate.rarity,
        quality: item.quality,
        description: item.itemTemplate.description,
        currentDurability: item.currentDurability,
        maxDurability: item.itemTemplate.durability,
        levelRequired: item.itemTemplate.levelRequired,
        requirements: item.itemTemplate.requirements,
        enchantments: item.enchantments,
        craftedBy: item.character_craftedById ? { id: item.character_craftedById.id, name: item.character_craftedById.name } : null,
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
    if (handleDbError(error, res, 'item-details', req)) return;
    logRouteError(req, 500, 'Item details error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/items/compare?equipped=id1&candidate=id2 — Side-by-side comparison
// -------------------------------------------------------------------------
router.get('/compare', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { equipped: equippedId, candidate: candidateId } = req.query;
    const character = req.character!;

    if (!equippedId || !candidateId || typeof equippedId !== 'string' || typeof candidateId !== 'string') {
      return res.status(400).json({ error: 'Both equipped and candidate item IDs are required' });
    }

    const [equippedItem, candidateItem] = await Promise.all([
      db.query.items.findFirst({
        where: eq(items.id, equippedId),
        with: { itemTemplate: true },
      }),
      db.query.items.findFirst({
        where: eq(items.id, candidateId),
        with: { itemTemplate: true },
      }),
    ]);

    if (!equippedItem || equippedItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Equipped item not found' });
    }
    if (!candidateItem || candidateItem.ownerId !== character.id) {
      return res.status(404).json({ error: 'Candidate item not found' });
    }

    const equippedStats = calculateItemStats({ ...equippedItem, template: equippedItem.itemTemplate });
    const candidateStats = calculateItemStats({ ...candidateItem, template: candidateItem.itemTemplate });

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
          name: equippedItem.itemTemplate.name,
          type: equippedItem.itemTemplate.type,
          quality: equippedItem.quality,
          currentDurability: equippedItem.currentDurability,
          maxDurability: equippedItem.itemTemplate.durability,
          stats: equippedStats.finalStats,
        },
        candidate: {
          id: candidateItem.id,
          name: candidateItem.itemTemplate.name,
          type: candidateItem.itemTemplate.type,
          quality: candidateItem.quality,
          currentDurability: candidateItem.currentDurability,
          maxDurability: candidateItem.itemTemplate.durability,
          stats: candidateStats.finalStats,
        },
        diff,
        resistanceDiff,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'item-compare', req)) return;
    logRouteError(req, 500, 'Item compare error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
