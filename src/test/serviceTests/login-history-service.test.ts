import { LoginHistoryService } from '../../backend/services/login-history-service';
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
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleLogin = {
  loginHistoryId: 1,
  playerId: 10,
  loggedInAt: new Date('2026-01-01'),
  sessionId: 'session-1',
};

describe('LoginHistoryService', () => {
  describe('getAll', () => {
    it('returns all login history rows', async () => {
      const stmt = mockStmt(null, [sampleLogin]);
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.getAll();

      expect(result).toEqual([sampleLogin]);
    });
  });

  describe('getById', () => {
    it('returns a login history row when found', async () => {
      const stmt = mockStmt(sampleLogin);
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.getById(1);

      expect(result).toEqual(sampleLogin);
    });

    it('returns null when login history row is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getByPlayerId', () => {
    it('returns login history for a player', async () => {
      const stmt = mockStmt(null, [sampleLogin]);
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.getByPlayerId(10);

      expect(result).toEqual([sampleLogin]);
    });

    it('returns an empty array when player has no login history', async () => {
      const stmt = mockStmt(null, []);
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.getByPlayerId(999);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('returns [true, id] when login history row is created', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LoginHistoryService(mockUnit(stmt));

      const result = await service.create(10, 'session-1');

      expect(result).toEqual([true, 1]);
    });

    it('allows null session id', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new LoginHistoryService(unit);

      await service.create(10);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO LoginHistory'),
        { playerId: 10, sessionId: null }
      );
    });
  });

  describe('delete', () => {
    it('returns true when row is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LoginHistoryService(mockUnit(stmt));

      expect(await service.delete(1)).toBe(true);
    });

    it('returns false when row does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new LoginHistoryService(mockUnit(stmt));

      expect(await service.delete(999)).toBe(false);
    });
  });

  describe('countByPlayer', () => {
    it('returns login count for a player', async () => {
      const stmt = mockStmt({ count: 7 });
      const service = new LoginHistoryService(mockUnit(stmt));

      expect(await service.countByPlayer(10)).toBe(7);
    });

    it('returns 0 when query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new LoginHistoryService(mockUnit(stmt));

      expect(await service.countByPlayer(10)).toBe(0);
    });
  });
});
