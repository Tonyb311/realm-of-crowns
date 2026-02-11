/**
 * Professions route tests (P2 #48)
 *
 * Tests profession acquisition (including Human 4th slot at L15),
 * level-up, the 3-profession limit, and abandon/reactivation.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn() },
    playerProfession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    gatheringAction: { findFirst: jest.fn() },
    craftingAction: { findFirst: jest.fn() },
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
const TOKEN = makeToken(USER_ID);

function makeCharacter(overrides: Record<string, unknown> = {}) {
  return {
    id: CHAR_ID,
    userId: USER_ID,
    name: 'TestHero',
    race: 'HUMAN',
    level: 5,
    gold: 500,
    currentTownId: 'town-001',
    ...overrides,
  };
}

describe('Professions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(makeCharacter());
  });

  // ---- POST /api/professions/learn ----

  describe('POST /api/professions/learn', () => {
    it('should learn a new profession successfully', async () => {
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([]); // no active professions
      (mockedPrisma.playerProfession.create as jest.Mock).mockResolvedValue({
        id: 'prof-new',
        professionType: 'FARMER',
        tier: 'APPRENTICE',
        level: 1,
        xp: 0,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'FARMER' });

      expect(res.status).toBe(201);
      expect(res.body.profession).toBeDefined();
      expect(res.body.profession.type).toBe('FARMER');
      expect(res.body.profession.tier).toBe('APPRENTICE');
      expect(res.body.profession.level).toBe(1);
    });

    it('should reject when already have the profession active', async () => {
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-001',
        professionType: 'FARMER',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'FARMER' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already have this profession active');
    });

    it('should enforce the 3-profession limit for non-humans', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(makeCharacter({ race: 'ELF' }));
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([
        { professionType: 'FARMER', isActive: true },
        { professionType: 'MINER', isActive: true },
        { professionType: 'BLACKSMITH', isActive: true },
      ]);

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'COOK' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot have more than 3 active professions');
    });

    it('should allow humans at level 15+ to have a 4th profession', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(makeCharacter({ race: 'HUMAN', level: 15 }));
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([
        { professionType: 'FARMER', isActive: true },
        { professionType: 'MINER', isActive: true },
        { professionType: 'COOK', isActive: true },
      ]);
      (mockedPrisma.playerProfession.create as jest.Mock).mockResolvedValue({
        id: 'prof-004',
        professionType: 'BLACKSMITH',
        tier: 'APPRENTICE',
        level: 1,
        xp: 0,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'BLACKSMITH' });

      expect(res.status).toBe(201);
      expect(res.body.profession.type).toBe('BLACKSMITH');
    });

    it('should reject humans below level 15 from having a 4th profession', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(makeCharacter({ race: 'HUMAN', level: 14 }));
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([
        { professionType: 'FARMER', isActive: true },
        { professionType: 'MINER', isActive: true },
        { professionType: 'COOK', isActive: true },
      ]);

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'BLACKSMITH' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot have more than 3 active professions');
    });

    it('should reactivate a previously abandoned profession', async () => {
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-old',
        professionType: 'FARMER',
        isActive: false,
        tier: 'JOURNEYMAN',
        level: 15,
        xp: 200,
      });
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([]); // no active
      (mockedPrisma.playerProfession.update as jest.Mock).mockResolvedValue({
        id: 'prof-old',
        professionType: 'FARMER',
        isActive: true,
        tier: 'JOURNEYMAN',
        level: 15,
        xp: 200,
      });

      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'FARMER' });

      expect(res.status).toBe(200);
      expect(res.body.profession.reactivated).toBe(true);
      expect(res.body.profession.level).toBe(15);
    });

    it('should reject invalid profession type', async () => {
      const res = await request(app)
        .post('/api/professions/learn')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'WIZARD' });

      expect(res.status).toBe(400);
    });
  });

  // ---- POST /api/professions/abandon ----

  describe('POST /api/professions/abandon', () => {
    it('should abandon an active profession', async () => {
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-001',
        professionType: 'FARMER',
        isActive: true,
      });
      (mockedPrisma.gatheringAction.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.craftingAction.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.playerProfession.update as jest.Mock).mockResolvedValue({
        id: 'prof-001',
        professionType: 'FARMER',
        isActive: false,
      });

      const res = await request(app)
        .post('/api/professions/abandon')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'FARMER' });

      expect(res.status).toBe(200);
      expect(res.body.abandoned).toBe(true);
    });

    it('should reject abandoning a non-active profession', async () => {
      (mockedPrisma.playerProfession.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/professions/abandon')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ professionType: 'FARMER' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('do not have this profession active');
    });
  });

  // ---- GET /api/professions/mine ----

  describe('GET /api/professions/mine', () => {
    it('should return empty list when no professions', async () => {
      (mockedPrisma.playerProfession.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/professions/mine')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.professions).toEqual([]);
    });
  });
});
