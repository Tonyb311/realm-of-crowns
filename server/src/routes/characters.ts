import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, asc, and, gt } from 'drizzle-orm';
import { users, characters, characterActiveEffects } from '@database/tables';
import { race as raceEnum, dragonBloodline as dragonBloodlineEnum, beastClan as beastClanEnum, elementalType as elementalTypeEnum } from '@database/enums';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getRace } from '@shared/data/races';
import { getStatAllocationCost, STAT_HARD_CAP } from '@shared/utils/bounded-accuracy';
import { FEAT_DEFINITIONS, getFeatById, MAX_FEATS } from '@shared/data/feats';
import { CLASS_SAVE_PROFICIENCIES } from '@shared/data/combat-constants';
import { getGameDay, getNextTickTime } from '../lib/game-day';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';
import { isRaceReleased } from '../lib/content-release';
import { assignStartingTown } from '../lib/starting-town';
import { transformInventory } from '../lib/inventory-transform';
import { calculateWeightState } from '../services/weight-calculator';
import { giveStartingInventory } from '../lib/starting-inventory';
import { giveStarterWeapon, giveStarterArmor } from '../lib/starting-weapons';
import { giveStarterHouse } from '../lib/starting-house';
import { buildCharacterSheet } from '../services/character-sheet';
import { autoGrantAbilities } from '../services/ability-grants';

const router = Router();

const VALID_CLASSES = ['warrior', 'mage', 'rogue', 'cleric', 'ranger', 'bard', 'psion'] as const;
type CharacterClass = typeof VALID_CLASSES[number];

const VALID_RACES = raceEnum.enumValues;

const createCharacterSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(20, 'Name must be at most 20 characters')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Name must be alphanumeric (spaces allowed)'),
  race: z.enum(VALID_RACES as [string, ...string[]], {
    error: 'Invalid race',
  }),
  subRace: z.string().optional(),
  characterClass: z.enum(VALID_CLASSES as unknown as [string, ...string[]], {
    error: `Invalid class. Must be one of: ${VALID_CLASSES.join(', ')}`,
  }),
});

