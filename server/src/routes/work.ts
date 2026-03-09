import crypto from 'crypto';
import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, sql, count } from 'drizzle-orm';
import {
  gatheringActions,
  craftingActions,
  resources,
  townResources,
  playerProfessions,
  towns,
  characterEquipment,
  items,
  itemTemplates,
  inventories,
  characters,
} from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import type { ProfessionType, ResourceType, Race } from '@shared/enums';
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
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { calculateWeightState } from '../services/weight-calculator';

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
    error: `Invalid gathering profession. Must be one of: ${GATHERING_PROFESSIONS.join(', ')}`,
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
 * Look up the tool equipped in the TOOL slot. Returns null if no tool
 * is equipped or if the equipped tool doesn't match the given profession.
 */
async function getEquippedTool(characterId: string, professionType: ProfessionType) {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(
      eq(characterEquipment.characterId, characterId),
      eq(characterEquipment.slot, 'TOOL'),
    ),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'TOOL') return null;

  const stats = equip.item.itemTemplate.stats as Record<string, unknown>;
  if (stats.professionType !== professionType) return null;

  return {
    equipmentId: equip.id,
    item: equip.item,
    template: equip.item.itemTemplate,
    speedBonus: (stats.speedBonus as number) ?? 0,
    yieldBonus: (stats.yieldBonus as number) ?? 0,
  };
}

