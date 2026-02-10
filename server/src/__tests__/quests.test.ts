import request from 'supertest';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  createTestTown,
  createTestQuest,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Quests API', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- GET /api/quests/available ----

  describe('GET /api/quests/available', () => {
    it('should return available quests for the character', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      await createTestQuest(region.id, { levelRequired: 1 });
      await createTestQuest(region.id, { levelRequired: 3 });

      const res = await request(app)
        .get('/api/quests/available')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.quests).toBeDefined();
      expect(Array.isArray(res.body.quests)).toBe(true);
      expect(res.body.quests.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter out quests above character level', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 1 });
      await createTestQuest(region.id, { levelRequired: 50, name: 'HighLevelQuest' });

      const res = await request(app)
        .get('/api/quests/available')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      const highLevelQuest = res.body.quests.find((q: any) => q.name === 'HighLevelQuest');
      expect(highLevelQuest).toBeUndefined();
    });
  });

  // ---- POST /api/quests/accept ----

  describe('POST /api/quests/accept', () => {
    it('should accept a quest successfully', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      const quest = await createTestQuest(region.id, { levelRequired: 1 });

      const res = await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(201);
      expect(res.body.quest).toBeDefined();
      expect(res.body.quest.questId).toBe(quest.id);
      expect(res.body.quest.progress).toBeDefined();
    });

    it('should reject quest when level too low', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 1 });
      const quest = await createTestQuest(region.id, { levelRequired: 10 });

      const res = await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('level');
    });

    it('should reject accepting same quest twice', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      const quest = await createTestQuest(region.id, { levelRequired: 1 });

      // Accept first time
      await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      // Try to accept again
      const res = await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already active');
    });

    it('should reject nonexistent quest', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Quest not found');
    });
  });

  // ---- POST /api/quests/complete ----

  describe('POST /api/quests/complete', () => {
    it('should reject when objectives not met', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      const quest = await createTestQuest(region.id, {
        levelRequired: 1,
        objectives: [{ type: 'kill', target: 'goblin', quantity: 5 }],
      });

      // Accept quest
      await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      // Try to complete without progress
      const res = await request(app)
        .post('/api/quests/complete')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not complete');
    });

    it('should complete quest successfully when objectives met', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5, gold: 0 });
      const quest = await createTestQuest(region.id, {
        levelRequired: 1,
        objectives: [{ type: 'kill', target: 'goblin', quantity: 3 }],
        rewards: { xp: 100, gold: 50 },
      });

      // Accept
      await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      // Manually set progress to complete
      await prisma.questProgress.updateMany({
        where: { characterId: user.character.id, questId: quest.id },
        data: { progress: { '0': 3 } },
      });

      // Complete
      const res = await request(app)
        .post('/api/quests/complete')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.rewards.xp).toBe(100);
      expect(res.body.rewards.gold).toBe(50);
    });

    it('should reject completing quest not in progress', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/quests/complete')
        .set(authHeader(user.token))
        .send({ questId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Active quest not found');
    });
  });

  // ---- POST /api/quests/abandon ----

  describe('POST /api/quests/abandon', () => {
    it('should abandon an active quest', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      const quest = await createTestQuest(region.id, { levelRequired: 1 });

      // Accept
      await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      // Abandon
      const res = await request(app)
        .post('/api/quests/abandon')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      expect(res.status).toBe(200);
      expect(res.body.abandoned).toBe(true);
      expect(res.body.questId).toBe(quest.id);
    });

    it('should reject abandoning quest not in progress', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/quests/abandon')
        .set(authHeader(user.token))
        .send({ questId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Active quest not found');
    });
  });

  // ---- GET /api/quests/active ----

  describe('GET /api/quests/active', () => {
    it('should return active quests', async () => {
      const { town, region } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id, level: 5 });
      const quest = await createTestQuest(region.id, { levelRequired: 1 });

      // Accept a quest
      await request(app)
        .post('/api/quests/accept')
        .set(authHeader(user.token))
        .send({ questId: quest.id });

      const res = await request(app)
        .get('/api/quests/active')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.quests).toBeDefined();
      expect(res.body.quests.length).toBe(1);
      expect(res.body.quests[0].questId).toBe(quest.id);
    });
  });

  // ---- GET /api/quests/completed ----

  describe('GET /api/quests/completed', () => {
    it('should return empty list when no quests completed', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/quests/completed')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.quests).toBeDefined();
      expect(res.body.quests.length).toBe(0);
    });
  });
});
