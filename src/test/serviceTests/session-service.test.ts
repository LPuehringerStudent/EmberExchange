import { SessionService } from '../../backend/services/session-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
  } as unknown as Unit;
}

describe('SessionService', () => {
  describe('getSessionsByPlayer', () => {
    it('returns active sessions for a player', async () => {
      const sessions = [
        { sessionId: 'sess-1', playerId: 1, createdAt: '2026-01-01', expiresAt: '2026-01-02', isActive: 1 },
        { sessionId: 'sess-2', playerId: 1, createdAt: '2026-01-03', expiresAt: '2026-01-04', isActive: 1 }
      ];
      const stmt = mockStmt(null, sessions);
      const unit = mockUnit(stmt);
      const service = new SessionService(unit);

      const result = await service.getSessionsByPlayer(1);

      expect(result).toEqual(sessions);
    });

    it('returns empty array when no active sessions', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new SessionService(unit);

      const result = await service.getSessionsByPlayer(999);

      expect(result).toEqual([]);
    });
  });

  describe('invalidateAllExcept', () => {
    it('invalidates all sessions except the specified one', async () => {
      const stmt = mockStmt(null, [], { changes: 3 });
      const unit = mockUnit(stmt);
      const service = new SessionService(unit);

      const result = await service.invalidateAllExcept(1, 'keep-sess');

      expect(result).toBe(3);
    });

    it('returns 0 when no sessions to invalidate', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new SessionService(unit);

      const result = await service.invalidateAllExcept(1, 'keep-sess');

      expect(result).toBe(0);
    });
  });
});
