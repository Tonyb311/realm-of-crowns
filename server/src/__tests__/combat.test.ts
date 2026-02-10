import request from 'supertest';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  createTestTown,
  createTestMonster,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Combat API (PvE & PvP)', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/combat/pve/start ----

  describe('POST /api/combat/pve/start', () => {
    it('should start PvE combat successfully', async () => {
      const { town, region } = await createTestTown();
      const monster = await createTestMonster(region.id);
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 1 });

      const res = await request(app)
        .post('/api/combat/pve/start')
        .set(authHeader(user.token))
        .send({ characterId: user.character.id });

      expect(res.status).toBe(201);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.combat).toBeDefined();
      expect(res.body.combat.round).toBe(1);
      expect(res.body.combat.combatants).toBeDefined();
      expect(res.body.combat.combatants.length).toBe(2);
      expect(res.body.combat.monster).toBeDefined();

      // Clean up combat session
      await prisma.combatParticipant.deleteMany({ where: { sessionId: res.body.sessionId } });
      await prisma.combatSession.delete({ where: { id: res.body.sessionId } });
    });

    it('should reject when character not found', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/combat/pve/start')
        .set(authHeader(user.token))
        .send({ characterId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Character not found');
    });

    it('should reject when character is not in a town', async () => {
      const user = await createTestUserWithCharacter({}, { townId: undefined });

      const res = await request(app)
        .post('/api/combat/pve/start')
        .set(authHeader(user.token))
        .send({ characterId: user.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not in a town');
    });

    it('should reject starting combat when already in combat', async () => {
      const { town, region } = await createTestTown();
      await createTestMonster(region.id);
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      // Start first combat
      const firstRes = await request(app)
        .post('/api/combat/pve/start')
        .set(authHeader(user.token))
        .send({ characterId: user.character.id });

      expect(firstRes.status).toBe(201);

      // Try to start second combat
      const secondRes = await request(app)
        .post('/api/combat/pve/start')
        .set(authHeader(user.token))
        .send({ characterId: user.character.id });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.error).toContain('already in combat');

      // Clean up
      await prisma.combatParticipant.deleteMany({ where: { sessionId: firstRes.body.sessionId } });
      await prisma.combatSession.delete({ where: { id: firstRes.body.sessionId } });
    });
  });

  // ---- GET /api/combat/pve/state ----

  describe('GET /api/combat/pve/state', () => {
    it('should require sessionId query parameter', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/combat/pve/state')
        .set(authHeader(user.token));

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sessionId');
    });

    it('should return 404 for nonexistent session', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/combat/pve/state')
        .set(authHeader(user.token))
        .query({ sessionId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });
  });

  // ---- POST /api/combat/pvp/challenge ----

  describe('POST /api/combat/pvp/challenge', () => {
    it('should reject self-challenge', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(user.token))
        .send({ targetCharacterId: user.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot challenge yourself');
    });

    it('should reject challenge when not in same town', async () => {
      const { town: town1 } = await createTestTown();
      const { town: town2 } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town1.id });
      const target = await createTestUserWithCharacter({}, { townId: town2.id });

      const res = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: target.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('same town');
    });

    it('should create a PvP challenge successfully', async () => {
      const { town } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town.id, gold: 100 });
      const target = await createTestUserWithCharacter({}, { townId: town.id, gold: 100 });

      const res = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: target.character.id });

      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.status).toBe('pending');
      expect(res.body.session.challenger.id).toBe(challenger.character.id);
      expect(res.body.session.target.id).toBe(target.character.id);

      // Clean up
      await prisma.combatParticipant.deleteMany({ where: { sessionId: res.body.session.id } });
      await prisma.combatSession.delete({ where: { id: res.body.session.id } });
    });

    it('should reject challenge when target not found', async () => {
      const { town } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Target character not found');
    });

    it('should reject challenge with too large level difference', async () => {
      const { town } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town.id, level: 1 });
      const target = await createTestUserWithCharacter({}, { townId: town.id, level: 10 });

      const res = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: target.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Level difference');
    });
  });

  // ---- POST /api/combat/pvp/decline ----

  describe('POST /api/combat/pvp/decline', () => {
    it('should decline a challenge successfully', async () => {
      const { town } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town.id });
      const target = await createTestUserWithCharacter({}, { townId: town.id });

      // Create challenge
      const challengeRes = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: target.character.id });

      const sessionId = challengeRes.body.session.id;

      // Decline as target
      const declineRes = await request(app)
        .post('/api/combat/pvp/decline')
        .set(authHeader(target.token))
        .send({ sessionId });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.session.status).toBe('cancelled');

      // Clean up
      await prisma.combatParticipant.deleteMany({ where: { sessionId } });
      await prisma.combatSession.delete({ where: { id: sessionId } });
    });

    it('should reject decline from non-target', async () => {
      const { town } = await createTestTown();
      const challenger = await createTestUserWithCharacter({}, { townId: town.id });
      const target = await createTestUserWithCharacter({}, { townId: town.id });

      const challengeRes = await request(app)
        .post('/api/combat/pvp/challenge')
        .set(authHeader(challenger.token))
        .send({ targetCharacterId: target.character.id });

      const sessionId = challengeRes.body.session.id;

      // Challenger tries to decline their own challenge
      const declineRes = await request(app)
        .post('/api/combat/pvp/decline')
        .set(authHeader(challenger.token))
        .send({ sessionId });

      expect(declineRes.status).toBe(403);

      // Clean up
      await prisma.combatParticipant.deleteMany({ where: { sessionId } });
      await prisma.combatSession.delete({ where: { id: sessionId } });
    });
  });
});
