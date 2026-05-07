import { PriceHistoryService } from '../../backend/services/price-history-service';
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

const samplePriceHistory = {
  historyId: 1,
  typeId: 2,
  salePrice: 250,
  saleDate: '2026-01-15',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PriceHistoryService', () => {

  // --- getAllPriceHistory -------------------------------------------------

  describe('getAllPriceHistory', () => {
    it('returns all price history records', async () => {
      const stmt = mockStmt(null, [samplePriceHistory]);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getAllPriceHistory();

      expect(result).toEqual([samplePriceHistory]);
    });

    it('returns an empty array when no records exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getAllPriceHistory();

      expect(result).toEqual([]);
    });
  });

  // --- getPriceHistoryById -----------------------------------------------

  describe('getPriceHistoryById', () => {
    it('returns the record when found', async () => {
      const stmt = mockStmt(samplePriceHistory);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getPriceHistoryById(1);

      expect(result).toEqual(samplePriceHistory);
    });

    it('returns null when record is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getPriceHistoryById(999);

      expect(result).toBeNull();
    });
  });

  // --- getPriceHistoryByTypeId -------------------------------------------

  describe('getPriceHistoryByTypeId', () => {
    it('returns price history records for a stove type', async () => {
      const stmt = mockStmt(null, [samplePriceHistory]);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getPriceHistoryByTypeId(2);

      expect(result).toEqual([samplePriceHistory]);
    });

    it('returns empty array when no records exist for that type', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getPriceHistoryByTypeId(99);

      expect(result).toEqual([]);
    });
  });

  // --- recordSale --------------------------------------------------------

  describe('recordSale', () => {
    it('returns [true, id] on successful sale recording', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const [success, id] = await service.recordSale(2, 250);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new PriceHistoryService(unit);

      const [success, id] = await service.recordSale(2, 250);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- getAveragePrice ---------------------------------------------------

  describe('getAveragePrice', () => {
    it('returns the average sale price for a stove type', async () => {
      const stmt = mockStmt({ average: 300 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getAveragePrice(2);

      expect(result).toBe(300);
    });

    it('returns 0 when no sales are recorded', async () => {
      const stmt = mockStmt({ average: null });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getAveragePrice(2);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getAveragePrice(2);

      expect(result).toBe(0);
    });
  });

  // --- getMinPrice -------------------------------------------------------

  describe('getMinPrice', () => {
    it('returns the minimum sale price for a stove type', async () => {
      const stmt = mockStmt({ min: 100 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMinPrice(2);

      expect(result).toBe(100);
    });

    it('returns 0 when no sales are recorded', async () => {
      const stmt = mockStmt({ min: null });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMinPrice(2);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMinPrice(2);

      expect(result).toBe(0);
    });
  });

  // --- getMaxPrice -------------------------------------------------------

  describe('getMaxPrice', () => {
    it('returns the maximum sale price for a stove type', async () => {
      const stmt = mockStmt({ max: 500 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMaxPrice(2);

      expect(result).toBe(500);
    });

    it('returns 0 when no sales are recorded', async () => {
      const stmt = mockStmt({ max: null });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMaxPrice(2);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getMaxPrice(2);

      expect(result).toBe(0);
    });
  });

  // --- getRecentPrices ---------------------------------------------------

  describe('getRecentPrices', () => {
    it('returns the most recent price records up to the default limit', async () => {
      const stmt = mockStmt(null, [samplePriceHistory]);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getRecentPrices(2);

      expect(result).toEqual([samplePriceHistory]);
    });

    it('returns an empty array when no sales exist for that type', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getRecentPrices(99);

      expect(result).toEqual([]);
    });

    it('respects a custom limit parameter', async () => {
      const records = Array.from({ length: 5 }, (_, i) => ({ ...samplePriceHistory, historyId: i + 1 }));
      const stmt = mockStmt(null, records);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.getRecentPrices(2, 5);

      expect(result).toHaveLength(5);
    });
  });

  // --- countSales --------------------------------------------------------

  describe('countSales', () => {
    it('returns the number of recorded sales for a stove type', async () => {
      const stmt = mockStmt({ count: 12 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.countSales(2);

      expect(result).toBe(12);
    });

    it('returns 0 when no sales have been recorded', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.countSales(99);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.countSales(2);

      expect(result).toBe(0);
    });
  });

  // --- deletePriceHistory ------------------------------------------------

  describe('deletePriceHistory', () => {
    it('returns true when record is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.deletePriceHistory(1);

      expect(result).toBe(true);
    });

    it('returns false when record does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new PriceHistoryService(unit);

      const result = await service.deletePriceHistory(999);

      expect(result).toBe(false);
    });
  });
});