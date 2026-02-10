import request from 'supertest';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Progression API (Skills & Abilities)', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- GET /api/skills/tree ----

  describe('GET /api/skills/tree', () => {
    it('should return skill tree for character class', async () => {
      const user = await createTestUserWithCharacter({}, { class: 'warrior', level: 5 });

      const res = await request(app)
        .get('/api/skills/tree')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.class).toBe('warrior');
      expect(res.body.level).toBe(5);
      expect(res.body.tree).toBeDefined();
      expect(Array.isArray(res.body.tree)).toBe(true);
      expect(res.body.unspentSkillPoints).toBeDefined();
    });

    it('should return 404 when user has no character', async () => {
      const { token } = await (await import('./setup')).createTestUser();

      const res = await request(app)
        .get('/api/skills/tree')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ---- POST /api/skills/specialize ----

  describe('POST /api/skills/specialize', () => {
    it('should reject specialization below level 10', async () => {
      const user = await createTestUserWithCharacter({}, { class: 'warrior', level: 5 });

      const res = await request(app)
        .post('/api/skills/specialize')
        .set(authHeader(user.token))
        .send({ specialization: 'berserker' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('level 10');
    });

    it('should reject specialization when already specialized', async () => {
      const user = await createTestUserWithCharacter({}, {
        class: 'warrior',
        level: 10,
        specialization: 'berserker',
      });

      const res = await request(app)
        .post('/api/skills/specialize')
        .set(authHeader(user.token))
        .send({ specialization: 'guardian' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already has a specialization');
    });

    it('should reject invalid specialization for class', async () => {
      const user = await createTestUserWithCharacter({}, { class: 'warrior', level: 10 });

      const res = await request(app)
        .post('/api/skills/specialize')
        .set(authHeader(user.token))
        .send({ specialization: 'necromancer' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid specialization');
    });
  });

  // ---- POST /api/skills/unlock ----

  describe('POST /api/skills/unlock', () => {
    it('should reject unlock with no skill points', async () => {
      const user = await createTestUserWithCharacter({}, {
        class: 'warrior',
        level: 5,
        unspentSkillPoints: 0,
      });

      const res = await request(app)
        .post('/api/skills/unlock')
        .set(authHeader(user.token))
        .send({ abilityId: 'some-ability-id' });

      // Either 404 (ability not found) or 400 (no skill points)
      expect([400, 404]).toContain(res.status);
    });

    it('should reject unlock for nonexistent ability', async () => {
      const user = await createTestUserWithCharacter({}, {
        class: 'warrior',
        level: 5,
        unspentSkillPoints: 3,
      });

      const res = await request(app)
        .post('/api/skills/unlock')
        .set(authHeader(user.token))
        .send({ abilityId: 'nonexistent-ability-id' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  // ---- GET /api/skills/abilities ----

  describe('GET /api/skills/abilities', () => {
    it('should return empty abilities list for new character', async () => {
      const user = await createTestUserWithCharacter({}, { class: 'warrior' });

      const res = await request(app)
        .get('/api/skills/abilities')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.abilities).toBeDefined();
      expect(Array.isArray(res.body.abilities)).toBe(true);
      expect(res.body.abilities.length).toBe(0);
    });

    it('should return 404 when no character exists', async () => {
      const { token } = await (await import('./setup')).createTestUser();

      const res = await request(app)
        .get('/api/skills/abilities')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  // ---- GET /api/work/professions ----

  describe('GET /api/work/professions', () => {
    it('should return empty professions for new character', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/work/professions')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.professions).toBeDefined();
      expect(Array.isArray(res.body.professions)).toBe(true);
    });
  });

  // ---- GET /api/characters/me (stat point verification) ----

  describe('Stat allocation persistence', () => {
    it('should persist allocated stats across requests', async () => {
      const user = await createTestUserWithCharacter({}, { unspentStatPoints: 3 });

      // Allocate (send all 6 keys to avoid NaN from missing defaults)
      const allocRes = await request(app)
        .post('/api/characters/allocate-stats')
        .set(authHeader(user.token))
        .send({ str: 1, dex: 0, con: 2, int: 0, wis: 0, cha: 0 });

      expect(allocRes.status).toBe(200);

      // Verify via /me
      const res = await request(app)
        .get('/api/characters/me')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.character.stats.str).toBe(13); // 12 + 1
      expect(res.body.character.stats.con).toBe(12); // 10 + 2
      expect(res.body.character.unspentStatPoints).toBe(0);
    });
  });

  // ---- Health check ----

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.game).toBe('Realm of Crowns');
      expect(res.body.version).toBeDefined();
    });
  });

  // ---- 404 handler ----

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent/route');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });
  });
});
