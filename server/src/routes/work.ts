import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { ProfessionType, ResourceType, Race } from '@prisma/client';
import { getRace } from '@shared/data/races';
import { getProficiencyBonus, getModifier as getStatModifier } from '@shared/utils/bounded-accuracy';
import { getProfessionByType } from '@shared/data/professions';
import { onResourceGather } from '../services/quest-triggers';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { addProfessionXP } from '../services/profession-xp';
import { BARE_HANDS_SPEED_PENALTY, BARE_HANDS_YIELD_PENALTY } from '@shared/data/tools';
import { ACTION_XP } from '@shared/data/progression';
import { emitToolBroken, emitGatheringDepleted } from '../socket/events';
import {
  getRacialGatheringBonus,
  getRacialCraftSpeedBonus,
  getRacialMaterialReduction,
} from '../services/racial-profession-bonuses';
import {
  getForgebornOverclockMultiplier,
  getMaxQueueSlots,
  applyGnomeEurekaMoment,
} from '../services/racial-special-profession-mechanics';

const router = Router();

// Profession-to-resource mapping: which professions can gather which resource types
const PROFESSION_RESOURCE_MAP: Partial<Record<ProfessionType, ResourceType[]>> = {
  MINER: ['ORE', 'STONE'],
  LUMBERJACK: ['WOOD'],
  FARMER: ['GRAIN', 'FIBER'],
  HERBALIST: ['HERB', 'REAGENT'],
  FISHERMAN: ['FISH'],
  HUNTER: ['HIDE', 'ANIMAL_PRODUCT'],
};

// Only gathering professions are valid for work
const GATHERING_PROFESSIONS = Object.keys(PROFESSION_RESOURCE_MAP) as ProfessionType[];

// How much abundance is consumed per gather action
const ABUNDANCE_DEPLETION_PER_GATHER = 2;
// Minimum abundance required to start gathering
const MIN_ABUNDANCE_TO_GATHER = 10;

const startWorkSchema = z.object({
  professionType: z.enum(GATHERING_PROFESSIONS as [string, ...string[]], {
    errorMap: () => ({
      message: `Invalid gathering profession. Must be one of: ${GATHERING_PROFESSIONS.join(', ')}`,
    }),
  }),
  resourceId: z.string().min(1, 'Resource ID is required'),
});

function raceEnumToRegistryKey(race: Race): string {
  return race.toLowerCase();
}

function getProfessionLevelBonus(level: number): number {
  return level * 0.005;
}

function getRacialSpeedBonus(race: Race, professionType: ProfessionType): number {
  const registryKey = raceEnumToRegistryKey(race);
  const raceDef = getRace(registryKey);
  if (!raceDef) return 0;

  const profKey = professionType.toLowerCase();
  const bonus = raceDef.professionBonuses.find(
    (b) => b.professionType === profKey || b.professionType === profKey.replace('_', '')
  );
  return bonus?.speedBonus ?? 0;
}

function getRacialYieldBonus(race: Race, professionType: ProfessionType): number {
  const registryKey = raceEnumToRegistryKey(race);
  const raceDef = getRace(registryKey);
  if (!raceDef) return 0;

  const profKey = professionType.toLowerCase();
  const bonus = raceDef.professionBonuses.find(
    (b) => b.professionType === profKey || b.professionType === profKey.replace('_', '')
  );
  return bonus?.yieldBonus ?? 0;
}

function getRacialXpBonus(race: Race, professionType: ProfessionType): number {
  const registryKey = raceEnumToRegistryKey(race);
  const raceDef = getRace(registryKey);
  if (!raceDef) return 0;

  const profKey = professionType.toLowerCase();
  const bonus = raceDef.professionBonuses.find(
    (b) => b.professionType === profKey || b.professionType === profKey.replace('_', '')
  );
  return bonus?.xpBonus ?? 0;
}

/**
 * Look up the tool equipped in the MAIN_HAND slot. Returns null if no tool
 * is equipped or if the equipped tool doesn't match the given profession.
 */
