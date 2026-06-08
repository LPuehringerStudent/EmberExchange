import express from 'express';
import request from 'supertest';

const unitMock = {
  complete: jest.fn().mockResolvedValue(undefined),
  savepoint: jest.fn().mockRejectedValue(new Error('skip achievements')),
  rollbackToSavepoint: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const tradeServiceMock = {
  getRecentTrades: jest.fn(),
  countTrades: jest.fn(),
  getTradeById: jest.fn(),
  getTradesByBuyerId: jest.fn(),
  createTrade: jest.fn(),
};

jest.mock('../../backend/services/trade-service', () => ({
  TradeService: jest.fn(() => tradeServiceMock),
}));

const listingServiceMock = {
  getListingById: jest.fn(),
  markAsSold: jest.fn(),
};

jest.mock('../../backend/services/listing-service', () => ({
  ListingService: jest.fn(() => listingServiceMock),
}));

const playerServiceMock = {
  getInfoByID: jest.fn(),
  deductCoinsAtomic: jest.fn(),
  addCoinsAtomic: jest.fn(),
};

jest.mock('../../backend/services/player-service', () => ({
  PlayerService: jest.fn(() => playerServiceMock),
}));

jest.mock('../../backend/services/stove-service', () => ({
  StoveService: jest.fn(() => ({
    updateOwner: jest.fn().mockResolvedValue(true),
    getStoveById: jest.fn().mockResolvedValue({ stoveId: 5, typeId: 2 }),
  })),
}));

jest.mock('../../backend/services/ownership-service', () => ({
  OwnershipService: jest.fn(() => ({ createOwnership: jest.fn().mockResolvedValue([true, 1]) })),
}));

jest.mock('../../backend/services/price-history-service', () => ({
  PriceHistoryService: jest.fn(() => ({ recordSale: jest.fn().mockResolvedValue([true, 1]) })),
}));

jest.mock('../../backend/services/coin-transaction-service', () => ({
  CoinTransactionService: jest.fn(() => ({ create: jest.fn().mockResolvedValue([true, 1]) })),
}));

jest.mock('../../backend/services/player-prestige-service', () => ({
  PlayerPrestigeService: jest.fn(() => ({ addXP: jest.fn().mockResolvedValue(undefined) })),
}));

jest.mock('../../backend/services/notification-service', () => ({
  NotificationService: jest.fn(() => ({ create: jest.fn().mockResolvedValue([true, 1]) })),
}));

jest.mock('../../backend/services/quest-service', () => ({
  QuestService: jest.fn(() => ({ trackProgress: jest.fn().mockResolvedValue(undefined) })),
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

jest.mock('../../backend/middleware/admin', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

import { tradeRouter } from '../../backend/routers/trade-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', tradeRouter);
  return app;
}

const trade = { tradeId: 1, listingId: 10, buyerId: 1 };
const listing = { listingId: 10, sellerId: 2, stoveId: 5, lootboxId: null, price: 100, status: 'active' };
const buyer = { playerId: 1, coins: 500, bannedAt: null };
const seller = { playerId: 2, coins: 50, bannedAt: null };

describe('Trade API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns recent trades and trade count', async () => {
    tradeServiceMock.getRecentTrades.mockResolvedValue([trade]);
    tradeServiceMock.countTrades.mockResolvedValue(3);

    await request(createApp()).get('/api/trades/recent').expect(200);
    await request(createApp())
      .get('/api/trades/count')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({ count: 3 });
      });
  });

  it('validates trade id and returns 404 when missing', async () => {
    await request(createApp()).get('/api/trades/bad').expect(400);

    tradeServiceMock.getTradeById.mockResolvedValue(null);
    await request(createApp()).get('/api/trades/99').expect(404);
  });

  it('allows buyers to view only their own trades', async () => {
    tradeServiceMock.getTradesByBuyerId.mockResolvedValue([trade]);

    await request(createApp())
      .get('/api/players/1/trades')
      .set('session-id', 's1')
      .expect(200);

    await request(createApp())
      .get('/api/players/2/trades')
      .set('session-id', 's1')
      .expect(403);
  });

  it('executes a stove trade', async () => {
    listingServiceMock.getListingById.mockResolvedValue(listing);
    playerServiceMock.getInfoByID
      .mockResolvedValueOnce(buyer)
      .mockResolvedValueOnce(seller)
      .mockResolvedValueOnce(seller);
    playerServiceMock.deductCoinsAtomic.mockResolvedValue(true);
    playerServiceMock.addCoinsAtomic.mockResolvedValue(true);
    listingServiceMock.markAsSold.mockResolvedValue(true);
    tradeServiceMock.createTrade.mockResolvedValue([true, 99]);

    await request(createApp())
      .post('/api/trades')
      .set('session-id', 's1')
      .send({ listingId: 10, buyerId: 1 })
      .expect(201)
      .expect(res => {
        expect(res.body).toEqual({ tradeId: 99, message: 'Trade executed successfully' });
      });
  });

  it('rejects buying your own listing', async () => {
    listingServiceMock.getListingById.mockResolvedValue({ ...listing, sellerId: 1 });

    await request(createApp())
      .post('/api/trades')
      .set('session-id', 's1')
      .send({ listingId: 10, buyerId: 1 })
      .expect(400)
      .expect(res => {
        expect(res.body.error).toBe('Cannot buy your own listing');
      });
  });
});
