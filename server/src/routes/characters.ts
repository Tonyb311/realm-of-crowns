import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { Race, DragonBloodline, BeastClan, ElementalType } from '@prisma/client';
import { getRace } from '@shared/data/races';
import { getStatAllocationCost, STAT_HARD_CAP } from '@shared/utils/bounded-accuracy';
import { getGameDay, getNextTickTime } from '../lib/game-day';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { isRaceReleased } from '../lib/content-release';
import { assignStartingTown } from '../lib/starting-town';
import { giveStartingInventory } from '../lib/starting-inventory';
import { giveStarterWeapon, giveStarterArmor } from '../lib/starting-weapons';

const router = Router();

const VALID_CLASSES = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'] as const;
type CharacterClass = typeof VALID_CLASSES[number];

const VALID_RACES = Object.values(Race);

const createCharacterSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Name must be alphanumeric (spaces allowed)'),
  race: z.enum(VALID_RACES as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid race' }),
  }),
  subRace: z.string().optional(),
  characterClass: z.enum(VALID_CLASSES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `Invalid class. Must be one of: ${VALID_CLASSES.join(', ')}` }),
  }),
});

function raceEnumToRegistryKey(race: Race): string {
  return race.toLowerCase();
}

function getClassHpBonus(charClass: CharacterClass): number {
  switch (charClass) {
    case 'warrior': return 10;
    case 'cleric': return 8;
    case 'ranger': return 8;
    case 'rogue': return 6;
    case 'bard': return 6;
    case 'mage': return 4;
    case 'psion': return 4;
  }
}

function getStartingGold(tier: 'core' | 'common' | 'exotic'): number {
  return 0; // Characters start with 0 gold — earn first gold by gathering
}