async function getEquippedTool(characterId: string, professionType: ProfessionType) {
  const equip = await prisma.characterEquipment.findUnique({
    where: {
      characterId_slot: { characterId, slot: 'MAIN_HAND' },
    },
    include: { item: { include: { template: true } } },
  });

  if (!equip || equip.item.template.type !== 'TOOL') return null;

  const stats = equip.item.template.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return null;

  return {
    equipmentId: equip.id,
    item: equip.item,
    template: equip.item.template,
    speedBonus: (stats.speedBonus as number) ?? 0,
    yieldBonus: (stats.yieldBonus as number) ?? 0,
  };
}

// POST /api/work/start
router.post('/start', authGuard, characterGuard, validate(startWorkSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType, resourceId } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'Character is not in a town' });
    }

    // Check not already traveling
    const activeTravel = await prisma.travelAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    if (activeTravel) {
      return res.status(400).json({ error: 'Cannot work while traveling' });
    }

    // Check not already gathering
    const activeGathering = await prisma.gatheringAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    if (activeGathering) {
      return res.status(400).json({ error: 'Already working on a gathering action' });
    }

    // Check not already crafting
    const activeCrafting = await prisma.craftingAction.findFirst({
      where: { characterId: character.id, status: 'IN_PROGRESS' },
    });
    if (activeCrafting) {
      return res.status(400).json({ error: 'Cannot work while crafting' });
    }

    // Validate resource exists
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Validate this profession can gather this resource type
    const allowedTypes = PROFESSION_RESOURCE_MAP[profEnum];
    if (!allowedTypes || !allowedTypes.includes(resource.type)) {
      return res.status(400).json({
        error: `${professionType} cannot gather ${resource.type} resources`,
      });
    }

    // Validate the character's town has this resource type
    const townResource = await prisma.townResource.findFirst({
      where: {
        townId: character.currentTownId,
        resourceType: resource.type,
      },
    });
    if (!townResource) {
      return res.status(400).json({ error: 'This resource type is not available in your current town' });
    }

    // Check resource depletion: block if abundance too low
    if (townResource.abundance < MIN_ABUNDANCE_TO_GATHER) {
      return res.status(400).json({
        error: 'Resources in this area are depleted. Try again later or travel to another town.',
        abundance: townResource.abundance,
      });
    }

    // Get or create the character's profession
    let profession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: character.id,
          professionType: profEnum,
        },
      },
    });

    if (!profession) {
      profession = await prisma.playerProfession.create({
        data: {
          characterId: character.id,
          professionType: profEnum,
          tier: 'APPRENTICE',
          level: 1,
          xp: 0,
        },
      });
    }

    // Check equipped tool for speed bonus (or apply bare-hands penalty)
    const tool = await getEquippedTool(character.id, profEnum);
    const toolSpeedBonus = tool ? tool.speedBonus : -BARE_HANDS_SPEED_PENALTY;

    // Calculate gather time with enhanced racial bonuses
    const levelBonus = getProfessionLevelBonus(profession.level);
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const townBiome = character.currentTownId
      ? (await prisma.town.findUnique({ where: { id: character.currentTownId }, select: { biome: true } }))?.biome ?? null
      : null;
    const gatherBonus = getRacialGatheringBonus(character.race, subRaceData, profEnum, townBiome);
    const racialSpeedBonus = gatherBonus.speedModifier;
    const timeMultiplier = Math.max(0.25, 1 - levelBonus - racialSpeedBonus - toolSpeedBonus);
    const gatherTimeMinutes = Math.ceil(resource.baseGatherTime * timeMultiplier);

    const now = new Date();
    const completesAt = new Date(now.getTime() + gatherTimeMinutes * 60 * 1000);

    const gatheringAction = await prisma.gatheringAction.create({
      data: {
        characterId: character.id,
        resourceId: resource.id,
        townId: character.currentTownId,
        status: 'IN_PROGRESS',
        quantity: 0,
        tickDate: now,
      },
    });

    return res.status(201).json({
      action: {
        id: gatheringAction.id,
        resource: {
          id: resource.id,
          name: resource.name,
          type: resource.type,
        },
        profession: {
          type: profession.professionType,
          level: profession.level,
        },
        tool: tool
          ? { name: tool.template.name, durability: tool.item.currentDurability, maxDurability: tool.template.durability }
          : null,
        bareHands: !tool,
        lockedInAt: now.toISOString(),
        tickDate: now.toISOString(),
        message: 'Locked in for today. Will be resolved at the daily tick.',
      },
    });
  } catch (error) {
    console.error('Start work error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work/status
router.get('/status', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeGathering = await prisma.gatheringAction.findFirst({
      where: {
        characterId: character.id,
        status: 'IN_PROGRESS',
      },
      include: {
        resource: { select: { id: true, name: true, type: true, tier: true } },
      },
    });

    if (!activeGathering) {
      return res.json({ working: false });
    }

    // In the daily-tick model, gathering is locked in and resolved at tick.
    // Look up the profession for display
    const profession = await prisma.playerProfession.findFirst({
      where: {
        characterId: character.id,
        professionType: { in: GATHERING_PROFESSIONS },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      working: true,
      ready: false,
      action: {
        id: activeGathering.id,
        resource: activeGathering.resource,
        lockedInAt: activeGathering.createdAt.toISOString(),
        tickDate: activeGathering.tickDate?.toISOString() ?? null,
        message: 'Locked in for today. Will be resolved at the daily tick.',
      },
      profession: profession
        ? { type: profession.professionType, level: profession.level }
        : null,
    });
  } catch (error) {
    console.error('Work status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work/collect
router.post('/collect', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeGathering = await prisma.gatheringAction.findFirst({
      where: {
        characterId: character.id,
        status: 'IN_PROGRESS',
      },
      include: {
        resource: true,
      },
    });

    if (!activeGathering) {
      return res.status(400).json({ error: 'No active gathering action' });
    }

    // In the daily-tick model, gathering completion is handled by the tick processor.
    // If status is still IN_PROGRESS, it hasn't been resolved yet.
    if (activeGathering.status === 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Gathering is not yet complete. It will be resolved at the daily tick.' });
    }

    // Determine which profession was used
    const resourceType = activeGathering.resource.type;
    const professionType = (Object.entries(PROFESSION_RESOURCE_MAP) as [ProfessionType, ResourceType[]][]).find(
      ([, types]) => types.includes(resourceType)
    )?.[0];

    if (!professionType) {
      return res.status(500).json({ error: 'Could not determine profession for resource' });
    }

    let profession = await prisma.playerProfession.findUnique({
      where: {
        characterId_professionType: {
          characterId: character.id,
          professionType,
        },
      },
    });

    if (!profession) {
      profession = await prisma.playerProfession.create({
        data: {
          characterId: character.id,
          professionType,
          tier: 'APPRENTICE',
          level: 1,
          xp: 0,
        },
      });
    }

    // Roll for yield: base 1-3 + d20 + proficiency + stat modifier
    const baseYield = 1 + Math.floor(Math.random() * 3); // 1-3
    const d20 = 1 + Math.floor(Math.random() * 20); // 1-20
    const profDef = getProfessionByType(professionType);
    const characterStats = character.stats as Record<string, number>;
    const primaryStatKey = profDef?.primaryStat?.toLowerCase() ?? 'con';
    const statMod = getStatModifier(characterStats[primaryStatKey] ?? 10);
    const d20Roll = d20 + getProficiencyBonus(character.level) + statMod;
    let totalYield = baseYield + Math.max(0, d20Roll - 10); // bonus from roll exceeding DC 10

    // Apply town abundance modifier (abundance is 0-100, scale as percentage)
    const townResource = await prisma.townResource.findFirst({
      where: {
        townId: activeGathering.townId,
        resourceType: activeGathering.resource.type,
      },
    });
    if (townResource) {
      const abundanceModifier = townResource.abundance / 100;
      totalYield = Math.max(1, Math.round(totalYield * abundanceModifier));
    }

    // Apply enhanced racial yield bonus
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const townForBiome = await prisma.town.findUnique({
      where: { id: activeGathering.townId },
      select: { biome: true },
    });
    const gatherBonus = getRacialGatheringBonus(
      character.race,
      subRaceData,
      professionType,
      townForBiome?.biome ?? null,
    );
    const racialYieldBonus = gatherBonus.yieldMultiplier - gatherBonus.penalty;
    if (racialYieldBonus !== 0) {
      totalYield = Math.max(1, Math.round(totalYield * (1 + racialYieldBonus)));
    }

    // Apply tool yield bonus (or bare-hands penalty)
    const tool = await getEquippedTool(character.id, professionType);
    if (tool) {
      totalYield = Math.max(1, Math.round(totalYield * (1 + tool.yieldBonus)));
    } else {
      totalYield = Math.max(1, Math.round(totalYield * (1 - BARE_HANDS_YIELD_PENALTY)));
    }

    // Award XP: 15-30 based on resource tier (rebalanced for daily action economy)
    const baseXp = ACTION_XP.WORK_GATHER_BASE + (activeGathering.resource.tier - 1) * ACTION_XP.WORK_GATHER_PER_TIER; // T1=15, T2=20, T3=25, T4=30
    const racialXpBonus = getRacialXpBonus(character.race, professionType);
    const xpGained = Math.round(baseXp * (1 + racialXpBonus));

    // Find or create an ItemTemplate for this resource material
    let itemTemplate = await prisma.itemTemplate.findFirst({
      where: {
        name: activeGathering.resource.name,
        type: 'MATERIAL',
      },
    });

    if (!itemTemplate) {
      itemTemplate = await prisma.itemTemplate.create({
        data: {
          name: activeGathering.resource.name,
          type: 'MATERIAL',
          rarity: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
          description: `Raw ${activeGathering.resource.name} gathered from the wilds.`,
          levelRequired: 1,
        },
      });
    }

    // Create item and add to inventory, update profession, mark gathering complete — all in a transaction
    await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.item.create({
        data: {
          templateId: itemTemplate!.id,
          ownerId: character.id,
          quality: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
        },
      });

      // Check if player already has this item in inventory
      const existingSlot = await tx.inventory.findFirst({
        where: {
          characterId: character.id,
          item: { templateId: itemTemplate!.id },
        },
      });

      if (existingSlot) {
        await tx.inventory.update({
          where: { id: existingSlot.id },
          data: { quantity: existingSlot.quantity + totalYield },
        });
        // Remove the extra item we just created since we're stacking
        await tx.item.delete({ where: { id: item.id } });
      } else {
        await tx.inventory.create({
          data: {
            characterId: character.id,
            itemId: item.id,
            quantity: totalYield,
          },
        });
      }

      // Mark gathering complete
      await tx.gatheringAction.update({
        where: { id: activeGathering.id },
        data: {
          status: 'COMPLETED',
          quantity: totalYield,
        },
      });

      // Reduce town resource abundance
      if (townResource) {
        const newAbundance = Math.max(0, townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER);
        await tx.townResource.update({
          where: { id: townResource.id },
          data: { abundance: newAbundance },
        });
        townResource.abundance = newAbundance;
      }
    });

    // Emit depletion warning if abundance is critically low
    if (townResource && townResource.abundance < 20) {
      emitGatheringDepleted(character.id, {
        townId: activeGathering.townId,
        resourceType: activeGathering.resource.type,
        abundance: townResource.abundance,
      });
    }

    // Award profession XP via centralized service (handles level-up, tier, logging, socket)
    const xpResult = await addProfessionXP(
      character.id,
      professionType,
      xpGained,
      `gathered_${activeGathering.resource.name.toLowerCase().replace(/\s+/g, '_')}`,
    );

    // Trigger quest progress for GATHER objectives
    onResourceGather(character.id, activeGathering.resource.type, totalYield);

    // Grant character XP from gathering (half of profession XP)
    const characterXpGain = Math.max(1, Math.floor(xpGained / 2));
    await prisma.character.update({
      where: { id: character.id },
      data: { xp: { increment: characterXpGain } },
    });

    // Check for level up after character XP grant
    await checkLevelUp(character.id);

    // Check gathering achievements
    const gatheringCount = await prisma.gatheringAction.count({
      where: { characterId: character.id, status: 'COMPLETED' },
    });
    await checkAchievements(character.id, 'gathering', { completed: gatheringCount });

    // Decrement tool durability after successful gather
    let toolResult: { broken: boolean; name: string; remaining: number } | null = null;
    if (tool) {
      const newDurability = tool.item.currentDurability - 1;
      if (newDurability <= 0) {
        // Tool breaks: remove from equipment and mark durability 0
        await prisma.$transaction([
          prisma.item.update({
            where: { id: tool.item.id },
            data: { currentDurability: 0 },
          }),
          prisma.characterEquipment.delete({
            where: { id: tool.equipmentId },
          }),
        ]);
        toolResult = { broken: true, name: tool.template.name, remaining: 0 };

        // Emit socket event for tool breakage
        emitToolBroken(character.id, {
          itemId: tool.item.id,
          toolName: tool.template.name,
          professionType,
        });
      } else {
        await prisma.item.update({
          where: { id: tool.item.id },
          data: { currentDurability: newDurability },
        });
        toolResult = { broken: false, name: tool.template.name, remaining: newDurability };
      }
    }

    return res.json({
      collected: {
        resource: activeGathering.resource.name,
        quantity: totalYield,
      },
      profession: {
        type: professionType,
        level: xpResult.newLevel,
        xp: xpResult.newXp,
        xpGained: xpResult.xpGained,
        tier: xpResult.newTier,
        leveledUp: xpResult.leveledUp,
      },
      characterXpGained: characterXpGain,
      tool: toolResult,
      depletion: townResource
        ? { abundance: townResource.abundance, depleted: townResource.abundance < MIN_ABUNDANCE_TO_GATHER }
        : null,
    });
  } catch (error) {
    console.error('Collect work error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work/cancel
router.post('/cancel', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeGathering = await prisma.gatheringAction.findFirst({
      where: {
        characterId: character.id,
        status: 'IN_PROGRESS',
      },
      include: {
        resource: true,
      },
    });

    if (!activeGathering) {
      return res.status(400).json({ error: 'No active gathering action to cancel' });
    }

    const now = new Date();
    const elapsed = now.getTime() - activeGathering.createdAt.getTime();
    // In the daily-tick model, there's no timer-based completion.
    // Use a fixed "1 day" window to approximate percent complete for partial yield.
    const dayMs = 24 * 60 * 60 * 1000;
    const percentComplete = Math.min(1, elapsed / dayMs);

    // If 50%+ complete, grant partial yield proportional to time spent
    let partialYield = 0;
    if (percentComplete >= 0.5) {
      // Base yield calculation (same as collect but scaled)
      const baseYield = 1 + Math.floor(Math.random() * 3);
      partialYield = Math.max(1, Math.floor(baseYield * percentComplete));
    }

    await prisma.$transaction(async (tx) => {
      // Mark gathering as cancelled
      await tx.gatheringAction.update({
        where: { id: activeGathering.id },
        data: {
          status: 'CANCELLED',
          quantity: partialYield,
        },
      });

      // If partial yield, add items to inventory
      if (partialYield > 0) {
        let itemTemplate = await tx.itemTemplate.findFirst({
          where: {
            name: activeGathering.resource.name,
            type: 'MATERIAL',
          },
        });

        if (!itemTemplate) {
          itemTemplate = await tx.itemTemplate.create({
            data: {
              name: activeGathering.resource.name,
              type: 'MATERIAL',
              rarity: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
              description: `Raw ${activeGathering.resource.name} gathered from the wilds.`,
              levelRequired: 1,
            },
          });
        }

        const existingSlot = await tx.inventory.findFirst({
          where: {
            characterId: character.id,
            item: { templateId: itemTemplate.id },
          },
        });

        if (existingSlot) {
          await tx.inventory.update({
            where: { id: existingSlot.id },
            data: { quantity: existingSlot.quantity + partialYield },
          });
        } else {
          const item = await tx.item.create({
            data: {
              templateId: itemTemplate.id,
              ownerId: character.id,
              quality: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
            },
          });
          await tx.inventory.create({
            data: {
              characterId: character.id,
              itemId: item.id,
              quantity: partialYield,
            },
          });
        }
      }
    });

    return res.json({
      cancelled: true,
      percentComplete: Math.round(percentComplete * 100),
      partialYield: partialYield > 0
        ? { resource: activeGathering.resource.name, quantity: partialYield }
        : null,
    });
  } catch (error) {
    console.error('Cancel work error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work/professions
router.get('/professions', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const professions = await prisma.playerProfession.findMany({
      where: { characterId: character.id },
      orderBy: { level: 'desc' },
    });

    return res.json({
      professions: professions.map((p) => ({
        type: p.professionType,
        tier: p.tier,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: ((p.level) * 100) - p.xp,
      })),
    });
  } catch (error) {
    console.error('Get professions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
