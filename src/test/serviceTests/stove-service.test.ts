import { StoveService } from '../../backend/services/stove-service';
import { Unit } from '../../backend/utils/unit';

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

const sampleStove = {
  stoveId: 1,
  typeId: 2,
  currentOwnerId: 10,
  mintedAt: '2026-01-01',
};

const sampleStoveWithImage = { ...sampleStove, imageUrl: '/assets/stove_sprites/stove2.png' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoveService', () => {

  // --- getAllStoves --------------------------------------------------------

  describe('getAllStoves', () => {
    it('returns all stoves', async () => {
      const stmt = mockStmt(null, [sampleStove]);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getAllStoves();

      expect(result).toEqual([sampleStove]);
    });

    it('returns an empty array when no stoves exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getAllStoves();

      expect(result).toEqual([]);
    });
  });

  // --- getStoveById -------------------------------------------------------

  describe('getStoveById', () => {
    it('returns the stove when found', async () => {
      const stmt = mockStmt(sampleStove);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStoveById(1);

      expect(result).toEqual(sampleStove);
    });

    it('returns null when stove is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStoveById(999);

      expect(result).toBeNull();
    });
  });

  // --- getStovesByOwnerId -------------------------------------------------

  describe('getStovesByOwnerId', () => {
    it('returns stoves with imageUrl for a given owner', async () => {
      const stmt = mockStmt(null, [sampleStoveWithImage]);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStovesByOwnerId(10);

      expect(result).toEqual([sampleStoveWithImage]);
    });

    it('returns empty array when player owns no stoves', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStovesByOwnerId(99);

      expect(result).toEqual([]);
    });
  });

  // --- getStovesByTypeId --------------------------------------------------

  describe('getStovesByTypeId', () => {
    it('returns stoves of a given type', async () => {
      const stmt = mockStmt(null, [sampleStove]);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStovesByTypeId(2);

      expect(result).toEqual([sampleStove]);
    });

    it('returns empty array when no stoves of that type exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.getStovesByTypeId(99);

      expect(result).toEqual([]);
    });
  });

  // --- createStove --------------------------------------------------------

  describe('createStove', () => {
    it('returns [true, id] on successful stove creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const [success, id] = await service.createStove(2, 10);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new StoveService(unit);

      const [success, id] = await service.createStove(2, 10);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- updateOwner --------------------------------------------------------

  describe('updateOwner', () => {
    it('returns true when owner is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.updateOwner(1, 20);

      expect(result).toBe(true);
    });

    it('returns false when stove is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.updateOwner(999, 20);

      expect(result).toBe(false);
    });
  });

  // --- deleteStove --------------------------------------------------------

  describe('deleteStove', () => {
    it('returns true when stove is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.deleteStove(1);

      expect(result).toBe(true);
    });

    it('returns false when stove does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.deleteStove(999);

      expect(result).toBe(false);
    });
  });

  // --- countStovesByOwner -------------------------------------------------

  describe('countStovesByOwner', () => {
    it('returns the count of stoves for a player', async () => {
      const stmt = mockStmt({ count: 3 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.countStovesByOwner(10);

      expect(result).toBe(3);
    });

    it('returns 0 when player owns no stoves', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.countStovesByOwner(10);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.countStovesByOwner(10);

      expect(result).toBe(0);
    });
  });

  // --- countStovesByType --------------------------------------------------

  describe('countStovesByType', () => {
    it('returns the count of stoves of a specific type', async () => {
      const stmt = mockStmt({ count: 7 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.countStovesByType(2);

      expect(result).toBe(7);
    });

    it('returns 0 when no stoves of that type exist', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new StoveService(unit);

      const result = await service.countStovesByType(99);

      expect(result).toBe(0);
    });
  });
});