import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { BuildingType } from '@prisma/client';
import {
  BUILDING_REQUIREMENTS,
  STORAGE_CAPACITY,
  getMaterialsForLevel,
  getConstructionTimeForLevel,
  MaterialRequirement,
} from '@shared/data/buildings/requirements';
import { getEffectiveTaxRate } from '../services/law-effects';
import { requireDailyAction } from '../middleware/daily-action';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

// ── Zod schemas ──────────────────────────────────────────────

const BUILDING_TYPES = Object.values(BuildingType) as [string, ...string[]];

const requestPermitSchema = z.object({
  townId: z.string().min(1, 'Town ID is required'),
  buildingType: z.enum(BUILDING_TYPES as [BuildingType, ...BuildingType[]], {
    errorMap: () => ({ message: `Invalid building type` }),
  }),
  name: z.string().min(1).max(100, 'Name must be 100 characters or less'),
});

const depositMaterialsSchema = z.object({
  buildingId: z.string().min(1, 'Building ID is required'),
  materials: z.array(z.object({
    itemName: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1, 'At least one material is required'),
});

const buildingIdSchema = z.object({
  buildingId: z.string().min(1, 'Building ID is required'),
});

const storageDepositSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1).default(1),
});

const storageWithdrawSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.number().int().min(1).default(1),
});

const setRentPriceSchema = z.object({
  pricePerUse: z.number().int().min(0),
});

/**
 * Workshop building types (used for rental features).
 */
const WORKSHOP_TYPES: BuildingType[] = [
  'SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB',
  'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP',
  'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY',
];

/**
 * Building types that support storage.
 */
const STORAGE_TYPES: BuildingType[] = [
  'HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'WAREHOUSE',
];

function isWorkshop(type: BuildingType): boolean {
  return WORKSHOP_TYPES.includes(type);
}

function hasStorage(type: BuildingType): boolean {
  return STORAGE_TYPES.includes(type);
}

// Racial construction bonuses
function getRacialConstructionBonus(race: string, buildingType: string): { materialDiscount: number; dayDiscount: number } {
  const stoneBuildings = ['SMITHY', 'SMELTERY', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'MASON_YARD', 'BANK', 'MINE'];
  const woodBuildings = ['HOUSE_SMALL', 'HOUSE_MEDIUM', 'HOUSE_LARGE', 'KITCHEN', 'BREWERY', 'FLETCHER_BENCH', 'LUMBER_MILL', 'STABLE', 'INN', 'FARM', 'RANCH'];
  const workshops = ['SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER', 'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP', 'FLETCHER_BENCH', 'MASON_YARD', 'LUMBER_MILL', 'SCRIBE_STUDY'];

  switch (race) {
    case 'HUMAN':
      return { materialDiscount: 0.10, dayDiscount: 0 }; // -10% materials
    case 'DWARF':
    case 'MOUNTAIN_DWARF':
      return { materialDiscount: 0, dayDiscount: stoneBuildings.includes(buildingType) ? 0.15 : 0 }; // -15% days for stone
    case 'GNOME':
      return { materialDiscount: workshops.includes(buildingType) ? 0.10 : 0, dayDiscount: 0 }; // -10% materials for workshops
    case 'FORGEBORN':
      return { materialDiscount: 0, dayDiscount: 0.20 }; // -20% build days
    case 'FIRBOLG':
      return { materialDiscount: woodBuildings.includes(buildingType) ? 0.25 : 0, dayDiscount: 0 }; // -25% for wood buildings
    default:
      return { materialDiscount: 0, dayDiscount: 0 };
  }
}

// Building condition effect tiers
function getConditionEffects(condition: number): { effectTier: string; effectivenessMultiplier: number } {
  if (condition >= 75) return { effectTier: 'FULL', effectivenessMultiplier: 1.0 };
  if (condition >= 50) return { effectTier: 'DEGRADED', effectivenessMultiplier: 0.90 };
  if (condition >= 25) return { effectTier: 'POOR', effectivenessMultiplier: 0.75 };
  if (condition > 0) return { effectTier: 'CONDEMNED', effectivenessMultiplier: 0.50 };
  return { effectTier: 'NON_FUNCTIONAL', effectivenessMultiplier: 0 };
}

