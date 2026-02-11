/**
 * Governance route tests (P2 #48)
 *
 * Tests law proposal, voting with duplicate prevention (rejects second vote),
 * and election lifecycle.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn() },
    kingdom: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    town: { findUnique: jest.fn(), findFirst: jest.fn() },
    law: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    lawVote: { findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
    councilMember: { findFirst: jest.fn(), create: jest.fn() },
    townPolicy: { upsert: jest.fn() },
    townTreasury: { upsert: jest.fn(), update: jest.fn() },
    war: { findFirst: jest.fn(), create: jest.fn() },
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
const KINGDOM_ID = 'kingdom-001';
const LAW_ID = 'law-001';
const TOKEN = makeToken(USER_ID);

const mockCharacter = {
  id: CHAR_ID,
  userId: USER_ID,
  name: 'RulerHero',
  race: 'HUMAN',
  level: 20,
  gold: 1000,
  currentTownId: 'town-001',
};

const mockKingdom = {
  id: KINGDOM_ID,
  name: 'TestKingdom',
  rulerId: CHAR_ID,
  treasury: 10000,
};

describe('Governance API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/governance/propose-law ----

  describe('POST /api/governance/propose-law', () => {
    it('should allow a ruler to propose a law', async () => {
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue(mockKingdom);
      (mockedPrisma.town.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.law.create as jest.Mock).mockResolvedValue({
        id: 'new-law',
        kingdomId: KINGDOM_ID,
        title: 'Tax Reform',
        status: 'PROPOSED',
      });

      const res = await request(app)
        .post('/api/governance/propose-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          kingdomId: KINGDOM_ID,
          title: 'Tax Reform',
          description: 'Reduce taxes to 10%',
          lawType: 'tax',
        });

      expect(res.status).toBe(201);
      expect(res.body.law).toBeDefined();
      expect(res.body.law.title).toBe('Tax Reform');
      expect(res.body.law.status).toBe('PROPOSED');
    });

    it('should reject when character is neither ruler nor mayor', async () => {
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue({
        ...mockKingdom,
        rulerId: 'someone-else',
      });
      (mockedPrisma.town.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/governance/propose-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          kingdomId: KINGDOM_ID,
          title: 'Tax Reform',
          lawType: 'tax',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only rulers or mayors');
    });

    it('should allow a mayor to propose a law', async () => {
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue({
        ...mockKingdom,
        rulerId: 'someone-else',
      });
      (mockedPrisma.town.findFirst as jest.Mock).mockResolvedValue({
        id: 'town-001',
        mayorId: CHAR_ID,
      });
      (mockedPrisma.law.create as jest.Mock).mockResolvedValue({
        id: 'new-law',
        kingdomId: KINGDOM_ID,
        title: 'Building Code',
        status: 'PROPOSED',
      });

      const res = await request(app)
        .post('/api/governance/propose-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          kingdomId: KINGDOM_ID,
          title: 'Building Code',
          lawType: 'building',
        });

      expect(res.status).toBe(201);
    });
  });

  // ---- POST /api/governance/vote-law ----

  describe('POST /api/governance/vote-law', () => {
    const mockLaw = {
      id: LAW_ID,
      kingdomId: KINGDOM_ID,
      title: 'Tax Reform',
      status: 'PROPOSED',
      votesFor: 0,
      votesAgainst: 0,
    };

    it('should allow a council member to vote on a law', async () => {
      (mockedPrisma.law.findUnique as jest.Mock).mockResolvedValue(mockLaw);
      (mockedPrisma.councilMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'cm-001',
        characterId: CHAR_ID,
        kingdomId: KINGDOM_ID,
      });
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue(mockKingdom);
      (mockedPrisma.lawVote.findUnique as jest.Mock).mockResolvedValue(null); // no existing vote
      (mockedPrisma.lawVote.create as jest.Mock).mockResolvedValue({ id: 'vote-001' });
      (mockedPrisma.lawVote.count as jest.Mock)
        .mockResolvedValueOnce(1) // votesFor
        .mockResolvedValueOnce(0); // votesAgainst
      (mockedPrisma.law.update as jest.Mock).mockResolvedValue({
        ...mockLaw,
        status: 'VOTING',
        votesFor: 1,
        votesAgainst: 0,
      });

      const res = await request(app)
        .post('/api/governance/vote-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ lawId: LAW_ID, vote: 'for' });

      expect(res.status).toBe(200);
      expect(res.body.law).toBeDefined();
      expect(res.body.law.votesFor).toBe(1);
    });

    it('should reject duplicate votes (vote stuffing prevention)', async () => {
      (mockedPrisma.law.findUnique as jest.Mock).mockResolvedValue(mockLaw);
      (mockedPrisma.councilMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'cm-001',
        characterId: CHAR_ID,
        kingdomId: KINGDOM_ID,
      });
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue(mockKingdom);
      // Already voted
      (mockedPrisma.lawVote.findUnique as jest.Mock).mockResolvedValue({
        id: 'vote-001',
        lawId: LAW_ID,
        characterId: CHAR_ID,
        vote: 'FOR',
      });

      const res = await request(app)
        .post('/api/governance/vote-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ lawId: LAW_ID, vote: 'for' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already voted');
    });

    it('should reject votes on non-voting laws', async () => {
      (mockedPrisma.law.findUnique as jest.Mock).mockResolvedValue({
        ...mockLaw,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/governance/vote-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ lawId: LAW_ID, vote: 'for' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not open for voting');
    });

    it('should reject votes from non-council members', async () => {
      (mockedPrisma.law.findUnique as jest.Mock).mockResolvedValue(mockLaw);
      (mockedPrisma.councilMember.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.kingdom.findUnique as jest.Mock).mockResolvedValue({
        ...mockKingdom,
        rulerId: 'someone-else',
      });

      const res = await request(app)
        .post('/api/governance/vote-law')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ lawId: LAW_ID, vote: 'for' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only council members');
    });
  });

  // ---- POST /api/governance/set-tax ----

  describe('POST /api/governance/set-tax', () => {
    it('should allow the mayor to set tax rate', async () => {
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue({
        id: 'town-001',
        mayorId: CHAR_ID,
      });
      (mockedPrisma.townPolicy.upsert as jest.Mock).mockResolvedValue({
        townId: 'town-001',
        taxRate: 0.15,
      });
      (mockedPrisma.townTreasury.upsert as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ townId: 'town-001', taxRate: 0.15 });

      expect(res.status).toBe(200);
      expect(res.body.policy.taxRate).toBe(0.15);
    });

    it('should reject non-mayor from setting tax', async () => {
      (mockedPrisma.town.findUnique as jest.Mock).mockResolvedValue({
        id: 'town-001',
        mayorId: 'someone-else',
      });

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ townId: 'town-001', taxRate: 0.15 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only the mayor');
    });

    it('should reject tax rate above 25%', async () => {
      const res = await request(app)
        .post('/api/governance/set-tax')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ townId: 'town-001', taxRate: 0.30 });

      expect(res.status).toBe(400);
    });
  });

  // ---- GET /api/governance/laws ----

  describe('GET /api/governance/laws', () => {
    it('should require kingdomId parameter', async () => {
      const res = await request(app)
        .get('/api/governance/laws')
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('kingdomId');
    });

    it('should return laws for a kingdom', async () => {
      (mockedPrisma.law.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'law-001',
          title: 'Tax Reform',
          status: 'ACTIVE',
          enactedBy: { id: CHAR_ID, name: 'RulerHero' },
        },
      ]);

      const res = await request(app)
        .get('/api/governance/laws')
        .query({ kingdomId: KINGDOM_ID })
        .set('Authorization', `Bearer ${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.laws).toHaveLength(1);
    });
  });
});
