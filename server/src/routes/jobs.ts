// ---------------------------------------------------------------------------
// Jobs Routes — Unified job board with gold escrow
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ownedAssets, jobs, dailyActions, playerProfessions, houses, houseStorage, itemTemplates, characters } from '@database/tables';
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
import { JOB_TYPE_LABELS, ASSET_JOB_TYPES } from '@shared/data/jobs-config';

const router = Router();

// --- Local mappings ---

const RANCHER_SPOT_TO_JOB: Record<string, string> = {
  chicken_coop: 'gather_eggs',
  dairy_barn: 'milk_cows',
  sheep_pen: 'shear_sheep',
};

const postJobSchema = z.object({
  assetId: z.string().uuid(),
  jobType: z.enum(ASSET_JOB_TYPES),
  pay: z.number().int().min(1, 'Pay must be at least 1 gold'),
});

// ============================================================
// POST /api/jobs/post — Post a job (FREE ACTION, works remotely)
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
      // Deduct gold from poster (escrow)
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${pay}` })
        .where(eq(characters.id, character.id));

      // Create job
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

    const asset = job.ownedAsset;
    if (!asset) {
      return res.status(400).json({ error: 'Job asset no longer exists' });
    }

    // 2. Validations
    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: 'This job is no longer available' });
    }
    if (character.currentTownId !== job.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the job' });
    }
    if (job.posterId === character.id) {
      return res.status(400).json({ error: 'You cannot accept your own job' });
    }

    // 3. Check daily action not used
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

    return res.json({
      jobs: openJobs.map((j) => ({
        id: j.id,
        category: j.category,
        jobType: j.jobType,
        jobLabel: JOB_TYPE_LABELS[j.jobType ?? ''] || j.jobType,
        title: j.title,
        pay: j.wage,
        assetId: j.ownedAsset?.id,
        assetName: j.ownedAsset?.name,
        assetType: j.ownedAsset?.spotType,
        assetTier: j.ownedAsset?.tier,
        professionType: j.ownedAsset?.professionType,
        ownerName: j.poster.name,
        ownerId: j.poster.id,
        autoPosted: j.autoPosted,
        createdAt: j.createdAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-browse', req)) return;
    logRouteError(req, 500, 'Jobs browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/cancel — Cancel a job (refund escrowed gold)
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
    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot cancel — job status is ${job.status}` });
    }

    // Refund escrowed gold and cancel in a transaction
    await db.transaction(async (tx) => {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} + ${job.wage}` })
        .where(eq(characters.id, job.posterId));

      await tx.update(jobs)
        .set({ status: 'CANCELLED' })
        .where(eq(jobs.id, id));
    });

    return res.json({ success: true, message: 'Job cancelled. Escrowed gold refunded.' });
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
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'jobs-mine', req)) return;
    logRouteError(req, 500, 'Jobs mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
