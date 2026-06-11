import express from 'express';
import request from 'supertest';

function stmt(getResult: unknown = null) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
  };
}

const unitMock = {
  complete: jest.fn().mockResolvedValue(undefined),
  prepare: jest.fn(),
};

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const listingServiceMock = {
  getActiveListings: jest.fn(),
  getFilteredListings: jest.fn(),
  getListingById: jest.fn(),
  getListingsBySellerId: jest.fn(),
  isStoveListed: jest.fn(),
  isLootboxListed: jest.fn(),
  createListing: jest.fn(),
  updatePrice: jest.fn(),
};

jest.mock('../../backend/services/listing-service', () => ({
  ListingService: jest.fn(() => listingServiceMock),
}));

jest.mock('../../backend/services/player-prestige-service', () => ({
  PlayerPrestigeService: jest.fn(() => ({ addXP: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock('../../backend/services/punishment-service', () => ({
  PunishmentService: jest.fn(() => ({ recordViolation: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock('../../backend/middleware/require-auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers['session-id']) {
      res.status(401).json({ error: 'Missing session-id header' });
      return;
    }
    req.playerId = 1;
    next();
  },
}));

jest.mock('../../backend/middleware/ban-check', () => ({
  checkPlayerBanned: jest.fn().mockResolvedValue(false),
}));

import { listingRouter } from '../../backend/routers/listing-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', listingRouter);
  return app;
}

const listing = { listingId: 1, sellerId: 1, stoveId: 5, lootboxId: null, price: 200, status: 'active' };

describe('Listing API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    unitMock.prepare.mockReturnValue(stmt());
  });

  it('returns active listings', async () => {
    listingServiceMock.getActiveListings.mockResolvedValue([listing]);

    await request(createApp())
      .get('/api/listings/active')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual([listing]);
      });
  });

  it('uses filtered listings when query filters are present', async () => {
    listingServiceMock.getFilteredListings.mockResolvedValue([listing]);

    await request(createApp())
      .get('/api/listings/active?rarity=rare&minPrice=100&itemType=stove')
      .expect(200);

    expect(listingServiceMock.getFilteredListings).toHaveBeenCalledWith(
      expect.objectContaining({ rarity: ['rare'], minPrice: 100, itemType: 'stove' }),
      100,
      0
    );
  });

  it('validates listing id and returns 404 when missing', async () => {
    await request(createApp()).get('/api/listings/bad').expect(400);

    listingServiceMock.getListingById.mockResolvedValue(null);
    await request(createApp()).get('/api/listings/99').expect(404);
  });

  it('allows sellers to view only their own listings', async () => {
    listingServiceMock.getListingsBySellerId.mockResolvedValue([listing]);

    await request(createApp())
      .get('/api/players/1/listings')
      .set('session-id', 's1')
      .expect(200);

    await request(createApp())
      .get('/api/players/2/listings')
      .set('session-id', 's1')
      .expect(403);
  });

  it('creates a stove listing owned by the seller', async () => {
    unitMock.prepare
      .mockReturnValueOnce(stmt({ currentOwnerId: 1 }))
      .mockReturnValueOnce(stmt({ playerId: 1 }))
      .mockReturnValueOnce(stmt({ bannedAt: null }));
    listingServiceMock.isStoveListed.mockResolvedValue(false);
    listingServiceMock.createListing.mockResolvedValue([true, 7]);

    await request(createApp())
      .post('/api/listings')
      .set('session-id', 's1')
      .send({ sellerId: 1, stoveId: 5, price: 200 })
      .expect(201)
      .expect(res => {
        expect(res.body.listingId).toBe(7);
      });
  });

  it('updates listing price only for the seller', async () => {
    listingServiceMock.getListingById.mockResolvedValue(listing);
    listingServiceMock.updatePrice.mockResolvedValue(true);

    await request(createApp())
      .patch('/api/listings/1/price')
      .set('session-id', 's1')
      .send({ price: 300 })
      .expect(200);
  });
});
