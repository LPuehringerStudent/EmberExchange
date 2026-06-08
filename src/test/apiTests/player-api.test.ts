import express from 'express';
import request from 'supertest';

const unitMock = { complete: jest.fn().mockResolvedValue(undefined) };

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const playerServiceMock = {
  getAllPublicPlayers: jest.fn(),
  getPublicPlayerById: jest.fn(),
  getPlayerByUsername: jest.fn(),
};

jest.mock('../../backend/services/player-service', () => ({
  PlayerService: jest.fn(() => playerServiceMock),
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

jest.mock('../../backend/services/email-service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import { playerRouter } from '../../backend/routers/player-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', playerRouter);
  return app;
}

const player = { playerId: 1, username: 'alice', email: 'alice@example.com' };

describe('Player API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all public players', async () => {
    playerServiceMock.getAllPublicPlayers.mockResolvedValue([player]);

    await request(createApp())
      .get('/api/players')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual([player]);
      });
  });

  it('returns 400 for invalid player id', async () => {
    await request(createApp())
      .get('/api/players/not-a-number')
      .expect(400);
  });

  it('returns 404 when player is not found', async () => {
    playerServiceMock.getPublicPlayerById.mockResolvedValue(null);

    await request(createApp())
      .get('/api/players/999')
      .expect(404);
  });

  it('returns a player by id', async () => {
    playerServiceMock.getPublicPlayerById.mockResolvedValue(player);

    await request(createApp())
      .get('/api/players/1')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual(player);
      });
  });

  it('looks up player by username', async () => {
    playerServiceMock.getPlayerByUsername.mockResolvedValue(player);

    await request(createApp())
      .get('/api/players/lookup/alice')
      .expect(200)
      .expect(res => {
        expect(res.body).toEqual({ playerId: 1, username: 'alice' });
      });
  });

  it('keeps direct player creation disabled', async () => {
    await request(createApp())
      .post('/api/players')
      .send({ username: 'new' })
      .expect(410);
  });
});
