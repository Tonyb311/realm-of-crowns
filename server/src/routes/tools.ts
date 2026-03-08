import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { characterEquipment, items, itemTemplates, inventories } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import type { ProfessionType } from '@shared/enums';
import { TOOL_TYPES, ToolTypeDefinition } from '@shared/data/tools';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// Valid gathering profession types that can have tools
const TOOL_PROFESSION_TYPES = TOOL_TYPES.map((t: ToolTypeDefinition) => t.professionType);

const equipSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  professionType: z.enum(TOOL_PROFESSION_TYPES as [string, ...string[]], {
    error: `Invalid profession type. Must be one of: ${TOOL_PROFESSION_TYPES.join(', ')}`,
  }),
});

const unequipSchema = z.object({
  professionType: z.enum(TOOL_PROFESSION_TYPES as [string, ...string[]], {
    error: `Invalid profession type. Must be one of: ${TOOL_PROFESSION_TYPES.join(', ')}`,
  }),
});

// -------------------------------------------------------------------------
// POST /api/tools/equip — Equip a tool to a profession slot
// -------------------------------------------------------------------------
router.post('/equip', authGuard, characterGuard, validate(equipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId, professionType } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    // Verify item exists, is owned by character, and is a TOOL
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: { itemTemplate: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    if (item.itemTemplate.type !== 'TOOL') {
      return res.status(400).json({ error: 'Item is not a tool' });
    }

    // Verify tool matches the profession
    const toolStats = item.itemTemplate.stats as Record<string, unknown>;
    if (toolStats.professionType !== profEnum) {
      const expectedTool = TOOL_TYPES.find((t: ToolTypeDefinition) => t.professionType === profEnum);
      return res.status(400).json({
        error: `This tool cannot be used for ${professionType}. You need a ${expectedTool?.toolType ?? 'matching tool'}.`,
      });
    }

    // Check durability — cannot equip a broken tool
    if (item.currentDurability <= 0) {
      return res.status(400).json({ error: 'This tool is broken and cannot be equipped' });
    }

    // Use dedicated TOOL slot — one tool at a time, separate from MAIN_HAND (weapon).
    // We track which profession it's for via the item template's stats.professionType.

    // Unequip any existing TOOL first
    const existingEquip = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'TOOL')),
    });

    if (existingEquip) {
      await db.delete(characterEquipment).where(eq(characterEquipment.id, existingEquip.id));
    }

    // Equip the new tool
    const [equipment] = await db.insert(characterEquipment).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      slot: 'TOOL',
      itemId: item.id,
    }).returning();

    return res.json({
      equipped: {
        id: equipment.id,
        slot: 'TOOL',
        item: {
          id: item.id,
          name: item.itemTemplate.name,
          currentDurability: item.currentDurability,
          maxDurability: item.itemTemplate.durability,
          stats: toolStats,
        },
        professionType: profEnum,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'equip-tool', req)) return;
    logRouteError(req, 500, 'Equip tool error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/tools/unequip — Unequip the current tool
// -------------------------------------------------------------------------
router.post('/unequip', authGuard, characterGuard, validate(unequipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const existingEquip = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'TOOL')),
      with: {
        item: { with: { itemTemplate: true } },
      },
    });

    if (!existingEquip) {
      return res.status(400).json({ error: 'No tool equipped' });
    }

    // Verify this is actually a tool for the requested profession
    const toolStats = existingEquip.item.itemTemplate.stats as Record<string, unknown>;
    const { professionType } = req.body;
    if (toolStats.professionType !== professionType) {
      return res.status(400).json({ error: `No ${professionType} tool is currently equipped` });
    }

    await db.delete(characterEquipment).where(eq(characterEquipment.id, existingEquip.id));

    return res.json({
      unequipped: {
        itemId: existingEquip.itemId,
        name: existingEquip.item.itemTemplate.name,
        professionType,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'unequip-tool', req)) return;
    logRouteError(req, 500, 'Unequip tool error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/tools/equipped — Get currently equipped tools
// -------------------------------------------------------------------------
router.get('/equipped', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const equipped = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'TOOL')),
      with: {
        item: { with: { itemTemplate: true } },
      },
    });

    if (!equipped || equipped.item.itemTemplate.type !== 'TOOL') {
      return res.json({ equipped: null });
    }

    const toolStats = equipped.item.itemTemplate.stats as Record<string, unknown>;

    return res.json({
      equipped: {
        id: equipped.id,
        slot: 'TOOL',
        item: {
          id: equipped.item.id,
          name: equipped.item.itemTemplate.name,
          currentDurability: equipped.item.currentDurability,
          maxDurability: equipped.item.itemTemplate.durability,
          stats: toolStats,
        },
        professionType: toolStats.professionType,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-equipped-tools', req)) return;
    logRouteError(req, 500, 'Get equipped tools error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/tools/inventory — List all tools in inventory
// -------------------------------------------------------------------------
router.get('/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const toolItems = await db.query.inventories.findMany({
      where: eq(inventories.characterId, character.id),
      with: {
        item: { with: { itemTemplate: true } },
      },
    });

    // Filter to only TOOL type items (Drizzle doesn't support nested where in `with`)
    const tools = toolItems
      .filter((inv) => inv.item.itemTemplate.type === 'TOOL')
      .map((inv) => {
        const stats = inv.item.itemTemplate.stats as Record<string, unknown>;
        return {
          inventoryId: inv.id,
          itemId: inv.item.id,
          name: inv.item.itemTemplate.name,
          currentDurability: inv.item.currentDurability,
          maxDurability: inv.item.itemTemplate.durability,
          stats,
        };
      });

    return res.json({ tools });
  } catch (error) {
    if (handleDbError(error, res, 'get-tool-inventory', req)) return;
    logRouteError(req, 500, 'Get tool inventory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
