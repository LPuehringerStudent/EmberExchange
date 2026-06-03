import { LootboxTypeService } from '../../backend/services/lootbox-type-service';
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

const sampleType = {
  lootboxTypeId: 1,
  name: 'Standard',
  description: 'Basic box',
  costCoins: 100,
  costFree: false,
  dailyLimit: null,
  isAvailable: true,
};

describe('LootboxTypeService', () => {
  describe('getAll', () => {
    it('returns all lootbox types', async () => {
      const stmt = mockStmt(null, [sampleType]);
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.getAll();

      expect(result).toEqual([sampleType]);
    });
  });

  describe('getAvailable', () => {
    it('returns available lootbox types', async () => {
      const stmt = mockStmt(null, [sampleType]);
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.getAvailable();

      expect(result).toEqual([sampleType]);
    });
  });

  describe('getById', () => {
    it('returns a lootbox type when found', async () => {
      const stmt = mockStmt(sampleType);
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.getById(1);

      expect(result).toEqual(sampleType);
    });

    it('returns null when lootbox type is not found', async () => {
      const stmt = mockStmt(undefined);
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('converts booleans to database flags and returns [true, id]', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new LootboxTypeService(unit);

      const result = await service.create('Standard', 'Basic box', 100, false, null, true);

      expect(result).toEqual([true, 1]);
      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO LootboxType'),
        expect.objectContaining({ costFree: 0, isAvailable: 1 })
      );
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new LootboxTypeService(unit);

      const result = await service.create('Standard', null, 100, true, 1, false);

      expect(result).toEqual([false, 0]);
    });
  });

  describe('update', () => {
    it('returns true when lootbox type is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.update(1, 'Premium', null, 500, false, null, true);

      expect(result).toBe(true);
    });

    it('returns false when lootbox type is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.update(999, 'Premium', null, 500, false, null, true);

      expect(result).toBe(false);
    });
  });

  describe('updateAvailability', () => {
    it('returns true when availability is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.updateAvailability(1, false);

      expect(result).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns true when lootbox type is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.delete(1);

      expect(result).toBe(true);
    });

    it('returns false when lootbox type does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('counts', () => {
    it('returns total lootbox type count', async () => {
      const stmt = mockStmt({ count: 4 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.count();

      expect(result).toBe(4);
    });

    it('returns available lootbox type count', async () => {
      const stmt = mockStmt({ count: 2 });
      const service = new LootboxTypeService(mockUnit(stmt));

      const result = await service.countAvailable();

      expect(result).toBe(2);
    });

    it('returns 0 when count query returns no row', async () => {
      const stmt = mockStmt(undefined);
      const service = new LootboxTypeService(mockUnit(stmt));

      expect(await service.count()).toBe(0);
      expect(await service.countAvailable()).toBe(0);
    });
  });
});
