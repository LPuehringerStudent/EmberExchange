import express from 'express';
import request from 'supertest';

const unitMock = { complete: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const shopServiceMock = {
  getShopItems: jest.fn(),
  purchaseItem: jest.fn(),
  getDailyRewardStatus: jest.fn(),
  sellStove: jest.fn(),
  claimDailyReward: jest.fn(),
};

jest.mock('../../backend/services/shop-service', () => ({
  ShopService: jest.fn(() => shopServiceMock),
}));

const rotationServiceMock = {
  rotate: jest.fn(),
};

jest.mock('../../backend/services/shop-rotation-service', () => ({
  ShopRotationService: jest.fn(() => rotationServiceMock),
}));

jest.mock('../../backend/services/quest-service', () => ({
  QuestService: jest.fn(() => ({ trackProgress: jest.fn().mockResolvedValue(undefined) })),
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

jest.mock('../../backend/middleware/ban-check', () => ({
  checkPlayerBanned: jest.fn().mockResolvedValue(false),
}));

import { shopRouter } from '../../backend/routers/shop-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', shopRouter);
  return app;
}

describe('Shop API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shop items', async () => {
    shopServiceMock.getShopItems.mockResolvedValue([{ listingId: 1, price: 100 }]);

    await request(createApp())
      .get('/api/shop/items')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual([{ listingId: 1, price: 100 }]);
      });
  });

  it('validates buy request body', async () => {
    await request(createApp())
      .post('/api/shop/buy')
      .set('session-id', 's1')
      .send({})
      .expect(400);
  });

  it('buys a shop item', async () => {
    shopServiceMock.purchaseItem.mockResolvedValue({ success: true, itemId: 99 });

    await request(createApp())
      .post('/api/shop/buy')
      .set('session-id', 's1')
      .send({ listingId: 1 })
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({ message: 'Purchase successful', itemId: 99 });
      });
  });

  it('returns daily reward status', async () => {
    shopServiceMock.getDailyRewardStatus.mockResolvedValue({ canClaim: true, streakCount: 2 });

    await request(createApp())
      .get('/api/shop/daily-status')
      .set('session-id', 's1')
      .expect(200)
      .expect(res => {
        expect(res.body.canClaim).toBe(true);
      });
  });

  it('claims daily reward', async () => {
    shopServiceMock.claimDailyReward.mockResolvedValue({ success: true, reward: 100, newStreak: 3 });

    await request(createApp())
      .post('/api/shop/claim-daily')
      .set('session-id', 's1')
      .expect(200)
      .expect(res => {
        expect(res.body.reward).toBe(100);
        expect(res.body.newStreak).toBe(3);
      });
  });

  it('rotates shop as admin', async () => {
    rotationServiceMock.rotate.mockResolvedValue({ newFeatured: [1, 2] });

    await request(createApp())
      .post('/api/shop/rotate')
      .set('session-id', 'admin')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({ newFeatured: [1, 2] });
      });
  });
});
