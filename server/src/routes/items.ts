import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../lib/db';
import { eq, and, gt, inArray, sql } from 'drizzle-orm';
import { items, itemTemplates, inventories, playerProfessions, characters, characterEquipment, characterActiveEffects } from '@database/tables';
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

// -------------------------------------------------------------------------
// Consumable system helpers
// -------------------------------------------------------------------------

/** Effects that are mid-combat healing (NOT usable via pre-tick API) */
const MID_COMBAT_EFFECTS = new Set(['heal_hp']);

/** Utility scroll effects that are out of scope */
const UTILITY_EFFECTS = new Set(['reveal_map', 'identify']);

/** Stat buff effect → combatant stat key map */
const EFFECT_TO_STAT: Record<string, string> = {
  buff_strength: 'str',
  buff_dexterity: 'dex',
  buff_constitution: 'con',
  buff_intelligence: 'int',
  buff_wisdom: 'wis',
  buff_charisma: 'cha',
};

/**
 * Normalize foodBuff formats into { effectType, magnitude }.
 * Seeded food: { stat: 'strength', value: 2 }
 * Crafted food: { effect: 'buff_strength', magnitude: 3, duration: ... }
 */
function normalizeFoodBuff(foodBuff: any): { effectType: string; magnitude: number; effectType2?: string; magnitude2?: number } | null {
  if (!foodBuff) return null;
  // Crafted format: { effect, magnitude }
  if (foodBuff.effect) {
    return {
      effectType: foodBuff.effect,
      magnitude: foodBuff.magnitude ?? 0,
      effectType2: foodBuff.secondaryEffect,
      magnitude2: foodBuff.secondaryMagnitude,
    };
  }
  // Seeded format: { stat, value }
  if (foodBuff.stat && foodBuff.value != null) {
    const statLower = foodBuff.stat.toLowerCase();
    const effectType = `buff_${statLower}`;
    return { effectType, magnitude: foodBuff.value };
  }
  return null;
}

const useConsumableSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

// -------------------------------------------------------------------------
// POST /api/items/use-consumable — Use a pre-tick consumable item
// -------------------------------------------------------------------------
router.post('/use-consumable', authGuard, characterGuard, validate(useConsumableSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const character = req.character!;

    // 1. Must be idle
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'Cannot use consumables while traveling' });
    }

    // 2. Find item in character's inventory with template
    const inventoryEntry = await db.query.inventories.findFirst({
      where: and(
        eq(inventories.characterId, character.id),
        eq(inventories.itemId, itemId),
      ),
      with: {
        item: {
          with: { itemTemplate: true },
        },
      },
    });

    if (!inventoryEntry) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    const item = inventoryEntry.item;
    const template = item.itemTemplate;
    const stats = template.stats as any;

    // 3. Determine source type and validate
    let sourceType: 'POTION' | 'FOOD' | 'SCROLL';
    let dailyFlag: 'potionBuffUsedToday' | 'foodUsedToday' | 'scrollUsedToday';

    if (template.isPotion) {
      // Check if this is a mid-combat healing potion (heal_hp) — reject
      if (stats?.effect && MID_COMBAT_EFFECTS.has(stats.effect)) {
        return res.status(400).json({
          error: 'Healing potions are used automatically in combat based on your combat presets. Configure your healing threshold in combat settings.',
        });
      }
      sourceType = 'POTION';
      dailyFlag = 'potionBuffUsedToday';
    } else if (template.isFood || template.isBeverage) {
      sourceType = 'FOOD';
      dailyFlag = 'foodUsedToday';
    } else if (
      template.type === 'CONSUMABLE' &&
      template.professionRequired === 'SCRIBE' &&
      stats?.effect &&
      !UTILITY_EFFECTS.has(stats.effect)
    ) {
      sourceType = 'SCROLL';
      dailyFlag = 'scrollUsedToday';
    } else {
      return res.status(400).json({ error: 'This item cannot be used as a consumable' });
    }

    // 4. Check daily flag
    if ((character as any)[dailyFlag] === true) {
      const typeLabel = sourceType === 'POTION' ? 'stat buff potion' : sourceType.toLowerCase();
      return res.status(400).json({ error: `You have already used a ${typeLabel} today` });
    }

    // 5. Extract effect data
    let effectType: string;
    let magnitude: number;
    let effectType2: string | undefined;
    let magnitude2: number | undefined;

    if (sourceType === 'FOOD') {
      // Try foodBuff first, then stats
      const normalized = normalizeFoodBuff(template.foodBuff) ?? normalizeFoodBuff(stats);
      if (!normalized) {
        return res.status(400).json({ error: 'This food has no buff effect' });
      }
      effectType = normalized.effectType;
      magnitude = normalized.magnitude;
      effectType2 = normalized.effectType2;
      magnitude2 = normalized.magnitude2;
    } else {
      // Potions and scrolls use template.stats
      effectType = stats?.effect;
      magnitude = stats?.magnitude ?? 0;
      effectType2 = stats?.secondaryEffect;
      magnitude2 = stats?.secondaryMagnitude;
      if (!effectType) {
        return res.status(400).json({ error: 'This item has no consumable effect data' });
      }
    }

    // 6. Create active effect and consume item in a transaction
    const effectId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db.transaction(async (tx) => {
      // Create active effect
      await tx.insert(characterActiveEffects).values({
        id: effectId,
        characterId: character.id,
        sourceType,
        effectType,
        magnitude,
        effectType2: effectType2 ?? null,
        magnitude2: magnitude2 ?? null,
        itemName: template.name,
        expiresAt,
      });

      // Set daily flag
      await tx.update(characters)
        .set({ [dailyFlag]: true })
        .where(eq(characters.id, character.id));

      // For food: reset hunger
      if (sourceType === 'FOOD') {
        await tx.update(characters)
          .set({ daysSinceLastMeal: 0, hungerState: 'FED' })
          .where(eq(characters.id, character.id));
      }

      // Consume item: decrement quantity or delete
      if (inventoryEntry.quantity > 1) {
        await tx.update(inventories)
          .set({ quantity: inventoryEntry.quantity - 1 })
          .where(eq(inventories.id, inventoryEntry.id));
      } else {
        await tx.delete(inventories).where(eq(inventories.id, inventoryEntry.id));
        await tx.delete(items).where(eq(items.id, itemId));
      }
    });

    return res.json({
      effect: {
        id: effectId,
        sourceType,
        effectType,
        magnitude,
        effectType2,
        magnitude2,
        itemName: template.name,
        expiresAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'use-consumable', req)) return;
    logRouteError(req, 500, 'Use consumable error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/items/active-effects — Current active consumable effects
// -------------------------------------------------------------------------
router.get('/active-effects', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const effects = await db.query.characterActiveEffects.findMany({
      where: and(
        eq(characterActiveEffects.characterId, character.id),
        gt(characterActiveEffects.expiresAt, new Date().toISOString()),
      ),
    });

    return res.json({ effects });
  } catch (error) {
    if (handleDbError(error, res, 'active-effects', req)) return;
    logRouteError(req, 500, 'Active effects error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
