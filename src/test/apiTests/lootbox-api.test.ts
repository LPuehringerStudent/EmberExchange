import express from 'express';
import request from 'supertest';

const unitMock = { complete: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const lootboxServiceMock = {
  getRecentPulls: jest.fn(),
  getLootboxById: jest.fn(),
  getLootboxesByPlayerId: jest.fn(),
  openLootbox: jest.fn(),
};

jest.mock('../../backend/services/lootbox-service', () => ({
  LootboxService: jest.fn(() => lootboxServiceMock),
}));

const listingServiceMock = {
  isLootboxListed: jest.fn(),
};

jest.mock('../../backend/services/listing-service', () => ({
  ListingService: jest.fn(() => listingServiceMock),
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

import { lootboxRouter } from '../../backend/routers/lootbox-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', lootboxRouter);
  return app;
}

const lootbox = { lootboxId: 10, playerId: 1, lootboxTypeId: 1, openedAt: null, acquiredHow: 'reward' };

describe('Lootbox API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns recent pulls with relative time labels', async () => {
    lootboxServiceMock.getRecentPulls.mockResolvedValue([
      { username: 'alice', name: 'Basic Stove', rarity: 'common', imageUrl: '/stove.png', openedAt: new Date().toISOString() },
    ]);

    await request(createApp())
      .get('/api/lootboxes/recent')
      .expect(200)
      .expect(res => {
        expect(res.body[0]).toEqual(expect.objectContaining({ username: 'alice', itemName: 'Basic Stove', timeAgo: 'now' }));
      });
  });

  it('validates lootbox id format', async () => {
    await request(createApp())
      .get('/api/lootboxes/nope')
      .expect(400);
  });

  it('returns 404 when lootbox is not found', async () => {
    lootboxServiceMock.getLootboxById.mockResolvedValue(null);

    await request(createApp())
      .get('/api/lootboxes/99')
      .expect(404);
  });

  it('allows a player to view only their own lootboxes', async () => {
    lootboxServiceMock.getLootboxesByPlayerId.mockResolvedValue([lootbox]);

    await request(createApp())
      .get('/api/players/1/lootboxes')
      .set('session-id', 's1')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual([lootbox]);
      });

    await request(createApp())
      .get('/api/players/2/lootboxes')
      .set('session-id', 's1')
      .expect(403);
  });

  it('opens an owned lootbox', async () => {
    lootboxServiceMock.getLootboxById.mockResolvedValue(lootbox);
    listingServiceMock.isLootboxListed.mockResolvedValue(false);
    lootboxServiceMock.openLootbox.mockResolvedValue([true, {
      stoveId: 5,
      stoveName: 'Basic Stove',
      rarity: 'common',
      imageUrl: '/stove.png',
      lootboxId: 10,
    }]);

    await request(createApp())
      .post('/api/lootboxes/10/open')
      .set('session-id', 's1')
      .expect(201)
      .expect(res => {
        expect(res.body.message).toBe('Lootbox opened successfully');
        expect(res.body.stoveId).toBe(5);
      });
  });
});
