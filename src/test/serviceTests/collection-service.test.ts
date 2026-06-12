import { CollectionService } from '../../backend/services/collection-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(getResult: unknown = undefined, allResult: unknown[] = [], runResult = { changes: 1 }) {
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
    savepoint: jest.fn().mockResolvedValue(undefined),
    rollbackToSavepoint: jest.fn().mockResolvedValue(undefined),
  } as unknown as Unit;
}

function collectionSchemaStmts() {
  return [mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt()];
}

describe('CollectionService', () => {
  describe('getPlayerCollections', () => {
    it('returns collection books with discovered stove progress for a player', async () => {
      const allTypesStmt = mockStmt(undefined, [
        {
          typeId: 1,
          name: 'Iron Stove',
          imageUrl: '/iron.png',
          rarity: 'common',
          collection: 'Industrial',
          discoveredAt: '2026-01-01',
          rewardClaimedAt: null,
        },
        {
          typeId: 2,
          name: 'Steel Stove',
          imageUrl: '/steel.png',
          rarity: 'legendary',
          collection: 'Industrial',
          discoveredAt: '2026-01-02',
          rewardClaimedAt: '2026-01-03',
        },
        {
          typeId: 3,
          name: 'Dragon Stove',
          imageUrl: '/dragon.png',
          rarity: 'secret',
          collection: 'Dragon',
          discoveredAt: null,
          rewardClaimedAt: null,
        },
      ]);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(10);

      expect(result).toEqual([
        {
          name: 'Industrial',
          total: 2,
          owned: 2,
          completed: true,
          bonusDescription: '+10% coal from all sources',
          stoves: [
            {
              typeId: 1,
              name: 'Iron Stove',
              imageUrl: '/iron.png',
              rarity: 'common',
              discovered: true,
              rewardClaimed: false,
              rewardCoins: 250,
              rewardXP: 15,
            },
            {
              typeId: 2,
              name: 'Steel Stove',
              imageUrl: '/steel.png',
              rarity: 'legendary',
              discovered: true,
              rewardClaimed: true,
              rewardCoins: 500,
              rewardXP: 100,
            },
          ],
        },
        {
          name: 'Dragon',
          total: 1,
          owned: 0,
          completed: false,
          bonusDescription: '+5% sparks from salvage',
          stoves: [
            {
              typeId: 3,
              name: 'Dragon Stove',
              imageUrl: '/dragon.png',
              rarity: 'secret',
              discovered: false,
              rewardClaimed: false,
              rewardCoins: 1000,
              rewardXP: 200,
            },
          ],
        },
      ]);
    });

    it('uses 0 owned and empty bonus for unknown collections', async () => {
      const allTypesStmt = mockStmt(undefined, [
        {
          typeId: 4,
          name: 'Mystery Stove',
          imageUrl: '/mystery.png',
          rarity: 'rare',
          collection: 'Mystery',
          discoveredAt: null,
          rewardClaimedAt: null,
        },
      ]);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(99);

      expect(result).toEqual([
        {
          name: 'Mystery',
          total: 1,
          owned: 0,
          completed: false,
          bonusDescription: '',
          stoves: [
            {
              typeId: 4,
              name: 'Mystery Stove',
              imageUrl: '/mystery.png',
              rarity: 'rare',
              discovered: false,
              rewardClaimed: false,
              rewardCoins: 250,
              rewardXP: 15,
            },
          ],
        },
      ]);
    });

    it('returns an empty array when no collections exist', async () => {
      const allTypesStmt = mockStmt(undefined, []);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(10);

      expect(result).toEqual([]);
    });

    it('reconciles existing collection tables before reading reward claim state', async () => {
      const allTypesStmt = mockStmt(undefined, []);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      await service.getPlayerCollections(10);

      const schemaSql = (unit.prepare as jest.Mock).mock.calls
        .slice(0, 5)
        .map(call => call[0] as string);
      expect(schemaSql[1]).toContain('ADD COLUMN IF NOT EXISTS rewardClaimedAt TEXT');
      expect(schemaSql[4]).toContain('ALTER COLUMN discoveredAt SET NOT NULL');
      expect(schemaSql[4]).toContain("ALTER COLUMN source SET DEFAULT 'unknown'");
      for (const sql of schemaSql) {
        expect(sql).not.toMatch(/;\s*\S/);
      }
    });

    it('reports the failing collection read step', async () => {
      const allTypesStmt = {
        get: jest.fn(),
        all: jest.fn().mockRejectedValue(new Error('relation "playercollectionentry" does not exist')),
        run: jest.fn(),
      };
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      await expect(service.getPlayerCollections(10)).rejects.toThrow(
        'Collections read collection progress failed: relation "playercollectionentry" does not exist'
      );
    });

    it('casts collection fallback timestamps to text for PostgreSQL COALESCE', async () => {
      const allTypesStmt = mockStmt(undefined, []);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      await service.getPlayerCollections(10);

      const sqlCalls = (unit.prepare as jest.Mock).mock.calls.map(call => call[0] as string);
      expect(sqlCalls.some(sql => sql.includes('CURRENT_TIMESTAMP::TEXT'))).toBe(true);
      expect(sqlCalls.join('\n')).not.toContain('COALESCE(MIN(s.mintedAt), CURRENT_TIMESTAMP)');
      expect(sqlCalls.join('\n')).not.toContain('COALESCE(MIN(o.acquiredAt), CURRENT_TIMESTAMP)');
    });

    it('excludes limited and One of a Kind stove types from collection books', async () => {
      const allTypesStmt = mockStmt(undefined, [
        {
          typeId: 1,
          name: 'One of a Kind',
          imageUrl: '',
          rarity: 'limited',
          collection: 'Special',
          discoveredAt: '2026-01-01',
          rewardClaimedAt: null,
        },
        {
          typeId: 2,
          name: 'Magic Stove',
          imageUrl: '/magic.png',
          rarity: 'legendary',
          collection: 'Special',
          discoveredAt: null,
          rewardClaimedAt: null,
        },
      ]);
      const unit = mockUnitSequence([...collectionSchemaStmts(), mockStmt(), mockStmt(), allTypesStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(10);

      expect(result).toEqual([
        {
          name: 'Special',
          total: 1,
          owned: 0,
          completed: false,
          bonusDescription: '',
          stoves: [
            {
              typeId: 2,
              name: 'Magic Stove',
              imageUrl: '/magic.png',
              rarity: 'legendary',
              discovered: false,
              rewardClaimed: false,
              rewardCoins: 500,
              rewardXP: 100,
            },
          ],
        },
      ]);
    });
  });

  describe('claimStoveReward', () => {
    it('rejects undiscovered stove types', async () => {
      const unit = mockUnitSequence([
        ...collectionSchemaStmts(),
        mockStmt(),
        mockStmt(),
        mockStmt(),
        mockStmt({ name: 'Iron Stove', rarity: 'common' }),
        mockStmt(null),
      ]);
      const service = new CollectionService(unit);

      const result = await service.claimStoveReward(10, 5);

      expect(result).toEqual({
        success: false,
        error: 'Discover this stove before claiming its reward',
      });
    });

    it('rejects already claimed rewards', async () => {
      const unit = mockUnitSequence([
        ...collectionSchemaStmts(),
        mockStmt(),
        mockStmt(),
        mockStmt(),
        mockStmt({ name: 'Iron Stove', rarity: 'common' }),
        mockStmt({ rewardClaimedAt: '2026-01-01', name: 'Iron Stove', rarity: 'common' }),
      ]);
      const service = new CollectionService(unit);

      const result = await service.claimStoveReward(10, 5);

      expect(result).toEqual({
        success: false,
        error: 'Collection reward already claimed',
      });
    });

    it('rejects direct claims for limited collection-excluded types', async () => {
      const unit = mockUnitSequence([
        ...collectionSchemaStmts(),
        mockStmt(),
        mockStmt(),
        mockStmt(),
        mockStmt({ name: 'One of a Kind', rarity: 'limited' }),
      ]);
      const service = new CollectionService(unit);

      const result = await service.claimStoveReward(10, 5);

      expect(result).toEqual({
        success: false,
        error: 'This stove is not part of collections',
      });
    });

    it('awards legendary collection rewards once', async () => {
      const prestige = { playerId: 10, totalXP: 100, currentLevel: 4, prestigeCount: 0, updatedAt: 'now' };
      const unit = mockUnitSequence([
        ...collectionSchemaStmts(),
        mockStmt(),
        mockStmt(),
        mockStmt(),
        mockStmt({ name: 'Steel Stove', rarity: 'legendary' }),
        mockStmt({ rewardClaimedAt: null, name: 'Steel Stove', rarity: 'legendary' }),
        mockStmt({ typeId: 5 }),
        mockStmt(undefined, [], { changes: 1 }),
        mockStmt(undefined, [], { changes: 1 }),
        mockStmt(prestige),
        mockStmt(undefined, [], { changes: 1 }),
        mockStmt(undefined, [], { changes: 1 }),
        mockStmt({ playerId: 10, coins: 1500 }),
      ]);
      const service = new CollectionService(unit);

      const result = await service.claimStoveReward(10, 5);

      expect(result).toEqual({
        success: true,
        typeId: 5,
        rewardCoins: 500,
        rewardXP: 100,
        newCoins: 1500,
        prestige: {
          ...prestige,
          totalXP: 200,
          currentLevel: 5,
          updatedAt: expect.any(String),
        },
      });
    });
  });
});
