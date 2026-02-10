import request from 'supertest';
import { app } from '../app';
import {
  createTestUserWithCharacter,
  createTestTown,
  createTestItem,
  createTestResource,
  authHeader,
  cleanupTestData,
  disconnectPrisma,
  prisma,
} from './setup';

describe('Economy API (Market, Crafting, Work)', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ---- POST /api/market/list ----

  describe('POST /api/market/list', () => {
    it('should list an item on the market', async () => {
      const { town } = await createTestTown();
      const seller = await createTestUserWithCharacter({}, { townId: town.id, gold: 500 });
      const { item } = await createTestItem(seller.character.id);

      // Add to inventory
      await prisma.inventory.create({
        data: {
          characterId: seller.character.id,
          itemId: item.id,
          quantity: 5,
        },
      });

      const res = await request(app)
        .post('/api/market/list')
        .set(authHeader(seller.token))
        .send({
          itemId: item.id,
          price: 100,
          quantity: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.listing).toBeDefined();
      expect(res.body.listing.price).toBe(100);
      expect(res.body.listing.quantity).toBe(3);
    });

    it('should reject listing item not in inventory', async () => {
      const { town } = await createTestTown();
      const seller = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/market/list')
        .set(authHeader(seller.token))
        .send({
          itemId: '00000000-0000-0000-0000-000000000000',
          price: 100,
          quantity: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found in inventory');
    });

    it('should reject listing when not in a town', async () => {
      const seller = await createTestUserWithCharacter({}, { townId: undefined });

      const res = await request(app)
        .post('/api/market/list')
        .set(authHeader(seller.token))
        .send({
          itemId: 'some-item-id',
          price: 100,
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('must be in a town');
    });
  });

  // ---- POST /api/market/buy ----

  describe('POST /api/market/buy', () => {
    it('should reject buying own listing', async () => {
      const { town } = await createTestTown();
      const seller = await createTestUserWithCharacter({}, { townId: town.id, gold: 1000 });
      const { item } = await createTestItem(seller.character.id);

      await prisma.inventory.create({
        data: { characterId: seller.character.id, itemId: item.id, quantity: 5 },
      });

      const listRes = await request(app)
        .post('/api/market/list')
        .set(authHeader(seller.token))
        .send({ itemId: item.id, price: 50, quantity: 2 });

      const listingId = listRes.body.listing.id;

      const buyRes = await request(app)
        .post('/api/market/buy')
        .set(authHeader(seller.token))
        .send({ listingId, quantity: 1 });

      expect(buyRes.status).toBe(400);
      expect(buyRes.body.error).toContain('cannot buy your own listing');
    });

    it('should reject buying with insufficient gold', async () => {
      const { town } = await createTestTown();
      const seller = await createTestUserWithCharacter({}, { townId: town.id, gold: 1000 });
      const buyer = await createTestUserWithCharacter({}, { townId: town.id, gold: 10 });
      const { item } = await createTestItem(seller.character.id);

      await prisma.inventory.create({
        data: { characterId: seller.character.id, itemId: item.id, quantity: 5 },
      });

      const listRes = await request(app)
        .post('/api/market/list')
        .set(authHeader(seller.token))
        .send({ itemId: item.id, price: 500, quantity: 2 });

      const listingId = listRes.body.listing.id;

      const buyRes = await request(app)
        .post('/api/market/buy')
        .set(authHeader(buyer.token))
        .send({ listingId, quantity: 1 });

      expect(buyRes.status).toBe(400);
      expect(buyRes.body.error).toContain('Insufficient gold');
    });

    it('should reject buying nonexistent listing', async () => {
      const { town } = await createTestTown();
      const buyer = await createTestUserWithCharacter({}, { townId: town.id, gold: 1000 });

      const res = await request(app)
        .post('/api/market/buy')
        .set(authHeader(buyer.token))
        .send({
          listingId: '00000000-0000-0000-0000-000000000000',
          quantity: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Listing not found');
    });
  });

  // ---- GET /api/market/browse ----

  describe('GET /api/market/browse', () => {
    it('should return listings for a town', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .get('/api/market/browse')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.listings).toBeDefined();
      expect(Array.isArray(res.body.listings)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(res.body.page).toBeDefined();
    });
  });

  // ---- POST /api/work/start ----

  describe('POST /api/work/start', () => {
    it('should reject work when not in a town', async () => {
      const user = await createTestUserWithCharacter({}, { townId: undefined });

      const res = await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({
          professionType: 'MINER',
          resourceId: 'some-resource-id',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not in a town');
    });

    it('should reject invalid profession type', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({
          professionType: 'BLACKSMITH',
          resourceId: 'some-resource-id',
        });

      expect(res.status).toBe(400);
    });

    it('should reject when resource not found', async () => {
      const { town } = await createTestTown();
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({
          professionType: 'MINER',
          resourceId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Resource not found');
    });

    it('should start gathering successfully', async () => {
      const { town } = await createTestTown();
      const resource = await createTestResource(town.id, { type: 'ORE' });
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      const res = await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({
          professionType: 'MINER',
          resourceId: resource.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.action).toBeDefined();
      expect(res.body.action.resource.id).toBe(resource.id);
      expect(res.body.action.lockedInAt).toBeDefined();
      expect(res.body.action.tickDate).toBeDefined();
    });

    it('should reject starting work when already gathering', async () => {
      const { town } = await createTestTown();
      const resource = await createTestResource(town.id, { type: 'ORE' });
      const user = await createTestUserWithCharacter({}, { townId: town.id });

      // Start first gathering
      await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({ professionType: 'MINER', resourceId: resource.id });

      // Try to start second
      const res = await request(app)
        .post('/api/work/start')
        .set(authHeader(user.token))
        .send({ professionType: 'MINER', resourceId: resource.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Already working');
    });
  });

  // ---- GET /api/work/status ----

  describe('GET /api/work/status', () => {
    it('should return working: false when idle', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/work/status')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.working).toBe(false);
    });
  });

  // ---- GET /api/crafting/recipes ----

  describe('GET /api/crafting/recipes', () => {
    it('should return recipes list', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/crafting/recipes')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.recipes).toBeDefined();
      expect(Array.isArray(res.body.recipes)).toBe(true);
    });
  });

  // ---- GET /api/crafting/status ----

  describe('GET /api/crafting/status', () => {
    it('should return crafting: false when idle', async () => {
      const user = await createTestUserWithCharacter();

      const res = await request(app)
        .get('/api/crafting/status')
        .set(authHeader(user.token));

      expect(res.status).toBe(200);
      expect(res.body.crafting).toBe(false);
    });
  });
});
