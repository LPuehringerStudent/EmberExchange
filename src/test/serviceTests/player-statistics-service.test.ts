import { PlayerStatisticsService } from '../../backend/services/player-statistics-service';
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

const row = {
  playerId: 1,
  username: 'alice',
  coins: 1000,
  lootboxesOpened: 3,
  listingsCreated: 2,
  listingsSold: 1,
  salesRevenue: 500,
  purchasesMade: 2,
  purchaseSpending: 300,
  miniGamesPlayed: 4,
  stovesOwned: 5,
  stoveValue: 700,
  totalLogins: 6,
  totalCoinsEarned: 900,
  totalCoinsSpent: 100,
  bestDropRarity: 'legendary',
};

describe('PlayerStatisticsService', () => {
  it('maps aggregate rows from getAll and sorts by market activity', async () => {
    const stmt = mockStmt(null, [row, { ...row, playerId: 2, username: 'bob', listingsSold: 5 }]);
    const service = new PlayerStatisticsService(mockUnit(stmt));

    const result = await service.getAll();

    expect(result[0].playerId).toBe(2);
    expect(result[1]).toEqual(expect.objectContaining({
      playerId: 1,
      totalLootboxesOpened: 3,
      totalTradesCompleted: 3,
      netWorthEstimate: 1700,
      marketActivityScore: 70,
    }));
  });

  it('returns top players by activity and net worth', async () => {
    const rows = [
      { ...row, playerId: 1, miniGamesPlayed: 1, stoveValue: 100 },
      { ...row, playerId: 2, miniGamesPlayed: 5, stoveValue: 2000 },
    ];
    const activityService = new PlayerStatisticsService(mockUnit(mockStmt(null, rows)));
    const worthService = new PlayerStatisticsService(mockUnit(mockStmt(null, rows)));

    expect((await activityService.getTopByActivity(1))[0].playerId).toBe(2);
    expect((await worthService.getTopByNetWorth(1))[0].playerId).toBe(2);
  });

  it('keeps legacy create and delete behavior', () => {
    const service = new PlayerStatisticsService(mockUnit());

    expect(service.create(7)).toEqual([true, 7]);
    expect(service.delete(7)).toBe(true);
  });

  it('creates default player statistics', async () => {
    const stmt = mockStmt(null, [], { changes: 1 });
    const service = new PlayerStatisticsService(mockUnit(stmt));

    expect(await service.createDefaultPlayerStatistics(7)).toEqual([true, 1]);
  });
});
