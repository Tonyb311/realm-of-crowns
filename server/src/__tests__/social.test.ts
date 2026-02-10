import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  createTestTown,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  trackGuildId,
  prisma,
} from './setup';

describe('Social API (Guilds, Messages, Friends)', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/guilds (create) ----

  describe('POST /api/guilds', () => {
    it('should create a guild successfully', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 1000 });
      const suffix = uuidv4().slice(0, 8);

      const res = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({
          name: `TestGuild${suffix}`,
          tag: 'TG',
          description: 'A test guild',
        });

      expect(res.status).toBe(201);
      expect(res.body.guild).toBeDefined();
      expect(res.body.guild.name).toBe(`TestGuild${suffix}`);
      expect(res.body.guild.tag).toBe('TG');
      trackGuildId(res.body.guild.id);
    });

    it('should reject guild creation with insufficient gold', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 100 });

      const res = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({
          name: 'Poor Guild',
          tag: 'PG',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient gold');
    });

    it('should reject duplicate guild name', async () => {
      const user1 = await createTestUserWithCharacter({}, { gold: 1000 });
      const user2 = await createTestUserWithCharacter({}, { gold: 1000 });
      const guildName = `DupeGuild${uuidv4().slice(0, 8)}`;

      const res1 = await request(app)
        .post('/api/guilds')
        .set(authHeader(user1.token))
        .send({ name: guildName, tag: 'UG' });

      expect(res1.status).toBe(201);
      trackGuildId(res1.body.guild.id);

      const res2 = await request(app)
        .post('/api/guilds')
        .set(authHeader(user2.token))
        .send({ name: guildName, tag: 'U2' });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toContain('already exists');
    });

    it('should reject short guild name', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 1000 });

      const res = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({ name: 'AB', tag: 'AB' });

      expect(res.status).toBe(400);
    });
  });

  // ---- POST /api/guilds/:id/donate ----

  describe('POST /api/guilds/:id/donate', () => {
    it('should donate gold to guild treasury', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 1000 });

      const createRes = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({ name: `DonateGuild${uuidv4().slice(0, 8)}`, tag: 'DG' });

      const guildId = createRes.body.guild.id;
      trackGuildId(guildId);

      const res = await request(app)
        .post(`/api/guilds/${guildId}/donate`)
        .set(authHeader(user.token))
        .send({ amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.donated).toBe(100);
      expect(res.body.treasury).toBeGreaterThanOrEqual(100);
    });

    it('should reject donation with insufficient gold', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 600 }); // 500 for creation, 100 left

      const createRes = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({ name: `PoorDonate${uuidv4().slice(0, 8)}`, tag: 'PD' });

      const guildId = createRes.body.guild.id;
      trackGuildId(guildId);

      const res = await request(app)
        .post(`/api/guilds/${guildId}/donate`)
        .set(authHeader(user.token))
        .send({ amount: 500 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient gold');
    });

    it('should reject donation from non-member', async () => {
      const leader = await createTestUserWithCharacter({}, { gold: 1000 });
      const nonMember = await createTestUserWithCharacter({}, { gold: 1000 });

      const createRes = await request(app)
        .post('/api/guilds')
        .set(authHeader(leader.token))
        .send({ name: `NoJoinGuild${uuidv4().slice(0, 8)}`, tag: 'NJ' });

      const guildId = createRes.body.guild.id;
      trackGuildId(guildId);

      const res = await request(app)
        .post(`/api/guilds/${guildId}/donate`)
        .set(authHeader(nonMember.token))
        .send({ amount: 50 });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not a member');
    });
  });

  // ---- GET /api/guilds ----

  describe('GET /api/guilds', () => {
    it('should list guilds', async () => {
      const user = await createTestUserWithCharacter({}, { gold: 1000 });

      const createRes = await request(app)
        .post('/api/guilds')
        .set(authHeader(user.token))
        .send({ name: `ListableGuild${uuidv4().slice(0, 8)}`, tag: 'LG' });

      trackGuildId(createRes.body.guild.id);

      const res = await request(app)
        .get('/api/guilds')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.guilds).toBeDefined();
      expect(Array.isArray(res.body.guilds)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  // ---- POST /api/messages/send ----

  describe('POST /api/messages/send', () => {
    it('should send a whisper message', async () => {
      const sender = await createTestUserWithCharacter();
      const recipient = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/messages/send')
        .set(authHeader(sender.token))
        .send({
          channelType: 'WHISPER',
          content: 'Hello there!',
          recipientId: recipient.character.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.content).toBe('Hello there!');
      expect(res.body.message.channelType).toBe('WHISPER');
    });

    it('should reject self-whisper', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/messages/send')
        .set(authHeader(user.token))
        .send({
          channelType: 'WHISPER',
          content: 'Talking to myself',
          recipientId: user.character.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot whisper to yourself');
    });

    it('should reject whisper without recipient', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/messages/send')
        .set(authHeader(user.token))
        .send({
          channelType: 'WHISPER',
          content: 'No recipient',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('recipientId is required');
    });

    it('should reject empty message content', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/messages/send')
        .set(authHeader(user.token))
        .send({
          channelType: 'WHISPER',
          content: '',
          recipientId: 'some-id',
        });

      expect(res.status).toBe(400);
    });

    it('should send a town message', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/messages/send')
        .set(authHeader(user.token))
        .send({
          channelType: 'TOWN',
          content: 'Hello town!',
        });

      expect(res.status).toBe(201);
      expect(res.body.message.channelType).toBe('TOWN');
    });
  });

  // ---- POST /api/friends/request ----

  describe('POST /api/friends/request', () => {
    it('should send a friend request successfully', async () => {
      const requester = await createTestUserWithCharacter();
      const target = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/friends/request')
        .set(authHeader(requester.token))
        .send({ characterId: target.character.id });

      expect(res.status).toBe(201);
      expect(res.body.friendship).toBeDefined();
      expect(res.body.friendship.status).toBe('PENDING');
      expect(res.body.friendship.recipientId).toBe(target.character.id);
    });

    it('should reject duplicate friend request', async () => {
      const requester = await createTestUserWithCharacter();
      const target = await createTestUserWithCharacter();

      // First request
      await request(app)
        .post('/api/friends/request')
        .set(authHeader(requester.token))
        .send({ characterId: target.character.id });

      // Duplicate
      const res = await request(app)
        .post('/api/friends/request')
        .set(authHeader(requester.token))
        .send({ characterId: target.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already pending');
    });

    it('should reject self-friend-request', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/friends/request')
        .set(authHeader(user.token))
        .send({ characterId: user.character.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('yourself');
    });

    it('should reject friend request to nonexistent character', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .post('/api/friends/request')
        .set(authHeader(user.token))
        .send({ characterId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  // ---- POST /api/friends/:id/accept ----

  describe('POST /api/friends/:id/accept', () => {
    it('should accept a friend request', async () => {
      const requester = await createTestUserWithCharacter();
      const target = await createTestUserWithCharacter();

      const reqRes = await request(app)
        .post('/api/friends/request')
        .set(authHeader(requester.token))
        .send({ characterId: target.character.id });

      const friendshipId = reqRes.body.friendship.id;

      const res = await request(app)
        .post(`/api/friends/${friendshipId}/accept`)
        .set(authHeader(target.token));

      expect(res.status).toBe(200);
      expect(res.body.friendship.status).toBe('ACCEPTED');
    });

    it('should reject accept from non-recipient', async () => {
      const requester = await createTestUserWithCharacter();
      const target = await createTestUserWithCharacter();

      const reqRes = await request(app)
        .post('/api/friends/request')
        .set(authHeader(requester.token))
        .send({ characterId: target.character.id });

      const friendshipId = reqRes.body.friendship.id;

      // Requester tries to accept their own request
      const res = await request(app)
        .post(`/api/friends/${friendshipId}/accept`)
        .set(authHeader(requester.token));

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Only the recipient');
    });
  });

  // ---- GET /api/friends ----

  describe('GET /api/friends', () => {
    it('should return friends list', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/friends')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.friends).toBeDefined();
      expect(Array.isArray(res.body.friends)).toBe(true);
    });
  });

  // ---- GET /api/friends/requests ----

  describe('GET /api/friends/requests', () => {
    it('should return incoming and outgoing requests', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/friends/requests')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.incoming).toBeDefined();
      expect(res.body.outgoing).toBeDefined();
    });
  });
});
