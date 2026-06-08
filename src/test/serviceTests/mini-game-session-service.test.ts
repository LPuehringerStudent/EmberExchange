import { MiniGameSessionService } from '../../backend/services/mini-game-session-service';
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

const sampleSession = {
  sessionId: 1,
  playerId: 10,
  gameType: 'blackjack',
  result: 'loss',
  coinPayout: 0,
  finishedAt: new Date('2026-01-01'),
};

describe('MiniGameSessionService', () => {
  describe('getAll', () => {
    it('returns all sessions', async () => {
      const stmt = mockStmt(null, [sampleSession]);
      const service = new MiniGameSessionService(mockUnit(stmt));

      const result = await service.getAll();

      expect(result).toEqual([sampleSession]);
    });
  });

  describe('getById', () => {
    it('returns a session when found', async () => {
      const stmt = mockStmt(sampleSession);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getById(1)).toEqual(sampleSession);
    });

    it('returns null when session is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getById(999)).toBeNull();
    });
  });

  describe('list queries', () => {
    it('returns sessions by player id', async () => {
      const stmt = mockStmt(null, [sampleSession]);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getByPlayerId(10)).toEqual([sampleSession]);
    });

    it('returns sessions by game type', async () => {
      const stmt = mockStmt(null, [sampleSession]);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getByGameType('blackjack')).toEqual([sampleSession]);
    });

    it('returns recent sessions', async () => {
      const stmt = mockStmt(null, [sampleSession]);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getRecent(5)).toEqual([sampleSession]);
    });
  });

  describe('create', () => {
    it('returns [true, id] when a session is created', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      const result = await service.create(10, 'blackjack', 'loss', 0);

      expect(result).toEqual([true, 1]);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new MiniGameSessionService(unit);

      const result = await service.create(10, 'blackjack', 'loss', 0);

      expect(result).toEqual([false, 0]);
    });
  });

  describe('updateResult and delete', () => {
    it('returns true when result is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.updateResult(1, 'win', 100)).toBe(true);
    });

    it('returns false when result update changes no row', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.updateResult(999, 'win', 100)).toBe(false);
    });

    it('returns true when session is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.delete(1)).toBe(true);
    });

    it('returns false when session does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.delete(999)).toBe(false);
    });
  });

  describe('counts and totals', () => {
    it('returns total session count', async () => {
      const stmt = mockStmt({ count: 6 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.count()).toBe(6);
    });

    it('returns session count by player', async () => {
      const stmt = mockStmt({ count: 3 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.countByPlayer(10)).toBe(3);
    });

    it('returns total payout by player', async () => {
      const stmt = mockStmt({ total: 250 });
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.getTotalPayoutByPlayer(10)).toBe(250);
    });

    it('returns 0 when aggregate query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new MiniGameSessionService(mockUnit(stmt));

      expect(await service.count()).toBe(0);
      expect(await service.countByPlayer(10)).toBe(0);
      expect(await service.getTotalPayoutByPlayer(10)).toBe(0);
    });
  });
});
