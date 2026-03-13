// ---------------------------------------------------------------------------
// Jobs Routes — Unified job board with gold escrow
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc, asc, sql, count, inArray, lte } from 'drizzle-orm';
import { ownedAssets, jobs, dailyActions, playerProfessions, houses, houseStorage, itemTemplates, characters, recipes, inventories, items, buildings, characterEquipment, characterActiveEffects, towns, travelRoutes } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';
import { getTodayTickDate, getNextTickTime, getGameDay } from '../lib/game-day';
import { ASSET_TIERS, PROFESSION_ASSET_TYPES } from '@shared/data/assets';
import { RESOURCE_MAP, GATHER_SPOT_PROFESSION_MAP } from '@shared/data/gathering';
import { addProfessionXP } from '../services/profession-xp';
import { JOB_TYPE_LABELS, ASSET_JOB_TYPES, WORKSHOP_JOB_CONFIG, DELIVERY_JOB_CONFIG } from '@shared/data/jobs-config';
import { qualityRoll } from '@shared/utils/dice';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
import { TIER_ORDER, PROFESSION_WORKSHOP_MAP, QUALITY_MAP, PROFESSION_TIER_QUALITY_BONUS } from '@shared/data/crafting-config';
import { getProfessionByType } from '@shared/data/professions';
import { getRacialCraftQualityBonus } from '../services/racial-profession-bonuses';
import { computeFeatBonus } from '@shared/data/feats';
import { getWellRestedBonus } from '@shared/data/inn-config';
import { getCharacterReligionContext, resolveReligionBuffs } from '../services/religion-buffs';
import type { ProfessionType, ProfessionTier } from '@shared/enums';

const router = Router();

// --- Local mappings ---

const RANCHER_SPOT_TO_JOB: Record<string, string> = {
  chicken_coop: 'gather_eggs',
  dairy_barn: 'milk_cows',
  sheep_pen: 'shear_sheep',
};

function tierIndex(tier: ProfessionTier): number {
  return TIER_ORDER.indexOf(tier);
}

// --- Schemas ---

const postJobSchema = z.object({
  assetId: z.string().uuid(),
  jobType: z.enum(ASSET_JOB_TYPES),
  pay: z.number().int().min(1, 'Pay must be at least 1 gold'),
});

const postWorkshopJobSchema = z.object({
  townId: z.string().uuid(),
  recipeId: z.string(),
  wage: z.number().int().min(1, 'Wage must be at least 1 gold'),
  quantity: z.number().int().min(1).max(5).default(1),
});

const postDeliveryJobSchema = z.object({
  townId: z.string().uuid(),
  destinationTownId: z.string().uuid(),
  wage: z.number().int().min(1, 'Wage must be at least 1 gold'),
  deadlineDays: z.number().int().min(DELIVERY_JOB_CONFIG.minDeadlineDays).max(DELIVERY_JOB_CONFIG.maxDeadlineDays),
  items: z.array(z.object({
    itemName: z.string(),
    quantity: z.number().int().min(1),
  })).min(1).max(10),
});

// --- Helper: build inventory map (duplicated from crafting.ts to avoid refactoring) ---

async function buildInventoryMap(characterId: string) {
  const inventory = await db.query.inventories.findMany({
    where: eq(inventories.characterId, characterId),
    with: { item: { with: { itemTemplate: true } } },
  });

  const inventoryByTemplate = new Map<string, {
    total: number;
    entries: typeof inventory;
  }>();

  for (const inv of inventory) {
    const tid = inv.item.templateId;
    const existing = inventoryByTemplate.get(tid);
    if (existing) {
      existing.total += inv.quantity;
      existing.entries.push(inv);
    } else {
      inventoryByTemplate.set(tid, { total: inv.quantity, entries: [inv] });
    }
  }

  return inventoryByTemplate;
}

// --- Helper: consume ingredients from inventory (duplicated from crafting.ts) ---

async function consumeIngredients(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ingredients: Array<{ itemTemplateId: string; quantity: number }>,
  inventoryByTemplate: Map<string, { total: number; entries: Array<{ id: string; itemId: string; quantity: number; item: { quality: string } }> }>,
) {
  for (const ing of ingredients) {
    let remaining = ing.quantity;
    const entries = inventoryByTemplate.get(ing.itemTemplateId)!.entries;

    for (const inv of entries) {
      if (remaining <= 0) break;

      if (inv.quantity <= remaining) {
        remaining -= inv.quantity;
        await tx.delete(inventories).where(eq(inventories.id, inv.id));
        await tx.delete(items).where(eq(items.id, inv.itemId));
      } else {
        await tx.update(inventories).set({ quantity: inv.quantity - remaining }).where(eq(inventories.id, inv.id));
        remaining = 0;
      }
    }
  }
}

// --- Helper: refund escrowed materials to poster's inventory ---

async function refundMaterials(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  posterId: string,
  materialsEscrow: Array<{ itemTemplateId: string; itemName: string; quantity: number }>,
) {
  for (const mat of materialsEscrow) {
    const [item] = await tx.insert(items).values({
      id: crypto.randomUUID(),
      templateId: mat.itemTemplateId,
      ownerId: posterId,
      quality: 'COMMON',
      enchantments: [],
    }).returning();
    await tx.insert(inventories).values({
      id: crypto.randomUUID(),
      characterId: posterId,
      itemId: item.id,
      quantity: mat.quantity,
    });
  }
}

// ============================================================
// POST /api/jobs/post — Post an asset job (FREE ACTION, works remotely)
// Gold is escrowed from poster at posting time.
// ============================================================

