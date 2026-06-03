import { CoinTransactionService } from '../../backend/services/coin-transaction-service';
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

const sampleTransaction = {
  transactionId: 1,
  playerId: 10,
  amount: 250,
  type: 'daily_reward',
  description: 'Daily login reward',
  createdAt: new Date('2026-01-01'),
};

describe('CoinTransactionService', () => {
  describe('getAll', () => {
    it('returns all transactions', async () => {
      const stmt = mockStmt(null, [sampleTransaction]);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getAll();

      expect(result).toEqual([sampleTransaction]);
    });

    it('passes custom limit and offset to the query', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      await service.getAll(25, 50);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT @limit OFFSET @offset'),
        { limit: 25, offset: 50 }
      );
    });
  });

  describe('getById', () => {
    it('returns a transaction when found', async () => {
      const stmt = mockStmt(sampleTransaction);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getById(1);

      expect(result).toEqual(sampleTransaction);
    });

    it('returns null when transaction is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getByPlayerId', () => {
    it('returns transactions for a player', async () => {
      const stmt = mockStmt(null, [sampleTransaction]);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getByPlayerId(10);

      expect(result).toEqual([sampleTransaction]);
    });

    it('returns an empty array when player has no transactions', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getByPlayerId(999);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('returns [true, id] when transaction is created', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.create(10, 250, 'daily_reward', 'Daily login reward');

      expect(result).toEqual([true, 1]);
    });

    it('returns [false, id] when insert does not change a row', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new CoinTransactionService(unit);

      const result = await service.create(10, -100, 'shop_purchase');

      expect(result).toEqual([false, 0]);
    });
  });

  describe('delete', () => {
    it('returns true when transaction is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.delete(1);

      expect(result).toBe(true);
    });

    it('returns false when transaction is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('getTotalEarnedByPlayer', () => {
    it('returns earned coins for a player', async () => {
      const stmt = mockStmt({ total: 500 });
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getTotalEarnedByPlayer(10);

      expect(result).toBe(500);
    });

    it('returns 0 when query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getTotalEarnedByPlayer(10);

      expect(result).toBe(0);
    });
  });

  describe('getTotalSpentByPlayer', () => {
    it('returns spent coins for a player', async () => {
      const stmt = mockStmt({ total: 300 });
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getTotalSpentByPlayer(10);

      expect(result).toBe(300);
    });

    it('returns 0 when query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new CoinTransactionService(unit);

      const result = await service.getTotalSpentByPlayer(10);

      expect(result).toBe(0);
    });
  });
});
