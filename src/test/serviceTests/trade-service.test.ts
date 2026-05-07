import { TradeService } from '../../backend/services/trade-service';
import { Unit } from '../../backend/utils/unit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleTrade = {
  tradeId: 1,
  listingId: 10,
  buyerId: 20,
  executedAt: '2026-02-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TradeService', () => {

  // --- getAllTrades -------------------------------------------------------

  describe('getAllTrades', () => {
    it('returns all trade records', async () => {
      const stmt = mockStmt(null, [sampleTrade]);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getAllTrades();

      expect(result).toEqual([sampleTrade]);
    });

    it('returns an empty array when no trades exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getAllTrades();

      expect(result).toEqual([]);
    });
  });

  // --- getTradeById ------------------------------------------------------

  describe('getTradeById', () => {
    it('returns the trade when found', async () => {
      const stmt = mockStmt(sampleTrade);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradeById(1);

      expect(result).toEqual(sampleTrade);
    });

    it('returns null when trade is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradeById(999);

      expect(result).toBeNull();
    });
  });

  // --- getTradeByListingId -----------------------------------------------

  describe('getTradeByListingId', () => {
    it('returns the trade for a given listing', async () => {
      const stmt = mockStmt(sampleTrade);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradeByListingId(10);

      expect(result).toEqual(sampleTrade);
    });

    it('returns null when no trade exists for the listing', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradeByListingId(999);

      expect(result).toBeNull();
    });
  });

  // --- getTradesByBuyerId ------------------------------------------------

  describe('getTradesByBuyerId', () => {
    it('returns trades for a given buyer', async () => {
      const stmt = mockStmt(null, [sampleTrade]);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradesByBuyerId(20);

      expect(result).toEqual([sampleTrade]);
    });

    it('returns empty array when buyer has no trades', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getTradesByBuyerId(99);

      expect(result).toEqual([]);
    });
  });

  // --- createTrade -------------------------------------------------------

  describe('createTrade', () => {
    it('returns [true, id] on successful trade creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const [success, id] = await service.createTrade(10, 20);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new TradeService(unit);

      const [success, id] = await service.createTrade(10, 20);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- getRecentTrades ---------------------------------------------------

  describe('getRecentTrades', () => {
    it('returns recent trades up to the default limit of 10', async () => {
      const stmt = mockStmt(null, [sampleTrade]);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getRecentTrades();

      expect(result).toEqual([sampleTrade]);
    });

    it('returns an empty array when no trades exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getRecentTrades();

      expect(result).toEqual([]);
    });

    it('respects a custom limit parameter', async () => {
      const trades = Array.from({ length: 3 }, (_, i) => ({ ...sampleTrade, tradeId: i + 1 }));
      const stmt = mockStmt(null, trades);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.getRecentTrades(3);

      expect(result).toHaveLength(3);
    });
  });

  // --- deleteTrade -------------------------------------------------------

  describe('deleteTrade', () => {
    it('returns true when trade is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.deleteTrade(1);

      expect(result).toBe(true);
    });

    it('returns false when trade does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.deleteTrade(999);

      expect(result).toBe(false);
    });
  });

  // --- countTrades -------------------------------------------------------

  describe('countTrades', () => {
    it('returns the total number of trades', async () => {
      const stmt = mockStmt({ count: 42 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTrades();

      expect(result).toBe(42);
    });

    it('returns 0 when no trades exist', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTrades();

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTrades();

      expect(result).toBe(0);
    });
  });

  // --- countTradesByBuyer ------------------------------------------------

  describe('countTradesByBuyer', () => {
    it('returns the number of trades made by a buyer', async () => {
      const stmt = mockStmt({ count: 5 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTradesByBuyer(20);

      expect(result).toBe(5);
    });

    it('returns 0 when buyer has made no trades', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTradesByBuyer(20);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new TradeService(unit);

      const result = await service.countTradesByBuyer(20);

      expect(result).toBe(0);
    });
  });
});