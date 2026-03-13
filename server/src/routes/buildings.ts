import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, gte, inArray, asc, desc, count, sql } from 'drizzle-orm';
import { buildings, buildingConstructions, towns, townTreasuries, townPolicies, characters, inventories, items, itemTemplates, playerProfessions } from '@database/tables';
import { buildingType as buildingTypeEnum } from '@database/enums';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import {
  WORKSHOP_TYPES,
  STORAGE_TYPES,
  STONE_BUILDINGS,
  WOOD_BUILDINGS,
  CONDITION_TIERS,
} from '@shared/data/building-config';
import {
  BUILDING_REQUIREMENTS,
  STORAGE_CAPACITY,
  getMaterialsForLevel,
  getConstructionTimeForLevel,
  MaterialRequirement,
} from '@shared/data/buildings/requirements';
import { buildingTypeLabel } from '@shared/data/building-labels';
import { getEffectiveTaxRate } from '../services/law-effects';
import { getTaxReduction } from '../services/religion-buffs';
import { requireDailyAction } from '../middleware/daily-action';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';

type BuildingType = typeof buildingTypeEnum.enumValues[number];

const router = Router();

// ── Zod schemas ──────────────────────────────────────────────

const BUILDING_TYPES = buildingTypeEnum.enumValues;

