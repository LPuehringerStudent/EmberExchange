import { DailyStatisticsService } from '../../backend/services/daily-statistics-service';
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

const calculatedStats = {
  lootboxesOpened: 7,
  newListings: 3,
  salesToday: 2,
  tradingVolume: 900,
  avgSalePrice: 450,
  gamesToday: 5,
  messagesToday: 11,
  newPlayers: 4,
  activePlayers: 6,
  totalSessions: 8,
  totalCoins: 10000,
  totalStoves: 25,
};

describe('DailyStatisticsService', () => {
  describe('getToday', () => {
    it('returns calculated statistics from aggregate query results', async () => {
      const stmt = mockStmt(calculatedStats);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const result = await service.getToday();

      expect(result).toEqual(expect.objectContaining({
        statId: 1,
        uniquePlayersLoggedIn: 6,
        newPlayersJoined: 4,
        totalSessions: 8,
        lootboxesOpenedToday: 7,
        newListingsToday: 3,
        listingsSoldToday: 2,
        averageSalePriceToday: 450,
        totalTradingVolume: 900,
        miniGamesPlayedToday: 5,
        messagesSentToday: 11,
        totalCoinsInCirculation: 10000,
        totalStovesInExistence: 25,
      }));
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('defaults numeric fields to 0 when query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const result = await service.getToday();

      expect(result.uniquePlayersLoggedIn).toBe(0);
      expect(result.lootboxesOpenedToday).toBe(0);
      expect(result.totalTradingVolume).toBe(0);
      expect(result.totalCoinsInCirculation).toBe(0);
      expect(result.totalStovesInExistence).toBe(0);
    });
  });

  describe('getAll', () => {
    it('returns a one-item array with today stats', async () => {
      const stmt = mockStmt(calculatedStats);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].lootboxesOpenedToday).toBe(7);
    });
  });

  describe('getSummary', () => {
    it('maps calculated today stats into summary totals', async () => {
      const stmt = mockStmt(calculatedStats);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const result = await service.getSummary(7);

      expect(result).toEqual({
        totalLootboxes: 7,
        totalSales: 2,
        totalVolume: 900,
        avgPlayers: 6,
      });
    });
  });

  describe('legacy aliases', () => {
    it('getByDate returns calculated today stats', async () => {
      const stmt = mockStmt(calculatedStats);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const result = await service.getByDate('2026-01-01');

      expect(result?.listingsSoldToday).toBe(2);
    });

    it('getRange and getByDateRange return calculated stats arrays', async () => {
      const stmt = mockStmt(calculatedStats);
      const unit = mockUnit(stmt);
      const service = new DailyStatisticsService(unit);

      const range = await service.getRange('2026-01-01', '2026-01-02');
      const aliasRange = await service.getByDateRange('2026-01-01', '2026-01-02');

      expect(range).toHaveLength(1);
      expect(aliasRange).toHaveLength(1);
    });

    it('create and delete keep legacy success behavior', () => {
      const unit = mockUnit();
      const service = new DailyStatisticsService(unit);

      expect(service.create('2026-01-01')).toEqual([true, 1]);
      expect(service.delete('2026-01-01')).toBe(true);
    });
  });
});