router.post('/post', authGuard, characterGuard, validate(postJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { assetId, jobType, pay } = req.body;

    // 1. Find asset, check ownership
    const asset = await db.query.ownedAssets.findFirst({ where: eq(ownedAssets.id, assetId) });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Check owner can afford the pay (gold will be escrowed)
    if (character.gold < pay) {
      return res.status(400).json({ error: `Insufficient gold. You have ${character.gold}g, job costs ${pay}g.` });
    }

    // 3. Check no existing OPEN job for this asset
    const existingJob = await db.query.jobs.findFirst({
      where: and(eq(jobs.assetId, assetId), eq(jobs.status, 'OPEN')),
    });
    if (existingJob) {
      return res.status(400).json({ error: 'An open job already exists for this asset' });
    }

    // 4. Validate jobType matches asset profession
    if (asset.professionType === 'RANCHER') {
      const expectedJobType = RANCHER_SPOT_TO_JOB[asset.spotType];
      if (jobType !== expectedJobType) {
        return res.status(400).json({ error: `Invalid job type for ${asset.spotType}. Expected: ${expectedJobType}` });
      }
      if (asset.pendingYield <= 0) {
        return res.status(400).json({ error: 'No products ready for collection' });
      }
    } else {
      if (jobType === 'harvest_field') {
        if (asset.cropState !== 'READY') {
          return res.status(400).json({ error: `Cannot post harvest job — crop state is ${asset.cropState}` });
        }
      } else if (jobType === 'plant_field') {
        if (asset.cropState !== 'EMPTY') {
          return res.status(400).json({ error: `Cannot post plant job — crop state is ${asset.cropState}` });
        }
      } else {
        return res.status(400).json({ error: 'Invalid job type for this asset type' });
      }
    }

    // 5. Escrow gold and create job in a transaction
    const title = `${JOB_TYPE_LABELS[jobType] ?? jobType} — ${asset.name}`;

    const [job] = await db.transaction(async (tx) => {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${pay}` })
        .where(eq(characters.id, character.id));

      return tx.insert(jobs).values({
        id: crypto.randomUUID(),
        category: 'ASSET',
        assetId,
        posterId: character.id,
        townId: asset.townId,
        jobType,
        title,
        wage: pay,
        status: 'OPEN',
      }).returning();
    });

    return res.status(201).json({
      success: true,
      job: {
        id: job.id,
        category: job.category,
        assetId: job.assetId,
        jobType: job.jobType,
        title: job.title,
        pay: job.wage,
        status: job.status,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-post', req)) return;
    logRouteError(req, 500, 'Jobs post error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/post-workshop — Post a workshop crafting job
// Gold + materials escrowed from poster at posting time.
// ============================================================

router.post('/post-workshop', authGuard, characterGuard, validate(postWorkshopJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, recipeId, wage, quantity } = req.body;

    // 1. Look up recipe
    const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, recipeId) });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;

    // 2. Calculate total materials needed (scaled by quantity)
    const totalIngredients = ingredients.map(ing => ({
      itemTemplateId: ing.itemTemplateId,
      quantity: ing.quantity * quantity,
    }));

    // 3. Check poster has all materials
    const inventoryByTemplate = await buildInventoryMap(character.id);
    const missingMaterials: string[] = [];
    for (const ing of totalIngredients) {
      const available = inventoryByTemplate.get(ing.itemTemplateId)?.total ?? 0;
      if (available < ing.quantity) {
        // Look up template name for the error message
        const template = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, ing.itemTemplateId) });
        missingMaterials.push(`${template?.name ?? ing.itemTemplateId}: need ${ing.quantity}, have ${available}`);
      }
    }
    if (missingMaterials.length > 0) {
      return res.status(400).json({ error: 'Insufficient materials', missing: missingMaterials });
    }

    // 4. Check poster has gold for wage
    if (character.gold < wage) {
      return res.status(400).json({ error: `Insufficient gold. You have ${character.gold}g, wage costs ${wage}g.` });
    }

    // 5. Check active workshop job limit
    const [{ total: activeCount }] = await db.select({ total: count() }).from(jobs).where(
      and(eq(jobs.posterId, character.id), eq(jobs.category, 'WORKSHOP'), eq(jobs.status, 'OPEN')),
    );
    if (activeCount >= WORKSHOP_JOB_CONFIG.maxActivePerPoster) {
      return res.status(400).json({ error: `You can have at most ${WORKSHOP_JOB_CONFIG.maxActivePerPoster} open workshop jobs` });
    }

    // 6. Build materialsEscrow data (with template names for display)
    const escrowData: Array<{ itemTemplateId: string; itemName: string; quantity: number }> = [];
    for (const ing of totalIngredients) {
      const template = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, ing.itemTemplateId) });
      escrowData.push({
        itemTemplateId: ing.itemTemplateId,
        itemName: template?.name ?? ing.itemTemplateId,
        quantity: ing.quantity,
      });
    }

    // 7. Generate title
    const title = quantity > 1 ? `Craft ${quantity}x ${recipe.name}` : `Craft ${recipe.name}`;
    const description = `Requires ${recipe.professionType} (${recipe.tier}+)`;

    // 8. Transaction: escrow gold + consume materials + create job
    const [job] = await db.transaction(async (tx) => {
      // Deduct wage
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${wage}` })
        .where(eq(characters.id, character.id));

      // Consume materials from poster's inventory
      await consumeIngredients(tx, totalIngredients, inventoryByTemplate as any);

      // Create job
      return tx.insert(jobs).values({
        id: crypto.randomUUID(),
        category: 'WORKSHOP',
        townId,
        posterId: character.id,
        recipeId,
        materialsEscrow: escrowData,
        title,
        description,
        wage,
        status: 'OPEN',
      }).returning();
    });

    return res.status(201).json({
      success: true,
      job: {
        id: job.id,
        category: job.category,
        title: job.title,
        recipeName: recipe.name,
        pay: job.wage,
        status: job.status,
        materials: escrowData,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-post-workshop', req)) return;
    logRouteError(req, 500, 'Jobs post-workshop error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/accept — Accept + execute job instantly (DAILY ACTION)
// Escrowed gold is transferred to worker on completion.
// ============================================================

router.post('/:id/accept', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find the job
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        ownedAsset: true,
        poster: { columns: { id: true, gold: true } },
      },
    });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // 2. Common validations
    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: 'This job is no longer available' });
    }
    if (character.currentTownId !== job.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the job' });
    }
    if (job.posterId === character.id) {
      return res.status(400).json({ error: 'You cannot accept your own job' });
    }

    // Delivery accept is a FREE ACTION — branch before daily action check
    if (job.category === 'DELIVERY') {
      return await acceptDeliveryJob(req, res, job, character);
    }

    // 3. Check daily action not used (ASSET + WORKSHOP only)
    const todayTick = getTodayTickDate();
    const existingAction = await db.query.dailyActions.findFirst({
      where: and(eq(dailyActions.characterId, character.id), eq(dailyActions.tickDate, todayTick.toISOString())),
    });
    if (existingAction) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existingAction.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // Branch by job category
    if (job.category === 'WORKSHOP') {
      return await acceptWorkshopJob(req, res, job, character, todayTick);
    }

    // ---------- ASSET JOB EXECUTION ----------

    const asset = job.ownedAsset;
    if (!asset) {
      return res.status(400).json({ error: 'Job asset no longer exists' });
    }

    // 4. Determine profession match for yield/XP bonus
    const assetProfession = GATHER_SPOT_PROFESSION_MAP[asset.spotType];
    const workerHasMatchingProf = assetProfession
      ? await db.query.playerProfessions.findFirst({
          where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, assetProfession as any)),
        })
      : null;
    const professionMatch = !!workerHasMatchingProf;
    const yieldMultiplier = professionMatch ? 1.0 : 0.5;
    const xpMultiplier = professionMatch ? 1.0 : 0.5;

    // 5. Execute the job in a single transaction
    const result = await db.transaction(async (tx) => {
      let itemsProduced: { itemName: string; quantity: number; templateId: string } | null = null;

      if (job.jobType === 'harvest_field') {
        if (asset.cropState !== 'READY') {
          throw new Error('Asset is no longer ready for harvest');
        }

        const tierData = ASSET_TIERS[asset.tier as 1 | 2 | 3];
        if (!tierData) throw new Error('Invalid asset tier');

        const baseYield = Math.floor(Math.random() * (tierData.maxYield - tierData.minYield + 1)) + tierData.minYield;
        const finalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier));

        const resourceEntry = RESOURCE_MAP[asset.spotType];
        if (!resourceEntry) throw new Error(`Unknown spot type: ${asset.spotType}`);

        const gatherItem = resourceEntry.item;
        const itemName = gatherItem.templateName;
        const itemType = gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL';

        let template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, itemName) });
        if (!template) {
          [template] = await tx.insert(itemTemplates).values({
            id: crypto.randomUUID(),
            name: itemName,
            type: itemType as any,
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

        const house = await tx.query.houses.findFirst({
          where: and(eq(houses.characterId, job.posterId), eq(houses.townId, job.townId)),
        });
        if (house) {
          const existingStorage = await tx.query.houseStorage.findFirst({
            where: and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, template.id)),
          });
          if (existingStorage) {
            await tx.update(houseStorage)
              .set({ quantity: sql`${houseStorage.quantity} + ${finalYield}` })
              .where(and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, template.id)));
          } else {
            await tx.insert(houseStorage).values({ id: crypto.randomUUID(), houseId: house.id, itemTemplateId: template.id, quantity: finalYield });
          }
        }

        await tx.update(ownedAssets)
          .set({ cropState: 'EMPTY', plantedAt: null, readyAt: null, witheringAt: null })
          .where(eq(ownedAssets.id, asset.id));

        itemsProduced = { itemName, quantity: finalYield, templateId: template.id };

      } else if (job.jobType === 'plant_field') {
        if (asset.cropState !== 'EMPTY') {
          throw new Error('Asset is no longer empty for planting');
        }

        const tierData = ASSET_TIERS[asset.tier as 1 | 2 | 3];
        if (!tierData) throw new Error('Invalid asset tier');

        const plantedAt = getGameDay();
        const readyAt = plantedAt + tierData.growthTicks;
        const witheringAt = readyAt + 3;

        await tx.update(ownedAssets)
          .set({ cropState: 'GROWING', plantedAt, readyAt, witheringAt })
          .where(eq(ownedAssets.id, asset.id));

      } else {
        // RANCHER collection: gather_eggs, milk_cows, shear_sheep
        const pendingYield = asset.pendingYield;
        if (pendingYield <= 0) {
          throw new Error('No products ready for collection');
        }

        const finalYield = Math.max(1, Math.floor(pendingYield * yieldMultiplier));

        const resourceEntry = RESOURCE_MAP[asset.spotType];
        if (!resourceEntry) throw new Error(`Unknown spot type: ${asset.spotType}`);

        const gatherItem = resourceEntry.item;
        const itemName = gatherItem.templateName;
        const itemType = gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL';

        let template = await tx.query.itemTemplates.findFirst({ where: eq(itemTemplates.name, itemName) });
        if (!template) {
          [template] = await tx.insert(itemTemplates).values({
            id: crypto.randomUUID(),
            name: itemName,
            type: itemType as any,
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

        const house = await tx.query.houses.findFirst({
          where: and(eq(houses.characterId, job.posterId), eq(houses.townId, job.townId)),
        });
        if (house) {
          const existingStorage = await tx.query.houseStorage.findFirst({
            where: and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, template.id)),
          });
          if (existingStorage) {
            await tx.update(houseStorage)
              .set({ quantity: sql`${houseStorage.quantity} + ${finalYield}` })
              .where(and(eq(houseStorage.houseId, house.id), eq(houseStorage.itemTemplateId, template.id)));
          } else {
            await tx.insert(houseStorage).values({ id: crypto.randomUUID(), houseId: house.id, itemTemplateId: template.id, quantity: finalYield });
          }
        }

        await tx.update(ownedAssets)
          .set({ pendingYield: 0, pendingYieldSince: null })
          .where(eq(ownedAssets.id, asset.id));

        itemsProduced = { itemName, quantity: finalYield, templateId: template.id };
      }

      // Transfer escrowed gold to worker (no Math.min — escrow guarantees funds)
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${job.wage}` })
        .where(eq(characters.id, character.id));

      // Mark job completed
      await tx.update(jobs)
        .set({
          status: 'COMPLETED',
          workerId: character.id,
          completedAt: new Date().toISOString(),
          result: itemsProduced
            ? { itemName: itemsProduced.itemName, quantity: itemsProduced.quantity }
            : null,
        })
        .where(eq(jobs.id, job.id));

      // Create daily action (consume slot)
      await tx.insert(dailyActions).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        tickDate: todayTick.toISOString(),
        actionType: 'JOB',
        status: 'COMPLETED',
        actionTarget: {
          type: 'job_accepted',
          jobId: job.id,
          assetId: job.assetId,
          townId: job.townId,
        },
        result: {
          type: 'job_completed',
          jobId: job.id,
          jobType: job.jobType,
          assetName: asset.name,
          pay: job.wage,
          items: itemsProduced,
          professionMatch,
        },
      });

      return { actualPay: job.wage, itemsProduced };
    });

    // 6. Award profession XP (outside transaction — non-critical)
    let xpAwarded = 0;
    if (assetProfession) {
      try {
        const baseXp = 10 + ((asset.tier || 1) * 5);
        xpAwarded = Math.floor(baseXp * xpMultiplier);
        if (xpAwarded > 0) {
          await addProfessionXP(character.id, assetProfession as any, xpAwarded, 'job');
        }
      } catch {
        // XP failure shouldn't break the job
      }
    }

    return res.json({
      success: true,
      job: {
        id: job.id,
        jobType: job.jobType,
        assetName: asset.name,
      },
      reward: {
        gold: result.actualPay,
        items: result.itemsProduced ? { name: result.itemsProduced.itemName, quantity: result.itemsProduced.quantity } : null,
        xp: xpAwarded,
        professionMatch,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-accept', req)) return;
    logRouteError(req, 500, 'Jobs accept error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// Workshop Job Accept — extracted for clarity
// ============================================================

async function acceptWorkshopJob(
  req: AuthenticatedRequest,
  res: Response,
  job: any,
  character: any,
  todayTick: Date,
) {
  // 1. Load recipe
  const recipe = await db.query.recipes.findFirst({ where: eq(recipes.id, job.recipeId!) });
  if (!recipe) {
    return res.status(400).json({ error: 'Recipe no longer exists' });
  }

  // 2. Check worker has matching profession
  const profession = await db.query.playerProfessions.findFirst({
    where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, recipe.professionType)),
  });
  if (!profession) {
    return res.status(400).json({ error: `You do not have the ${recipe.professionType} profession` });
  }

  // 3. Check worker's profession tier
  if (tierIndex(profession.tier as ProfessionTier) < tierIndex(recipe.tier as ProfessionTier)) {
    return res.status(400).json({ error: `Requires ${recipe.tier} tier in ${recipe.professionType}, you are ${profession.tier}` });
  }

  // 4. Check specialization
  const recipeSpecialization = (recipe as any).specialization as string | null;
  if (recipeSpecialization && profession.specialization !== recipeSpecialization) {
    return res.status(400).json({ error: `Requires ${recipeSpecialization} specialization in ${recipe.professionType}` });
  }

  // 5. Workshop check (required for tier > APPRENTICE)
  const requiredBuildingType = PROFESSION_WORKSHOP_MAP[recipe.professionType as ProfessionType];
  let workshopBonus = 0;
  if (recipe.tier !== 'APPRENTICE') {
    if (!requiredBuildingType) {
      return res.status(400).json({ error: 'No workshop type defined for this profession' });
    }
    const workshop = await db.query.buildings.findFirst({
      where: and(eq(buildings.townId, character.currentTownId!), eq(buildings.type, requiredBuildingType as any)),
    });
    if (!workshop) {
      return res.status(400).json({ error: `${recipe.tier} tier recipes require a ${requiredBuildingType} in your current town` });
    }
    workshopBonus = (workshop as any).level ?? 0;
  }

  // 6. Get worker's tool bonus
  const equippedTool = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, character.id), eq(characterEquipment.slot, 'TOOL')),
    with: { item: { with: { itemTemplate: true } } },
  });
  let toolBonus = 0;
  if (equippedTool && equippedTool.item.itemTemplate.type === 'TOOL') {
    const toolStats = equippedTool.item.itemTemplate.stats as Record<string, unknown>;
    if (toolStats.professionType === recipe.professionType) {
      toolBonus = (typeof toolStats.qualityBonus === 'number') ? toolStats.qualityBonus : 0;
    }
  }

  // 7. Racial quality bonus
  const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
  const racialQuality = getRacialCraftQualityBonus(character.race, subRaceData, recipe.professionType);

  // 8. Profession tier bonus
  const professionTierBonus = PROFESSION_TIER_QUALITY_BONUS[profession.tier as ProfessionTier] ?? 0;

  // 9. Stat modifier from profession's primary stat
  const profDef = getProfessionByType(recipe.professionType);
  const characterStats = character.stats as Record<string, number>;
  const primaryStatKey = profDef?.primaryStat?.toLowerCase() ?? 'int';
  const statModifier = getModifier(characterStats[primaryStatKey] ?? 10);

  // 10. Feat bonus
  const craftFeats = (character.feats as string[]) ?? [];
  const featBonus = computeFeatBonus(craftFeats, 'professionQualityBonus');

  // 11. Well-rested bonus
  const wellRestedEffect = await db.query.characterActiveEffects.findFirst({
    where: and(eq(characterActiveEffects.characterId, character.id), eq(characterActiveEffects.sourceType, 'INN_REST')),
  });
  const wellRestedBonus = wellRestedEffect
    ? (getWellRestedBonus(wellRestedEffect.magnitude ?? 0)?.craftingQualityBonus ?? 0)
    : 0;

  // 12. Determine quantity from escrowed materials
  const escrow = job.materialsEscrow as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
  const recipeIngredients = recipe.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
  const craftQuantity = recipeIngredients.length > 0
    ? Math.floor(escrow[0].quantity / recipeIngredients[0].quantity)
    : 1;

  // 13. Get result template
  const resultTemplate = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, recipe.result) });
  if (!resultTemplate) {
    return res.status(500).json({ error: 'Result item template not found' });
  }

  // 14. Find poster's house for item deposit
  const posterHouse = await db.query.houses.findFirst({
    where: and(eq(houses.characterId, job.posterId), eq(houses.townId, job.townId)),
  });

  // Get town name for fallback message
  const town = await db.query.towns.findFirst({ where: eq(towns.id, job.townId), columns: { name: true } });

  // 15. Execute in transaction
  const craftedItems: Array<{ quality: string; roll: number; total: number }> = [];

  const result = await db.transaction(async (tx) => {
    // Quality roll + item creation for each unit
    // Religion crafting quality bonus (Tyrvex)
    const jobRelCtx = await getCharacterReligionContext(character.id);
    const jobRelBuffs = resolveReligionBuffs(jobRelCtx);
    const religionCraftBonus = Math.floor((jobRelBuffs.combinedBuffs.craftingQualityPercent ?? 0) * 25);

    for (let i = 0; i < craftQuantity; i++) {
      const { roll: diceRoll, total, quality: qualityName } = qualityRoll(
        getProficiencyBonus(character.level),
        statModifier,
        toolBonus,
        workshopBonus,
        racialQuality.qualityBonus,
        professionTierBonus,
        0, // ingredientQualityBonus — template-level escrow
        featBonus,
        wellRestedBonus, religionCraftBonus,
      );
      const quality = QUALITY_MAP[qualityName] ?? 'COMMON';
      craftedItems.push({ quality, roll: diceRoll, total });

      if (posterHouse) {
        // Deposit to poster's cottage storage
        const existingStorage = await tx.query.houseStorage.findFirst({
          where: and(eq(houseStorage.houseId, posterHouse.id), eq(houseStorage.itemTemplateId, resultTemplate.id)),
        });
        if (existingStorage) {
          await tx.update(houseStorage)
            .set({ quantity: sql`${houseStorage.quantity} + 1` })
            .where(eq(houseStorage.id, existingStorage.id));
        } else {
          await tx.insert(houseStorage).values({
            id: crypto.randomUUID(),
            houseId: posterHouse.id,
            itemTemplateId: resultTemplate.id,
            quantity: 1,
          });
        }
      } else {
        // Fallback: create item in poster's personal inventory
        const [item] = await tx.insert(items).values({
          id: crypto.randomUUID(),
          templateId: resultTemplate.id,
          ownerId: job.posterId,
          currentDurability: resultTemplate.durability,
          quality,
          craftedById: character.id,
          enchantments: [],
        }).returning();
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: job.posterId,
          itemId: item.id,
          quantity: 1,
        });
      }
    }

    // Transfer escrowed wage to worker
    await tx.update(characters)
      .set({ gold: sql`${characters.gold} + ${job.wage}` })
      .where(eq(characters.id, character.id));

    // Mark job completed
    await tx.update(jobs)
      .set({
        status: 'COMPLETED',
        workerId: character.id,
        completedAt: new Date().toISOString(),
        result: {
          recipeName: recipe.name,
          outputItem: resultTemplate.name,
          quantity: craftQuantity,
          qualities: craftedItems.map(c => c.quality),
        },
      })
      .where(eq(jobs.id, job.id));

    // Create daily action
    await tx.insert(dailyActions).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      tickDate: todayTick.toISOString(),
      actionType: 'JOB',
      status: 'COMPLETED',
      actionTarget: {
        type: 'workshop_job_accepted',
        jobId: job.id,
        townId: job.townId,
        recipeId: recipe.id,
      },
      result: {
        type: 'workshop_job_completed',
        jobId: job.id,
        recipeName: recipe.name,
        outputItem: resultTemplate.name,
        quantity: craftQuantity,
        qualities: craftedItems.map(c => c.quality),
        pay: job.wage,
        depositedTo: posterHouse ? 'cottage' : 'inventory',
      },
    });

    return { depositedTo: posterHouse ? 'cottage' : 'inventory' };
  });

  // Award profession XP (outside transaction — non-critical)
  let xpAwarded = 0;
  try {
    const baseXp = recipe.xpReward * craftQuantity;
    if (baseXp > 0) {
      xpAwarded = baseXp;
      await addProfessionXP(character.id, recipe.professionType as any, xpAwarded, 'job');
    }
  } catch {
    // XP failure shouldn't break the job
  }

  const depositMessage = result.depositedTo === 'cottage'
    ? `Crafted item deposited to poster's cottage storage`
    : `Crafted item added to poster's inventory (no cottage found in ${town?.name ?? 'this town'})`;

  return res.json({
    success: true,
    job: {
      id: job.id,
      category: 'WORKSHOP',
      recipeName: recipe.name,
    },
    reward: {
      gold: job.wage,
      items: { name: resultTemplate.name, quantity: craftQuantity },
      qualities: craftedItems.map(c => c.quality),
      xp: xpAwarded,
      depositMessage,
    },
  });
}

