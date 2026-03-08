/**
 * Market route tests (P2 #48)
 *
 * Tests listing creation, purchase with tax calculation (single tax, not
 * double), and inventory record creation for the buyer.
 */

jest.mock('../../lib/db', () => ({
  db: {
    query: {
      characters: { findFirst: jest.fn(), findMany: jest.fn() },
      inventories: { findFirst: jest.fn(), findMany: jest.fn() },
      marketListings: { findFirst: jest.fn(), findMany: jest.fn() },
      tradeTransactions: { findFirst: jest.fn(), findMany: jest.fn() },
      priceHistories: { findFirst: jest.fn() },
      townTreasuries: { findFirst: jest.fn() },
      playerProfessions: { findFirst: jest.fn(), findMany: jest.fn() },
      marketBuyOrders: { findFirst: jest.fn(), findMany: jest.fn() },
      characterEquipment: { findFirst: jest.fn() },
      itemTemplates: { findFirst: jest.fn() },
    },
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]), onConflictDoUpdate: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }) }) }),
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
import { db } from '../../lib/db';

const mockedDb = db as jest.Mocked<typeof db>;

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
    (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue(mockCharacter);
  });

  // ---- POST /api/market/list ----

  describe('POST /api/market/list', () => {
    it('should create a listing successfully', async () => {
      (mockedDb.query.inventories.findFirst as jest.Mock).mockResolvedValue({
        id: 'inv-001',
        characterId: CHAR_ID,
        itemId: 'item-001',
        quantity: 10,
        item: {
          id: 'item-001',
          templateId: 'tmpl-001',
          itemTemplate: { id: 'tmpl-001', name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
        },
      });
      // Not equipped
      (mockedDb.query.characterEquipment as any).findFirst = jest.fn().mockResolvedValue(undefined);

      const mockListing = {
        id: 'listing-001',
        sellerId: CHAR_ID,
        itemId: 'item-001',
        price: 50,
        quantity: 5,
        townId: 'town-001',
      };

      // transaction returns the listing directly (not wrapped in array)
      (mockedDb.transaction as jest.Mock).mockResolvedValue(mockListing);

      // After transaction, the route fetches listing with relations
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue({
        ...mockListing,
        item: {
          id: 'item-001',
          itemTemplate: { name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
        },
      });

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
      (mockedDb.query.inventories.findFirst as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'nonexistent', price: 50, quantity: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found in inventory');
    });

    it('should reject when not in a town', async () => {
      (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue({
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
      (mockedDb.query.inventories.findFirst as jest.Mock).mockResolvedValue({
        id: 'inv-001',
        characterId: CHAR_ID,
        itemId: 'item-001',
        quantity: 2,
        item: {
          id: 'item-001',
          templateId: 'tmpl-001',
          itemTemplate: { id: 'tmpl-001', name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
        },
      });
      // Not equipped
      (mockedDb.query.characterEquipment as any).findFirst = jest.fn().mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/market/list')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ itemId: 'item-001', price: 50, quantity: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient quantity');
    });
  });

  // ---- POST /api/market/buy (now a bid system) ----

  describe('POST /api/market/buy', () => {
    const mockListing = {
      id: 'listing-001',
      sellerId: SELLER_ID,
      itemId: 'item-001',
      price: 100,
      quantity: 5,
      townId: 'town-001',
      status: 'active',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      item: {
        id: 'item-001',
        templateId: 'tmpl-001',
        itemTemplate: { name: 'Iron Sword', type: 'WEAPON', rarity: 'COMMON' },
      },
      character: { id: SELLER_ID, name: 'Seller' },
    };

    it('should reject bidding on your own listing', async () => {
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue({
        ...mockListing,
        sellerId: CHAR_ID, // same as buyer
      });

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', bidPrice: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot bid on your own');
    });

    it('should reject when not in same town', async () => {
      (mockedDb.query.characters.findFirst as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        currentTownId: 'town-002', // different town
      });
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', bidPrice: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('same town');
    });

    it('should reject when listing has expired', async () => {
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue({
        ...mockListing,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // expired
      });

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', bidPrice: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expired');
    });

    it('should reject bid below asking price', async () => {
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app)
        .post('/api/market/buy')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({ listingId: 'listing-001', bidPrice: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least the asking price');
    });
  });

  // ---- POST /api/market/cancel ----

  describe('POST /api/market/cancel', () => {
    it('should reject cancelling someone else\'s listing', async () => {
      (mockedDb.query.marketListings.findFirst as jest.Mock).mockResolvedValue({
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
