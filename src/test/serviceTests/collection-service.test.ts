import { CollectionService } from '../../backend/services/collection-service';
import { Unit } from '../../backend/utils/unit';

function mockStmt(allResult: unknown[] = []) {
  return {
    get: jest.fn().mockResolvedValue(undefined),
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

describe('CollectionService', () => {
  describe('getPlayerCollections', () => {
    it('returns collection progress for a player', async () => {
      const allTypesStmt = mockStmt([
        { collection: 'Dragon', count: 3 },
        { collection: 'Industrial', count: 2 },
      ]);
      const ownedStmt = mockStmt([
        { collection: 'Dragon', count: 1 },
        { collection: 'Industrial', count: 2 },
      ]);
      const unit = mockUnitSequence([allTypesStmt, ownedStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(10);

      expect(result).toEqual([
        {
          name: 'Dragon',
          total: 3,
          owned: 1,
          completed: false,
          bonusDescription: '+5% sparks from salvage',
        },
        {
          name: 'Industrial',
          total: 2,
          owned: 2,
          completed: true,
          bonusDescription: '+10% coins from all sources',
        },
      ]);
    });

    it('uses 0 owned and empty bonus for unknown collections', async () => {
      const allTypesStmt = mockStmt([{ collection: 'Mystery', count: 4 }]);
      const ownedStmt = mockStmt([]);
      const unit = mockUnitSequence([allTypesStmt, ownedStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(99);

      expect(result).toEqual([
        {
          name: 'Mystery',
          total: 4,
          owned: 0,
          completed: false,
          bonusDescription: '',
        },
      ]);
    });

    it('returns an empty array when no collections exist', async () => {
      const allTypesStmt = mockStmt([]);
      const ownedStmt = mockStmt([]);
      const unit = mockUnitSequence([allTypesStmt, ownedStmt]);
      const service = new CollectionService(unit);

      const result = await service.getPlayerCollections(10);

      expect(result).toEqual([]);
    });
  });
});
