import { InvestmentService } from '../../backend/services/investment-service';
import { Unit } from '../../backend/utils/unit';

jest.mock('../../backend/services/stove-type-statistics-service', () => {
    return {
        StoveTypeStatisticsService: jest.fn().mockImplementation(() => ({
            getByStoveTypeId: jest.fn().mockResolvedValue(null),
            getAll: jest.fn().mockResolvedValue([]),
        })),
    };
});

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

function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[]) {
  let callIndex = 0;
  return {
    prepare: jest.fn().mockImplementation(() => {
      const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
      callIndex++;
      return stmt;
    }),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
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

const samplePosition = {
  positionId: 1,
  playerId: 10,
  assetId: 5,
  category: 'stove' as const,
  quantity: 10,
  avgBuyPrice: 100,
  totalInvested: 1000,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const sampleTransaction = {
  transactionId: 1,
  playerId: 10,
  assetId: 5,
  category: 'stove' as const,
  type: 'buy' as const,
  quantity: 10,
  pricePerUnit: 100,
  totalAmount: 1000,
  createdAt: '2026-01-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InvestmentService', () => {

  // --- buyPosition ---------------------------------------------------------

  describe('buyPosition', () => {
    it('deducts coins and creates a new position', async () => {
      const deductStmt = mockStmt(null, [], { changes: 1 });
      const upsertStmt = mockStmt({ positionId: 42 });
      const txStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([deductStmt, upsertStmt, txStmt]);
      const service = new InvestmentService(unit);

      const [success, positionId] = await service.buyPosition(10, 5, 5, 100);

      expect(success).toBe(true);
      expect(positionId).toBe(42);
    });

    it('returns [false, undefined] when player has insufficient coins', async () => {
      const deductStmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(deductStmt);
      const service = new InvestmentService(unit);

      const [success, positionId] = await service.buyPosition(10, 5, 5, 100);

      expect(success).toBe(false);
      expect(positionId).toBeUndefined();
    });
  });

  // --- sellPosition --------------------------------------------------------

  describe('sellPosition', () => {
    it('credits net coins after 5% fee and updates the position', async () => {
      const canSellStmt = mockStmt(undefined);
      const positionStmt = mockStmt(samplePosition);
      const creditStmt = mockStmt(null, [], { changes: 1 });
      const updateStmt = mockStmt(null, [], { changes: 1 });
      const txStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([canSellStmt, positionStmt, creditStmt, updateStmt, txStmt]);
      const service = new InvestmentService(unit);

      const [success, netRevenue] = await service.sellPosition(10, 5, 5, 150);

      expect(success).toBe(true);
      // 5 * 150 = 750 gross, 5% fee = 37.5 ≈ 38, net = 712
      expect(netRevenue).toBe(712);
    });

    it('deletes the position when selling entire quantity', async () => {
      const canSellStmt = mockStmt(undefined);
      const positionStmt = mockStmt(samplePosition);
      const creditStmt = mockStmt(null, [], { changes: 1 });
      const deleteStmt = mockStmt(null, [], { changes: 1 });
      const txStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([canSellStmt, positionStmt, creditStmt, deleteStmt, txStmt]);
      const service = new InvestmentService(unit);

      const [success, netRevenue] = await service.sellPosition(10, 5, 10, 150);

      expect(success).toBe(true);
      // 10 * 150 = 1500 gross, 5% fee = 75, net = 1425
      expect(netRevenue).toBe(1425);
    });

    it('returns [false, undefined] when cooldown is active', async () => {
      const recentSell = new Date(Date.now() - 1000).toISOString();
      const canSellStmt = mockStmt({ createdAt: recentSell });
      const unit = mockUnitSequence([canSellStmt]);
      const service = new InvestmentService(unit);

      const [success, netRevenue] = await service.sellPosition(10, 5, 5, 150);

      expect(success).toBe(false);
      expect(netRevenue).toBeUndefined();
    });

    it('returns [false, undefined] when position has insufficient quantity', async () => {
      const canSellStmt = mockStmt(undefined);
      const positionStmt = mockStmt({ ...samplePosition, quantity: 3 });
      const unit = mockUnitSequence([canSellStmt, positionStmt]);
      const service = new InvestmentService(unit);

      const [success, netRevenue] = await service.sellPosition(10, 5, 5, 150);

      expect(success).toBe(false);
      expect(netRevenue).toBeUndefined();
    });
  });

  // --- getPortfolio --------------------------------------------------------

  describe('getPortfolio', () => {
    it('returns computed portfolio values', async () => {
      const positionRows = [
        { ...samplePosition, assetId: 1, quantity: 10, totalInvested: 1000 },
        { ...samplePosition, positionId: 2, assetId: 2, quantity: 5, totalInvested: 500 },
      ];
      const portfolioStmt = mockStmt(null, positionRows);
      const typeStmt1 = mockStmt({ rarity: 'common' });
      const typeStmt2 = mockStmt({ rarity: 'rare' });

      const unit = mockUnitSequence([portfolioStmt, typeStmt1, typeStmt2]);
      const service = new InvestmentService(unit);

      const result = await service.getPortfolio(10);

      expect(result.positions).toHaveLength(2);
      // Both fallback to base prices (common=30, rare=180)
      expect(result.totalValue).toBe(10 * 30 + 5 * 180); // 300 + 900 = 1200
      expect(result.totalCost).toBe(1500);
      expect(result.totalPL).toBe(1200 - 1500); // -300
    });

    it('returns empty portfolio when no positions exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.getPortfolio(99);

      expect(result.positions).toEqual([]);
      expect(result.totalValue).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalPL).toBe(0);
    });
  });

  // --- getLeaderboard ------------------------------------------------------

  describe('getLeaderboard', () => {
    it('returns sorted leaderboard entries', async () => {
      const positions = [
        { ...samplePosition, playerId: 1, assetId: 1, quantity: 10, totalInvested: 1000 },
        { ...samplePosition, playerId: 2, assetId: 1, quantity: 10, totalInvested: 500 },
      ];
      const allStmt = mockStmt(null, positions);
      const typeStmt = mockStmt({ rarity: 'common' });
      const nameStmt = mockStmt(null, [
        { playerId: 1, username: 'Alice' },
        { playerId: 2, username: 'Bob' },
      ]);

      const unit = mockUnitSequence([allStmt, typeStmt, nameStmt]);
      const service = new InvestmentService(unit);

      const result = await service.getLeaderboard(10);

      expect(result).toHaveLength(2);
      // Both have assetId 1 (common, base price 30)
      // Alice: value = 300, invested = 1000, PL = -700
      // Bob: value = 300, invested = 500, PL = -200
      // Bob has higher PL (less negative), so should be first
      expect(result[0].playerId).toBe(2);
      expect(result[0].totalPL).toBe(-200);
      expect(result[1].playerId).toBe(1);
      expect(result[1].totalPL).toBe(-700);
    });

    it('returns empty array when no positions exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.getLeaderboard(10);

      expect(result).toEqual([]);
    });
  });

  // --- getAssetPrice -------------------------------------------------------

  describe('getAssetPrice', () => {
    it('returns cached price within 5 minutes', async () => {
      const typeStmt = mockStmt({ rarity: 'common' });
      const unit = mockUnit(typeStmt);
      const service = new InvestmentService(unit);

      const price1 = await service.getAssetPrice(1);
      expect(price1).toBe(30);

      const price2 = await service.getAssetPrice(1);
      expect(price2).toBe(30);
      // Should only query once because of cache
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });

    it('falls back to rarity base price when no sales data', async () => {
      const typeStmt = mockStmt({ rarity: 'legendary' });
      const unit = mockUnit(typeStmt);
      const service = new InvestmentService(unit);

      const price = await service.getAssetPrice(3);
      expect(price).toBe(1500);
    });

    it('falls back to common base price for unknown rarity', async () => {
      const typeStmt = mockStmt({ rarity: null });
      const unit = mockUnit(typeStmt);
      const service = new InvestmentService(unit);

      const price = await service.getAssetPrice(3);
      expect(price).toBe(30);
    });
  });

  // --- canSell -------------------------------------------------------------

  describe('canSell', () => {
    it('returns true when no previous sell exists', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.canSell(10, 5);
      expect(result).toBe(true);
    });

    it('returns true when last sell was over 24h ago', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const stmt = mockStmt({ createdAt: oldDate });
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.canSell(10, 5);
      expect(result).toBe(true);
    });

    it('returns false when last sell was within 24h', async () => {
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      const stmt = mockStmt({ createdAt: recentDate });
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.canSell(10, 5);
      expect(result).toBe(false);
    });
  });

  // --- recordPrices --------------------------------------------------------

  describe('recordPrices', () => {
    it('inserts price records for all stove types', async () => {
      const typesStmt = mockStmt(null, [{ typeId: 1 }, { typeId: 2 }]);
      const typeStmt1 = mockStmt({ rarity: 'common' });
      const insertStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([typesStmt, typeStmt1, insertStmt, typeStmt1, insertStmt]);
      const service = new InvestmentService(unit);

      await service.recordPrices();

      expect(unit.prepare).toHaveBeenCalledTimes(5); // types query + 2 * (type lookup + insert)
    });
  });

  // --- getPriceHistory -----------------------------------------------------

  describe('getPriceHistory', () => {
    it('returns price history for a stove type', async () => {
      const historyRows = [
        { historyId: 1, typeId: 5, price: 100, timestamp: '2026-01-01' },
        { historyId: 2, typeId: 5, price: 110, timestamp: '2026-01-02' },
      ];
      const stmt = mockStmt(null, historyRows);
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.getPriceHistory(5, '1w');

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(100);
      expect(result[1].price).toBe(110);
    });

    it('returns empty array when no history exists', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new InvestmentService(unit);

      const result = await service.getPriceHistory(99, '1d');

      expect(result).toEqual([]);
    });
  });
});
