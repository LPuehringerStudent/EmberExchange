import { StoveTypeStatisticsService } from '../../backend/services/stove-type-statistics-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = null, allResult: unknown[] = []) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue({ changes: 1 }),
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
  } as unknown as Unit;
}

const aggregateRow = {
  stoveTypeId: 1,
  name: 'Basic',
  rarity: 'common',
  totalMinted: 10,
  currentlyOwned: 9,
  currentlyListed: 2,
  averageListingPrice: 100,
  currentLowestPrice: 80,
  currentHighestPrice: 120,
  totalSales: 5,
  totalVolumeTraded: 500,
  averageSalePrice: 100,
  allTimeHighPrice: 150,
  allTimeLowPrice: 50,
  lastSalePrice: 90,
  salesLast7Days: 1,
  salesLast30Days: 3,
};

describe('StoveTypeStatisticsService', () => {
  it('maps aggregate rows from getAll', async () => {
    const service = new StoveTypeStatisticsService(mockUnitSequence([
      mockStmt({ count: 20 }),
      mockStmt(null, [aggregateRow]),
    ]));

    const result = await service.getAll();

    expect(result[0]).toEqual(expect.objectContaining({
      stoveTypeId: 1,
      totalMinted: 10,
      listedPercent: 20,
      percentOfTotalSupply: 50,
      totalSales: 5,
    }));
  });

  it('returns top sales, market summary, and trend aliases', async () => {
    const rows = [aggregateRow, { ...aggregateRow, stoveTypeId: 2, totalSales: 10, currentlyListed: 1 }];
    const topService = new StoveTypeStatisticsService(mockUnitSequence([mockStmt({ count: 20 }), mockStmt(null, rows)]));
    const summaryService = new StoveTypeStatisticsService(mockUnitSequence([mockStmt({ count: 20 }), mockStmt(null, rows)]));
    const trendService = new StoveTypeStatisticsService(mockUnitSequence([mockStmt({ count: 20 }), mockStmt(null, rows)]));

    expect((await topService.getTopBySales(1))[0].stoveTypeId).toBe(2);
    expect(await summaryService.getMarketSummary()).toEqual({
      totalStoves: 20,
      totalListed: 3,
      totalSales: 15,
      avgListedPercent: 15,
    });
    expect(await trendService.getByDemandTrend('stable')).toHaveLength(2);
  });

  it('returns null for missing stove type', async () => {
    const service = new StoveTypeStatisticsService(mockUnitSequence([mockStmt(undefined)]));

    expect(await service.getByStoveTypeId(999)).toBeNull();
  });

  it('keeps legacy create, incrementViews, and delete behavior', () => {
    const service = new StoveTypeStatisticsService(mockUnitSequence([]));

    expect(service.create(1, 0, 0)).toEqual([true, 1]);
    expect(service.incrementViews(1)).toBe(true);
    expect(service.delete(1)).toBe(true);
  });
});