// ============================================================
// Delivery Job Accept — extracted for clarity (FREE ACTION)
// ============================================================

async function acceptDeliveryJob(
  req: AuthenticatedRequest,
  res: Response,
  job: any,
  character: any,
) {
  // 1. Worker must not be traveling
  if (character.travelStatus && character.travelStatus !== 'idle') {
    return res.status(400).json({ error: 'You cannot accept a delivery while traveling' });
  }

  // 2. Check worker's active IN_PROGRESS delivery count
  const [{ total: activeDeliveries }] = await db.select({ total: count() }).from(jobs).where(
    and(eq(jobs.workerId, character.id), eq(jobs.category, 'DELIVERY'), eq(jobs.status, 'IN_PROGRESS')),
  );
  if (activeDeliveries >= DELIVERY_JOB_CONFIG.maxActivePerWorker) {
    return res.status(400).json({ error: `You can carry at most ${DELIVERY_JOB_CONFIG.maxActivePerWorker} deliveries at once` });
  }

  // 3. Get destination town name for response
  const destTown = job.destinationTownId
    ? await db.query.towns.findFirst({ where: eq(towns.id, job.destinationTownId), columns: { id: true, name: true } })
    : null;

  // 4. Set IN_PROGRESS — NO daily action consumed
  await db.update(jobs)
    .set({ status: 'IN_PROGRESS', workerId: character.id })
    .where(eq(jobs.id, job.id));

  return res.json({
    success: true,
    job: {
      id: job.id,
      category: 'DELIVERY',
      title: job.title,
      destinationTownId: job.destinationTownId,
      destinationTownName: destTown?.name,
    },
    message: `Delivery accepted! Travel to ${destTown?.name ?? 'the destination'} to complete.`,
    deadline: job.expiresAt,
    freeAction: true,
  });
}

