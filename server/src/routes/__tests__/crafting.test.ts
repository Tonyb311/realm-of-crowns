/**
 * Crafting route tests (P2 #48)
 *
 * Tests recipe validation, crafting start/collect, the atomic collect
 * race condition guard (409 on double collect), and quality roll calculation.
 *
 * All external services (Prisma, Redis, Socket.io) are mocked.
 */

// --- Mocks must be declared before imports ---

jest.mock('../../lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn(), update: jest.fn() },
    recipe: { findUnique: jest.fn(), findMany: jest.fn() },
    playerProfession: { findFirst: jest.fn(), findMany: jest.fn() },
    craftingAction: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    characterTravelState: { findUnique: jest.fn() },
    inventory: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), update: jest.fn() },
    item: { create: jest.fn(), delete: jest.fn() },
    itemTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
    building: { findFirst: jest.fn() },
    characterEquipment: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/redis', () => ({
  redis: null,
  invalidateCache: jest.fn(),
}));

jest.mock('../../index', () => ({}));

jest.mock('../../socket/events', () => ({
  initEventBroadcaster: jest.fn(),
  emitCraftingReady: jest.fn(),
  emitNotification: jest.fn(),
  emitPlayerEnterTown: jest.fn(),
  emitPlayerLeaveTown: jest.fn(),
  emitCombatResult: jest.fn(),
  emitTradeCompleted: jest.fn(),
  emitFriendRequest: jest.fn(),
  emitFriendAccepted: jest.fn(),
  emitLevelUp: jest.fn(),
  emitAchievementUnlocked: jest.fn(),
  emitGovernanceEvent: jest.fn(),
  emitGuildEvent: jest.fn(),
}));

jest.mock('../../services/progression', () => ({
  checkLevelUp: jest.fn(),
}));

jest.mock('../../services/achievements', () => ({
  checkAchievements: jest.fn(),
}));

jest.mock('../../services/profession-xp', () => ({
  addProfessionXP: jest.fn().mockResolvedValue({ newLevel: 2, newTier: 'APPRENTICE', leveledUp: false }),
}));

jest.mock('../../services/racial-profession-bonuses', () => ({
  getRacialCraftSpeedBonus: jest.fn().mockReturnValue({ speedBonus: 0 }),
  getRacialCraftQualityBonus: jest.fn().mockReturnValue({ qualityBonus: 0 }),
  getRacialMaterialReduction: jest.fn().mockReturnValue({ reduction: 0 }),
}));

