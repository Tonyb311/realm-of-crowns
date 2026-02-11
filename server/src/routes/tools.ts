import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ProfessionType } from '@prisma/client';
import { TOOL_TYPES, ToolTypeDefinition } from '@shared/data/tools';

const router = Router();

// Valid gathering profession types that can have tools
const TOOL_PROFESSION_TYPES = TOOL_TYPES.map((t: ToolTypeDefinition) => t.professionType);

const equipSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  professionType: z.enum(TOOL_PROFESSION_TYPES as [string, ...string[]], {
    errorMap: () => ({
      message: `Invalid profession type. Must be one of: ${TOOL_PROFESSION_TYPES.join(', ')}`,
    }),
  }),
});

const unequipSchema = z.object({
  professionType: z.enum(TOOL_PROFESSION_TYPES as [string, ...string[]], {
    errorMap: () => ({
      message: `Invalid profession type. Must be one of: ${TOOL_PROFESSION_TYPES.join(', ')}`,
    }),
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
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { template: true },
    });

    if (!item || item.ownerId !== character.id) {
      return res.status(404).json({ error: 'Item not found in your inventory' });
    }

    if (item.template.type !== 'TOOL') {
      return res.status(400).json({ error: 'Item is not a tool' });
    }

    // Verify tool matches the profession
    const toolStats = item.template.stats as Record<string, unknown>;
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

    // Use MAIN_HAND slot — each profession maps to a separate "equipped tool" record
    // We store profession type in a custom approach: one equipment row per profession tool
    // by using a convention: slot MAIN_HAND for the currently active gathering tool.
    // To support multiple profession tools simultaneously, we use a JSON approach:
    // store equipped tools as character equipment with metadata.

    // For simplicity, use the existing CharacterEquipment with MAIN_HAND slot.
    // Only one tool can be in MAIN_HAND at a time.
    // We track which profession it's for via the item template's stats.professionType.

    // Unequip any existing MAIN_HAND tool first
    const existingEquip = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: {
          characterId: character.id,
          slot: 'MAIN_HAND',
        },
      },
    });

    if (existingEquip) {
      await prisma.characterEquipment.delete({
        where: { id: existingEquip.id },
      });
    }

    // Equip the new tool
    const equipment = await prisma.characterEquipment.create({
      data: {
        characterId: character.id,
        slot: 'MAIN_HAND',
        itemId: item.id,
      },
    });

    return res.json({
      equipped: {
        id: equipment.id,
        slot: 'MAIN_HAND',
        item: {
          id: item.id,
          name: item.template.name,
          currentDurability: item.currentDurability,
          maxDurability: item.template.durability,
          stats: toolStats,
        },
        professionType: profEnum,
      },
    });
  } catch (error) {
    console.error('Equip tool error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// POST /api/tools/unequip — Unequip the current tool
// -------------------------------------------------------------------------
router.post('/unequip', authGuard, characterGuard, validate(unequipSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const existingEquip = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: {
          characterId: character.id,
          slot: 'MAIN_HAND',
        },
      },
      include: {
        item: { include: { template: true } },
      },
    });

    if (!existingEquip) {
      return res.status(400).json({ error: 'No tool equipped' });
    }

    // Verify this is actually a tool for the requested profession
    const toolStats = existingEquip.item.template.stats as Record<string, unknown>;
    const { professionType } = req.body;
    if (toolStats.professionType !== professionType) {
      return res.status(400).json({ error: `No ${professionType} tool is currently equipped` });
    }

    await prisma.characterEquipment.delete({
      where: { id: existingEquip.id },
    });

    return res.json({
      unequipped: {
        itemId: existingEquip.itemId,
        name: existingEquip.item.template.name,
        professionType,
      },
    });
  } catch (error) {
    console.error('Unequip tool error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/tools/equipped — Get currently equipped tools
// -------------------------------------------------------------------------
router.get('/equipped', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const equipped = await prisma.characterEquipment.findUnique({
      where: {
        characterId_slot: {
          characterId: character.id,
          slot: 'MAIN_HAND',
        },
      },
      include: {
        item: { include: { template: true } },
      },
    });

    if (!equipped || equipped.item.template.type !== 'TOOL') {
      return res.json({ equipped: null });
    }

    const toolStats = equipped.item.template.stats as Record<string, unknown>;

    return res.json({
      equipped: {
        id: equipped.id,
        slot: 'MAIN_HAND',
        item: {
          id: equipped.item.id,
          name: equipped.item.template.name,
          currentDurability: equipped.item.currentDurability,
          maxDurability: equipped.item.template.durability,
          stats: toolStats,
        },
        professionType: toolStats.professionType,
      },
    });
  } catch (error) {
    console.error('Get equipped tools error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------------------------
// GET /api/tools/inventory — List all tools in inventory
// -------------------------------------------------------------------------
router.get('/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const toolItems = await prisma.inventory.findMany({
      where: {
        characterId: character.id,
        item: { template: { type: 'TOOL' } },
      },
      include: {
        item: { include: { template: true } },
      },
    });

    const tools = toolItems.map((inv) => {
      const stats = inv.item.template.stats as Record<string, unknown>;
      return {
        inventoryId: inv.id,
        itemId: inv.item.id,
        name: inv.item.template.name,
        currentDurability: inv.item.currentDurability,
        maxDurability: inv.item.template.durability,
        stats,
      };
    });

    return res.json({ tools });
  } catch (error) {
    console.error('Get tool inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
