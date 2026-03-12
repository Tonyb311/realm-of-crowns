// ---------------------------------------------------------------------------
// Asset Routes — Private Asset Ownership System
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, count, sql } from 'drizzle-orm';
import { ownedAssets, characters, playerProfessions, dailyActions, jobs, itemTemplates, houses, houseStorage } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';
import { getTodayTickDate, getNextTickTime, getGameDay } from '../lib/game-day';
import {
  ASSET_TIERS,
  MAX_SLOTS_PER_TIER,
  WITHER_TICKS,
  PROFESSION_ASSET_TYPES,
  getAssetPurchaseCost,
  getProfessionForAssetType,
  AssetTypeDefinition,
} from '@shared/data/assets';

const router = Router();

// --- Schemas ---

const buySchema = z.object({
  assetTypeId: z.string().min(1, 'assetTypeId is required'),
  tier: z.number().int().min(1).max(3),
});

// postJobSchema removed — job posting moved to /jobs router

// ============================================================
// GET /api/assets/mine — List character's owned assets
// ============================================================

router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const townId = req.query.townId as string | undefined;

    const assets = await db.query.ownedAssets.findMany({
      where: townId
        ? and(eq(ownedAssets.ownerId, character.id), eq(ownedAssets.townId, townId))
        : eq(ownedAssets.ownerId, character.id),
      with: {
        town: { columns: { id: true, name: true } },
        jobs: true,
      },
      orderBy: (oa, { asc }) => [asc(oa.tier), asc(oa.slotNumber)],
    });

    // Filter jobs to only OPEN ones (application-level since Drizzle doesn't support nested where on with)
    const assetsWithFilteredJobs = assets.map(a => ({
      ...a,
      jobs: (a.jobs || []).filter((j: any) => j.status === 'OPEN').slice(0, 1),
    }));

    return res.json({ assets: assetsWithFilteredJobs, currentGameDay: getGameDay() });
  } catch (error) {
    if (handleDbError(error, res, 'assets-mine', req)) return;
    logRouteError(req, 500, 'Assets mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/assets/available — Available asset types + pricing
// ============================================================

router.get('/available', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const professions = await db.query.playerProfessions.findMany({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.isActive, true)),
    });

    const result = await Promise.all(
      professions
        .filter((p) => PROFESSION_ASSET_TYPES[p.professionType])
        .map(async (prof) => {
          const assetTypes = PROFESSION_ASSET_TYPES[prof.professionType];

          const assetTypesWithTiers = await Promise.all(
            assetTypes.map(async (at: AssetTypeDefinition) => {
              const tiers = await Promise.all(
                [1, 2, 3].map(async (tier) => {
                  const tierData = ASSET_TIERS[tier];
                  const [{ total: owned }] = await db.select({ total: count() }).from(ownedAssets).where(
                    and(
                      eq(ownedAssets.ownerId, character.id),
                      eq(ownedAssets.professionType, prof.professionType),
                      eq(ownedAssets.tier, tier),
                    ),
                  );
                  const nextSlotNumber = owned + 1;
                  const effectiveLevelReq = at.levelRequired ?? tierData.levelRequired;
                  const locked = prof.level < effectiveLevelReq;
                  const nextCost = owned < MAX_SLOTS_PER_TIER
                    ? (at.baseCost ? at.baseCost * nextSlotNumber : getAssetPurchaseCost(tier, nextSlotNumber))
                    : null;

                  return {
                    tier,
                    owned,
                    maxSlots: MAX_SLOTS_PER_TIER,
                    nextSlotCost: nextCost,
                    levelRequired: effectiveLevelReq,
                    locked,
                    capacity: at.capacity ?? null,
                  };
                }),
              );

              return {
                id: at.id,
                name: at.name,
                spotType: at.spotType,
                tiers,
              };
            }),
          );

          return {
            type: prof.professionType,
            level: prof.level,
            assetTypes: assetTypesWithTiers,
          };
        }),
    );

    return res.json({ professions: result });
  } catch (error) {
    if (handleDbError(error, res, 'assets-available', req)) return;
    logRouteError(req, 500, 'Assets available error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/buy — Purchase a new asset
// ============================================================

router.post('/buy', authGuard, characterGuard, validate(buySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { assetTypeId, tier } = req.body;

    // 1. Find which profession this asset type belongs to
    const professionType = getProfessionForAssetType(assetTypeId);
    if (!professionType) {
      return res.status(400).json({ error: 'Invalid asset type ID' });
    }

    // Find the asset type definition for name and spotType
    const assetTypeDef = PROFESSION_ASSET_TYPES[professionType].find((t: AssetTypeDefinition) => t.id === assetTypeId);
    if (!assetTypeDef) {
      return res.status(400).json({ error: 'Invalid asset type ID' });
    }

    // 2. Check character has the profession at required level
    const tierData = ASSET_TIERS[tier];
    if (!tierData) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const profession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, character.id),
        eq(playerProfessions.professionType, professionType as any),
        eq(playerProfessions.isActive, true),
      ),
    });

    if (!profession) {
      return res.status(400).json({ error: `You do not have the ${professionType} profession` });
    }

    // Use asset-type-specific overrides if defined, otherwise fall back to tier defaults
    const effectiveLevelRequired = assetTypeDef.levelRequired ?? tierData.levelRequired;

    if (profession.level < effectiveLevelRequired) {
      return res.status(400).json({
        error: `${professionType} level ${effectiveLevelRequired} required for ${assetTypeDef.name}. You are level ${profession.level}.`,
      });
    }

    // 3. Must have a home town
    if (!character.homeTownId) {
      return res.status(400).json({ error: 'You must be a resident of a town to purchase assets.' });
    }

    // 4. Count existing assets for this profession + tier
    const [{ total: existingCount }] = await db.select({ total: count() }).from(ownedAssets).where(
      and(
        eq(ownedAssets.ownerId, character.id),
        eq(ownedAssets.professionType, professionType),
        eq(ownedAssets.tier, tier),
      ),
    );

    // 5. Check slot limit
    if (existingCount >= MAX_SLOTS_PER_TIER) {
      return res.status(400).json({
        error: `Maximum ${MAX_SLOTS_PER_TIER} tier ${tier} slots reached for ${professionType}.`,
      });
    }

    // 6. Calculate cost (use asset-type-specific baseCost if defined)
    const slotNumber = existingCount + 1;
    const cost = assetTypeDef.baseCost
      ? assetTypeDef.baseCost * slotNumber
      : getAssetPurchaseCost(tier, slotNumber);

    // 7. Check gold
    if (character.gold < cost) {
      return res.status(400).json({
        error: `Insufficient gold. Need ${cost}, have ${character.gold}.`,
      });
    }

    // RANCHER buildings are permanent structures — set cropState to READY immediately
    const isRancherBuilding = professionType === 'RANCHER';

    // Transaction: deduct gold + create asset
    const asset = await db.transaction(async (tx) => {
      const [newAsset] = await tx.insert(ownedAssets).values({
        id: crypto.randomUUID(),
        ownerId: character.id,
        townId: character.homeTownId!,
        professionType,
        spotType: assetTypeDef.spotType,
        tier,
        slotNumber,
        name: assetTypeDef.name,
        purchasePrice: cost,
        ...(isRancherBuilding ? { cropState: 'READY' } : {}),
      }).returning();

      await tx.update(characters).set({
        gold: sql`${characters.gold} - ${cost}`,
      }).where(eq(characters.id, character.id));

      return newAsset;
    });

    return res.status(201).json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        tier: asset.tier,
        slotNumber: asset.slotNumber,
        spotType: asset.spotType,
        townId: asset.townId,
        purchasePrice: asset.purchasePrice,
      },
      goldRemaining: character.gold - cost,
    });
  } catch (error) {
    if (handleDbError(error, res, 'assets-buy', req)) return;
    logRouteError(req, 500, 'Assets buy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/plant — Plant a crop
// ============================================================

router.post('/:id/plant', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset, check ownership
    const asset = await db.query.ownedAssets.findFirst({ where: eq(ownedAssets.id, id) });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Check crop state
    if (asset.cropState !== 'EMPTY') {
      return res.status(400).json({ error: `Cannot plant — asset is currently ${asset.cropState}` });
    }

    // 3. Must be present in the asset's town
    if (character.currentTownId !== asset.townId) {
      return res.status(400).json({ error: 'You must be in the town where this asset is located' });
    }

    // 4. Update with planting data
    const tierData = ASSET_TIERS[asset.tier];
    const plantedAt = getGameDay();
    const readyAt = plantedAt + tierData.growthTicks;
    const witheringAt = readyAt + WITHER_TICKS;

    const [updated] = await db.update(ownedAssets).set({
      cropState: 'GROWING',
      plantedAt,
      readyAt,
      witheringAt,
    }).where(eq(ownedAssets.id, id)).returning();

    return res.json({
      success: true,
      asset: {
        id: updated.id,
        cropState: updated.cropState,
        plantedAt: updated.plantedAt,
        readyAt: updated.readyAt,
        witheringAt: updated.witheringAt,
      },
      message: `You planted crops in your ${asset.name}. Ready in ${tierData.growthTicks} days.`,
    });
  } catch (error) {
    if (handleDbError(error, res, 'assets-plant', req)) return;
    logRouteError(req, 500, 'Assets plant error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/harvest — Lock in harvest action
// ============================================================

router.post('/:id/harvest', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset
    const asset = await db.query.ownedAssets.findFirst({ where: eq(ownedAssets.id, id) });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // 2. RANCHER buildings cannot be harvested — use /assets/:id/collect instead
    if (asset.professionType === 'RANCHER') {
      return res.status(400).json({ error: 'RANCHER buildings require collection, not harvest. Use the collect endpoint.' });
    }

    // 3. Check crop state
    if (asset.cropState !== 'READY') {
      return res.status(400).json({ error: `Cannot harvest — crop state is ${asset.cropState}` });
    }

    // 4. Must be present in the asset's town
    if (character.currentTownId !== asset.townId) {
      return res.status(400).json({ error: 'You must be in the town where this asset is located' });
    }

    // 5. Only owner can harvest directly (workers use jobs board)
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'Only the owner can harvest directly. Workers should use the Jobs Board.' });
    }

    // 6. Check no existing daily action for today
    const todayTick = getTodayTickDate().toISOString();
    const existingAction = await db.query.dailyActions.findFirst({
      where: and(eq(dailyActions.characterId, character.id), eq(dailyActions.tickDate, todayTick)),
    });
    if (existingAction) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existingAction.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // 7. Cancel any open job for this asset + refund escrowed gold (owner harvesting manually)
    const openJobsForAsset = await db.query.jobs.findMany({
      where: and(eq(jobs.assetId, asset.id), eq(jobs.status, 'OPEN')),
    });
    for (const openJob of openJobsForAsset) {
      await db.transaction(async (tx) => {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${openJob.wage}` })
          .where(eq(characters.id, openJob.posterId));
        await tx.update(jobs)
          .set({ status: 'CANCELLED' })
          .where(eq(jobs.id, openJob.id));
      });
    }

    // 8. Create daily action
    await db.insert(dailyActions).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      tickDate: todayTick,
      actionType: 'HARVEST',
      status: 'LOCKED_IN',
      actionTarget: {
        type: 'private_asset_harvest',
        assetId: asset.id,
        spotType: asset.spotType,
        ownerId: asset.ownerId,
        harvesterId: character.id,
        isWorker: false,
        wage: 0,
        tier: asset.tier,
        assetName: asset.name,
      },
    });

    return res.json({
      success: true,
      committed: true,
      action: 'HARVEST',
      assetName: asset.name,
      message: "You've committed to harvesting. Results at next tick.",
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handleDbError(error, res, 'assets-harvest', req)) return;
    logRouteError(req, 500, 'Assets harvest error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/assets/:id/collect — Collect RANCHER building products (DAILY ACTION)
// ============================================================

router.post('/:id/collect', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find asset
    const asset = await db.query.ownedAssets.findFirst({ where: eq(ownedAssets.id, id) });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }
    if (asset.professionType !== 'RANCHER') {
      return res.status(400).json({ error: 'Only RANCHER buildings have collectible products' });
    }
    if (asset.pendingYield <= 0) {
      return res.status(400).json({ error: 'No products ready for collection' });
    }
    if (character.currentTownId !== asset.townId) {
      return res.status(400).json({ error: 'You must be in the town where this asset is located' });
    }

    // 2. Check daily action
    const todayTick = getTodayTickDate().toISOString();
    const existingAction = await db.query.dailyActions.findFirst({
      where: and(eq(dailyActions.characterId, character.id), eq(dailyActions.tickDate, todayTick)),
    });
    if (existingAction) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existingAction.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // 3. Collect in transaction
    const resourceEntry = (await import('@shared/data/gathering')).RESOURCE_MAP[asset.spotType];
    if (!resourceEntry) {
      return res.status(500).json({ error: `Unknown spot type: ${asset.spotType}` });
    }

    const gatherItem = resourceEntry.item;
    const itemName = gatherItem.templateName;
    const quantity = asset.pendingYield;

    await db.transaction(async (tx) => {
      // Find/create template
      let template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, itemName) });
      if (!template) {
        [template] = await tx.insert(itemTemplates).values({
          id: crypto.randomUUID(),
          name: itemName,
          type: (gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL') as any,
          rarity: 'COMMON',
          description: gatherItem.description,
          stats: {},
          durability: 0,
          requirements: {},
          isFood: gatherItem.isFood,
          foodBuff: gatherItem.foodBuff ?? null,
          isPerishable: gatherItem.shelfLifeDays != null,
          shelfLifeDays: gatherItem.shelfLifeDays,
        }).returning();
      }

      // Put items in house storage
      const house = await tx.query.houses.findFirst({
        where: and(eq(houses.characterId, character.id), eq(houses.townId, asset.townId)),
      });
      if (house) {
        await tx.insert(houseStorage).values({
          id: crypto.randomUUID(),
          houseId: house.id,
          itemTemplateId: template.id,
          quantity,
        }).onConflictDoUpdate({
          target: [houseStorage.houseId, houseStorage.itemTemplateId],
          set: { quantity: sql`${houseStorage.quantity} + ${quantity}` },
        });
      }

      // Reset pending yield
      await tx.update(ownedAssets).set({
        pendingYield: 0,
        pendingYieldSince: null,
      }).where(eq(ownedAssets.id, asset.id));

      // Cancel any open job for this asset + refund escrowed gold
      const openJobsForAsset = await tx.query.jobs.findMany({
        where: and(eq(jobs.assetId, asset.id), eq(jobs.status, 'OPEN')),
      });
      for (const openJob of openJobsForAsset) {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${openJob.wage}` })
          .where(eq(characters.id, openJob.posterId));
        await tx.update(jobs)
          .set({ status: 'CANCELLED' })
          .where(eq(jobs.id, openJob.id));
      }

      // Create daily action
      await tx.insert(dailyActions).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        tickDate: todayTick,
        actionType: 'HARVEST',
        status: 'COMPLETED',
        actionTarget: {
          type: 'rancher_collection',
          assetId: asset.id,
          spotType: asset.spotType,
        },
        result: {
          type: 'rancher_collection',
          itemName,
          quantity,
          assetName: asset.name,
        },
      });
    });

    return res.json({
      success: true,
      collected: { itemName, quantity },
      assetName: asset.name,
      message: `Collected ${quantity}x ${itemName} from ${asset.name}. Items stored in your house.`,
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handleDbError(error, res, 'assets-collect', req)) return;
    logRouteError(req, 500, 'Assets collect error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