// ============================================================
// GET /api/jobs/town/:townId — Browse open jobs in a town
// ============================================================

router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const openJobs = await db.query.jobs.findMany({
      where: and(eq(jobs.townId, townId), eq(jobs.status, 'OPEN')),
      with: {
        ownedAsset: { columns: { id: true, name: true, spotType: true, tier: true, professionType: true, pendingYield: true } },
        poster: { columns: { id: true, name: true } },
      },
      orderBy: desc(jobs.wage),
    });

    // Enrich workshop jobs with recipe details
    const enrichedJobs = await Promise.all(openJobs.map(async (j) => {
      const base: any = {
        id: j.id,
        category: j.category,
        title: j.title,
        pay: j.wage,
        ownerName: j.poster.name,
        ownerId: j.poster.id,
        autoPosted: j.autoPosted,
        createdAt: j.createdAt,
      };

      if (j.category === 'ASSET') {
        base.jobType = j.jobType;
        base.jobLabel = JOB_TYPE_LABELS[j.jobType ?? ''] || j.jobType;
        base.assetId = j.ownedAsset?.id;
        base.assetName = j.ownedAsset?.name;
        base.assetType = j.ownedAsset?.spotType;
        base.assetTier = j.ownedAsset?.tier;
        base.professionType = j.ownedAsset?.professionType;
      } else if (j.category === 'WORKSHOP') {
        const recipe = j.recipeId
          ? await db.query.recipes.findFirst({ where: eq(recipes.id, j.recipeId), columns: { id: true, name: true, professionType: true, tier: true, result: true } })
          : null;
        const resultTemplate = recipe?.result
          ? await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, recipe.result), columns: { name: true } })
          : null;
        const escrow = j.materialsEscrow as Array<{ itemTemplateId: string; itemName: string; quantity: number }> | null;
        const recipeIngredients = recipe ? (await db.query.recipes.findFirst({ where: eq(recipes.id, recipe.id) }))?.ingredients as Array<{ quantity: number }> : null;
        const quantity = escrow && recipeIngredients && recipeIngredients.length > 0
          ? Math.floor(escrow[0].quantity / recipeIngredients[0].quantity)
          : 1;

        base.recipeName = recipe?.name;
        base.professionRequired = recipe?.professionType;
        base.tierRequired = recipe?.tier;
        base.outputItemName = resultTemplate?.name;
        base.materialsSupplied = true;
        base.quantity = quantity;
        base.description = j.description;
      } else if (j.category === 'DELIVERY') {
        const destTown = j.destinationTownId
          ? await db.query.towns.findFirst({ where: eq(towns.id, j.destinationTownId), columns: { id: true, name: true } })
          : null;
        base.destinationTownId = j.destinationTownId;
        base.destinationTownName = destTown?.name;
        base.deliveryItems = j.deliveryItems;
        base.expiresAt = j.expiresAt;
        base.description = j.description;
        base.freeAction = true;
      }

      return base;
    }));

    return res.json({ jobs: enrichedJobs });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-browse', req)) return;
    logRouteError(req, 500, 'Jobs browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/cancel — Cancel a job (refund escrowed gold + materials)
// ============================================================

router.post('/:id/cancel', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.posterId !== character.id) {
      return res.status(403).json({ error: 'Only the job poster can cancel this job' });
    }

    // DELIVERED delivery jobs cannot be cancelled — poster must pick up
    if (job.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot cancel a delivered job — pick up your items instead' });
    }

    // DELIVERY jobs can be cancelled while OPEN or IN_PROGRESS
    if (job.category === 'DELIVERY') {
      if (job.status !== 'OPEN' && job.status !== 'IN_PROGRESS') {
        return res.status(400).json({ error: `Cannot cancel — job status is ${job.status}` });
      }
    } else if (job.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot cancel — job status is ${job.status}` });
    }

    // Refund escrowed gold + items and cancel in a transaction
    await db.transaction(async (tx) => {
      if (job.category === 'DELIVERY' && job.status === 'IN_PROGRESS') {
        // 50/50 wage split: worker gets floor, poster gets ceil
        const workerShare = Math.floor(job.wage / 2);
        const posterShare = Math.ceil(job.wage / 2);
        if (workerShare > 0 && job.workerId) {
          await tx.update(characters)
            .set({ gold: sql`${characters.gold} + ${workerShare}` })
            .where(eq(characters.id, job.workerId));
        }
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${posterShare}` })
          .where(eq(characters.id, job.posterId));
      } else {
        // Full wage refund to poster (OPEN status for all categories)
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${job.wage}` })
          .where(eq(characters.id, job.posterId));
      }

      // Refund escrowed materials for WORKSHOP jobs
      if (job.category === 'WORKSHOP' && job.materialsEscrow) {
        const escrow = job.materialsEscrow as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
        await refundMaterials(tx, job.posterId, escrow);
      }

      // Refund escrowed delivery items
      if (job.category === 'DELIVERY' && job.deliveryItems) {
        const deliveryEscrow = job.deliveryItems as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
        await refundMaterials(tx, job.posterId, deliveryEscrow);
      }

      await tx.update(jobs)
        .set({ status: 'CANCELLED' })
        .where(eq(jobs.id, id));
    });

    let message = 'Job cancelled. Escrowed gold refunded.';
    if (job.category === 'WORKSHOP') {
      message = 'Job cancelled. Escrowed gold and materials refunded.';
    } else if (job.category === 'DELIVERY' && job.status === 'IN_PROGRESS') {
      message = 'Job cancelled. Wage split 50/50 with worker. Items refunded.';
    } else if (job.category === 'DELIVERY') {
      message = 'Job cancelled. Escrowed gold and items refunded.';
    }

    return res.json({ success: true, message });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-cancel', req)) return;
    logRouteError(req, 500, 'Jobs cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/jobs/mine — List jobs posted by the current character
// ============================================================

router.get('/mine', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const myJobs = await db.query.jobs.findMany({
      where: eq(jobs.posterId, character.id),
      with: {
        ownedAsset: { columns: { id: true, name: true, spotType: true, tier: true } },
        destinationTown: { columns: { id: true, name: true } },
        worker: { columns: { id: true, name: true } },
      },
      orderBy: desc(jobs.createdAt),
    });

    return res.json({
      jobs: myJobs.map((j) => ({
        id: j.id,
        category: j.category,
        jobType: j.jobType,
        jobLabel: JOB_TYPE_LABELS[j.jobType ?? ''] || j.jobType,
        title: j.title,
        pay: j.wage,
        assetId: j.ownedAsset?.id,
        assetName: j.ownedAsset?.name,
        status: j.status,
        autoPosted: j.autoPosted,
        createdAt: j.createdAt,
        materialsEscrow: j.category === 'WORKSHOP' ? j.materialsEscrow : undefined,
        // Delivery fields
        destinationTownId: j.category === 'DELIVERY' ? j.destinationTownId : undefined,
        destinationTownName: j.category === 'DELIVERY' ? j.destinationTown?.name : undefined,
        deliveryItems: j.category === 'DELIVERY' ? j.deliveryItems : undefined,
        expiresAt: j.category === 'DELIVERY' ? j.expiresAt : undefined,
        workerName: j.category === 'DELIVERY' && j.worker ? j.worker.name : undefined,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-mine', req)) return;
    logRouteError(req, 500, 'Jobs mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/jobs/recipes — Browse recipe catalog for workshop job posting
// ============================================================

router.get('/recipes', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allRecipes = await db.query.recipes.findMany({
      orderBy: [asc(recipes.professionType), asc(recipes.tier), asc(recipes.name)],
    });

    // Look up template names for ingredients and results
    const templateIds = new Set<string>();
    for (const r of allRecipes) {
      const ings = r.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
      for (const ing of ings) templateIds.add(ing.itemTemplateId);
      templateIds.add(r.result);
    }

    const templates = templateIds.size > 0
      ? await db.query.itemTemplates.findMany({
          where: inArray(itemTemplates.id, [...templateIds]),
          columns: { id: true, name: true },
        })
      : [];
    const templateMap = new Map(templates.map(t => [t.id, t.name]));

    return res.json({
      recipes: allRecipes.map(r => {
        const ings = r.ingredients as Array<{ itemTemplateId: string; quantity: number }>;
        return {
          id: r.id,
          name: r.name,
          professionType: r.professionType,
          tier: r.tier,
          inputs: ings.map(ing => ({
            itemTemplateId: ing.itemTemplateId,
            itemName: templateMap.get(ing.itemTemplateId) ?? ing.itemTemplateId,
            quantity: ing.quantity,
          })),
          outputItemTemplateId: r.result,
          outputItemName: templateMap.get(r.result) ?? r.result,
          craftTime: r.craftTime,
          xpReward: r.xpReward,
        };
      }),
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-recipes', req)) return;
    logRouteError(req, 500, 'Jobs recipes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/post-delivery — Post a delivery job
// Gold + items escrowed from poster at posting time.
// ============================================================

router.post('/post-delivery', authGuard, characterGuard, requireTown, validate(postDeliveryJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, destinationTownId, wage, deadlineDays, items: requestedItems } = req.body;

    // 1. Poster must be in origin town
    if (character.currentTownId !== townId) {
      return res.status(400).json({ error: 'You must be in the origin town to post a delivery job' });
    }

    // 2. Destination must differ from origin
    if (destinationTownId === townId) {
      return res.status(400).json({ error: 'Destination must be a different town' });
    }

    // 3. Verify destination town exists
    const destTown = await db.query.towns.findFirst({
      where: eq(towns.id, destinationTownId),
      columns: { id: true, name: true },
    });
    if (!destTown) {
      return res.status(404).json({ error: 'Destination town not found' });
    }

    // 4. Verify a released travel route exists between origin and destination
    const route = await db.query.travelRoutes.findFirst({
      where: and(
        eq(travelRoutes.isReleased, true),
        or(
          and(eq(travelRoutes.fromTownId, townId), eq(travelRoutes.toTownId, destinationTownId)),
          and(eq(travelRoutes.fromTownId, destinationTownId), eq(travelRoutes.toTownId, townId), eq(travelRoutes.bidirectional, true)),
        ),
      ),
    });
    if (!route) {
      return res.status(400).json({ error: `No travel route exists between your town and ${destTown.name}` });
    }

    // 5. Resolve item names to templates and check inventory
    const inventoryByTemplate = await buildInventoryMap(character.id);
    const resolvedItems: Array<{ itemTemplateId: string; itemName: string; quantity: number }> = [];
    const missingItems: string[] = [];

    for (const reqItem of requestedItems) {
      const template = await db.query.itemTemplates.findFirst({
        where: eq(itemTemplates.name, reqItem.itemName),
        columns: { id: true, name: true },
      });
      if (!template) {
        missingItems.push(`${reqItem.itemName}: item not found`);
        continue;
      }
      const available = inventoryByTemplate.get(template.id)?.total ?? 0;
      if (available < reqItem.quantity) {
        missingItems.push(`${reqItem.itemName}: need ${reqItem.quantity}, have ${available}`);
      } else {
        resolvedItems.push({ itemTemplateId: template.id, itemName: template.name, quantity: reqItem.quantity });
      }
    }
    if (missingItems.length > 0) {
      return res.status(400).json({ error: 'Insufficient items', missing: missingItems });
    }

    // 6. Check poster has gold for wage
    if (character.gold < wage) {
      return res.status(400).json({ error: `Insufficient gold. You have ${character.gold}g, wage costs ${wage}g.` });
    }

    // 7. Check active delivery job limit
    const [{ total: activeCount }] = await db.select({ total: count() }).from(jobs).where(
      and(eq(jobs.posterId, character.id), eq(jobs.category, 'DELIVERY'), eq(jobs.status, 'OPEN')),
    );
    if (activeCount >= DELIVERY_JOB_CONFIG.maxActivePerPoster) {
      return res.status(400).json({ error: `You can have at most ${DELIVERY_JOB_CONFIG.maxActivePerPoster} open delivery jobs` });
    }

    // 8. Calculate expiration
    const expiresAt = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();

    // 9. Transaction: escrow gold + consume items + create job
    const title = `Deliver to ${destTown.name}`;
    const description = resolvedItems.map(i => `${i.quantity}x ${i.itemName}`).join(', ');

    const [job] = await db.transaction(async (tx) => {
      // Deduct wage
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${wage}` })
        .where(eq(characters.id, character.id));

      // Consume items from poster's inventory
      await consumeIngredients(tx, resolvedItems, inventoryByTemplate as any);

      // Create job
      return tx.insert(jobs).values({
        id: crypto.randomUUID(),
        category: 'DELIVERY',
        townId,
        destinationTownId,
        posterId: character.id,
        deliveryItems: resolvedItems,
        title,
        description,
        wage,
        status: 'OPEN',
        expiresAt,
      }).returning();
    });

    return res.status(201).json({
      success: true,
      job: {
        id: job.id,
        category: job.category,
        title: job.title,
        destinationTownName: destTown.name,
        pay: job.wage,
        status: job.status,
        deliveryItems: resolvedItems,
        expiresAt: job.expiresAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-post-delivery', req)) return;
    logRouteError(req, 500, 'Jobs post-delivery error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/pickup — Poster collects delivered items (FREE ACTION)
// ============================================================

router.post('/:id/pickup', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.category !== 'DELIVERY') {
      return res.status(400).json({ error: 'This is not a delivery job' });
    }
    if (job.status !== 'DELIVERED') {
      return res.status(400).json({ error: `Cannot pick up — job status is ${job.status}` });
    }
    if (job.posterId !== character.id) {
      return res.status(403).json({ error: 'Only the job poster can pick up delivered items' });
    }
    if (character.currentTownId !== job.destinationTownId) {
      const destTown = await db.query.towns.findFirst({
        where: eq(towns.id, job.destinationTownId!),
        columns: { name: true },
      });
      return res.status(400).json({
        error: `You must be in ${destTown?.name ?? 'the destination town'} to pick up this delivery`,
      });
    }

    // Create item instances in poster's personal inventory
    const deliveryItems = job.deliveryItems as Array<{ itemTemplateId: string; itemName: string; quantity: number }>;

    await db.transaction(async (tx) => {
      for (const di of deliveryItems) {
        const [item] = await tx.insert(items).values({
          id: crypto.randomUUID(),
          templateId: di.itemTemplateId,
          ownerId: character.id,
          quality: 'COMMON',
          enchantments: [],
        }).returning();
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: item.id,
          quantity: di.quantity,
        });
      }

      await tx.update(jobs)
        .set({ status: 'COMPLETED' })
        .where(eq(jobs.id, id));
    });

    return res.json({
      success: true,
      message: 'Delivery collected!',
      items: deliveryItems,
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-pickup', req)) return;
    logRouteError(req, 500, 'Jobs pickup error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/jobs/pickups — List all DELIVERED jobs for the poster
// ============================================================

router.get('/pickups', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const deliveredJobs = await db.query.jobs.findMany({
      where: and(
        eq(jobs.posterId, character.id),
        eq(jobs.category, 'DELIVERY'),
        eq(jobs.status, 'DELIVERED'),
      ),
      with: {
        destinationTown: { columns: { id: true, name: true } },
        worker: { columns: { id: true, name: true } },
      },
      orderBy: desc(jobs.completedAt),
    });

    return res.json({
      pickups: deliveredJobs.map(j => ({
        id: j.id,
        title: j.title,
        destinationTownId: j.destinationTownId,
        destinationTownName: j.destinationTown?.name,
        deliveryItems: j.deliveryItems,
        workerName: j.worker?.name,
        deliveredAt: j.completedAt,
        canPickUp: character.currentTownId === j.destinationTownId,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-pickups', req)) return;
    logRouteError(req, 500, 'Jobs pickups error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