// POST /api/work/start
router.post('/start', authGuard, characterGuard, requireTown, validate(startWorkSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType, resourceId } = req.body;
    const profEnum = professionType as ProfessionType;
    const character = req.character!;

    if (!character.currentTownId) {
      return res.status(400).json({ error: 'Character is not in a town' });
    }

    // Check not already traveling
    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'Cannot work while traveling' });
    }

    // Check not already gathering
    const activeGathering = await db.query.gatheringActions.findFirst({
      where: and(
        eq(gatheringActions.characterId, character.id),
        eq(gatheringActions.status, 'IN_PROGRESS'),
      ),
    });
    if (activeGathering) {
      return res.status(400).json({ error: 'Already working on a gathering action' });
    }

    // Check not already crafting
    const activeCrafting = await db.query.craftingActions.findFirst({
      where: and(
        eq(craftingActions.characterId, character.id),
        eq(craftingActions.status, 'IN_PROGRESS'),
      ),
    });
    if (activeCrafting) {
      return res.status(400).json({ error: 'Cannot work while crafting' });
    }

    // Validate resource exists
    const resource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Validate this profession can gather this resource type
    const allowedTypes = PROFESSION_RESOURCE_MAP[profEnum];
    if (!allowedTypes || !allowedTypes.includes(resource.type as ResourceType)) {
      return res.status(400).json({
        error: `${professionType} cannot gather ${resource.type} resources`,
      });
    }

    // Validate the character's town has this resource type
    const townResource = await db.query.townResources.findFirst({
      where: and(
        eq(townResources.townId, character.currentTownId),
        eq(townResources.resourceType, resource.type),
      ),
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
    let profession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, character.id),
        eq(playerProfessions.professionType, profEnum),
      ),
    });

    if (!profession) {
      const [created] = await db.insert(playerProfessions).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        professionType: profEnum,
        tier: 'APPRENTICE',
        level: 1,
        xp: 0,
      }).returning();
      profession = created;
    }

    // Check equipped tool for speed bonus (or apply bare-hands penalty)
    const tool = await getEquippedTool(character.id, profEnum);
    const toolSpeedBonus = tool ? tool.speedBonus : -BARE_HANDS_SPEED_PENALTY;

    // Calculate gather time with enhanced racial bonuses
    const levelBonus = getProfessionLevelBonus(profession.level);
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const townForBiome = character.currentTownId
      ? await db.query.towns.findFirst({
          where: eq(towns.id, character.currentTownId),
          columns: { biome: true },
        })
      : null;
    const townBiome = townForBiome?.biome ?? null;
    const gatherBonus = getRacialGatheringBonus(character.race, subRaceData, profEnum, townBiome);
    const racialSpeedBonus = gatherBonus.speedModifier;
    const timeMultiplier = Math.max(0.25, 1 - levelBonus - racialSpeedBonus - toolSpeedBonus);
    const gatherTimeMinutes = Math.ceil(resource.baseGatherTime * timeMultiplier);

    const now = new Date();
    const completesAt = new Date(now.getTime() + gatherTimeMinutes * 60 * 1000);

    const [gatheringAction] = await db.insert(gatheringActions).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      resourceId: resource.id,
      townId: character.currentTownId,
      status: 'IN_PROGRESS',
      quantity: 0,
      tickDate: now.toISOString(),
    }).returning();

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
    if (handleDbError(error, res, 'start-work', req)) return;
    logRouteError(req, 500, 'Start work error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work/status
router.get('/status', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const activeGathering = await db.query.gatheringActions.findFirst({
      where: and(
        eq(gatheringActions.characterId, character.id),
        eq(gatheringActions.status, 'IN_PROGRESS'),
      ),
      with: {
        resource: {
          columns: { id: true, name: true, type: true, tier: true },
        },
      },
    });

    if (!activeGathering) {
      return res.json({ working: false });
    }

    // In the daily-tick model, gathering is locked in and resolved at tick.
    // Look up the profession for display
    const profession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, character.id),
      ),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });

    return res.json({
      working: true,
      ready: false,
      action: {
        id: activeGathering.id,
        resource: activeGathering.resource,
        lockedInAt: activeGathering.createdAt,
        tickDate: activeGathering.tickDate ?? null,
        message: 'Locked in for today. Will be resolved at the daily tick.',
      },
      profession: profession
        ? { type: profession.professionType, level: profession.level }
        : null,
    });
  } catch (error) {
    if (handleDbError(error, res, 'work-status', req)) return;
    logRouteError(req, 500, 'Work status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work/collect
router.post('/collect', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const activeGathering = await db.query.gatheringActions.findFirst({
      where: and(
        eq(gatheringActions.characterId, character.id),
        eq(gatheringActions.status, 'IN_PROGRESS'),
      ),
      with: {
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
    const resourceType = activeGathering.resource.type as ResourceType;
    const professionType = (Object.entries(PROFESSION_RESOURCE_MAP) as [ProfessionType, ResourceType[]][]).find(
      ([, types]) => types.includes(resourceType)
    )?.[0];

    if (!professionType) {
      return res.status(500).json({ error: 'Could not determine profession for resource' });
    }

    let profession = await db.query.playerProfessions.findFirst({
      where: and(
        eq(playerProfessions.characterId, character.id),
        eq(playerProfessions.professionType, professionType),
      ),
    });

    if (!profession) {
      const [created] = await db.insert(playerProfessions).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        professionType,
        tier: 'APPRENTICE',
        level: 1,
        xp: 0,
      }).returning();
      profession = created;
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
    const townResource = await db.query.townResources.findFirst({
      where: and(
        eq(townResources.townId, activeGathering.townId),
        eq(townResources.resourceType, activeGathering.resource.type),
      ),
    });
    if (townResource) {
      const abundanceModifier = townResource.abundance / 100;
      totalYield = Math.max(1, Math.round(totalYield * abundanceModifier));
    }

    // Apply enhanced racial yield bonus
    const subRaceData = character.subRace as { element?: string; chosenProfession?: string } | null;
    const townForBiome = await db.query.towns.findFirst({
      where: eq(towns.id, activeGathering.townId),
      columns: { biome: true },
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
    // Prefer stable-ID pattern so gathered items match recipe ingredient templateIds
    const stableResId = `resource-${activeGathering.resource.name.toLowerCase().replace(/\s+/g, '-')}`;
    let itemTemplate = await db.query.itemTemplates.findFirst({
      where: eq(itemTemplates.id, stableResId),
    });
    if (!itemTemplate) {
      itemTemplate = await db.query.itemTemplates.findFirst({
        where: and(
          eq(itemTemplates.name, activeGathering.resource.name),
          eq(itemTemplates.type, 'MATERIAL'),
        ),
      });
    }

    if (!itemTemplate) {
      const [created] = await db.insert(itemTemplates).values({
        id: stableResId,
        name: activeGathering.resource.name,
        type: 'MATERIAL',
        rarity: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
        description: `Raw ${activeGathering.resource.name} gathered from the wilds.`,
        levelRequired: 1,
      }).returning();
      itemTemplate = created;
    }

    // Create item and add to inventory, update profession, mark gathering complete — all in a transaction
    await db.transaction(async (tx) => {
      // Create the item
      const [item] = await tx.insert(items).values({
        id: crypto.randomUUID(),
        templateId: itemTemplate!.id,
        ownerId: character.id,
        quality: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
      }).returning();

      // Check if player already has this item in inventory
      // Load all inventory entries and filter in app code (nested where not supported in Drizzle with)
      const charInventory = await tx.query.inventories.findMany({
        where: eq(inventories.characterId, character.id),
        with: { item: true },
      });
      const existingSlot = charInventory.find(inv => inv.item.templateId === itemTemplate!.id);

      if (existingSlot) {
        await tx.update(inventories).set({
          quantity: existingSlot.quantity + totalYield,
        }).where(eq(inventories.id, existingSlot.id));
        // Remove the extra item we just created since we're stacking
        await tx.delete(items).where(eq(items.id, item.id));
      } else {
        await tx.insert(inventories).values({
          id: crypto.randomUUID(),
          characterId: character.id,
          itemId: item.id,
          quantity: totalYield,
        });
      }

      // Mark gathering complete
      await tx.update(gatheringActions).set({
        status: 'COMPLETED',
        quantity: totalYield,
      }).where(eq(gatheringActions.id, activeGathering.id));

      // Reduce town resource abundance
      if (townResource) {
        const newAbundance = Math.max(0, townResource.abundance - ABUNDANCE_DEPLETION_PER_GATHER);
        await tx.update(townResources).set({
          abundance: newAbundance,
        }).where(eq(townResources.id, townResource.id));
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
    onResourceGather(character.id, activeGathering.resource.type as ResourceType, totalYield);

    // Grant character XP from gathering (half of profession XP)
    const characterXpGain = Math.max(1, Math.floor(xpGained / 2));
    await db.update(characters).set({
      xp: sql`${characters.xp} + ${characterXpGain}`,
    }).where(eq(characters.id, character.id));

    // Check for level up after character XP grant
    await checkLevelUp(character.id);

    // Check gathering achievements
    const [gatheringCountResult] = await db.select({ value: count() }).from(gatheringActions).where(
      and(
        eq(gatheringActions.characterId, character.id),
        eq(gatheringActions.status, 'COMPLETED'),
      ),
    );
    await checkAchievements(character.id, 'gathering', { completed: gatheringCountResult.value });

    // Decrement tool durability after successful gather
    let toolResult: { broken: boolean; name: string; remaining: number } | null = null;
    if (tool) {
      const newDurability = tool.item.currentDurability - 1;
      if (newDurability <= 0) {
        // Tool breaks: remove from equipment and mark durability 0
        await db.transaction(async (tx) => {
          await tx.update(items).set({
            currentDurability: 0,
          }).where(eq(items.id, tool.item.id));
          await tx.delete(characterEquipment).where(eq(characterEquipment.id, tool.equipmentId));
        });
        toolResult = { broken: true, name: tool.template.name, remaining: 0 };

        // Emit socket event for tool breakage
        emitToolBroken(character.id, {
          itemId: tool.item.id,
          toolName: tool.template.name,
          professionType,
        });
      } else {
        await db.update(items).set({
          currentDurability: newDurability,
        }).where(eq(items.id, tool.item.id));
        toolResult = { broken: false, name: tool.template.name, remaining: newDurability };
      }
    }

    const weightState = await calculateWeightState(character.id);

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
      weightState,
    });
  } catch (error) {
    if (handleDbError(error, res, 'collect-work', req)) return;
    logRouteError(req, 500, 'Collect work error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/work/cancel
router.post('/cancel', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const activeGathering = await db.query.gatheringActions.findFirst({
      where: and(
        eq(gatheringActions.characterId, character.id),
        eq(gatheringActions.status, 'IN_PROGRESS'),
      ),
      with: {
        resource: true,
      },
    });

    if (!activeGathering) {
      return res.status(400).json({ error: 'No active gathering action to cancel' });
    }

    const now = new Date();
    const elapsed = now.getTime() - new Date(activeGathering.createdAt).getTime();
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

    await db.transaction(async (tx) => {
      // Mark gathering as cancelled
      await tx.update(gatheringActions).set({
        status: 'CANCELLED',
        quantity: partialYield,
      }).where(eq(gatheringActions.id, activeGathering.id));

      // If partial yield, add items to inventory
      if (partialYield > 0) {
        let itemTemplate = await tx.query.itemTemplates.findFirst({
          where: and(
            eq(itemTemplates.name, activeGathering.resource.name),
            eq(itemTemplates.type, 'MATERIAL'),
          ),
        });

        if (!itemTemplate) {
          const [created] = await tx.insert(itemTemplates).values({
            id: crypto.randomUUID(),
            name: activeGathering.resource.name,
            type: 'MATERIAL',
            rarity: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
            description: `Raw ${activeGathering.resource.name} gathered from the wilds.`,
            levelRequired: 1,
          }).returning();
          itemTemplate = created;
        }

        // Load all inventory entries and filter in app code
        const charInventory = await tx.query.inventories.findMany({
          where: eq(inventories.characterId, character.id),
          with: { item: true },
        });
        const existingSlot = charInventory.find(inv => inv.item.templateId === itemTemplate!.id);

        if (existingSlot) {
          await tx.update(inventories).set({
            quantity: existingSlot.quantity + partialYield,
          }).where(eq(inventories.id, existingSlot.id));
        } else {
          const [item] = await tx.insert(items).values({
            id: crypto.randomUUID(),
            templateId: itemTemplate.id,
            ownerId: character.id,
            quality: activeGathering.resource.tier <= 2 ? 'COMMON' : activeGathering.resource.tier <= 3 ? 'FINE' : 'SUPERIOR',
          }).returning();
          await tx.insert(inventories).values({
            id: crypto.randomUUID(),
            characterId: character.id,
            itemId: item.id,
            quantity: partialYield,
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
    if (handleDbError(error, res, 'cancel-work', req)) return;
    logRouteError(req, 500, 'Cancel work error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/work/professions
router.get('/professions', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const charProfessions = await db.query.playerProfessions.findMany({
      where: eq(playerProfessions.characterId, character.id),
      orderBy: (t, { desc }) => [desc(t.level)],
    });

    return res.json({
      professions: charProfessions.map((p) => ({
        type: p.professionType,
        tier: p.tier,
        level: p.level,
        xp: p.xp,
        xpToNextLevel: ((p.level) * 100) - p.xp,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'get-professions', req)) return;
    logRouteError(req, 500, 'Get professions error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
