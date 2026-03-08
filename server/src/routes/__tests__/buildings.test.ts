/**
 * Buildings route tests (P2 #48)
 *
 * Tests building construction with material requirements and workshop bonuses.
 */

jest.mock('../../lib/db', () => ({
  db: {
    query: {
      characters: { findFirst: jest.fn(), findMany: jest.fn() },
      buildings: { findFirst: jest.fn(), findMany: jest.fn() },
      buildingConstructions: { findFirst: jest.fn(), findMany: jest.fn() },
      towns: { findFirst: jest.fn() },
      townPolicies: { findFirst: jest.fn() },
      townTreasuries: { findFirst: jest.fn() },
      inventories: { findFirst: jest.fn(), findMany: jest.fn() },
      items: { findFirst: jest.fn() },
    },
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]), onConflictDoUpdate: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }) }),
    update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }) }),
    delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
    execute: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(),
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
import { db } from '../../lib/db';

const mockedDb = db as jest.Mocked<typeof db>;

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
  homeTownId: TOWN_ID,
  travelStatus: 'idle',
};

describe('Buildings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/buildings/request-permit ----

  describe('POST /api/buildings/request-permit', () => {
    it('should create a building permit successfully', async () => {
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        name: 'TestTown',
        population: 5000,
        townPolicies: [],
        buildings: [], // no buildings yet
      });
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue(undefined); // no existing building of this type

      const newBuilding = {
        id: 'building-001',
        type: 'SMITHY',
        name: 'My Smithy',
        level: 0,
        townId: TOWN_ID,
        ownerId: CHAR_ID,
      };

      (mockedDb.transaction as jest.Mock).mockResolvedValue(newBuilding);

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

    it('should reject when not a resident of the town', async () => {
      const res = await request(app)
        .post('/api/buildings/request-permit')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          townId: 'nonexistent',
          buildingType: 'SMITHY',
          name: 'My Smithy',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('resident of this town');
    });

    it('should reject when town not found', async () => {
      // Set homeTownId to match the requested town so residency passes
      (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        homeTownId: 'nonexistent',
        currentTownId: 'nonexistent',
      });
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue(undefined);

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
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        population: 5000,
        townPolicies: [],
        buildings: [],
      });
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue({
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
      const buildingsArr = Array.from({ length: 20 }, (_, i) => ({ id: `b-${i}` }));
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
        id: TOWN_ID,
        population: 100,
        townPolicies: [],
        buildings: buildingsArr,
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
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        buildingConstructions: [{
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
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: 'someone-else',
        type: 'SMITHY',
        level: 0,
        buildingConstructions: [{
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
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        buildingConstructions: [{
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
      (mockedDb.query.buildings.findFirst as jest.Mock).mockResolvedValue({
        id: 'building-001',
        ownerId: CHAR_ID,
        type: 'SMITHY',
        level: 0,
        buildingConstructions: [{
          id: 'const-001',
          status: 'IN_PROGRESS',
          completesAt: pastDate,
          startedAt: new Date(Date.now() - 3600000),
        }],
      });

      (mockedDb.transaction as jest.Mock).mockResolvedValue(undefined);

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
      (mockedDb.query.buildings.findMany as jest.Mock).mockResolvedValue([
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
