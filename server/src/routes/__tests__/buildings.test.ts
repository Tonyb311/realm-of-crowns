/**
 * Buildings route tests (P2 #48)
 *
 * Tests building construction with material requirements and workshop bonuses.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn(), update: jest.fn() },
    building: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    buildingConstruction: { create: jest.fn(), update: jest.fn(), count: jest.fn() },
    town: { findUnique: jest.fn() },
    townPolicy: { upsert: jest.fn() },
    townTreasury: { updateMany: jest.fn() },
    inventory: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    item: { delete: jest.fn() },
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
  emitPlayerEnterTown: jest.fn(),
  emitPlayerLeaveTown: jest.fn(),
  emitCombatResult: jest.fn(),
  emitTradeCompleted: jest.fn(),
  emitFriendRequest: jest.fn(),
  emitFriendAccepted: jest.fn(),
  emitLevelUp: jest.fn(),
  emitAchievementUnlocked: jest.fn(),
  emitNotification: jest.fn(),
  emitGovernanceEvent: jest.fn(),
  emitGuildEvent: jest.fn(),
}));

jest.mock('../../services/law-effects', () => ({
  getEffectiveTaxRate: jest.fn().mockResolvedValue(0.10),
}));

jest.mock('../../middleware/daily-action', () => ({
  requireDailyAction: () => (_req: any, _res: any, next: any) => next(),
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

function makeToken(userId: string) {
  return jwt.sign({ userId, username: 'tester' }, process.env.JWT_SECRET || 'test-secret-key-for-integration-tests');
}

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CHAR_ID = '22222222-2222-2222-2222-222222222222';
const TOWN_ID = 'town-001';
const TOKEN = makeToken(USER_ID);

const mockCharacter = {
  id: CHAR_ID,
  userId: USER_ID,
  name: 'Builder',
  race: 'HUMAN',
  level: 10,
  gold: 5000,
  currentTownId: TOWN_ID,
};

describe('Buildings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/buildings/request-permit ----

  describe('POST /api/buildings/request-permit', () => {
    it('should create a building permit successfully', async () => {
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        name: 'TestTown',
        population: 5000,
        townPolicy: null,
        buildings: [], // no buildings yet
      });
      (mockedPrisma.building.findFirst as jest.Mock).mockResolvedValue(null); // no existing building of this type

      const newBuilding = {
        id: 'building-001',
        type: 'SMITHY',
        name: 'My Smithy',
        level: 0,
        townId: TOWN_ID,
        ownerId: CHAR_ID,
      };

      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue(newBuilding);

      const res = await request(app)
        .post('/api/buildings/request-permit')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          townId: TOWN_ID,
          buildingType: 'SMITHY',
          name: 'My Smithy',
        });

      expect(res.status).toBe(201);
      expect(res.body.building).toBeDefined();
      expect(res.body.building.type).toBe('SMITHY');
      expect(res.body.building.level).toBe(0);
      expect(res.body.requirements).toBeDefined();
    });

    it('should reject when town not found', async () => {
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/buildings/request-permit')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          townId: 'nonexistent',
          buildingType: 'SMITHY',
          name: 'My Smithy',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Town not found');
    });

    it('should reject when player already owns this type in this town', async () => {
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        population: 5000,
        townPolicy: null,
        buildings: [],
      });
      (mockedPrisma.building.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-smithy',
        type: 'SMITHY',
        ownerId: CHAR_ID,
      });

      const res = await request(app)
        .post('/api/buildings/request-permit')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          townId: TOWN_ID,
          buildingType: 'SMITHY',
          name: 'Another Smithy',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already own a SMITHY');
    });

    it('should reject when town is at building capacity', async () => {
      // Population 100, capacity = max(20, 100/100) = 20
      // Fill it with 20 buildings
      const buildings = Array.from({ length: 20 }, (_, i) => ({ id: `b-${i}` }));
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        population: 100,
        townPolicy: null,
        buildings,
      });

      const res = await request(app)
        .post('/api/buildings/request-permit')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          townId: TOWN_ID,
          buildingType: 'SMITHY',
          name: 'My Smithy',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('building capacity');
    });
  });

  // ---- POST /api/buildings/start-construction ----

  describe('POST /api/buildings/start-construction', () => {
    it('should reject when not all materials deposited', async () => {
      (mockedPrisma.building.findUnique as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        constructions: [{
          id: 'const-001',
          status: 'PENDING',
          materialsUsed: {}, // nothing deposited
        }],
      });

      const res = await request(app)
        .post('/api/buildings/start-construction')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ buildingId: 'building-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Not all materials');
    });

    it('should reject when building not owned by character', async () => {
      (mockedPrisma.building.findUnique as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: 'someone-else',
        type: 'SMITHY',
        level: 0,
        constructions: [{
          id: 'const-001',
          status: 'PENDING',
          materialsUsed: {},
        }],
      });

      const res = await request(app)
        .post('/api/buildings/start-construction')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ buildingId: 'building-001' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('do not own');
    });
  });

  // ---- POST /api/buildings/complete-construction ----

  describe('POST /api/buildings/complete-construction', () => {
    it('should reject when construction timer not done', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      (mockedPrisma.building.findUnique as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        constructions: [{
          id: 'const-001',
          status: 'IN_PROGRESS',
          completesAt: futureDate,
          startedAt: new Date(),
        }],
      });

      const res = await request(app)
        .post('/api/buildings/complete-construction')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ buildingId: 'building-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not yet complete');
    });

    it('should complete construction when timer is done', async () => {
      const pastDate = new Date(Date.now() - 1000); // in the past
      (mockedPrisma.building.findUnique as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        constructions: [{
          id: 'const-001',
          status: 'IN_PROGRESS',
          completesAt: pastDate,
          startedAt: new Date(Date.now() - 3600000),
        }],
      });

      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/buildings/complete-construction')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ buildingId: 'building-001' });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.building.level).toBe(1);
    });
  });

  // ---- GET /api/buildings/mine ----

  describe('GET /api/buildings/mine', () => {
    it('should return buildings owned by the character', async () => {
      (mockedPrisma.building.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'building-001',
          type: 'SMITHY',
          name: 'My Smithy',
          level: 2,
          town: { id: TOWN_ID, name: 'TestTown' },
          constructions: [],
          createdAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/buildings/mine')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.buildings).toHaveLength(1);
      expect(res.body.buildings[0].type).toBe('SMITHY');
      expect(res.body.buildings[0].level).toBe(2);
    });
  });
});
