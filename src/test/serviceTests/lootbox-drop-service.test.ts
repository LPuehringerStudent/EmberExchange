import { LootboxDropService } from '../../backend/services/lootbox-drop-service';
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

const sampleDrop = {
  dropId: 1,
  lootboxId: 10,
  stoveId: 20,
};

describe('LootboxDropService', () => {
  describe('getAll', () => {
    it('returns all drops', async () => {
      const stmt = mockStmt(null, [sampleDrop]);
      const service = new LootboxDropService(mockUnit(stmt));

      const result = await service.getAll();

      expect(result).toEqual([sampleDrop]);
    });

    it('passes custom limit and offset', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new LootboxDropService(unit);

      await service.getAll(25, 50);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT @limit OFFSET @offset'),
        { limit: 25, offset: 50 }
      );
    });
  });

  describe('get single drop queries', () => {
    it('returns by drop id', async () => {
      const stmt = mockStmt(sampleDrop);
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.getById(1)).toEqual(sampleDrop);
    });

    it('returns by lootbox id', async () => {
      const stmt = mockStmt(sampleDrop);
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.getByLootboxId(10)).toEqual(sampleDrop);
    });

    it('returns by stove id', async () => {
      const stmt = mockStmt(sampleDrop);
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.getByStoveId(20)).toEqual(sampleDrop);
    });

    it('returns null when a drop is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.getById(999)).toBeNull();
      expect(await service.getByLootboxId(999)).toBeNull();
      expect(await service.getByStoveId(999)).toBeNull();
    });
  });

  describe('getByPlayerId', () => {
    it('returns drops for a player', async () => {
      const stmt = mockStmt(null, [sampleDrop]);
      const service = new LootboxDropService(mockUnit(stmt));

      const result = await service.getByPlayerId(10);

      expect(result).toEqual([sampleDrop]);
    });
  });

  describe('create', () => {
    it('returns [true, id] when drop is created', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxDropService(mockUnit(stmt));

      const result = await service.create(10, 20);

      expect(result).toEqual([true, 1]);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new LootboxDropService(unit);

      const result = await service.create(10, 20);

      expect(result).toEqual([false, 0]);
    });
  });

  describe('updateStove and delete', () => {
    it('returns true when stove is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.updateStove(1, 21)).toBe(true);
    });

    it('returns false when stove update changes no row', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.updateStove(999, 21)).toBe(false);
    });

    it('returns true when drop is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.delete(1)).toBe(true);
    });

    it('returns false when drop does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.delete(999)).toBe(false);
    });
  });

  describe('counts', () => {
    it('returns total drop count', async () => {
      const stmt = mockStmt({ count: 5 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.count()).toBe(5);
    });

    it('returns drop count by lootbox type', async () => {
      const stmt = mockStmt({ count: 3 });
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.countByLootboxType(2)).toBe(3);
    });

    it('returns 0 when count query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new LootboxDropService(mockUnit(stmt));

      expect(await service.count()).toBe(0);
      expect(await service.countByLootboxType(2)).toBe(0);
    });
  });
});
