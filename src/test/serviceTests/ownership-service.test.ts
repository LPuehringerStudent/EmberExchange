import { OwnershipService } from '../../backend/services/ownership-service';
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

const sampleOwnership = {
  ownershipId: 1,
  stoveId: 5,
  playerId: 10,
  acquiredAt: '2026-01-01',
  acquiredHow: 'lootbox',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OwnershipService', () => {

  // --- getAllOwnerships ---------------------------------------------------

  describe('getAllOwnerships', () => {
    it('returns all ownership records', async () => {
      const stmt = mockStmt(null, [sampleOwnership]);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getAllOwnerships();

      expect(result).toEqual([sampleOwnership]);
    });

    it('returns an empty array when no ownerships exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getAllOwnerships();

      expect(result).toEqual([]);
    });
  });

  // --- getOwnershipById --------------------------------------------------

  describe('getOwnershipById', () => {
    it('returns the ownership record when found', async () => {
      const stmt = mockStmt(sampleOwnership);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipById(1);

      expect(result).toEqual(sampleOwnership);
    });

    it('returns null when ownership record is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipById(999);

      expect(result).toBeNull();
    });
  });

  // --- getOwnershipHistoryByStoveId --------------------------------------

  describe('getOwnershipHistoryByStoveId', () => {
    it('returns ownership history for a stove', async () => {
      const stmt = mockStmt(null, [sampleOwnership]);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipHistoryByStoveId(5);

      expect(result).toEqual([sampleOwnership]);
    });

    it('returns empty array when stove has no ownership history', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipHistoryByStoveId(99);

      expect(result).toEqual([]);
    });
  });

  // --- getOwnershipsByPlayerId -------------------------------------------

  describe('getOwnershipsByPlayerId', () => {
    it('returns ownership records for a player', async () => {
      const stmt = mockStmt(null, [sampleOwnership]);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipsByPlayerId(10);

      expect(result).toEqual([sampleOwnership]);
    });

    it('returns empty array when player has no ownership records', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getOwnershipsByPlayerId(99);

      expect(result).toEqual([]);
    });
  });

  // --- createOwnership ---------------------------------------------------

  describe('createOwnership', () => {
    it('returns [true, id] on successful creation via lootbox', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const [success, id] = await service.createOwnership(5, 10, 'lootbox');

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [true, id] on successful creation via trade', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const [success, id] = await service.createOwnership(5, 10, 'trade');

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [true, id] on successful creation via mini-game', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const [success, id] = await service.createOwnership(5, 10, 'mini-game');

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new OwnershipService(unit);

      const [success, id] = await service.createOwnership(5, 10, 'lootbox');

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- getCurrentOwnership -----------------------------------------------

  describe('getCurrentOwnership', () => {
    it('returns the most recent ownership record for a stove', async () => {
      const stmt = mockStmt(sampleOwnership);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getCurrentOwnership(5);

      expect(result).toEqual(sampleOwnership);
    });

    it('returns null when stove has no ownership records', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.getCurrentOwnership(99);

      expect(result).toBeNull();
    });
  });

  // --- deleteOwnership ---------------------------------------------------

  describe('deleteOwnership', () => {
    it('returns true when ownership record is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.deleteOwnership(1);

      expect(result).toBe(true);
    });

    it('returns false when ownership record does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.deleteOwnership(999);

      expect(result).toBe(false);
    });
  });

  // --- countOwnershipChanges ---------------------------------------------

  describe('countOwnershipChanges', () => {
    it('returns the number of ownership changes for a stove', async () => {
      const stmt = mockStmt({ count: 3 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countOwnershipChanges(5);

      expect(result).toBe(3);
    });

    it('returns 0 when stove has never changed hands', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countOwnershipChanges(5);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countOwnershipChanges(5);

      expect(result).toBe(0);
    });
  });

  // --- countStovesAcquiredByPlayer ---------------------------------------

  describe('countStovesAcquiredByPlayer', () => {
    it('returns the number of stoves acquired by a player', async () => {
      const stmt = mockStmt({ count: 6 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countStovesAcquiredByPlayer(10);

      expect(result).toBe(6);
    });

    it('returns 0 when player has acquired no stoves', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countStovesAcquiredByPlayer(10);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new OwnershipService(unit);

      const result = await service.countStovesAcquiredByPlayer(10);

      expect(result).toBe(0);
    });
  });
});