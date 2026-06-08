import express from 'express';
import request from 'supertest';

const unitMock = { complete: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const ownershipServiceMock = {
  getOwnershipById: jest.fn(),
  getOwnershipsByPlayerId: jest.fn(),
  getCurrentOwnership: jest.fn(),
  countOwnershipChanges: jest.fn(),
};

jest.mock('../../backend/services/ownership-service', () => ({
  OwnershipService: jest.fn(() => ownershipServiceMock),
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

import { ownershipRouter } from '../../backend/routers/ownership-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', ownershipRouter);
  return app;
}

const ownership = { ownershipId: 1, stoveId: 5, playerId: 1, acquiredHow: 'lootbox' };

describe('Ownership API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates ownership id format', async () => {
    await request(createApp())
      .get('/api/ownerships/bad')
      .expect(400);
  });

  it('returns 404 when ownership is not found', async () => {
    ownershipServiceMock.getOwnershipById.mockResolvedValue(null);

    await request(createApp())
      .get('/api/ownerships/999')
      .expect(404);
  });

  it('returns ownership by id', async () => {
    ownershipServiceMock.getOwnershipById.mockResolvedValue(ownership);

    await request(createApp())
      .get('/api/ownerships/1')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual(ownership);
      });
  });

  it('allows players to view only their own ownerships', async () => {
    ownershipServiceMock.getOwnershipsByPlayerId.mockResolvedValue([ownership]);

    await request(createApp())
      .get('/api/players/1/ownerships')
      .set('session-id', 's1')
      .expect(200);

    await request(createApp())
      .get('/api/players/2/ownerships')
      .set('session-id', 's1')
      .expect(403);
  });

  it('returns current owner for a stove', async () => {
    ownershipServiceMock.getCurrentOwnership.mockResolvedValue(ownership);

    await request(createApp())
      .get('/api/stoves/5/current-owner')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual(ownership);
      });
  });

  it('returns ownership change count', async () => {
    ownershipServiceMock.countOwnershipChanges.mockResolvedValue(3);

    await request(createApp())
      .get('/api/stoves/5/ownership-changes/count')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({ count: 3 });
      });
  });
});