// POST /api/characters/create
router.post('/create', authGuard, validate(createCharacterSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, race, subRace, characterClass } = req.body;
    const userId = req.user!.userId;
    const raceEnum = race as Race;
    const charClass = characterClass as CharacterClass;

    // One character per user
    const existing = await prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (existing) {
      return res.status(409).json({ error: 'You already have a character' });
    }

    // Validate race exists in registry
    const registryKey = raceEnumToRegistryKey(raceEnum);
    const raceDef = getRace(registryKey);
    if (!raceDef) {
      return res.status(400).json({ error: `Race data not found for ${race}` });
    }

    // Content gating: check if race is released
    if (!(await isRaceReleased(registryKey))) {
      return res.status(400).json({ error: 'This race is not yet available' });
    }

    // Validate sub-race requirements
    let dragonBloodline: DragonBloodline | null = null;
    let beastClan: BeastClan | null = null;
    let elementalType: ElementalType | null = null;

    if (raceEnum === Race.DRAKONID) {
      if (!subRace) {
        return res.status(400).json({ error: 'Drakonid requires dragonBloodline sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!Object.values(DragonBloodline).includes(upper as DragonBloodline)) {
        return res.status(400).json({
          error: `Invalid dragon bloodline. Must be one of: ${Object.values(DragonBloodline).join(', ')}`,
        });
      }
      dragonBloodline = upper as DragonBloodline;
    } else if (raceEnum === Race.BEASTFOLK) {
      if (!subRace) {
        return res.status(400).json({ error: 'Beastfolk requires beastClan sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!Object.values(BeastClan).includes(upper as BeastClan)) {
        return res.status(400).json({
          error: `Invalid beast clan. Must be one of: ${Object.values(BeastClan).join(', ')}`,
        });
      }
      beastClan = upper as BeastClan;
    } else if (raceEnum === Race.ELEMENTARI) {
      if (!subRace) {
        return res.status(400).json({ error: 'Elementari requires elementalType sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!Object.values(ElementalType).includes(upper as ElementalType)) {
        return res.status(400).json({
          error: `Invalid elemental type. Must be one of: ${Object.values(ElementalType).join(', ')}`,
        });
      }
      elementalType = upper as ElementalType;
    } else if (subRace) {
      return res.status(400).json({ error: `Race ${race} does not support sub-races` });
    }

    // Calculate starting stats: base 10 + race modifiers
    const baseStat = 10;
    const mods = raceDef.statModifiers;
    const stats = {
      str: baseStat + mods.str,
      dex: baseStat + mods.dex,
      con: baseStat + mods.con,
      int: baseStat + mods.int,
      wis: baseStat + mods.wis,
      cha: baseStat + mods.cha,
    };

    // Starting gold by tier
    const gold = getStartingGold(raceDef.tier);

    // Starting HP: 10 + CON modifier + class bonus
    const conModifier = Math.floor((stats.con - 10) / 2);
    const maxHealth = 10 + conModifier + getClassHpBonus(charClass);

    // Auto-assign starting town based on race (least-populated home city)
    const startingTown = await assignStartingTown(registryKey);

    const character = await prisma.character.create({
      data: {
        userId,
        name,
        race: raceEnum,
        dragonBloodline,
        beastClan,
        elementalType,
        class: charClass,
        stats,
        gold,
        health: maxHealth,
        maxHealth,
        currentTownId: startingTown.id,
        homeTownId: startingTown.id,
      },
      include: {
        currentTown: { select: { id: true, name: true } },
        homeTown: { select: { id: true, name: true } },
      },
    });

    // Give starting inventory (5 Basic Rations)
    await giveStartingInventory(character.id);

    // Give class-appropriate starter weapon (equipped to MAIN_HAND)
    await giveStarterWeapon(character.id, charClass);

    // Give starter armor (Rustic Leather Vest, +2 AC, equipped to CHEST)
    await giveStarterArmor(character.id);

    return res.status(201).json({
      character: {
        ...character,
        stats: typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats,
      },
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'character-create', req)) return;
    logRouteError(req, 500, 'Character creation error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/me
router.get('/me', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Re-query with town, inventory and equipment relations for frontend display
    const character = await prisma.character.findUnique({
      where: { id: req.character!.id },
      include: {
        currentTown: { select: { name: true } },
        professions: { select: { professionType: true, tier: true, level: true, isActive: true } },
        inventory: {
          include: {
            item: {
              include: {
                template: true,
                craftedBy: { select: { id: true, name: true } },
              },
            },
          },
        },
        equipment: {
          include: {
            item: {
              include: { template: true },
            },
          },
        },
      },
    });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const { currentTown, professions, inventory, equipment, ...rest } = character;

    // Transform inventory into frontend-friendly shape
    // Includes top-level aliases (name, type, rarity, templateName, itemId) for
    // compatibility with CraftingPage, MarketPage, and InventoryPage expectations.
    const inventoryItems = (inventory || []).map((inv: any) => ({
      id: inv.item.id,
      itemId: inv.item.id,
      templateId: inv.item.templateId,
      templateName: inv.item.template.name,
      name: inv.item.template.name,
      type: inv.item.template.type,
      rarity: inv.item.template.rarity,
      description: inv.item.template.description,
      template: {
        id: inv.item.template.id,
        name: inv.item.template.name,
        type: inv.item.template.type,
        rarity: inv.item.template.rarity,
        description: inv.item.template.description,
        stats: inv.item.template.stats,
        durability: inv.item.template.durability,
      },
      quantity: inv.quantity,
      currentDurability: inv.item.currentDurability,
      quality: inv.item.quality,
      craftedById: inv.item.craftedById,
      craftedByName: inv.item.craftedBy?.name ?? null,
      enchantments: inv.item.enchantments ?? [],
    }));

    // Transform equipment into slot-based map
    const SLOT_MAP: Record<string, string> = {
      HEAD: 'head',
      CHEST: 'chest',
      HANDS: 'hands',
      LEGS: 'legs',
      FEET: 'feet',
      MAIN_HAND: 'mainHand',
      OFF_HAND: 'offHand',
      ACCESSORY_1: 'accessory1',
      ACCESSORY_2: 'accessory2',
    };

    const equipmentSlots: Record<string, any> = {
      head: null, chest: null, hands: null, legs: null, feet: null,
      mainHand: null, offHand: null, accessory1: null, accessory2: null,
    };

    for (const equip of (equipment || [])) {
      const slotKey = SLOT_MAP[equip.slot] || equip.slot.toLowerCase();
      if (slotKey in equipmentSlots) {
        equipmentSlots[slotKey] = {
          id: equip.item.id,
          templateId: equip.item.templateId,
          template: {
            id: equip.item.template.id,
            name: equip.item.template.name,
            type: equip.item.template.type,
            rarity: equip.item.template.rarity,
            description: equip.item.template.description,
            stats: equip.item.template.stats,
            durability: equip.item.template.durability,
          },
          quantity: 1,
          currentDurability: equip.item.currentDurability,
          quality: equip.item.quality,
          craftedById: equip.item.craftedById,
          enchantments: equip.item.enchantments ?? [],
        };
      }
    }

    // Return flat shape with frontend-friendly field aliases
    return res.json({
      ...rest,
      stats: typeof rest.stats === 'string' ? JSON.parse(rest.stats) : rest.stats,
      hp: rest.health,
      maxHp: rest.maxHealth,
      status: rest.travelStatus === 'idle' || rest.travelStatus === 'arrived' ? 'idle' : 'traveling',
      currentTownName: currentTown?.name ?? null,
      professions: (professions || []).map(p => ({
        type: p.professionType,
        professionType: p.professionType,
        tier: p.tier,
        level: p.level,
        isActive: p.isActive,
      })),
      inventory: inventoryItems,
      equipment: equipmentSlots,
    });
  } catch (error) {
    logRouteError(req, 500, 'Get character error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/me/inventory — Standalone inventory endpoint (used by MarketPage)
router.get('/me/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.character!.id },
      include: {
        inventory: {
          include: {
            item: {
              include: {
                template: true,
                craftedBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const items = (character.inventory || []).map((inv: any) => ({
      id: inv.item.id,
      itemId: inv.item.id,
      templateId: inv.item.templateId,
      templateName: inv.item.template.name,
      name: inv.item.template.name,
      type: inv.item.template.type,
      rarity: inv.item.template.rarity,
      description: inv.item.template.description,
      quantity: inv.quantity,
      currentDurability: inv.item.currentDurability,
      quality: inv.item.quality,
      craftedById: inv.item.craftedById,
      craftedByName: inv.item.craftedBy?.name ?? null,
      enchantments: inv.item.enchantments ?? [],
    }));

    return res.json(items);
  } catch (error) {
    logRouteError(req, 500, 'Get inventory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/mine — List all characters for authenticated user
router.get('/mine', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const characters = await prisma.character.findMany({
      where: { userId: req.user!.userId },
      select: { id: true, name: true, race: true, class: true, level: true, currentTownId: true },
    });
    return res.json({
      characters: characters.map(c => ({
        ...c,
        isActive: c.id === user?.activeCharacterId,
      })),
      activeCharacterId: user?.activeCharacterId,
    });
  } catch (error) {
    logRouteError(req, 500, 'List characters error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/characters/switch — Switch active character
router.post('/switch', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId } = req.body;
    const gameDay = getGameDay();

    // Validate character belongs to user
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId: req.user!.userId },
    });
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (user?.activeCharacterId === characterId) {
      return res.status(400).json({ error: 'Character is already active' });
    }
    if (user?.lastSwitchDay === gameDay) {
      return res.status(429).json({ error: 'Already switched characters today', resetsAt: getNextTickTime().toISOString() });
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { activeCharacterId: characterId, lastSwitchDay: gameDay },
    });

    return res.json({
      message: 'Character switch queued. Takes effect at next daily reset.',
      activeCharacterId: characterId,
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'character-switch', req)) return;
    logRouteError(req, 500, 'Switch character error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/:id
router.get('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Public view: exclude sensitive fields
    return res.json({
      character: {
        id: character.id,
        name: character.name,
        race: character.race,
        dragonBloodline: character.dragonBloodline,
        beastClan: character.beastClan,
        elementalType: character.elementalType,
        level: character.level,
        currentTownId: character.currentTownId,
        health: character.health,
        maxHealth: character.maxHealth,
      },
    });
  } catch (error) {
    logRouteError(req, 500, 'Get character by id error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/characters/allocate-stats
const allocateStatsSchema = z.object({
  str: z.number().int().min(0).optional().default(0),
  dex: z.number().int().min(0).optional().default(0),
  con: z.number().int().min(0).optional().default(0),
  int: z.number().int().min(0).optional().default(0),
  wis: z.number().int().min(0).optional().default(0),
  cha: z.number().int().min(0).optional().default(0),
});

router.post('/allocate-stats', authGuard, characterGuard, validate(allocateStatsSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { str, dex, con, int: intStat, wis, cha } = req.body;
    const userId = req.user!.userId;

    const character = req.character!;

    const allocations = { str, dex, con, int: intStat, wis, cha } as Record<string, number>;
    const totalStatPoints = str + dex + con + intStat + wis + cha;
    if (totalStatPoints === 0) {
      return res.status(400).json({ error: 'Must allocate at least 1 stat point' });
    }

    const currentStats = character.stats as Record<string, number>;

    // Calculate total cost using the cost curve and validate hard cap
    let totalCost = 0;
    const newStats: Record<string, number> = {};
    for (const stat of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const current = currentStats[stat] ?? 10;
      const increase = allocations[stat] ?? 0;
      if (current + increase > STAT_HARD_CAP) {
        return res.status(400).json({
          error: `${stat.toUpperCase()} would exceed the cap of ${STAT_HARD_CAP} (current: ${current}, adding: ${increase})`,
        });
      }
      // Sum the cost for each individual point purchased
      for (let i = 0; i < increase; i++) {
        const cost = getStatAllocationCost(current + i);
        if (!isFinite(cost)) {
          return res.status(400).json({
            error: `Cannot increase ${stat.toUpperCase()} beyond ${STAT_HARD_CAP}`,
          });
        }
        totalCost += cost;
      }
      newStats[stat] = current + increase;
    }

    if (totalCost > character.unspentStatPoints) {
      return res.status(400).json({
        error: `Not enough stat points. Have ${character.unspentStatPoints}, cost is ${totalCost} for ${totalStatPoints} point(s)`,
      });
    }

    // CON +2 HP per stat point purchased (not per cost spent)
    const conIncrease = con;
    const hpBonus = conIncrease > 0 ? conIncrease * 2 : 0;

    await prisma.character.update({
      where: { id: character.id },
      data: {
        stats: newStats,
        unspentStatPoints: character.unspentStatPoints - totalCost,
        maxHealth: character.maxHealth + hpBonus,
        health: character.health + hpBonus,
      },
    });

    return res.json({
      stats: newStats,
      unspentStatPoints: character.unspentStatPoints - totalCost,
      maxHealth: character.maxHealth + hpBonus,
    });
  } catch (error) {
    if (handlePrismaError(error, res, 'allocate-stats', req)) return;
    logRouteError(req, 500, 'Allocate stats error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