// =========================================================================
// POST /api/buildings/request-permit
// =========================================================================
router.post('/request-permit', authGuard, characterGuard, validate(requestPermitSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, buildingType, name } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Check town exists
    const town = await prisma.town.findUnique({
      where: { id: townId },
      include: { townPolicy: true, buildings: { select: { id: true } } },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    // Check building permits are enabled
    if (town.townPolicy && !town.townPolicy.buildingPermits) {
      return res.status(403).json({ error: 'Building permits are not available in this town' });
    }

    // Check town capacity (population / 100, minimum 20)
    const maxBuildings = Math.max(20, Math.floor(town.population / 100));
    if (town.buildings.length >= maxBuildings) {
      return res.status(400).json({
        error: `Town has reached its building capacity (${maxBuildings})`,
      });
    }

    // Check player doesn't already own this building type in this town
    const existingBuilding = await prisma.building.findFirst({
      where: {
        ownerId: character.id,
        townId,
        type: buildingType as BuildingType,
      },
    });

    if (existingBuilding) {
      return res.status(400).json({
        error: `You already own a ${buildingType} in this town`,
      });
    }

    // Get material requirements for display
    const requirements = BUILDING_REQUIREMENTS[buildingType as BuildingType];

    // Create building at level 0 (under construction) + initial construction record
    const building = await prisma.$transaction(async (tx) => {
      const b = await tx.building.create({
        data: {
          ownerId: character.id,
          townId,
          type: buildingType as BuildingType,
          name,
          level: 0,
          storage: {},
        },
      });

      await tx.buildingConstruction.create({
        data: {
          buildingId: b.id,
          status: 'PENDING',
          materialsUsed: {},
        },
      });

      return b;
    });

    return res.status(201).json({
      building: {
        id: building.id,
        type: building.type,
        name: building.name,
        level: building.level,
        townId: building.townId,
      },
      requirements: {
        materials: requirements.materials,
        constructionTimeHours: requirements.constructionTimeHours,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'request-permit', req)) return;
    logRouteError(req, 500, 'Request permit error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/deposit-materials
// =========================================================================
router.post('/deposit-materials', authGuard, characterGuard, validate(depositMaterialsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId, materials } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Load building + active construction
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        constructions: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const construction = building.constructions[0];
    if (!construction) {
      return res.status(400).json({ error: 'No pending construction for this building' });
    }

    // Determine target level (current level + 1)
    const targetLevel = building.level + 1;
    const baseMaterials = getMaterialsForLevel(building.type, targetLevel);
    // Apply racial material discount
    const racialBonus = getRacialConstructionBonus(character.race, building.type);
    const requiredMaterials = baseMaterials.map((m: MaterialRequirement) => ({
      ...m,
      quantity: Math.ceil(m.quantity * (1 - racialBonus.materialDiscount)),
    }));
    const currentDeposited = (construction.materialsUsed ?? {}) as Record<string, number>;

    // Build player inventory map by item name (only fetch materials being deposited)
    const materialNames = materials.map((m: { itemName: string }) => m.itemName);
    const inventory = await prisma.inventory.findMany({
      where: {
        characterId: character.id,
        item: { template: { name: { in: materialNames } } },
      },
      include: { item: { include: { template: true } } },
    });

    const inventoryByName = new Map<string, Array<{ invId: string; itemId: string; quantity: number }>>();
    for (const inv of inventory) {
      const name = inv.item.template.name;
      const existing = inventoryByName.get(name) ?? [];
      existing.push({ invId: inv.id, itemId: inv.item.id, quantity: inv.quantity });
      inventoryByName.set(name, existing);
    }

    // Validate player has enough of each deposited material
    for (const mat of materials) {
      const entries = inventoryByName.get(mat.itemName) ?? [];
      const available = entries.reduce((sum, e) => sum + e.quantity, 0);
      if (available < mat.quantity) {
        return res.status(400).json({
          error: `Not enough ${mat.itemName}: need ${mat.quantity}, have ${available}`,
        });
      }

      // Check we don't deposit more than required
      const required = requiredMaterials.find((r: MaterialRequirement) => r.itemName === mat.itemName);
      if (!required) {
        return res.status(400).json({
          error: `${mat.itemName} is not required for this building`,
        });
      }
      const alreadyDeposited = currentDeposited[mat.itemName] ?? 0;
      const stillNeeded = required.quantity - alreadyDeposited;
      if (mat.quantity > stillNeeded) {
        return res.status(400).json({
          error: `${mat.itemName}: only ${stillNeeded} more needed (${alreadyDeposited} already deposited)`,
        });
      }
    }

    // Transaction: consume items from inventory, update construction materialsUsed
    const updatedDeposited = { ...currentDeposited };

    await prisma.$transaction(async (tx) => {
      for (const mat of materials) {
        let remaining = mat.quantity;
        const entries = inventoryByName.get(mat.itemName)!;

        for (const entry of entries) {
          if (remaining <= 0) break;

          if (entry.quantity <= remaining) {
            remaining -= entry.quantity;
            await tx.inventory.delete({ where: { id: entry.invId } });
            await tx.item.delete({ where: { id: entry.itemId } });
          } else {
            await tx.inventory.update({
              where: { id: entry.invId },
              data: { quantity: entry.quantity - remaining },
            });
            remaining = 0;
          }
        }

        updatedDeposited[mat.itemName] = (updatedDeposited[mat.itemName] ?? 0) + mat.quantity;
      }

      await tx.buildingConstruction.update({
        where: { id: construction.id },
        data: { materialsUsed: updatedDeposited },
      });
    });

    // Check if all materials are satisfied
    const allSatisfied = requiredMaterials.every(
      (r: MaterialRequirement) => (updatedDeposited[r.itemName] ?? 0) >= r.quantity
    );

    return res.json({
      deposited: materials,
      totalDeposited: updatedDeposited,
      required: requiredMaterials,
      allMaterialsSatisfied: allSatisfied,
      readyToStartConstruction: allSatisfied,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'deposit-materials', req)) return;
    logRouteError(req, 500, 'Deposit materials error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/start-construction
// Daily action candidate: add requireDailyAction('CONSTRUCT') middleware when daily action tracking is enabled
// =========================================================================
router.post('/start-construction', authGuard, characterGuard, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        constructions: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const construction = building.constructions[0];
    if (!construction) {
      return res.status(400).json({ error: 'No pending construction for this building' });
    }

    // Validate all materials deposited (with racial discount)
    const targetLevel = building.level + 1;
    const baseMaterials = getMaterialsForLevel(building.type, targetLevel);
    const racialBonus = getRacialConstructionBonus(character.race, building.type);
    const requiredMaterials = baseMaterials.map((m: MaterialRequirement) => ({
      ...m,
      quantity: Math.ceil(m.quantity * (1 - racialBonus.materialDiscount)),
    }));
    const deposited = (construction.materialsUsed ?? {}) as Record<string, number>;

    const missing: Array<{ itemName: string; needed: number; have: number }> = [];
    for (const req of requiredMaterials) {
      const have = deposited[req.itemName] ?? 0;
      if (have < req.quantity) {
        missing.push({ itemName: req.itemName, needed: req.quantity, have });
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Not all materials have been deposited',
        missing,
      });
    }

    // Start construction timer (reuse racialBonus from material validation above)
    const baseConstructionHours = getConstructionTimeForLevel(building.type, targetLevel);
    const constructionHours = Math.ceil(baseConstructionHours * (1 - racialBonus.dayDiscount));
    const now = new Date();
    const completesAt = new Date(now.getTime() + constructionHours * 60 * 60 * 1000);

    await prisma.buildingConstruction.update({
      where: { id: construction.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: now,
        completesAt,
      },
    });

    return res.json({
      construction: {
        buildingId: building.id,
        buildingName: building.name,
        status: 'IN_PROGRESS',
        targetLevel,
        startedAt: now.toISOString(),
        completesAt: completesAt.toISOString(),
        constructionTimeHours: constructionHours,
        ...(racialBonus.dayDiscount > 0 ? { racialBonus: `${Math.round(racialBonus.dayDiscount * 100)}% time reduction (${character.race})` } : {}),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'start-construction', req)) return;
    logRouteError(req, 500, 'Start construction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/construction-status?buildingId=xxx
// =========================================================================
router.get('/construction-status', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.query;
    if (!buildingId || typeof buildingId !== 'string') {
      return res.status(400).json({ error: 'buildingId query parameter is required' });
    }

    const character = req.character!;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        constructions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const construction = building.constructions[0];
    if (!construction) {
      return res.json({
        building: { id: building.id, name: building.name, level: building.level },
        construction: null,
      });
    }

    const targetLevel = building.level + 1;
    const requiredMaterials = getMaterialsForLevel(building.type, targetLevel);
    const deposited = (construction.materialsUsed ?? {}) as Record<string, number>;

    const materialProgress = requiredMaterials.map((r: MaterialRequirement) => ({
      itemName: r.itemName,
      required: r.quantity,
      deposited: deposited[r.itemName] ?? 0,
    }));

    let timeProgress = null;
    if (construction.status === 'IN_PROGRESS' && construction.completesAt) {
      const now = new Date();
      const totalMs = construction.completesAt.getTime() - construction.startedAt.getTime();
      const elapsedMs = now.getTime() - construction.startedAt.getTime();
      const percent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
      const remainingMs = Math.max(0, construction.completesAt.getTime() - now.getTime());
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      timeProgress = {
        percent,
        remainingMinutes,
        completesAt: construction.completesAt.toISOString(),
        isComplete: now >= construction.completesAt,
      };
    }

    return res.json({
      building: { id: building.id, name: building.name, level: building.level, type: building.type },
      construction: {
        id: construction.id,
        status: construction.status,
        targetLevel,
        materialProgress,
        timeProgress,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'construction-status', req)) return;
    logRouteError(req, 500, 'Construction status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/complete-construction
// =========================================================================
router.post('/complete-construction', authGuard, characterGuard, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        constructions: {
          where: { status: 'IN_PROGRESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const construction = building.constructions[0];
    if (!construction) {
      return res.status(400).json({ error: 'No active construction for this building' });
    }

    // Check timer is done
    const now = new Date();
    if (construction.completesAt && construction.completesAt > now) {
      const remainingMs = construction.completesAt.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return res.status(400).json({
        error: `Construction is not yet complete. ${remainingMinutes} minute(s) remaining.`,
      });
    }

    const newLevel = building.level + 1;

    await prisma.$transaction(async (tx) => {
      await tx.building.update({
        where: { id: building.id },
        data: { level: newLevel },
      });

      await tx.buildingConstruction.update({
        where: { id: construction.id },
        data: { status: 'COMPLETED' },
      });
    });

    return res.json({
      completed: true,
      building: {
        id: building.id,
        type: building.type,
        name: building.name,
        level: newLevel,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'complete-construction', req)) return;
    logRouteError(req, 500, 'Complete construction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/upgrade
// =========================================================================
router.post('/upgrade', authGuard, characterGuard, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        constructions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (building.level < 1) {
      return res.status(400).json({ error: 'Building must be completed before upgrading' });
    }

    if (building.level >= 5) {
      return res.status(400).json({ error: 'Building is already at maximum level (5)' });
    }

    // Check no active construction
    if (building.constructions.length > 0) {
      return res.status(400).json({ error: 'Building already has an active construction or upgrade' });
    }

    const targetLevel = building.level + 1;
    const requiredMaterials = getMaterialsForLevel(building.type, targetLevel);
    const constructionHours = getConstructionTimeForLevel(building.type, targetLevel);

    // Create a new construction entry for the upgrade
    const construction = await prisma.buildingConstruction.create({
      data: {
        buildingId: building.id,
        status: 'PENDING',
        materialsUsed: {},
      },
    });

    return res.status(201).json({
      upgrade: {
        constructionId: construction.id,
        buildingId: building.id,
        buildingName: building.name,
        currentLevel: building.level,
        targetLevel,
        requirements: {
          materials: requiredMaterials,
          constructionTimeHours: constructionHours,
        },
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'upgrade-building', req)) return;
    logRouteError(req, 500, 'Upgrade building error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/mine — all my buildings across towns
// =========================================================================
router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const buildings = await prisma.building.findMany({
      where: { ownerId: character.id },
      include: {
        town: { select: { id: true, name: true } },
        constructions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      buildings: buildings.map(b => ({
        id: b.id,
        type: b.type,
        name: b.name,
        level: b.level,
        town: b.town,
        underConstruction: b.constructions.length > 0,
        constructionStatus: b.constructions[0]?.status ?? null,
        completesAt: b.constructions[0]?.completesAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-my-buildings', req)) return;
    logRouteError(req, 500, 'Get my buildings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/town/:townId — town building directory
// =========================================================================
router.get('/town/:townId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const town = await prisma.town.findUnique({ where: { id: townId } });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const buildings = await prisma.building.findMany({
      where: { townId, level: { gte: 1 } },
      include: {
        owner: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return res.json({
      town: { id: town.id, name: town.name },
      buildings: buildings.map(b => ({
        id: b.id,
        type: b.type,
        name: b.name,
        level: b.level,
        owner: b.owner,
        isWorkshop: isWorkshop(b.type),
        hasStorage: hasStorage(b.type),
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-town-buildings', req)) return;
    logRouteError(req, 500, 'Get town buildings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId — building details
// =========================================================================
router.get('/:buildingId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        owner: { select: { id: true, name: true } },
        town: { select: { id: true, name: true } },
        constructions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const storageCapacity = STORAGE_CAPACITY[building.type] ?? 0;

    // Count stored items
    const storedItems = (storageData.items ?? []) as Array<{ itemId: string; quantity: number }>;
    const usedSlots = storedItems.length;

    // Rental info for workshops
    let rental = null;
    if (isWorkshop(building.type)) {
      rental = {
        pricePerUse: (storageData.rentalPrice as number) ?? 0,
        isAvailable: building.level >= 1,
      };
    }

    // Building condition effects
    const condition = (storageData.condition as number) ?? 100;
    const conditionEffects = getConditionEffects(condition);

    return res.json({
      building: {
        id: building.id,
        type: building.type,
        name: building.name,
        level: building.level,
        owner: building.owner,
        town: building.town,
        condition,
        conditionEffects,
        isWorkshop: isWorkshop(building.type),
        hasStorage: hasStorage(building.type),
        storage: hasStorage(building.type) ? {
          capacity: storageCapacity,
          used: usedSlots,
        } : null,
        rental,
        constructions: building.constructions.map(c => ({
          id: c.id,
          status: c.status,
          startedAt: c.startedAt.toISOString(),
          completesAt: c.completesAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-building-details', req)) return;
    logRouteError(req, 500, 'Get building details error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/storage/deposit
// =========================================================================
router.post('/:buildingId/storage/deposit', authGuard, characterGuard, validate(storageDepositSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { itemId, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (!hasStorage(building.type)) {
      return res.status(400).json({ error: 'This building does not support storage' });
    }

    if (building.level < 1) {
      return res.status(400).json({ error: 'Building must be completed before using storage' });
    }

    const capacity = STORAGE_CAPACITY[building.type] ?? 0;
    const storageData = building.storage as Record<string, unknown>;
    const storedItems = ((storageData.items ?? []) as Array<{ itemId: string; itemName: string; quantity: number }>).slice();

    if (storedItems.length >= capacity) {
      // Check if we're stacking onto an existing item
      const existingSlot = storedItems.find(s => s.itemId === itemId);
      if (!existingSlot) {
        return res.status(400).json({ error: `Storage is full (${capacity} slots)` });
      }
    }

    // Verify player has the item
    const invEntry = await prisma.inventory.findFirst({
      where: { characterId: character.id, itemId },
      include: { item: { include: { template: true } } },
    });

    if (!invEntry || invEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough of this item in inventory: need ${quantity}, have ${invEntry?.quantity ?? 0}`,
      });
    }

    // Transfer item from inventory to storage
    await prisma.$transaction(async (tx) => {
      // Reduce/remove from inventory
      if (invEntry.quantity <= quantity) {
        await tx.inventory.delete({ where: { id: invEntry.id } });
      } else {
        await tx.inventory.update({
          where: { id: invEntry.id },
          data: { quantity: invEntry.quantity - quantity },
        });
      }

      // Add to storage
      const existingSlot = storedItems.find(s => s.itemId === itemId);
      if (existingSlot) {
        existingSlot.quantity += quantity;
      } else {
        storedItems.push({
          itemId,
          itemName: invEntry.item.template.name,
          quantity,
        });
      }

      await tx.building.update({
        where: { id: building.id },
        data: { storage: { ...storageData, items: storedItems } },
      });
    });

    return res.json({
      deposited: { itemId, itemName: invEntry.item.template.name, quantity },
      storageUsed: storedItems.length,
      storageCapacity: capacity,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'storage-deposit', req)) return;
    logRouteError(req, 500, 'Storage deposit error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/storage/withdraw
// =========================================================================
router.post('/:buildingId/storage/withdraw', authGuard, characterGuard, validate(storageWithdrawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { itemId, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (!hasStorage(building.type)) {
      return res.status(400).json({ error: 'This building does not support storage' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const storedItems = ((storageData.items ?? []) as Array<{ itemId: string; itemName: string; quantity: number }>).slice();

    const slot = storedItems.find(s => s.itemId === itemId);
    if (!slot || slot.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough of this item in storage: need ${quantity}, have ${slot?.quantity ?? 0}`,
      });
    }

    // Transfer item from storage to inventory
    await prisma.$transaction(async (tx) => {
      // Add to inventory
      const existingInv = await tx.inventory.findFirst({
        where: { characterId: character.id, itemId },
      });

      if (existingInv) {
        await tx.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: existingInv.quantity + quantity },
        });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId,
            quantity,
          },
        });
      }

      // Remove from storage
      if (slot.quantity <= quantity) {
        const idx = storedItems.indexOf(slot);
        storedItems.splice(idx, 1);
      } else {
        slot.quantity -= quantity;
      }

      await tx.building.update({
        where: { id: building.id },
        data: { storage: { ...storageData, items: storedItems } },
      });
    });

    return res.json({
      withdrawn: { itemId, itemName: slot.itemName, quantity },
      storageUsed: storedItems.length,
      storageCapacity: STORAGE_CAPACITY[building.type] ?? 0,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'storage-withdraw', req)) return;
    logRouteError(req, 500, 'Storage withdraw error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId/storage — list stored items
// =========================================================================
router.get('/:buildingId/storage', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (!hasStorage(building.type)) {
      return res.status(400).json({ error: 'This building does not support storage' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const storedItems = (storageData.items ?? []) as Array<{ itemId: string; itemName: string; quantity: number }>;
    const capacity = STORAGE_CAPACITY[building.type] ?? 0;

    return res.json({
      building: { id: building.id, name: building.name, type: building.type },
      storage: {
        capacity,
        used: storedItems.length,
        items: storedItems,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'list-storage', req)) return;
    logRouteError(req, 500, 'List storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/rent/set-price — set workshop rental price
// =========================================================================
router.post('/:buildingId/rent/set-price', authGuard, characterGuard, validate(setRentPriceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { pricePerUse } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (!isWorkshop(building.type)) {
      return res.status(400).json({ error: 'Only workshops can set rental prices' });
    }

    if (building.level < 1) {
      return res.status(400).json({ error: 'Building must be completed before setting rental prices' });
    }

    const storageData = building.storage as Record<string, unknown>;
    await prisma.building.update({
      where: { id: building.id },
      data: { storage: { ...storageData, rentalPrice: pricePerUse } },
    });

    return res.json({
      rental: {
        buildingId: building.id,
        buildingName: building.name,
        type: building.type,
        pricePerUse,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'set-rent-price', req)) return;
    logRouteError(req, 500, 'Set rent price error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/rent/use — pay to use a workshop
// =========================================================================
router.post('/:buildingId/rent/use', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (!isWorkshop(building.type)) {
      return res.status(400).json({ error: 'Only workshops can be rented' });
    }

    if (building.level < 1) {
      return res.status(400).json({ error: 'Workshop is not yet constructed' });
    }

    // Check building condition — non-functional below 25
    const conditionData = building.storage as Record<string, unknown>;
    const condition = (conditionData.condition as number) ?? 100;
    if (condition < 25) {
      return res.status(400).json({
        error: 'This workshop is in too poor condition to use. The owner must repair it first.',
        condition,
      });
    }

    // Owner uses their own workshop for free
    if (building.ownerId === character.id) {
      return res.json({
        rental: {
          buildingId: building.id,
          paid: 0,
          message: 'You use your own workshop for free',
        },
      });
    }

    const storageData = building.storage as Record<string, unknown>;
    const price = (storageData.rentalPrice as number) ?? 0;

    if (price > 0 && character.gold < price) {
      return res.status(400).json({
        error: `Not enough gold. Rental costs ${price} gold, you have ${character.gold}`,
      });
    }

    if (price > 0) {
      // Calculate town tax cut on rental income
      const townTaxRate = await getEffectiveTaxRate(building.townId);
      const townTaxCut = Math.floor(price * townTaxRate);
      const ownerShare = price - townTaxCut;

      // Transfer gold: renter pays, owner gets share, town gets tax cut
      await prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: character.id },
          data: { gold: { decrement: price } },
        });

        await tx.character.update({
          where: { id: building.ownerId },
          data: { gold: { increment: ownerShare } },
        });

        // Deposit town tax cut into treasury
        if (townTaxCut > 0) {
          await tx.townTreasury.updateMany({
            where: { townId: building.townId },
            data: { balance: { increment: townTaxCut } },
          });
        }

        // Log the rental transaction in the building's storage
        const storageData = building.storage as Record<string, unknown>;
        const rentalLog = ((storageData.rentalLog ?? []) as Array<Record<string, unknown>>);
        rentalLog.push({
          renterId: character.id,
          renterName: character.name,
          amount: price,
          ownerShare,
          townTaxCut,
          timestamp: new Date().toISOString(),
        });
        // Keep only last 100 entries
        const trimmedLog = rentalLog.slice(-100);

        await tx.building.update({
          where: { id: building.id },
          data: { storage: { ...storageData, rentalLog: trimmedLog as any } },
        });
      });

      return res.json({
        rental: {
          buildingId: building.id,
          workshopType: building.type,
          workshopLevel: building.level,
          owner: building.owner,
          paid: price,
          ownerReceived: ownerShare,
          townTaxCut,
        },
      });
    }

    return res.json({
      rental: {
        buildingId: building.id,
        workshopType: building.type,
        workshopLevel: building.level,
        owner: building.owner,
        paid: 0,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'use-rental', req)) return;
    logRouteError(req, 500, 'Use rental error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId/rent — rental info
// =========================================================================
router.get('/:buildingId/rent', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (!isWorkshop(building.type)) {
      return res.status(400).json({ error: 'Only workshops have rental info' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const pricePerUse = (storageData.rentalPrice as number) ?? 0;

    return res.json({
      rental: {
        buildingId: building.id,
        buildingName: building.name,
        type: building.type,
        level: building.level,
        owner: building.owner,
        pricePerUse,
        isAvailable: building.level >= 1,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-rental-info', req)) return;
    logRouteError(req, 500, 'Get rental info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/repair — repair building condition
// =========================================================================
router.post('/:buildingId/repair', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (building.level < 1) {
      return res.status(400).json({ error: 'Building must be completed before repairing' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const currentCondition = (storageData.condition as number) ?? 100;

    if (currentCondition >= 100) {
      return res.status(400).json({ error: 'Building is already at full condition' });
    }

    // Repair cost: 10% of original construction materials (gold equivalent)
    // Simplified: base gold cost per building type
    const repairCostPerPoint = Math.max(1, Math.floor(building.level * 2));
    const pointsToRepair = 100 - currentCondition;
    const totalRepairCost = repairCostPerPoint * pointsToRepair;

    if (character.gold < totalRepairCost) {
      return res.status(400).json({
        error: `Not enough gold for full repair. Need ${totalRepairCost}g, you have ${character.gold}g`,
        repairCost: totalRepairCost,
        currentCondition,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: totalRepairCost } },
      });

      await tx.building.update({
        where: { id: building.id },
        data: {
          storage: { ...storageData, condition: 100 },
        },
      });
    });

    return res.json({
      repair: {
        buildingId: building.id,
        buildingName: building.name,
        previousCondition: currentCondition,
        newCondition: 100,
        goldSpent: totalRepairCost,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'repair-building', req)) return;
    logRouteError(req, 500, 'Repair building error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId/rent/income — rental income history
// =========================================================================
router.get('/:buildingId/rent/income', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    const building = await prisma.building.findUnique({ where: { id: buildingId } });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    if (!isWorkshop(building.type)) {
      return res.status(400).json({ error: 'Only workshops have rental income' });
    }

    const storageData = building.storage as Record<string, unknown>;
    const rentalLog = ((storageData.rentalLog ?? []) as Array<{
      renterId: string;
      renterName: string;
      amount: number;
      ownerShare: number;
      townTaxCut: number;
      timestamp: string;
    }>);

    const totalIncome = rentalLog.reduce((sum, entry) => sum + entry.ownerShare, 0);

    return res.json({
      buildingId: building.id,
      buildingName: building.name,
      totalIncome,
      recentRentals: rentalLog.slice(-50), // Last 50 entries
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-rental-income', req)) return;
    logRouteError(req, 500, 'Get rental income error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/town/:townId/economics — mayor economic reports
// =========================================================================
router.get('/town/:townId/economics', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;
    const character = req.character!;

    // Check if user is the mayor
    const town = await prisma.town.findUnique({
      where: { id: townId },
      include: {
        treasury: true,
        townPolicy: true,
        buildings: {
          where: { level: { gte: 1 } },
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can view economic reports' });
    }

    const buildings = town.buildings;
    const totalBuildings = buildings.length;
    const maxBuildings = Math.max(20, Math.floor(town.population / 100));
    const occupancyRate = totalBuildings / maxBuildings;

    // Count buildings by type
    const buildingsByType: Record<string, number> = {};
    for (const b of buildings) {
      buildingsByType[b.type] = (buildingsByType[b.type] ?? 0) + 1;
    }

    // Count unique owners
    const uniqueOwners = new Set(buildings.map(b => b.ownerId)).size;

    // Count delinquent buildings
    const delinquentBuildings = buildings.filter(b => {
      const storage = b.storage as Record<string, unknown>;
      return !!storage.taxDelinquentSince;
    });

    // Count low-condition buildings
    const lowConditionBuildings = buildings.filter(b => {
      const storage = b.storage as Record<string, unknown>;
      const condition = (storage.condition as number) ?? 100;
      return condition < 50;
    });

    // Pending constructions
    const pendingConstructions = await prisma.buildingConstruction.count({
      where: {
        building: { townId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    return res.json({
      economics: {
        town: { id: town.id, name: town.name },
        treasury: {
          balance: town.treasury?.balance ?? 0,
          taxRate: town.townPolicy?.taxRate ?? 0.10,
        },
        buildings: {
          total: totalBuildings,
          maxCapacity: maxBuildings,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          byType: buildingsByType,
          uniqueOwners,
        },
        issues: {
          delinquentCount: delinquentBuildings.length,
          lowConditionCount: lowConditionBuildings.length,
          pendingConstructions,
        },
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'get-town-economics', req)) return;
    logRouteError(req, 500, 'Get town economics error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
