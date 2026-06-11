import express from 'express';
import request from 'supertest';

const completeMock = jest.fn().mockResolvedValue(undefined);
const unitMock = { complete: completeMock };

jest.mock('../../backend/utils/unit', () => ({
  Unit: {
    create: jest.fn().mockResolvedValue(unitMock),
  },
}));

const sessionServiceMock = {
  getSession: jest.fn(),
  invalidateSession: jest.fn(),
};

jest.mock('../../backend/services/session-service', () => ({
  SessionService: jest.fn(() => sessionServiceMock),
}));

const playerServiceMock = {
  getInfoByID: jest.fn(),
};

jest.mock('../../backend/services/player-service', () => ({
  PlayerService: jest.fn(() => playerServiceMock),
}));

jest.mock('../../backend/middleware/rate-limiter', () => ({
  registerRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
  loginRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
  authRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
  resendVerificationRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
  twoFactorRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
  challengeRateLimiter: { middleware: () => (_req: any, _res: any, next: any) => next() },
}));

jest.mock('../../backend/middleware/turnstile', () => ({
  turnstileMiddleware: (_req: any, res: any, next: any) => {
    res.locals.turnstileFailed = false;
    next();
  },
}));

jest.mock('../../backend/middleware/timing-guard', () => ({
  timingGuard: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../backend/middleware/header-guard', () => ({
  headerGuard: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../backend/middleware/behavior-guard', () => ({
  behaviorGuard: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../backend/middleware/datacenter-guard', () => ({
  datacenterGuard: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../backend/services/security-event-service', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../backend/services/email-service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../backend/utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed'),
  comparePassword: jest.fn().mockResolvedValue(true),
  isHashed: jest.fn().mockReturnValue(true),
}));

jest.mock('../../backend/utils/bot-trap', () => ({
  handleBotDetection: jest.fn().mockResolvedValue(false),
  fakeAuthResponse: jest.fn(),
  checkHoneypot: jest.fn().mockReturnValue(false),
  logBot: jest.fn(),
  tarPit: jest.fn().mockResolvedValue(undefined),
  setBotHeaders: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

jest.mock('../../backend/middleware/require-auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const sessionId = req.headers['session-id'];
    if (!sessionId) {
      res.status(401).json({ error: 'Missing session-id header' });
      return;
    }
    req.playerId = 1;
    next();
  },
}));

import { authRouter } from '../../backend/routers/auth-router';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', authRouter);
  return app;
}

const player = {
  playerId: 1,
  username: 'alice',
  email: 'alice@example.com',
  coins: 100,
  violationCount: 0,
  lastViolationAt: null,
};

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('returns 400 when session-id header is missing', async () => {
      await request(createApp())
        .get('/api/auth/me')
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe('Missing session-id header');
        });
    });

    it('returns 401 when session is invalid', async () => {
      sessionServiceMock.getSession.mockResolvedValue(null);

      await request(createApp())
        .get('/api/auth/me')
        .set('session-id', 'bad')
        .expect(401);
    });

    it('returns current player without violation fields', async () => {
      sessionServiceMock.getSession.mockResolvedValue({ sessionId: 's1', playerId: 1, expiresAt: new Date(Date.now() + 1000) });
      playerServiceMock.getInfoByID.mockResolvedValue(player);

      await request(createApp())
        .get('/api/auth/me')
        .set('session-id', 's1')
        .expect(200)
        .expect(res => {
          expect(res.body).toEqual(expect.objectContaining({ playerId: 1, username: 'alice' }));
          expect(res.body.violationCount).toBeUndefined();
        });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('invalidates a valid session', async () => {
      sessionServiceMock.getSession.mockResolvedValue({ sessionId: 's1', playerId: 1 });
      sessionServiceMock.invalidateSession.mockResolvedValue(true);

      await request(createApp())
        .post('/api/auth/logout')
        .set('session-id', 's1')
        .expect(200)
        .expect(res => {
          expect(res.body.message).toBe('Logout successful');
        });
    });
  });
});
