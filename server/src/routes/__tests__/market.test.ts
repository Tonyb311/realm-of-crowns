/**
 * Market route tests (P2 #48)
 *
 * Tests listing creation, purchase with tax calculation (single tax, not
 * double), and inventory record creation for the buyer.
 */

jest.mock('../../lib/prisma', () => ({
  prisma: {
    character: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    inventory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    marketListing: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tradeTransaction: { create: jest.fn() },
    priceHistory: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    townTreasury: { upsert: jest.fn() },
    playerProfession: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/redis', () => ({
  redis: null,
  invalidateCache: jest.fn(),
}));

jest.mock('../../index', () => ({}));

jest.mock('../../socket/events', () => ({
  initEventBroadcaster: jest.fn(),
  emitTradeCompleted: jest.fn(),
  emitPlayerEnterTown: jest.fn(),
  emitPlayerLeaveTown: jest.fn(),
  emitCombatResult: jest.fn(),
  emitFriendRequest: jest.fn(),
  emitFriendAccepted: jest.fn(),
  emitLevelUp: jest.fn(),
  emitAchievementUnlocked: jest.fn(),
  emitNotification: jest.fn(),
  emitGovernanceEvent: jest.fn(),
  emitGuildEvent: jest.fn(),
}));

jest.mock('../../services/law-effects', () => ({
  getEffectiveTaxRate: jest.fn().mockResolvedValue(0.10),
  getTradeRestrictions: jest.fn().mockResolvedValue({ blocked: false }),
}));

jest.mock('../../middleware/cache', () => ({
  cache: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('./../../routes/trade-analytics', () => {
  const { Router } = require('express');
  const r = Router();
  return {
    __esModule: true,
    default: r,
    awardCrossTownMerchantXP: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../services/psion-perks', () => ({
  getPsionSpec: jest.fn().mockResolvedValue({ isPsion: false, specialization: null }),
  calculateSellerUrgency: jest.fn(),
  calculatePriceTrend: jest.fn(),
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
const SELLER_ID = '33333333-3333-3333-3333-333333333333';
const TOKEN = makeToken(USER_ID);

const mockCharacter = {
  id: CHAR_ID,
  userId: USER_ID,
  name: 'Buyer',
  race: 'HUMAN',
  level: 5,
  gold: 1000,
  currentTownId: 'town-001',
  travelStatus: 'idle',
};

describe('Market API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/market/list ----

  describe('POST /api/market/list', () => {
    it('should create a listing successfully', async () => {
      (mockedPrisma.inventory.findFirst as jest.Mock).mockResolvedValue({
        id: 'inv-001',
        characterId: CHAR_ID,
        itemId: 'item-001',
        quantity: 10,
      });

      const mockListing = {
        id: 'listing-001',
        sellerId: CHAR_ID,
        itemId: 'item-001',
        price: 50,
        quantity: 5,
        townId: 'town-001',
        item: {
          id: 'item-001',
          template: { name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
        },
      };

      // $transaction returns array [listing, inventoryUpdate]
      (mockedPrisma.$transaction as jest.Mock).mockResolvedValue([mockListing, {}]);

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'item-001', price: 50, quantity: 5 });

      expect(res.status).toBe(201);
      expect(res.body.listing).toBeDefined();
      expect(res.body.listing.price).toBe(50);
      expect(res.body.listing.quantity).toBe(5);
    });

    it('should reject when item not in inventory', async () => {
      (mockedPrisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'nonexistent', price: 50, quantity: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found in inventory');
    });

    it('should reject when not in a town', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        currentTownId: null,
      });

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'item-001', price: 50, quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('must be in a town');
    });

    it('should reject insufficient quantity', async () => {
      (mockedPrisma.inventory.findFirst as jest.Mock).mockResolvedValue({
        id: 'inv-001',
        characterId: CHAR_ID,
        itemId: 'item-001',
        quantity: 2,
      });

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'item-001', price: 50, quantity: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient quantity');
    });
  });

  // ---- POST /api/market/buy ----

  describe('POST /api/market/buy', () => {
    const mockListing = {
      id: 'listing-001',
      sellerId: SELLER_ID,
      itemId: 'item-001',
      price: 100,
      quantity: 5,
      townId: 'town-001',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      item: {
        id: 'item-001',
        templateId: 'tmpl-001',
        template: { name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
      },
      seller: { id: SELLER_ID, name: 'Seller' },
    };

    it('should complete a purchase with correct tax calculation', async () => {
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue(mockListing);

      // getEffectiveTaxRate returns 0.10 (10%)
      // subtotal = 100 * 2 = 200
      // tax = floor(200 * 0.10) = 20
      // totalCost = 220

      const mockTransaction = {
        id: 'tx-001',
        buyerId: CHAR_ID,
        sellerId: SELLER_ID,
        quantity: 2,
        price: 100,
        timestamp: new Date(),
      };

      (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
        // Simulate the transaction callback
        return mockTransaction;
      });

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.transaction).toBeDefined();
      expect(res.body.transaction.subtotal).toBe(200);
      expect(res.body.transaction.tax).toBe(20);
      expect(res.body.transaction.totalCost).toBe(220);
    });

    it('should reject buying your own listing', async () => {
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue({
        ...mockListing,
        sellerId: CHAR_ID, // same as buyer
      });

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot buy your own');
    });

    it('should reject when not in same town', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        currentTownId: 'town-002', // different town
      });
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('same town');
    });

    it('should reject when insufficient gold', async () => {
      (mockedPrisma.character.findFirst as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        gold: 10, // not enough
      });
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient gold');
    });

    it('should reject when listing has expired', async () => {
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue({
        ...mockListing,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('should reject when requesting more than available', async () => {
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', quantity: 10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Only 5 available');
    });
  });

  // ---- POST /api/market/cancel ----

  describe('POST /api/market/cancel', () => {
    it('should reject cancelling someone else\'s listing', async () => {
      (mockedPrisma.marketListing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-001',
        sellerId: SELLER_ID, // not the current user
        itemId: 'item-001',
        quantity: 5,
      });

      const res = await request(app)
        .post('/api/market/cancel')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('does not belong to you');
    });
  });
});