const requestPermitSchema = z.object({
  townId: z.string().min(1, 'Town ID is required'),
  buildingType: z.enum(BUILDING_TYPES, {
    error: 'Invalid building type',
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

// Building constants imported from @shared/data/building-config

function isWorkshop(type: BuildingType): boolean {
  return WORKSHOP_TYPES.includes(type);
}

function hasStorage(type: BuildingType): boolean {
  return STORAGE_TYPES.includes(type);
}

// Racial construction bonuses — building categories from @shared/data/building-config
function getRacialConstructionBonus(race: string, buildingType: string): { materialDiscount: number; dayDiscount: number } {
  switch (race) {
    case 'HUMAN':
      return { materialDiscount: 0.10, dayDiscount: 0 }; // -10% materials
    case 'DWARF':
    case 'MOUNTAIN_DWARF':
      return { materialDiscount: 0, dayDiscount: STONE_BUILDINGS.includes(buildingType) ? 0.15 : 0 }; // -15% days for stone
    case 'GNOME':
      return { materialDiscount: WORKSHOP_TYPES.includes(buildingType as BuildingType) ? 0.10 : 0, dayDiscount: 0 }; // -10% materials for workshops
    case 'FORGEBORN':
      return { materialDiscount: 0, dayDiscount: 0.20 }; // -20% build days
    case 'FIRBOLG':
      return { materialDiscount: WOOD_BUILDINGS.includes(buildingType) ? 0.25 : 0, dayDiscount: 0 }; // -25% for wood buildings
    default:
      return { materialDiscount: 0, dayDiscount: 0 };
  }
}

// Building condition effect tiers — thresholds from @shared/data/building-config
function getConditionEffects(condition: number): { effectTier: string; effectivenessMultiplier: number } {
  for (const tier of CONDITION_TIERS) {
    if (condition >= tier.minCondition) return { effectTier: tier.effectTier, effectivenessMultiplier: tier.effectivenessMultiplier };
  }
  return { effectTier: 'NON_FUNCTIONAL', effectivenessMultiplier: 0 };
}

// =========================================================================
// POST /api/buildings/request-permit
// =========================================================================
router.post('/request-permit', authGuard, characterGuard, requireTown, validate(requestPermitSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, buildingType, name } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Residency check — can only build in your home town
    if (character.homeTownId !== townId) {
      return res.status(400).json({ error: 'You must be a resident of this town to build here.' });
    }

    // Check town exists
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: { townPolicies: true, buildings: { columns: { id: true } } },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    // Check building permits are enabled
    const policy = town.townPolicies?.[0];
    if (policy && !policy.buildingPermits) {
      return res.status(403).json({ error: 'Building permits are not available in this town' });
    }

    // Check town capacity (population / 100, minimum 20)
    const maxBuildings = Math.max(20, Math.floor(town.population / 100));
    if (town.buildings.length >= maxBuildings) {
      return res.status(400).json({
        error: `Town has reached its building capacity (${maxBuildings})`,
      });
    }

    // Check building type is available in this town
    const availableBuildings: string[] = (town.features as any)?.availableBuildings ?? [];
    if (availableBuildings.length > 0 && !availableBuildings.includes(buildingType)) {
      return res.status(400).json({
        error: `${buildingTypeLabel(buildingType)} cannot be built in ${town.name}. Available: ${availableBuildings.map((b: string) => buildingTypeLabel(b)).join(', ')}`,
      });
    }

    // Check player doesn't already own this building type in this town
    const existingBuilding = await db.query.buildings.findFirst({
      where: and(
        eq(buildings.ownerId, character.id),
        eq(buildings.townId, townId),
        eq(buildings.type, buildingType as BuildingType),
      ),
    });

    if (existingBuilding) {
      return res.status(400).json({
        error: `You already own a ${buildingType} in this town`,
      });
    }

    // INN requires active Innkeeper profession
    if (buildingType === 'INN') {
      const innkeeperProf = await db.query.playerProfessions.findFirst({
        where: and(
          eq(playerProfessions.characterId, character.id),
          eq(playerProfessions.professionType, 'INNKEEPER'),
          eq(playerProfessions.isActive, true),
        ),
      });
      if (!innkeeperProf) {
        return res.status(400).json({
          error: 'Only Innkeepers can build and operate an Inn.',
        });
      }
    }

    // Get material requirements for display
    const requirements = BUILDING_REQUIREMENTS[buildingType as BuildingType];

    // Create building at level 0 (under construction) + initial construction record
    const building = await db.transaction(async (tx) => {
      const [b] = await tx.insert(buildings).values({
        id: crypto.randomUUID(),
        ownerId: character.id,
        townId,
        type: buildingType as BuildingType,
        name,
        level: 0,
        storage: {},
      }).returning();

      await tx.insert(buildingConstructions).values({
        id: crypto.randomUUID(),
        buildingId: b.id,
        status: 'PENDING',
        materialsUsed: {},
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
    if (handleDbError(error, res, 'request-permit', req)) return;
    logRouteError(req, 500, 'Request permit error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/deposit-materials
// =========================================================================
router.post('/deposit-materials', authGuard, characterGuard, requireTown, validate(depositMaterialsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId, materials } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Load building + active construction
    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: {
        buildingConstructions: true,
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    // Filter to PENDING constructions, sorted desc by createdAt, take first
    const pendingConstructions = (building.buildingConstructions || [])
      .filter((c: any) => c.status === 'PENDING')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const construction = pendingConstructions[0];
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

    // Build player inventory map by item name
    const materialNames = materials.map((m: { itemName: string }) => m.itemName);
    const allInventory = await db.query.inventories.findMany({
      where: eq(inventories.characterId, character.id),
      with: { item: { with: { itemTemplate: true } } },
    });
    // Filter to matching template names
    const inventory = allInventory.filter(inv => materialNames.includes(inv.item.itemTemplate.name));

    const inventoryByName = new Map<string, Array<{ invId: string; itemId: string; quantity: number }>>();
    for (const inv of inventory) {
      const name = inv.item.itemTemplate.name;
      const existing = inventoryByName.get(name) ?? [];
      existing.push({ invId: inv.id, itemId: inv.item.id, quantity: inv.quantity });
      inventoryByName.set(name, existing);
    }

    // Validate player has enough of each deposited material
    for (const mat of materials) {
      const entries = inventoryByName.get(mat.itemName) ?? [];
      const available = entries.reduce((sum: number, e: any) => sum + e.quantity, 0);
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

    await db.transaction(async (tx) => {
      for (const mat of materials) {
        let remaining = mat.quantity;
        const entries = inventoryByName.get(mat.itemName)!;

        for (const entry of entries) {
          if (remaining <= 0) break;

          if (entry.quantity <= remaining) {
            remaining -= entry.quantity;
            await tx.delete(inventories).where(eq(inventories.id, entry.invId));
            await tx.delete(items).where(eq(items.id, entry.itemId));
          } else {
            await tx.update(inventories).set({ quantity: entry.quantity - remaining }).where(eq(inventories.id, entry.invId));
            remaining = 0;
          }
        }

        updatedDeposited[mat.itemName] = (updatedDeposited[mat.itemName] ?? 0) + mat.quantity;
      }

      await tx.update(buildingConstructions).set({ materialsUsed: updatedDeposited }).where(eq(buildingConstructions.id, construction.id));
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
    if (handleDbError(error, res, 'deposit-materials', req)) return;
    logRouteError(req, 500, 'Deposit materials error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/start-construction
// =========================================================================
router.post('/start-construction', authGuard, characterGuard, requireTown, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { buildingConstructions: true },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const pendingConstructions = (building.buildingConstructions || [])
      .filter((c: any) => c.status === 'PENDING')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const construction = pendingConstructions[0];
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

    await db.update(buildingConstructions).set({
      status: 'IN_PROGRESS',
      startedAt: now.toISOString(),
      completesAt: completesAt.toISOString(),
    }).where(eq(buildingConstructions.id, construction.id));

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
    if (handleDbError(error, res, 'start-construction', req)) return;
    logRouteError(req, 500, 'Start construction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/construction-status?buildingId=xxx
// =========================================================================
router.get('/construction-status', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.query;
    if (!buildingId || typeof buildingId !== 'string') {
      return res.status(400).json({ error: 'buildingId query parameter is required' });
    }

    const character = req.character!;

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { buildingConstructions: true },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Filter to PENDING or IN_PROGRESS constructions
    const activeConstructions = (building.buildingConstructions || [])
      .filter((c: any) => c.status === 'PENDING' || c.status === 'IN_PROGRESS')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const construction = activeConstructions[0];
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
      const totalMs = new Date(construction.completesAt).getTime() - new Date(construction.startedAt!).getTime();
      const elapsedMs = now.getTime() - new Date(construction.startedAt!).getTime();
      const percent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
      const remainingMs = Math.max(0, new Date(construction.completesAt).getTime() - now.getTime());
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      timeProgress = {
        percent,
        remainingMinutes,
        completesAt: construction.completesAt,
        isComplete: now >= new Date(construction.completesAt),
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
    if (handleDbError(error, res, 'construction-status', req)) return;
    logRouteError(req, 500, 'Construction status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/complete-construction
// =========================================================================
router.post('/complete-construction', authGuard, characterGuard, requireTown, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { buildingConstructions: true },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this building' });
    }

    const inProgressConstructions = (building.buildingConstructions || [])
      .filter((c: any) => c.status === 'IN_PROGRESS')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const construction = inProgressConstructions[0];
    if (!construction) {
      return res.status(400).json({ error: 'No active construction for this building' });
    }

    // Check timer is done
    const now = new Date();
    if (construction.completesAt && new Date(construction.completesAt) > now) {
      const remainingMs = new Date(construction.completesAt).getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return res.status(400).json({
        error: `Construction is not yet complete. ${remainingMinutes} minute(s) remaining.`,
      });
    }

    const newLevel = building.level + 1;

    await db.transaction(async (tx) => {
      await tx.update(buildings).set({ level: newLevel }).where(eq(buildings.id, building.id));
      await tx.update(buildingConstructions).set({ status: 'COMPLETED' }).where(eq(buildingConstructions.id, construction.id));
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
    if (handleDbError(error, res, 'complete-construction', req)) return;
    logRouteError(req, 500, 'Complete construction error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/upgrade
// =========================================================================
router.post('/upgrade', authGuard, characterGuard, requireTown, validate(buildingIdSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { buildingConstructions: true },
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
    const activeConstructions = (building.buildingConstructions || [])
      .filter((c: any) => c.status === 'PENDING' || c.status === 'IN_PROGRESS');
    if (activeConstructions.length > 0) {
      return res.status(400).json({ error: 'Building already has an active construction or upgrade' });
    }

    const targetLevel = building.level + 1;
    const requiredMaterials = getMaterialsForLevel(building.type, targetLevel);
    const constructionHours = getConstructionTimeForLevel(building.type, targetLevel);

    // Create a new construction entry for the upgrade
    const [construction] = await db.insert(buildingConstructions).values({
      id: crypto.randomUUID(),
      buildingId: building.id,
      status: 'PENDING',
      materialsUsed: {},
    }).returning();

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
    if (handleDbError(error, res, 'upgrade-building', req)) return;
    logRouteError(req, 500, 'Upgrade building error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/mine — all my buildings across towns
// =========================================================================
router.get('/mine', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const myBuildings = await db.query.buildings.findMany({
      where: eq(buildings.ownerId, character.id),
      with: {
        town: { columns: { id: true, name: true } },
        buildingConstructions: true,
      },
      orderBy: (b, { desc: d }) => [d(b.createdAt)],
    });

    return res.json({
      buildings: myBuildings.map(b => {
        // Filter constructions to PENDING or IN_PROGRESS
        const activeConstruction = (b.buildingConstructions || [])
          .filter((c: any) => c.status === 'PENDING' || c.status === 'IN_PROGRESS')[0];
        return {
          id: b.id,
          type: b.type,
          name: b.name,
          level: b.level,
          town: b.town,
          underConstruction: !!activeConstruction,
          constructionStatus: activeConstruction?.status ?? null,
          completesAt: activeConstruction?.completesAt ?? null,
        };
      }),
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-my-buildings', req)) return;
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

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const townBuildings = await db.query.buildings.findMany({
      where: and(eq(buildings.townId, townId), gte(buildings.level, 1)),
      with: {
        character: { columns: { id: true, name: true } },
      },
      orderBy: (b, { asc: a }) => [a(b.type), a(b.name)],
    });

    return res.json({
      town: { id: town.id, name: town.name },
      buildings: townBuildings.map(b => ({
        id: b.id,
        type: b.type,
        name: b.name,
        level: b.level,
        owner: b.character,
        isWorkshop: isWorkshop(b.type),
        hasStorage: hasStorage(b.type),
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-town-buildings', req)) return;
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

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: {
        character: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
        buildingConstructions: true,
      },
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Sort constructions desc by createdAt and take first 3
    const recentConstructions = (building.buildingConstructions || [])
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

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
        owner: building.character,
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
        buildingConstructions: recentConstructions.map((c: any) => ({
          id: c.id,
          status: c.status,
          startedAt: c.startedAt.toISOString(),
          completesAt: c.completesAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-building-details', req)) return;
    logRouteError(req, 500, 'Get building details error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/storage/deposit
// =========================================================================
router.post('/:buildingId/storage/deposit', authGuard, characterGuard, requireTown, validate(storageDepositSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { itemId, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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
      const existingSlot = storedItems.find(s => s.itemId === itemId);
      if (!existingSlot) {
        return res.status(400).json({ error: `Storage is full (${capacity} slots)` });
      }
    }

    // Verify player has the item
    const invEntry = await db.query.inventories.findFirst({
      where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, itemId)),
      with: { item: { with: { itemTemplate: true } } },
    });

    if (!invEntry || invEntry.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough of this item in inventory: need ${quantity}, have ${invEntry?.quantity ?? 0}`,
      });
    }

    // Transfer item from inventory to storage
    await db.transaction(async (tx) => {
      // Reduce/remove from inventory
      if (invEntry.quantity <= quantity) {
        await tx.delete(inventories).where(eq(inventories.id, invEntry.id));
      } else {
        await tx.update(inventories).set({ quantity: invEntry.quantity - quantity }).where(eq(inventories.id, invEntry.id));
      }

      // Add to storage
      const existingSlot = storedItems.find(s => s.itemId === itemId);
      if (existingSlot) {
        existingSlot.quantity += quantity;
      } else {
        storedItems.push({
          itemId,
          itemName: invEntry.item.itemTemplate.name,
          quantity,
        });
      }

      await tx.update(buildings).set({ storage: { ...storageData, items: storedItems } }).where(eq(buildings.id, building.id));
    });

    return res.json({
      deposited: { itemId, itemName: invEntry.item.itemTemplate.name, quantity },
      storageUsed: storedItems.length,
      storageCapacity: capacity,
    });
  } catch (error) {
    if (handleDbError(error, res, 'storage-deposit', req)) return;
    logRouteError(req, 500, 'Storage deposit error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/storage/withdraw
// =========================================================================
router.post('/:buildingId/storage/withdraw', authGuard, characterGuard, requireTown, validate(storageWithdrawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { itemId, quantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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
    await db.transaction(async (tx) => {
      // Add to inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, itemId)),
      });

      if (existingInv) {
        await tx.update(inventories).set({ quantity: existingInv.quantity + quantity }).where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId,
          quantity,
        });
      }

      // Remove from storage
      if (slot.quantity <= quantity) {
        const idx = storedItems.indexOf(slot);
        storedItems.splice(idx, 1);
      } else {
        slot.quantity -= quantity;
      }

      await tx.update(buildings).set({ storage: { ...storageData, items: storedItems } }).where(eq(buildings.id, building.id));
    });

    return res.json({
      withdrawn: { itemId, itemName: slot.itemName, quantity },
      storageUsed: storedItems.length,
      storageCapacity: STORAGE_CAPACITY[building.type] ?? 0,
    });
  } catch (error) {
    if (handleDbError(error, res, 'storage-withdraw', req)) return;
    logRouteError(req, 500, 'Storage withdraw error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId/storage — list stored items
// =========================================================================
router.get('/:buildingId/storage', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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
    if (handleDbError(error, res, 'list-storage', req)) return;
    logRouteError(req, 500, 'List storage error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/rent/set-price — set workshop rental price
// =========================================================================
router.post('/:buildingId/rent/set-price', authGuard, characterGuard, requireTown, validate(setRentPriceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { pricePerUse } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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
    await db.update(buildings).set({ storage: { ...storageData, rentalPrice: pricePerUse } }).where(eq(buildings.id, building.id));

    return res.json({
      rental: {
        buildingId: building.id,
        buildingName: building.name,
        type: building.type,
        pricePerUse,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'set-rent-price', req)) return;
    logRouteError(req, 500, 'Set rent price error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/rent/use — pay to use a workshop
// =========================================================================
router.post('/:buildingId/rent/use', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { character: { columns: { id: true, name: true } } },
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
      let townTaxCut = Math.floor(price * townTaxRate);
      // Veradine tax reduction for building owner
      const ownerTaxReduction = await getTaxReduction(building.ownerId, building.townId);
      if (ownerTaxReduction > 0) {
        townTaxCut = Math.floor(townTaxCut * (1 - ownerTaxReduction));
      }
      const ownerShare = price - townTaxCut;

      // Transfer gold: renter pays, owner gets share, town gets tax cut
      await db.transaction(async (tx) => {
        await tx.update(characters).set({
          gold: sql`${characters.gold} - ${price}`,
        }).where(eq(characters.id, character.id));

        await tx.update(characters).set({
          gold: sql`${characters.gold} + ${ownerShare}`,
        }).where(eq(characters.id, building.ownerId));

        // Deposit town tax cut into treasury
        if (townTaxCut > 0) {
          await tx.update(townTreasuries).set({
            balance: sql`${townTreasuries.balance} + ${townTaxCut}`,
          }).where(eq(townTreasuries.townId, building.townId));
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

        await tx.update(buildings).set({ storage: { ...storageData, rentalLog: trimmedLog as any } }).where(eq(buildings.id, building.id));
      });

      return res.json({
        rental: {
          buildingId: building.id,
          workshopType: building.type,
          workshopLevel: building.level,
          owner: building.character,
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
        owner: building.character,
        paid: 0,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'use-rental', req)) return;
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

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, buildingId),
      with: { character: { columns: { id: true, name: true } } },
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
        owner: building.character,
        pricePerUse,
        isAvailable: building.level >= 1,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-rental-info', req)) return;
    logRouteError(req, 500, 'Get rental info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/buildings/:buildingId/repair — repair building condition
// =========================================================================
router.post('/:buildingId/repair', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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

    await db.transaction(async (tx) => {
      await tx.update(characters).set({
        gold: sql`${characters.gold} - ${totalRepairCost}`,
      }).where(eq(characters.id, character.id));

      await tx.update(buildings).set({
        storage: { ...storageData, condition: 100 },
      }).where(eq(buildings.id, building.id));
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
    if (handleDbError(error, res, 'repair-building', req)) return;
    logRouteError(req, 500, 'Repair building error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/:buildingId/rent/income — rental income history
// =========================================================================
router.get('/:buildingId/rent/income', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { buildingId } = req.params;
    const character = req.character!;

    const building = await db.query.buildings.findFirst({ where: eq(buildings.id, buildingId) });

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
    if (handleDbError(error, res, 'get-rental-income', req)) return;
    logRouteError(req, 500, 'Get rental income error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/buildings/town/:townId/economics — mayor economic reports
// =========================================================================
router.get('/town/:townId/economics', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;
    const character = req.character!;

    // Check if user is the mayor
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: {
        townTreasuries: true,
        townPolicies: true,
        buildings: {
          with: { character: { columns: { id: true, name: true } } },
        },
      },
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can view economic reports' });
    }

    // Filter to completed buildings (level >= 1) at application level
    const completedBuildings = (town.buildings || []).filter((b: any) => b.level >= 1);
    const totalBuildings = completedBuildings.length;
    const maxBuildings = Math.max(20, Math.floor(town.population / 100));
    const occupancyRate = totalBuildings / maxBuildings;

    // Count buildings by type
    const buildingsByType: Record<string, number> = {};
    for (const b of completedBuildings) {
      buildingsByType[b.type] = (buildingsByType[b.type] ?? 0) + 1;
    }

    // Count unique owners
    const uniqueOwners = new Set(completedBuildings.map((b: any) => b.ownerId)).size;

    // Count delinquent buildings
    const delinquentBuildings = completedBuildings.filter((b: any) => {
      const storage = b.storage as Record<string, unknown>;
      return !!storage.taxDelinquentSince;
    });

    // Count low-condition buildings
    const lowConditionBuildings = completedBuildings.filter((b: any) => {
      const storage = b.storage as Record<string, unknown>;
      const condition = (storage.condition as number) ?? 100;
      return condition < 50;
    });

    // Pending constructions — count via join
    const pendingConstructionsList = await db.query.buildingConstructions.findMany({
      where: and(
        inArray(buildingConstructions.status, ['PENDING', 'IN_PROGRESS']),
      ),
      with: { building: { columns: { townId: true } } },
    });
    const pendingConstructions = pendingConstructionsList.filter((c: any) => c.building?.townId === townId).length;

    return res.json({
      economics: {
        town: { id: town.id, name: town.name },
        treasury: {
          balance: (town.townTreasuries as any)?.[0]?.balance ?? 0,
          taxRate: (town.townPolicies as any)?.[0]?.taxRate ?? 0.10,
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
    if (handleDbError(error, res, 'get-town-economics', req)) return;
    logRouteError(req, 500, 'Get town economics error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
