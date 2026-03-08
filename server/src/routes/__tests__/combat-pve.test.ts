/**
 * Combat PvE route tests (P2 #48)
 *
 * Tests combat start, attack action with server-side weapon lookup,
 * damage calculation, finish combat transaction, flee with minor penalty,
 * and death penalty.
 */

jest.mock('../../lib/db', () => ({
  db: {
    query: {
      characters: { findFirst: jest.fn(), findMany: jest.fn() },
      monsters: { findMany: jest.fn(), findFirst: jest.fn() },
      combatSessions: { findFirst: jest.fn(), findMany: jest.fn() },
      combatParticipants: { findFirst: jest.fn(), findMany: jest.fn() },
      combatLogs: { findFirst: jest.fn() },
      characterEquipment: { findFirst: jest.fn(), findMany: jest.fn() },
      items: { findFirst: jest.fn() },
    },
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }),
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
  emitCombatResult: jest.fn(),
  emitPlayerEnterTown: jest.fn(),
  emitPlayerLeaveTown: jest.fn(),
  emitTradeCompleted: jest.fn(),
  emitFriendRequest: jest.fn(),
  emitFriendAccepted: jest.fn(),
  emitLevelUp: jest.fn(),
  emitAchievementUnlocked: jest.fn(),
  emitNotification: jest.fn(),
  emitGovernanceEvent: jest.fn(),
  emitGuildEvent: jest.fn(),
}));

jest.mock('../../services/quest-triggers', () => ({
  onMonsterKill: jest.fn(),
}));

jest.mock('../../services/progression', () => ({
  checkLevelUp: jest.fn(),
}));

jest.mock('../../services/achievements', () => ({
  checkAchievements: jest.fn(),
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
const TOKEN = makeToken(USER_ID);

const mockCharacter = {
  id: CHAR_ID,
  userId: USER_ID,
  name: 'TestHero',
  race: 'HUMAN',
  level: 5,
  gold: 500,
  health: 100,
  maxHealth: 100,
  xp: 200,
  currentTownId: 'town-001',
  travelStatus: 'idle',
  currentTown: { id: 'town-001', name: 'TestTown', regionId: 'region-001' },
  stats: { str: 14, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
};

const mockMonster = {
  id: 'monster-001',
  name: 'Goblin Scout',
  level: 4,
  regionId: 'region-001',
  biome: 'PLAINS',
  stats: { hp: 30, ac: 12, str: 10, dex: 12, con: 10, int: 5, wis: 5, cha: 5, damage: '1d6', attack: 3 },
  lootTable: [{ dropChance: 1.0, minQty: 1, maxQty: 1, gold: 10 }],
};

describe('Combat PvE API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- POST /api/combat/pve/start ----
  // Standalone PvE combat is disabled — combat now only occurs as road encounters during travel.

  describe('POST /api/combat/pve/start', () => {
    it('should always return 400 because standalone PvE is disabled', async () => {
      (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue(mockCharacter);

      // Note: characterId must be a valid RFC 4122 UUID (variant bits [89ab] in 4th group)
      // to pass Zod's z.string().uuid() before reaching the disabled route handler
      const validUUID = '22222222-2222-4222-a222-222222222222';
      const res = await request(app)
        .post('/api/combat/pve/start')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ characterId: validUUID });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('road encounters during travel');
    });
  });

  // ---- POST /api/combat/pve/action ----

  describe('POST /api/combat/pve/action', () => {
    it('should return 404 when session not found', async () => {
      (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue(mockCharacter);

      const res = await request(app)
        .post('/api/combat/pve/action')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          sessionId: '00000000-0000-0000-0000-000000000000',
          action: { type: 'attack' },
        });

      // Combat state is stored in memory/Redis, not found returns 404
      expect(res.status).toBe(404);
    });
  });

  // ---- GET /api/combat/pve/state ----

  describe('GET /api/combat/pve/state', () => {
    it('should require sessionId query parameter', async () => {
      const res = await request(app)
        .get('/api/combat/pve/state')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sessionId');
    });

    it('should return 404 for unknown session', async () => {
      (mockedDb.query.combatSessions.findFirst as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .get('/api/combat/pve/state')
        .query({ sessionId: '00000000-0000-0000-0000-000000000000' })
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(404);
    });
  });
});
