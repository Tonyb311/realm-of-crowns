// ---------------------------------------------------------------------------
// Jobs Routes — One-shot task board for property owners and workers
// ---------------------------------------------------------------------------

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { getTodayTickDate, getNextTickTime, getGameDay } from '../lib/game-day';
import { ASSET_TIERS, PROFESSION_ASSET_TYPES } from '@shared/data/assets';
import { RESOURCE_MAP, GATHER_SPOT_PROFESSION_MAP } from '@shared/data/gathering';
import { addProfessionXP } from '../services/profession-xp';

const router = Router();

// --- Schemas ---

const JOB_TYPES_FARMER = ['harvest_field', 'plant_field'] as const;
const JOB_TYPES_RANCHER = ['gather_eggs', 'milk_cows', 'shear_sheep'] as const;
const ALL_JOB_TYPES = [...JOB_TYPES_FARMER, ...JOB_TYPES_RANCHER] as const;

const RANCHER_SPOT_TO_JOB: Record<string, string> = {
  chicken_coop: 'gather_eggs',
  dairy_barn: 'milk_cows',
  sheep_pen: 'shear_sheep',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  harvest_field: 'Harvest Field',
  plant_field: 'Plant Field',
  gather_eggs: 'Gather Eggs',
  milk_cows: 'Milk Cows',
  shear_sheep: 'Shear Sheep',
};

const postJobSchema = z.object({
  assetId: z.string().uuid(),
  jobType: z.enum(ALL_JOB_TYPES),
  pay: z.number().int().min(1, 'Pay must be at least 1 gold'),
});

// ============================================================
// POST /api/jobs/post — Post a job (FREE ACTION, works remotely)
// ============================================================

