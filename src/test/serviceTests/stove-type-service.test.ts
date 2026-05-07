import { StoveTypeService } from '../../backend/services/stove-type-service';
import { Unit } from '../../backend/utils/unit';
import { Rarity } from '../../shared/model';

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

const sampleStoveType = {
  typeId: 1,
  name: 'Ember Stove',
  imageUrl: '/assets/stove_sprites/ember.png',
  rarity: Rarity.COMMON,
  lootboxWeight: 50,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoveTypeService', () => {

  // --- getAllStoveTypes ----------------------------------------------------

  describe('getAllStoveTypes', () => {
    it('returns all stove types', async () => {
      const stmt = mockStmt(null, [sampleStoveType]);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getAllStoveTypes();

      expect(result).toEqual([sampleStoveType]);
    });

    it('returns an empty array when no stove types exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getAllStoveTypes();

      expect(result).toEqual([]);
    });
  });

  // --- getStoveTypeById ---------------------------------------------------

  describe('getStoveTypeById', () => {
    it('returns the stove type when found', async () => {
      const stmt = mockStmt(sampleStoveType);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypeById(1);

      expect(result).toEqual(sampleStoveType);
    });

    it('returns null when stove type is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypeById(999);

      expect(result).toBeNull();
    });
  });

  // --- getStoveTypesByRarity ----------------------------------------------

  describe('getStoveTypesByRarity', () => {
    it('returns stove types matching the given rarity', async () => {
      const stmt = mockStmt(null, [sampleStoveType]);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypesByRarity(Rarity.COMMON);

      expect(result).toEqual([sampleStoveType]);
    });

    it('returns an empty array when no stove types match the rarity', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypesByRarity(Rarity.LEGENDARY);

      expect(result).toEqual([]);
    });
  });

  // --- createStoveType ----------------------------------------------------

  describe('createStoveType', () => {
    it('returns [true, id] on successful creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const [success, id] = await service.createStoveType('Ember Stove', '/assets/ember.png', Rarity.COMMON, 50);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new StoveTypeService(unit);

      const [success, id] = await service.createStoveType('Ember Stove', '/assets/ember.png', Rarity.COMMON, 50);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- updateLootboxWeight ------------------------------------------------

  describe('updateLootboxWeight', () => {
    it('returns true when lootbox weight is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.updateLootboxWeight(1, 30);

      expect(result).toBe(true);
    });

    it('returns false when stove type is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.updateLootboxWeight(999, 30);

      expect(result).toBe(false);
    });
  });

  // --- updateImageUrl -----------------------------------------------------

  describe('updateImageUrl', () => {
    it('returns true when image URL is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.updateImageUrl(1, '/assets/new.png');

      expect(result).toBe(true);
    });

    it('returns false when stove type is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.updateImageUrl(999, '/assets/new.png');

      expect(result).toBe(false);
    });
  });

  // --- deleteStoveType ----------------------------------------------------

  describe('deleteStoveType', () => {
    it('returns true when stove type is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.deleteStoveType(1);

      expect(result).toBe(true);
    });

    it('returns false when stove type does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.deleteStoveType(999);

      expect(result).toBe(false);
    });
  });

  // --- getStoveTypeByName -------------------------------------------------

  describe('getStoveTypeByName', () => {
    it('returns the stove type matching the name', async () => {
      const stmt = mockStmt(sampleStoveType);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypeByName('Ember Stove');

      expect(result).toEqual(sampleStoveType);
    });

    it('returns null when no stove type matches the name', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getStoveTypeByName('Unknown Stove');

      expect(result).toBeNull();
    });
  });

  // --- getTotalLootboxWeight ----------------------------------------------

  describe('getTotalLootboxWeight', () => {
    it('returns the sum of all lootbox weights', async () => {
      const stmt = mockStmt({ total: 185 });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getTotalLootboxWeight();

      expect(result).toBe(185);
    });

    it('returns 0 when there are no stove types', async () => {
      const stmt = mockStmt({ total: null });
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getTotalLootboxWeight();

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new StoveTypeService(unit);

      const result = await service.getTotalLootboxWeight();

      expect(result).toBe(0);
    });
  });
});