type Race = typeof raceEnum.enumValues[number];
type DragonBloodline = typeof dragonBloodlineEnum.enumValues[number];
type BeastClan = typeof beastClanEnum.enumValues[number];
type ElementalType = typeof elementalTypeEnum.enumValues[number];

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
    const raceVal = race as Race;
    const charClass = characterClass as CharacterClass;

    // One character per user
    const existing = await db.query.characters.findFirst({
      where: eq(characters.userId, userId),
      orderBy: asc(characters.createdAt),
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a character' });
    }

    // Validate race exists in registry
    const registryKey = raceEnumToRegistryKey(raceVal);
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

    if (raceVal === 'DRAKONID') {
      if (!subRace) {
        return res.status(400).json({ error: 'Drakonid requires dragonBloodline sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!(dragonBloodlineEnum.enumValues as readonly string[]).includes(upper)) {
        return res.status(400).json({
          error: `Invalid dragon bloodline. Must be one of: ${dragonBloodlineEnum.enumValues.join(', ')}`,
        });
      }
      dragonBloodline = upper as DragonBloodline;
    } else if (raceVal === 'BEASTFOLK') {
      if (!subRace) {
        return res.status(400).json({ error: 'Beastfolk requires beastClan sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!(beastClanEnum.enumValues as readonly string[]).includes(upper)) {
        return res.status(400).json({
          error: `Invalid beast clan. Must be one of: ${beastClanEnum.enumValues.join(', ')}`,
        });
      }
      beastClan = upper as BeastClan;
    } else if (raceVal === 'ELEMENTARI') {
      if (!subRace) {
        return res.status(400).json({ error: 'Elementari requires elementalType sub-race' });
      }
      const upper = subRace.toUpperCase();
      if (!(elementalTypeEnum.enumValues as readonly string[]).includes(upper)) {
        return res.status(400).json({
          error: `Invalid elemental type. Must be one of: ${elementalTypeEnum.enumValues.join(', ')}`,
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

    const [character] = await db.insert(characters).values({
      id: crypto.randomUUID(),
      userId,
      name,
      race: raceVal,
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
    }).returning();

    // Give starting inventory (5 Basic Rations)
    await giveStartingInventory(character.id);

    // Give class-appropriate starter weapon (equipped to MAIN_HAND)
    await giveStarterWeapon(character.id, charClass);

    // Give starter armor (Rustic Leather Vest, +2 AC, equipped to CHEST)
    await giveStarterArmor(character.id);

    // Give free cottage in home town
    await giveStarterHouse(character.id, startingTown.id, name);

    // Auto-grant cantrips (tier -1 abilities) for caster classes
    await autoGrantAbilities(character.id);

    return res.status(201).json({
      character: {
        ...character,
        stats: typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'character-create', req)) return;
    logRouteError(req, 500, 'Character creation error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/me
router.get('/me', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Re-query with town, inventory and equipment relations for frontend display
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, req.character!.id),
      with: {
        town_currentTownId: { columns: { name: true } },
        town_homeTownId: { columns: { id: true, name: true } },
        checkedInInn: { columns: { id: true, name: true } },
        playerProfessions: { columns: { professionType: true, tier: true, level: true, isActive: true } },
        inventories: {
          with: {
            item: {
              with: {
                itemTemplate: true,
                character_craftedById: { columns: { id: true, name: true } },
              },
            },
          },
        },
        characterEquipments: {
          with: {
            item: {
              with: { itemTemplate: true },
            },
          },
        },
      },
    });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const weightState = await calculateWeightState(character.id);

    // Check for active Well Rested buff
    const wellRestedEffect = await db.query.characterActiveEffects.findFirst({
      where: and(
        eq(characterActiveEffects.characterId, character.id),
        eq(characterActiveEffects.sourceType, 'INN_REST'),
        gt(characterActiveEffects.expiresAt, new Date().toISOString()),
      ),
      columns: { magnitude: true, expiresAt: true },
    });

    const { town_currentTownId: currentTown, town_homeTownId: homeTown, checkedInInn, playerProfessions: professions, inventories: inventory, characterEquipments: equipment, ...rest } = character;

    // Transform inventory into frontend-friendly shape
    const inventoryItems = transformInventory(inventory || [], true);

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
            id: equip.item.itemTemplate.id,
            name: equip.item.itemTemplate.name,
            type: equip.item.itemTemplate.type,
            rarity: equip.item.itemTemplate.rarity,
            description: equip.item.itemTemplate.description,
            stats: equip.item.itemTemplate.stats,
            durability: equip.item.itemTemplate.durability,
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
      homeTownName: homeTown?.name ?? null,
      checkedInInnName: checkedInInn?.name ?? null,
      wellRestedEffect: wellRestedEffect ? { magnitude: wellRestedEffect.magnitude, expiresAt: wellRestedEffect.expiresAt } : null,
      professions: (professions || []).map((p: any) => ({
        type: p.professionType,
        professionType: p.professionType,
        tier: p.tier,
        level: p.level,
        isActive: p.isActive,
      })),
      inventory: inventoryItems,
      equipment: equipmentSlots,
      encumbranceTier: weightState.encumbrance.tier,
    });
  } catch (error) {
    logRouteError(req, 500, 'Get character error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/me/inventory — Standalone inventory endpoint (used by MarketPage)
router.get('/me/inventory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, req.character!.id),
      with: {
        inventories: {
          with: {
            item: {
              with: {
                itemTemplate: true,
                character_craftedById: { columns: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const items = transformInventory(character.inventories || []);

    return res.json(items);
  } catch (error) {
    logRouteError(req, 500, 'Get inventory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/mine — List all characters for authenticated user
router.get('/mine', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
    const charList = await db.query.characters.findMany({
      where: eq(characters.userId, req.user!.userId),
      columns: { id: true, name: true, race: true, class: true, level: true, currentTownId: true },
    });
    return res.json({
      characters: charList.map(c => ({
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
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });
    if (!character || character.userId !== req.user!.userId) return res.status(404).json({ error: 'Character not found' });

    const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
    if (user?.activeCharacterId === characterId) {
      return res.status(400).json({ error: 'Character is already active' });
    }
    if (user?.lastSwitchDay === gameDay) {
      return res.status(429).json({ error: 'Already switched characters today', resetsAt: getNextTickTime().toISOString() });
    }

    await db.update(users).set({
      activeCharacterId: characterId,
      lastSwitchDay: gameDay,
    }).where(eq(users.id, req.user!.userId));

    return res.json({
      message: 'Character switch queued. Takes effect at next daily reset.',
      activeCharacterId: characterId,
      resetsAt: getNextTickTime().toISOString(),
    });
  } catch (error) {
    if (handleDbError(error, res, 'character-switch', req)) return;
    logRouteError(req, 500, 'Switch character error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/me/sheet — full character sheet for own character
router.get('/me/sheet', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sheet = await buildCharacterSheet(req.character!.id, req.character!.id);
    if (!sheet) return res.status(404).json({ error: 'Character not found' });
    return res.json(sheet);
  } catch (error) {
    logRouteError(req, 500, 'Character sheet error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/:id/sheet — character sheet for another player (redacted)
router.get('/:id/sheet', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sheet = await buildCharacterSheet(req.params.id, req.character!.id);
    if (!sheet) return res.status(404).json({ error: 'Character not found' });
    return res.json(sheet);
  } catch (error) {
    logRouteError(req, 500, 'Character sheet error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/characters/me/bio — update character biography
const bioSchema = z.object({
  bio: z.string().max(500).nullable(),
});

router.patch('/me/bio', authGuard, characterGuard, validate(bioSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bio } = req.body;
    await db.update(characters).set({ bio } as any).where(eq(characters.id, req.character!.id));
    return res.json({ success: true, bio });
  } catch (error) {
    logRouteError(req, 500, 'Update bio error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/characters/:id
router.get('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, req.params.id),
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

    await db.update(characters).set({
      stats: newStats,
      unspentStatPoints: character.unspentStatPoints - totalCost,
      maxHealth: character.maxHealth + hpBonus,
      health: character.health + hpBonus,
    }).where(eq(characters.id, character.id));

    return res.json({
      stats: newStats,
      unspentStatPoints: character.unspentStatPoints - totalCost,
      maxHealth: character.maxHealth + hpBonus,
    });
  } catch (error) {
    if (handleDbError(error, res, 'allocate-stats', req)) return;
    logRouteError(req, 500, 'Allocate stats error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Feat Selection ----

const chooseFeatSchema = z.object({
  featId: z.string(),
  saveProficiency: z.string().optional(), // Required only for Resilient feat
});

router.post('/choose-feat', authGuard, characterGuard, validate(chooseFeatSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as any).character;
    const { featId, saveProficiency } = req.body;

    // Must have a pending feat choice
    if (!character.pendingFeatChoice) {
      return res.status(400).json({ error: 'No pending feat choice available' });
    }

    // Feat must exist
    const feat = getFeatById(featId);
    if (!feat) {
      return res.status(400).json({ error: 'Invalid feat ID' });
    }

    // No duplicate feats
    const currentFeats = (character.feats as string[]) ?? [];
    if (currentFeats.includes(featId)) {
      return res.status(400).json({ error: 'You already have this feat' });
    }

    // Max feats check
    if (currentFeats.length >= MAX_FEATS) {
      return res.status(400).json({ error: 'Maximum feats already chosen' });
    }

    // Class exclusion check
    if (feat.excludedClasses?.includes(character.class?.toLowerCase() ?? '')) {
      return res.status(400).json({ error: 'This feat is not available for your class' });
    }

    // Resilient feat: requires saveProficiency choice
    if (feat.effects.bonusSaveProficiency) {
      if (!saveProficiency || !['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(saveProficiency)) {
        return res.status(400).json({ error: 'Resilient feat requires a valid saveProficiency choice (str/dex/con/int/wis/cha)' });
      }
      // Check not already proficient
      const classSaves = CLASS_SAVE_PROFICIENCIES[character.class?.toLowerCase() ?? ''] ?? [];
      const bonusSaves = (character.bonusSaveProficiencies as string[]) ?? [];
      const allSaves = [...classSaves, ...bonusSaves];
      if (allSaves.includes(saveProficiency)) {
        return res.status(400).json({ error: `Already proficient in ${saveProficiency} saves` });
      }
    }

    // Build update data
    const updateData: any = {
      feats: [...currentFeats, featId],
      pendingFeatChoice: false,
    };

    // Apply immediate effects
    if (feat.effects.hpPerLevel) {
      const hpGain = character.level * feat.effects.hpPerLevel;
      updateData.maxHealth = character.maxHealth + hpGain;
      updateData.health = character.health + hpGain;
    }
    if (feat.effects.bonusHp) {
      updateData.maxHealth = (updateData.maxHealth ?? character.maxHealth) + feat.effects.bonusHp;
      updateData.health = (updateData.health ?? character.health) + feat.effects.bonusHp;
    }
    if (feat.effects.statBonus) {
      const stats = character.stats as Record<string, number>;
      const newVal = Math.min(STAT_HARD_CAP, (stats[feat.effects.statBonus.stat] ?? 10) + feat.effects.statBonus.value);
      updateData.stats = { ...stats, [feat.effects.statBonus.stat]: newVal };
    }
    if (feat.effects.bonusSaveProficiency && saveProficiency) {
      const bonusSaves = (character.bonusSaveProficiencies as string[]) ?? [];
      updateData.bonusSaveProficiencies = [...bonusSaves, saveProficiency];
    }

    await db.update(characters).set(updateData).where(eq(characters.id, character.id));

    return res.json({ success: true, feat: feat.name });
  } catch (error) {
    if (handleDbError(error, res, 'choose-feat', req)) return;
    logRouteError(req, 500, 'Choose feat error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Pending Feats Query ----

router.get('/pending-feat', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = (req as any).character;
    if (!character.pendingFeatChoice) {
      return res.json({ pending: false, availableFeats: [] });
    }
    const currentFeats = (character.feats as string[]) ?? [];
    const charClass = character.class?.toLowerCase() ?? '';
    const available = FEAT_DEFINITIONS.filter(f =>
      !currentFeats.includes(f.id) &&
      !f.excludedClasses?.includes(charClass)
    );
    return res.json({ pending: true, availableFeats: available });
  } catch (error) {
    logRouteError(req, 500, 'Pending feat error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
