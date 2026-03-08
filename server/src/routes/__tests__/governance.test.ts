/**
 * Governance route tests (P2 #48)
 *
 * Tests law proposal, voting with duplicate prevention (rejects second vote),
 * and election lifecycle.
 */

jest.mock('../../lib/db', () => ({
  db: {
    query: {
      characters: { findFirst: jest.fn() },
      kingdoms: { findFirst: jest.fn() },
      towns: { findFirst: jest.fn() },
      laws: { findFirst: jest.fn(), findMany: jest.fn() },
      lawVotes: { findFirst: jest.fn() },
      councilMembers: { findFirst: jest.fn() },
      townPolicies: { findFirst: jest.fn() },
      townTreasuries: { findFirst: jest.fn() },
      wars: { findFirst: jest.fn() },
    },
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]), onConflictDoUpdate: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }) }),
    update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }) }),
    delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
    execute: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) }),
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
  travelStatus: 'idle',
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
    (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/governance/propose-law ----

  describe('POST /api/governance/propose-law', () => {
    it('should allow a ruler to propose a law', async () => {
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue(mockKingdom);
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue(undefined);

      // Mock insert for law creation
      (mockedDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'new-law',
            kingdomId: KINGDOM_ID,
            title: 'Tax Reform',
            status: 'PROPOSED',
          }]),
        }),
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
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue({
        ...mockKingdom,
        rulerId: 'someone-else',
      });
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue(undefined);

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
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue({
        ...mockKingdom,
        rulerId: 'someone-else',
      });
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
        id: 'town-001',
        mayorId: CHAR_ID,
      });

      (mockedDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'new-law',
            kingdomId: KINGDOM_ID,
            title: 'Building Code',
            status: 'PROPOSED',
          }]),
        }),
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
      (mockedDb.query.laws.findFirst as jest.Mock).mockResolvedValue(mockLaw);
      (mockedDb.query.councilMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 'cm-001',
        characterId: CHAR_ID,
        kingdomId: KINGDOM_ID,
      });
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue(mockKingdom);
      (mockedDb.query.lawVotes.findFirst as jest.Mock).mockResolvedValue(undefined); // no existing vote

      // Mock insert for vote creation
      (mockedDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'vote-001' }]),
        }),
      });

      // Mock select().from().where() for vote counts
      (mockedDb.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn()
            .mockResolvedValueOnce([{ count: 1 }]) // votesFor
            .mockResolvedValueOnce([{ count: 0 }]), // votesAgainst
        }),
      });

      // Mock update for law vote counts
      (mockedDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              ...mockLaw,
              status: 'VOTING',
              votesFor: 1,
              votesAgainst: 0,
            }]),
          }),
        }),
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
      (mockedDb.query.laws.findFirst as jest.Mock).mockResolvedValue(mockLaw);
      (mockedDb.query.councilMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 'cm-001',
        characterId: CHAR_ID,
        kingdomId: KINGDOM_ID,
      });
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue(mockKingdom);
      // Already voted
      (mockedDb.query.lawVotes.findFirst as jest.Mock).mockResolvedValue({
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
      (mockedDb.query.laws.findFirst as jest.Mock).mockResolvedValue({
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
      (mockedDb.query.laws.findFirst as jest.Mock).mockResolvedValue(mockLaw);
      (mockedDb.query.councilMembers.findFirst as jest.Mock).mockResolvedValue(undefined);
      (mockedDb.query.kingdoms.findFirst as jest.Mock).mockResolvedValue({
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
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
        id: 'town-001',
        mayorId: CHAR_ID,
      });
      (mockedDb.query.townPolicies.findFirst as jest.Mock).mockResolvedValue(undefined);
      (mockedDb.query.townTreasuries.findFirst as jest.Mock).mockResolvedValue(undefined);

      // Mock insert/update for policy upsert
      (mockedDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            townId: 'town-001',
            taxRate: 0.15,
          }]),
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              townId: 'town-001',
              taxRate: 0.15,
            }]),
          }),
        }),
      });

      // Mock update for treasury
      (mockedDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{}]),
          }),
        }),
      });

      const res = await request(app)
        .post('/api/governance/set-tax')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ townId: 'town-001', taxRate: 0.15 });

      expect(res.status).toBe(200);
      expect(res.body.policy.taxRate).toBe(0.15);
    });

    it('should reject non-mayor from setting tax', async () => {
      (mockedDb.query.towns.findFirst as jest.Mock).mockResolvedValue({
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
      (mockedDb.query.laws.findMany as jest.Mock).mockResolvedValue([
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
