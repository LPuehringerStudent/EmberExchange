import { AdminService } from '../../backend/services/admin-service';
import { Unit } from '../../backend/utils/unit';
import { Rarity } from '../../shared/model';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[], lastRowId = 1) {
  let callIndex = 0;
  return {
    prepare: jest.fn().mockImplementation(() => {
      const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
      callIndex++;
      return stmt;
    }),
    getLastRowId: jest.fn().mockResolvedValue(lastRowId),
  } as unknown as Unit;
}

const player = {
  playerId: 1,
  username: 'alice',
  password: null,
  email: 'alice@test.com',
  motto: '',
  coins: 100,
  sparks: 0,
  lootboxCount: 1,
  isAdmin: false,
  isPublic: true,
  joinedAt: new Date('2026-01-01'),
  provider: null,
  providerId: null,
  totpEnabled: false,
  bannedAt: null,
  banReason: null,
  emailVerified: true,
  verifiedAt: null,
  violationCount: 0,
  lastViolationAt: null,
  totpSecret: null,
};

describe('AdminService', () => {
  it('returns filtered players with paging metadata', async () => {
    const unit = mockUnitSequence([
      mockStmt({ cnt: 1 }),
      mockStmt(null, [player]),
    ]);
    const service = new AdminService(unit);

    const result = await service.getPlayers(2, 10, {
      search: 'ali',
      banned: 'active',
      minCoins: 10,
      maxCoins: 500,
      isAdmin: 'user',
      sortBy: 'coins_desc',
    });

    expect(result).toEqual({ players: [player], total: 1, page: 2, limit: 10 });
    expect(unit.prepare).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(*)'),
      expect.objectContaining({ search: '%ali%', limit: 10, offset: 10 })
    );
  });

  it('returns null player detail when player is not found', async () => {
    const unit = mockUnitSequence([mockStmt(undefined)]);
    const service = new AdminService(unit);

    expect(await service.getPlayerDetail(999)).toBeNull();
  });

  it('returns player detail with calculated admin stats', async () => {
    const unit = mockUnitSequence([
      mockStmt(player),
      mockStmt(player),
      mockStmt({ count: 0 }),
      mockStmt({ count: 0 }),
      mockStmt({ count: 0, revenue: 0 }),
      mockStmt({ count: 0, spent: 0 }),
      mockStmt({ count: 0 }),
      mockStmt({ count: 0 }),
      mockStmt({ count: 0 }),
      mockStmt({ total: 0 }),
      mockStmt({ total: 0 }),
      mockStmt(undefined),
      mockStmt({ value: 0 }),
      mockStmt({ cnt: 4 }),
    ]);
    const service = new AdminService(unit);

    const result = await service.getPlayerDetail(1);

    expect(result?.player).toEqual(player);
    expect(result?.stats.stovesOwned).toBe(4);
    expect(result?.stats.totalTradesCompleted).toBe(0);
  });

  it('adjusts player coins and records transaction', async () => {
    const unit = mockUnitSequence([
      mockStmt(player),
      mockStmt(null, [], { changes: 1 }),
      mockStmt(null, [], { changes: 1 }),
    ]);
    const service = new AdminService(unit);

    expect(await service.adjustPlayerCoins(1, -500, 'Penalty')).toBe(true);
  });

  it('returns false when adjusting coins for missing player', async () => {
    const unit = mockUnitSequence([mockStmt(undefined)]);
    const service = new AdminService(unit);

    expect(await service.adjustPlayerCoins(999, 100, 'Gift')).toBe(false);
  });

  it('sets player ban state', async () => {
    const unit = mockUnitSequence([mockStmt(null, [], { changes: 1 })]);
    const service = new AdminService(unit);

    expect(await service.setPlayerBan(1, true, 'bad')).toBe(true);
  });

  it('returns system stats', async () => {
    const unit = mockUnitSequence([
      mockStmt({ cnt: 2 }),
      mockStmt({ cnt: 10 }),
      mockStmt({ cnt: 3 }),
      mockStmt({ total: 1000 }),
      mockStmt({ cnt: 5 }),
      mockStmt({ cnt: 1 }),
      mockStmt({ cnt: 1 }),
      mockStmt({ cnt: 1 }),
      mockStmt({ cnt: 1 }),
      mockStmt({ cnt: 1 }),
      mockStmt({ cnt: 1 }),
    ]);
    const service = new AdminService(unit);

    expect(await service.getSystemStats()).toEqual({
      totalPlayers: 2,
      totalStoves: 10,
      totalTrades: 3,
      totalCoinsInCirculation: 1000,
      totalLootboxesOpened: 5,
      recentSignups7d: 1,
      activePlayers24h: 1,
      bannedPlayers: 1,
      totalListings: 1,
      totalCoinTransactions: 1,
      totalEligiblePlayers: 1,
    });
  });

  it('returns and updates stove types', async () => {
    const stoveType = {
      typeId: 1,
      name: 'Basic',
      imageUrl: '/basic.png',
      rarity: Rarity.COMMON,
      lootboxWeight: 10,
      collection: 'Industrial',
      minHeat: 0.1,
      maxHeat: 0.5,
    };
    const unit = mockUnitSequence([
      mockStmt(null, [stoveType]),
      mockStmt(null, [], { changes: 1 }),
      mockStmt(null, [], { changes: 1 }),
    ]);
    const service = new AdminService(unit);

    expect(await service.getStoveTypes()).toEqual([stoveType]);
    expect(await service.updateStoveType(1, { name: 'Better' })).toBe(true);
    const { typeId: _typeId, ...newStoveType } = stoveType;
    expect(await service.createStoveType(newStoveType)).toEqual([true, 1]);
  });

  it('returns false when stove type update has no fields', async () => {
    const service = new AdminService(mockUnitSequence([]));

    expect(await service.updateStoveType(1, {})).toBe(false);
  });
});