jest.mock('../../services/racial-special-profession-mechanics', () => ({
  getForgebornOverclockMultiplier: jest.fn().mockResolvedValue(1),
  getMaxQueueSlots: jest.fn().mockResolvedValue(10),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper: generate a valid JWT
function makeToken(userId: string) {
  return jwt.sign({ userId, username: 'tester' }, process.env.JWT_SECRET || 'test-secret-key-for-integration-tests');
}

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CHAR_ID = '22222222-2222-2222-2222-222222222222';
const RECIPE_ID = 'recipe-001';
const TOKEN = makeToken(USER_ID);

const mockCharacter = {
  id: CHAR_ID,
  userId: USER_ID,
  name: 'TestHero',
  race: 'HUMAN',
  level: 5,
  gold: 500,
  currentTownId: 'town-001',
  travelStatus: 'idle',
  stats: { str: 12, dex: 10, con: 10, int: 14, wis: 10, cha: 10 },
  subRace: null,
  health: 100,
  maxHealth: 100,
};

const mockRecipe = {
  id: RECIPE_ID,
  name: 'Iron Sword',
  professionType: 'BLACKSMITH',
  tier: 'APPRENTICE',
  craftTime: 60,
  xpReward: 50,
  result: 'template-iron-sword',
  ingredients: [{ itemTemplateId: 'template-iron-bar', quantity: 2 }],
};

const mockProfession = {
  id: 'prof-001',
  characterId: CHAR_ID,
  professionType: 'BLACKSMITH',
  tier: 'APPRENTICE',
  level: 5,
  xp: 100,
  isActive: true,
};

describe('Crafting API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: character found
    (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/crafting/start ----

  describe('POST /api/crafting/start', () => {
    it('should reject when no character found', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/crafting/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ recipeId: RECIPE_ID });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No character found');
    });

    it('should reject when recipe not found', async () => {
      (mockedPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/crafting/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ recipeId: 'nonexistent-recipe' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Recipe not found');
    });

    it('should reject when character lacks the required profession', async () => {
      (mockedPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (mockedPrisma.playerProfession.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/crafting/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ recipeId: RECIPE_ID });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('do not have the BLACKSMITH profession');
    });

    it('should reject when already crafting', async () => {
      (mockedPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (mockedPrisma.playerProfession.findFirst as jest.Mock).mockResolvedValue(mockProfession);
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue({ id: 'active-craft' });

      const res = await request(app)
        .post('/api/crafting/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ recipeId: RECIPE_ID });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Already crafting');
    });

    it('should start crafting successfully with sufficient ingredients', async () => {
      (mockedPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (mockedPrisma.playerProfession.findFirst as jest.Mock).mockResolvedValue(mockProfession);
      // No active craft or travel
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(null);
      // travelAction removed — travel status checked via character.travelStatus
      // No workshop (apprentice tier doesn't need one)
      (mockedPrisma.building.findFirst as jest.Mock).mockResolvedValue(null);
      // Sufficient inventory
      (mockedPrisma.inventory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv-001',
          itemId: 'item-iron-bar',
          characterId: CHAR_ID,
          quantity: 5,
          item: {
            id: 'item-iron-bar',
            templateId: 'template-iron-bar',
            quality: 'COMMON',
            template: { id: 'template-iron-bar', name: 'Iron Bar' },
          },
        },
      ]);
      // Transaction succeeds
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/crafting/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ recipeId: RECIPE_ID });

      expect(res.status).toBe(201);
      expect(res.body.crafting).toBeDefined();
      expect(res.body.crafting.recipeId).toBe(RECIPE_ID);
      expect(res.body.crafting.recipeName).toBe('Iron Sword');
    });
  });

  // ---- POST /api/crafting/collect ----

  describe('POST /api/crafting/collect', () => {
    it('should return 400 when no active crafting action', async () => {
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/crafting/collect')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No active crafting action');
    });

    it('should return 400 when crafting is still in progress', async () => {
      // First call: no COMPLETED craft; second call: finds IN_PROGRESS
      (mockedPrisma.craftingAction.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // status=COMPLETED query
        .mockResolvedValueOnce({ id: 'craft-001', status: 'IN_PROGRESS' }); // status=IN_PROGRESS query

      const res = await request(app)
        .post('/api/crafting/collect')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not yet complete');
    });

    it('should collect a completed craft successfully', async () => {
      const completedCraft = {
        id: 'craft-001',
        characterId: CHAR_ID,
        recipeId: RECIPE_ID,
        status: 'COMPLETED',
        recipe: mockRecipe,
        createdAt: new Date(),
      };

      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(completedCraft);
      (mockedPrisma.playerProfession.findFirst as jest.Mock).mockResolvedValue(mockProfession);
      (mockedPrisma.characterEquipment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.building.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.itemTemplate.findUnique as jest.Mock).mockResolvedValue({
        id: 'template-iron-sword',
        name: 'Iron Sword',
        type: 'WEAPON',
        durability: 100,
      });

      const mockItem = { id: 'crafted-item-001' };
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue(mockItem);
      (mockedPrisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);
      (mockedPrisma.craftingAction.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .post('/api/crafting/collect')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.collected).toBe(true);
      expect(res.body.item).toBeDefined();
      expect(res.body.qualityRoll).toBeDefined();
    });

    it('should return 409 when double-collect race condition occurs', async () => {
      const completedCraft = {
        id: 'craft-001',
        characterId: CHAR_ID,
        recipeId: RECIPE_ID,
        status: 'COMPLETED',
        recipe: mockRecipe,
        createdAt: new Date(),
      };

      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(completedCraft);
      (mockedPrisma.playerProfession.findFirst as jest.Mock).mockResolvedValue(mockProfession);
      (mockedPrisma.characterEquipment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.building.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.itemTemplate.findUnique as jest.Mock).mockResolvedValue({
        id: 'template-iron-sword',
        name: 'Iron Sword',
        type: 'WEAPON',
        durability: 100,
      });

      // Transaction throws ALREADY_COLLECTED error (race condition guard)
      (mockedPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('ALREADY_COLLECTED'));

      const res = await request(app)
        .post('/api/crafting/collect')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send();

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already collected');
    });
  });

  // ---- GET /api/crafting/status ----

  describe('GET /api/crafting/status', () => {
    it('should return false when no active craft', async () => {
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/crafting/status')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.crafting).toBe(false);
    });

    it('should return active craft status', async () => {
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue({
        id: 'craft-001',
        recipeId: RECIPE_ID,
        status: 'IN_PROGRESS',
        recipe: { name: 'Iron Sword' },
        createdAt: new Date(),
        tickDate: new Date(),
      });

      const res = await request(app)
        .get('/api/crafting/status')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.crafting).toBe(true);
      expect(res.body.recipeName).toBe('Iron Sword');
    });
  });
});