router.post('/post', authGuard, characterGuard, validate(postJobSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { assetId, jobType, pay } = req.body;

    // 1. Find asset, check ownership
    const asset = await prisma.ownedAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (asset.ownerId !== character.id) {
      return res.status(403).json({ error: 'You do not own this asset' });
    }

    // 2. Check owner can afford the pay
    if (character.gold < pay) {
      return res.status(400).json({ error: `Insufficient gold. You have ${character.gold}g, job costs ${pay}g.` });
    }

    // 3. Check no existing OPEN job for this asset
    const existingJob = await prisma.jobListing.findFirst({
      where: { assetId, status: 'OPEN' },
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
      // Must have pending yield
      if (asset.pendingYield <= 0) {
        return res.status(400).json({ error: 'No products ready for collection' });
      }
    } else {
      // FARMER and other gathering professions
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

    // 5. Create job listing
    const job = await prisma.jobListing.create({
      data: {
        assetId,
        ownerId: character.id,
        townId: asset.townId,
        jobType,
        wage: pay,
        status: 'OPEN',
      },
    });

    return res.status(201).json({
      success: true,
      job: {
        id: job.id,
        assetId: job.assetId,
        jobType: job.jobType,
        pay: job.wage,
        status: job.status,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'jobs-post', req)) return;
    logRouteError(req, 500, 'Jobs post error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/accept — Accept + execute job instantly (DAILY ACTION)
// ============================================================

router.post('/:id/accept', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    // 1. Find the job
    const job = await prisma.jobListing.findUnique({
      where: { id },
      include: { asset: true, owner: { select: { id: true, gold: true } } },
    });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // 2. Validations
    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: 'This job is no longer available' });
    }
    if (character.currentTownId !== job.townId) {
      return res.status(400).json({ error: 'You must be in the same town as the job' });
    }
    if (job.ownerId === character.id) {
      return res.status(400).json({ error: 'You cannot accept your own job' });
    }

    // 3. Check daily action not used
    const todayTick = getTodayTickDate();
    const existingAction = await prisma.dailyAction.findFirst({
      where: { characterId: character.id, tickDate: todayTick },
    });
    if (existingAction) {
      return res.status(429).json({
        error: 'Daily action already used',
        actionType: existingAction.actionType,
        resetsAt: getNextTickTime().toISOString(),
      });
    }

    // 4. Determine profession match for yield/XP bonus
    const assetProfession = GATHER_SPOT_PROFESSION_MAP[job.asset.spotType];
    const workerHasMatchingProf = assetProfession
      ? await prisma.playerProfession.findFirst({
          where: { characterId: character.id, professionType: assetProfession as any },
        })
      : null;
    const professionMatch = !!workerHasMatchingProf;
    const yieldMultiplier = professionMatch ? 1.0 : 0.5;
    const xpMultiplier = professionMatch ? 1.0 : 0.5;

    // 5. Execute the job in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 5a. Determine yield and items
      let itemsProduced: { itemName: string; quantity: number; templateId: string } | null = null;

      if (job.jobType === 'harvest_field') {
        // Harvest: FARMER field -> products to house storage
        if (job.asset.cropState !== 'READY') {
          throw new Error('Asset is no longer ready for harvest');
        }

        const tierData = ASSET_TIERS[job.asset.tier as 1 | 2 | 3];
        if (!tierData) throw new Error('Invalid asset tier');

        const baseYield = Math.floor(Math.random() * (tierData.maxYield - tierData.minYield + 1)) + tierData.minYield;
        const finalYield = Math.max(1, Math.floor(baseYield * yieldMultiplier));

        const resourceEntry = RESOURCE_MAP[job.asset.spotType];
        if (!resourceEntry) throw new Error(`Unknown spot type: ${job.asset.spotType}`);

        const gatherItem = resourceEntry.item;
        const itemName = gatherItem.templateName;
        const itemType = gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL';

        // Find/create template
        let template = await tx.itemTemplate.findFirst({ where: { name: itemName } });
        if (!template) {
          template = await tx.itemTemplate.create({
            data: {
              name: itemName,
              type: itemType as any,
              rarity: 'COMMON',
              description: gatherItem.description,
              stats: {},
              durability: 0,
              requirements: {},
              isFood: gatherItem.isFood,
              foodBuff: gatherItem.foodBuff ?? Prisma.JsonNull,
              isPerishable: gatherItem.shelfLifeDays != null,
              shelfLifeDays: gatherItem.shelfLifeDays,
            },
          });
        }

        // Put items in owner's house storage
        const house = await tx.house.findFirst({
          where: { characterId: job.ownerId, townId: job.townId },
        });
        if (house) {
          await tx.houseStorage.upsert({
            where: { houseId_itemTemplateId: { houseId: house.id, itemTemplateId: template.id } },
            update: { quantity: { increment: finalYield } },
            create: { houseId: house.id, itemTemplateId: template.id, quantity: finalYield },
          });
        }

        // Reset asset to EMPTY
        await tx.ownedAsset.update({
          where: { id: job.asset.id },
          data: { cropState: 'EMPTY', plantedAt: null, readyAt: null, witheringAt: null },
        });

        itemsProduced = { itemName, quantity: finalYield, templateId: template.id };

      } else if (job.jobType === 'plant_field') {
        // Plant: set GROWING state
        if (job.asset.cropState !== 'EMPTY') {
          throw new Error('Asset is no longer empty for planting');
        }

        const tierData = ASSET_TIERS[job.asset.tier as 1 | 2 | 3];
        if (!tierData) throw new Error('Invalid asset tier');

        const plantedAt = getGameDay();
        const readyAt = plantedAt + tierData.growthTicks;
        const witheringAt = readyAt + 3; // WITHER_TICKS

        await tx.ownedAsset.update({
          where: { id: job.asset.id },
          data: { cropState: 'GROWING', plantedAt, readyAt, witheringAt },
        });

        // No items produced for planting
      } else {
        // RANCHER collection: gather_eggs, milk_cows, shear_sheep
        const pendingYield = job.asset.pendingYield;
        if (pendingYield <= 0) {
          throw new Error('No products ready for collection');
        }

        const finalYield = Math.max(1, Math.floor(pendingYield * yieldMultiplier));

        const resourceEntry = RESOURCE_MAP[job.asset.spotType];
        if (!resourceEntry) throw new Error(`Unknown spot type: ${job.asset.spotType}`);

        const gatherItem = resourceEntry.item;
        const itemName = gatherItem.templateName;
        const itemType = gatherItem.type === 'CONSUMABLE' ? 'CONSUMABLE' : 'MATERIAL';

        let template = await tx.itemTemplate.findFirst({ where: { name: itemName } });
        if (!template) {
          template = await tx.itemTemplate.create({
            data: {
              name: itemName,
              type: itemType as any,
              rarity: 'COMMON',
              description: gatherItem.description,
              stats: {},
              durability: 0,
              requirements: {},
              isFood: gatherItem.isFood,
              foodBuff: gatherItem.foodBuff ?? Prisma.JsonNull,
              isPerishable: gatherItem.shelfLifeDays != null,
              shelfLifeDays: gatherItem.shelfLifeDays,
            },
          });
        }

        // Put items in owner's house storage
        const house = await tx.house.findFirst({
          where: { characterId: job.ownerId, townId: job.townId },
        });
        if (house) {
          await tx.houseStorage.upsert({
            where: { houseId_itemTemplateId: { houseId: house.id, itemTemplateId: template.id } },
            update: { quantity: { increment: finalYield } },
            create: { houseId: house.id, itemTemplateId: template.id, quantity: finalYield },
          });
        }

        // Reset pending yield
        await tx.ownedAsset.update({
          where: { id: job.asset.id },
          data: { pendingYield: 0, pendingYieldSince: null },
        });

        itemsProduced = { itemName, quantity: finalYield, templateId: template.id };
      }

      // 5b. Transfer gold: owner -> worker
      const actualPay = Math.min(job.wage, job.owner.gold);
      if (actualPay > 0) {
        await tx.character.update({ where: { id: job.ownerId }, data: { gold: { decrement: actualPay } } });
        await tx.character.update({ where: { id: character.id }, data: { gold: { increment: actualPay } } });
      }

      // 5c. Mark job completed
      await tx.jobListing.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          workerId: character.id,
          completedAt: new Date(),
          productYield: itemsProduced
            ? { itemName: itemsProduced.itemName, quantity: itemsProduced.quantity }
            : Prisma.JsonNull,
        },
      });

      // 5d. Create daily action (consume slot)
      await tx.dailyAction.create({
        data: {
          characterId: character.id,
          tickDate: todayTick,
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
            assetName: job.asset.name,
            pay: actualPay,
            items: itemsProduced,
            professionMatch,
          },
        },
      });

      return { actualPay, itemsProduced };
    });

    // 6. Award profession XP (outside transaction — non-critical)
    let xpAwarded = 0;
    if (assetProfession) {
      try {
        const baseXp = 10 + ((job.asset.tier || 1) * 5);
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
        assetName: job.asset.name,
      },
      reward: {
        gold: result.actualPay,
        items: result.itemsProduced ? { name: result.itemsProduced.itemName, quantity: result.itemsProduced.quantity } : null,
        xp: xpAwarded,
        professionMatch,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'jobs-accept', req)) return;
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

    const jobs = await prisma.jobListing.findMany({
      where: { townId, status: 'OPEN' },
      include: {
        asset: { select: { id: true, name: true, spotType: true, tier: true, professionType: true, pendingYield: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { wage: 'desc' },
    });

    return res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        jobType: j.jobType,
        jobLabel: JOB_TYPE_LABELS[j.jobType] || j.jobType,
        pay: j.wage,
        assetId: j.asset.id,
        assetName: j.asset.name,
        assetType: j.asset.spotType,
        assetTier: j.asset.tier,
        professionType: j.asset.professionType,
        ownerName: j.owner.name,
        ownerId: j.owner.id,
        autoPosted: j.autoPosted,
        createdAt: j.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'jobs-browse', req)) return;
    logRouteError(req, 500, 'Jobs browse error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/jobs/:id/cancel — Cancel a job
// ============================================================

router.post('/:id/cancel', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { id } = req.params;

    const job = await prisma.jobListing.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.ownerId !== character.id) {
      return res.status(403).json({ error: 'Only the job owner can cancel this job' });
    }
    if (job.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot cancel — job status is ${job.status}` });
    }

    await prisma.jobListing.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return res.json({ success: true, message: 'Job cancelled.' });
  } catch (error) {
    if (handlePrismaError(error, res, 'jobs-cancel', req)) return;
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

    const jobs = await prisma.jobListing.findMany({
      where: { ownerId: character.id, status: 'OPEN' },
      include: {
        asset: { select: { id: true, name: true, spotType: true, tier: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      jobs: jobs.map((j) => ({
        id: j.id,
        jobType: j.jobType,
        jobLabel: JOB_TYPE_LABELS[j.jobType] || j.jobType,
        pay: j.wage,
        assetId: j.asset.id,
        assetName: j.asset.name,
        status: j.status,
        autoPosted: j.autoPosted,
        createdAt: j.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'jobs-mine', req)) return;
    logRouteError(req, 500, 'Jobs mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
