import request from 'supertest';
import { app } from '../app';
import {
  createTestUser,
  createTestUserWithCharacter,
  createTestTown,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Characters API', () => {
  afterEach(async () => {
    await cleanupTestData();
    // Clean up any content release records created during tests
    await prisma.contentRelease.deleteMany({
      where: { contentId: { startsWith: 'test_' } },
    }).catch(() => {});
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/characters/create ----

  describe('POST /api/characters/create', () => {
    it('should create a character successfully', async () => {
      const testUser = await createTestUser();
      // Create a released town matching a Human starting town name
      const { town } = await createTestTown('Kingshold');
      await prisma.town.update({
        where: { id: town.id },
        data: { isReleased: true },
      });
      // Ensure HUMAN race is marked as released in ContentRelease table
      await prisma.contentRelease.upsert({
        where: { contentType_contentId: { contentType: 'race', contentId: 'human' } },
        create: { contentType: 'race', contentId: 'human', contentName: 'Humans', tier: 'core', isReleased: true, releasedAt: new Date() },
        update: { isReleased: true, releasedAt: new Date() },
      });

      const res = await request(app)
        .post('/api/characters/create')
        .set(authHeader(testUser.token))
        .send({
          name: 'TestHero',
          race: 'HUMAN',
          characterClass: 'warrior',
        });

      expect(res.status).toBe(201);
      expect(res.body.character).toBeDefined();
      expect(res.body.character.name).toBe('TestHero');
      expect(res.body.character.race).toBe('HUMAN');
      expect(res.body.character.class).toBe('warrior');
      // Town is auto-assigned based on race; verify it's the released Kingshold town
      expect(res.body.character.currentTownId).toBe(town.id);
      expect(res.body.character.homeTownId).toBe(town.id);
      expect(res.body.character.stats).toBeDefined();
      expect(res.body.character.gold).toBeGreaterThan(0);

      // Clean up character
      await prisma.character.delete({ where: { id: res.body.character.id } });
    });

    it('should reject duplicate character (one per user)', async () => {
      const { town } = await createTestTown();
      const testUser = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/characters/create')
        .set(authHeader(testUser.token))
        .send({
          name: 'SecondHero',
          race: 'ELF',
          characterClass: 'mage',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already have a character');
    });

    it('should reject invalid race', async () => {
      const testUser = await createTestUser();

      const res = await request(app)
        .post('/api/characters/create')
        .set(authHeader(testUser.token))
        .send({
          name: 'BadRace',
          race: 'NOTARACE',
          characterClass: 'warrior',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid class', async () => {
      const testUser = await createTestUser();

      const res = await request(app)
        .post('/api/characters/create')
        .set(authHeader(testUser.token))
        .send({
          name: 'BadClass',
          race: 'HUMAN',
          characterClass: 'wizard',
        });

      expect(res.status).toBe(400);
    });

    it('should require sub-race for Drakonid', async () => {
      const testUser = await createTestUser();

      const res = await request(app)
        .post('/api/characters/create')
        .set(authHeader(testUser.token))
        .send({
          name: 'DragonNoSub',
          race: 'DRAKONID',
          characterClass: 'warrior',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dragonBloodline');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/characters/create')
        .send({
          name: 'NoAuth',
          race: 'HUMAN',
          characterClass: 'warrior',
        });

      expect(res.status).toBe(401);
    });
  });

  // ---- GET /api/characters/me ----

  describe('GET /api/characters/me', () => {
    it('should return the character for an authenticated user', async () => {
      const testUser = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/characters/me')
        .set(authHeader(testUser.token));

      expect(res.status).toBe(200);
      expect(res.body.character).toBeDefined();
      expect(res.body.character.id).toBe(testUser.character.id);
      expect(res.body.character.name).toBe(testUser.character.name);
      expect(res.body.character.stats).toBeDefined();
    });

    it('should return 404 when user has no character', async () => {
      const testUser = await createTestUser();

      const res = await request(app)
        .get('/api/characters/me')
        .set(authHeader(testUser.token));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No character found');
    });
  });

  // ---- POST /api/characters/allocate-stats ----

  describe('POST /api/characters/allocate-stats', () => {
    it('should allocate stats successfully', async () => {
      const testUser = await createTestUserWithCharacter({}, { unspentStatPoints: 5 });

      const res = await request(app)
        .post('/api/characters/allocate-stats')
        .set(authHeader(testUser.token))
        .send({ str: 2, dex: 1, con: 2, int: 0, wis: 0, cha: 0 });

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.str).toBe(14); // 12 base + 2
      expect(res.body.stats.dex).toBe(11); // 10 base + 1
      expect(res.body.unspentStatPoints).toBe(0); // 5 - 5
    });

    it('should reject when insufficient stat points', async () => {
      const testUser = await createTestUserWithCharacter({}, { unspentStatPoints: 2 });

      const res = await request(app)
        .post('/api/characters/allocate-stats')
        .set(authHeader(testUser.token))
        .send({ str: 3, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Not enough stat points');
    });

    it('should reject zero allocation', async () => {
      const testUser = await createTestUserWithCharacter({}, { unspentStatPoints: 5 });

      const res = await request(app)
        .post('/api/characters/allocate-stats')
        .set(authHeader(testUser.token))
        .send({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Must allocate at least 1');
    });
  });

  // ---- GET /api/characters/:id ----

  describe('GET /api/characters/:id', () => {
    it('should return public character data by ID', async () => {
      const viewer = await createTestUserWithCharacter();
      const target = await createTestUserWithCharacter();

      const res = await request(app)
        .get(`/api/characters/${target.character.id}`)
        .set(authHeader(viewer.token));

      expect(res.status).toBe(200);
      expect(res.body.character.id).toBe(target.character.id);
      expect(res.body.character.name).toBe(target.character.name);
      expect(res.body.character.level).toBeDefined();
      // Should NOT include gold or stats (private fields)
      expect(res.body.character.gold).toBeUndefined();
    });

    it('should return 404 for nonexistent character', async () => {
      const viewer = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/characters/00000000-0000-0000-0000-000000000000')
        .set(authHeader(viewer.token));

      expect(res.status).toBe(404);
    });
  });
});
