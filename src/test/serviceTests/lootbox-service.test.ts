import { LootboxService } from '../../backend/services/lootbox-service';
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

/**
 * Build a unit mock where prepare() returns different stmts per call index.
 * If fewer overrides are given than prepare() calls made, the last override repeats.
 */
function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[]) {
  let callIndex = 0;
  return {
    prepare: jest.fn().mockImplementation(() => {
      const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
      callIndex++;
      return stmt;
    }),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

const sampleLootbox = {
  lootboxId: 1,
  lootboxTypeId: 1,
  playerId: 10,
  openedAt: null,
  acquiredHow: 'free',
};

const sampleLootboxType = {
  lootboxTypeId: 1,
  name: 'Standard Lootbox',
  isAvailable: 1,
};

const sampleLootboxDrop = {
  dropId: 1,
  lootboxId: 1,
  stoveId: 5,
};

const sampleStoveType = {
  typeId: 2,
  name: 'Ember Stove',
  rarity: 'common',
  imageUrl: '/assets/stove_sprites/ember.png',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LootboxService', () => {

  // --- getAllLootboxes ----------------------------------------------------

  describe('getAllLootboxes', () => {
    it('returns all lootboxes', async () => {
      const stmt = mockStmt(null, [sampleLootbox]);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getAllLootboxes();

      expect(result).toEqual([sampleLootbox]);
    });

    it('returns an empty array when no lootboxes exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getAllLootboxes();

      expect(result).toEqual([]);
    });
  });

  // --- getLootboxById ----------------------------------------------------

  describe('getLootboxById', () => {
    it('returns the lootbox when found', async () => {
      const stmt = mockStmt(sampleLootbox);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getLootboxById(1);

      expect(result).toEqual(sampleLootbox);
    });

    it('returns null when lootbox is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getLootboxById(999);

      expect(result).toBeNull();
    });
  });

  // --- getLootboxesByPlayerId -------------------------------------------

  describe('getLootboxesByPlayerId', () => {
    it('returns unopened lootboxes for a player', async () => {
      // Call order: (1) SELECT unopened lootboxes → [sampleLootbox]
      //             (2) SELECT lootboxCount → { lootboxCount: 1 }
      const lootboxStmt = mockStmt(null, [sampleLootbox]);
      const playerStmt = mockStmt({ lootboxCount: 1 });
      const unit = mockUnitSequence([lootboxStmt, playerStmt]);
      const service = new LootboxService(unit);

      const result = await service.getLootboxesByPlayerId(10);

      expect(result).toEqual([sampleLootbox]);
    });

    it('returns empty array when player has no lootboxes and lootboxCount is 0', async () => {
      const emptyStmt = mockStmt(null, []);
      const playerStmt = mockStmt({ lootboxCount: 0 });
      const unit = mockUnitSequence([emptyStmt, playerStmt]);
      const service = new LootboxService(unit);

      const result = await service.getLootboxesByPlayerId(10);

      expect(result).toEqual([]);
    });
  });

  // --- createLootbox -----------------------------------------------------

  describe('createLootbox', () => {
    it('returns [true, id] and increments lootboxCount on success', async () => {
      const insertStmt = mockStmt(null, [], { changes: 1 });
      const updateStmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnitSequence([insertStmt, updateStmt]);
      const service = new LootboxService(unit);

      const [success, id] = await service.createLootbox(1, 10, 'free');

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails and does not increment lootboxCount', async () => {
      const insertStmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(insertStmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new LootboxService(unit);

      const [success, id] = await service.createLootbox(1, 10, 'free');

      expect(success).toBe(false);
      expect(id).toBe(0);
      // lootboxCount update should NOT have been called
      expect(unit.prepare).toHaveBeenCalledTimes(1);
    });
  });

  // --- getAvailableLootboxTypes ------------------------------------------

  describe('getAvailableLootboxTypes', () => {
    it('returns only available lootbox types', async () => {
      const stmt = mockStmt(null, [sampleLootboxType]);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getAvailableLootboxTypes();

      expect(result).toEqual([sampleLootboxType]);
    });

    it('returns empty array when no types are available', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getAvailableLootboxTypes();

      expect(result).toEqual([]);
    });
  });

  // --- getLootboxTypeById -----------------------------------------------

  describe('getLootboxTypeById', () => {
    it('returns the lootbox type when found', async () => {
      const stmt = mockStmt(sampleLootboxType);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getLootboxTypeById(1);

      expect(result).toEqual(sampleLootboxType);
    });

    it('returns null when lootbox type is not found', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getLootboxTypeById(999);

      expect(result).toBeNull();
    });
  });

  // --- getAllLootboxTypes ------------------------------------------------

  describe('getAllLootboxTypes', () => {
    it('returns all lootbox types', async () => {
      const stmt = mockStmt(null, [sampleLootboxType]);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getAllLootboxTypes();

      expect(result).toEqual([sampleLootboxType]);
    });
  });

  // --- getDropsByLootboxId ----------------------------------------------

  describe('getDropsByLootboxId', () => {
    it('returns drops associated with a lootbox', async () => {
      const stmt = mockStmt(null, [sampleLootboxDrop]);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getDropsByLootboxId(1);

      expect(result).toEqual([sampleLootboxDrop]);
    });

    it('returns empty array when lootbox has no drops', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.getDropsByLootboxId(99);

      expect(result).toEqual([]);
    });
  });

  // --- createLootboxDrop -----------------------------------------------

  describe('createLootboxDrop', () => {
    it('returns [true, id] on successful drop creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const [success, id] = await service.createLootboxDrop(1, 5);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new LootboxService(unit);

      const [success, id] = await service.createLootboxDrop(1, 5);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- openLootbox -------------------------------------------------------

  describe('openLootbox', () => {
    it('returns [false, null] when lootbox does not exist or is already opened', async () => {
      // First prepare() = verify lootbox ownership → not found
      const verifyStmt = mockStmt(undefined);
      const unit = mockUnitSequence([verifyStmt]);
      const service = new LootboxService(unit);

      const [success, result] = await service.openLootbox(99, 10);

      expect(success).toBe(false);
      expect(result).toBeNull();
    });

    it('returns [false, null] when the lootbox is listed on the marketplace', async () => {
      // (1) verifyStmt → lootbox found
      // (2) isLootboxListed count → { count: 1 } (listed)
      const verifyStmt = mockStmt(sampleLootbox);
      const listedStmt = mockStmt({ count: 1 });
      const unit = mockUnitSequence([verifyStmt, listedStmt]);
      const service = new LootboxService(unit);

      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(false);
      expect(result).toBeNull();
    });

    it('returns [true, drop result] on successful lootbox open', async () => {
      // Call sequence:
      // (1) verify lootbox → sampleLootbox
      // (2) isLootboxListed count → { count: 0 }
      // (3) pickStoveTypeByRarity all → [sampleStoveType]
      // (4) INSERT Stove run
      // (5) markOpened run
      // (6) INSERT LootboxDrop run
      // (7) decrement lootboxCount run
      const verifyStmt = mockStmt(sampleLootbox);
      const notListedStmt = mockStmt({ count: 0 });
      const stoveTypesStmt = mockStmt(null, [sampleStoveType]);
      const insertStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([
        verifyStmt,      // verify ownership
        notListedStmt,   // isLootboxListed
        stoveTypesStmt,  // pickStoveTypeByRarity
        insertStmt,      // INSERT Stove
        insertStmt,      // UPDATE Lootbox openedAt
        insertStmt,      // INSERT LootboxDrop
        insertStmt,      // UPDATE Player lootboxCount
      ]);
      (unit as any).getLastRowId = jest.fn()
          .mockResolvedValueOnce(55)   // stoveId
          .mockResolvedValueOnce(7);   // dropId

      const service = new LootboxService(unit);
      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(true);
      expect(result).not.toBeNull();
      expect(result?.stoveId).toBe(55);
      expect(result?.stoveName).toBe('Ember Stove');
      expect(result?.lootboxId).toBe(1);
      expect(typeof result?.rarity).toBe('string');
    });

    it('returns [false, null] when no stove type matches the rolled rarity', async () => {
      const verifyStmt = mockStmt(sampleLootbox);
      const notListedStmt = mockStmt({ count: 0 });
      const emptyStoveTypes = mockStmt(null, []); // no matching stove type

      const unit = mockUnitSequence([verifyStmt, notListedStmt, emptyStoveTypes]);
      const service = new LootboxService(unit);

      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(false);
      expect(result).toBeNull();
    });

    it('opens Dragon Crate with rarity-weighted dragon stove drop', async () => {
      const dragonLootbox = { ...sampleLootbox, lootboxTypeId: 4 };
      const dragonStoveType = {
        typeId: 7,
        name: 'Dragon Stove',
        rarity: 'legendary',
        imageUrl: '/assets/dragon.png',
        minHeat: 0,
        maxHeat: 1,
      };
      const verifyStmt = mockStmt(dragonLootbox);
      const notListedStmt = mockStmt({ count: 0 });
      const stoveTypesStmt = mockStmt(null, [dragonStoveType]);
      const insertStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([
        verifyStmt,
        notListedStmt,
        stoveTypesStmt,
        insertStmt,
        insertStmt,
        insertStmt,
        insertStmt,
      ]);
      (unit as any).getLastRowId = jest.fn()
        .mockResolvedValueOnce(55)
        .mockResolvedValueOnce(7);

      const service = new LootboxService(unit);
      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(true);
      expect(result).not.toBeNull();
      expect(result?.stoveName).toBe('Dragon Stove');
    });

    it('opens Winter Crate with rarity-weighted winter stove drop', async () => {
      const winterLootbox = { ...sampleLootbox, lootboxTypeId: 5 };
      const winterStoveType = {
        typeId: 25,
        name: 'Festival Stove',
        rarity: 'secret',
        imageUrl: '/assets/festival.png',
        minHeat: 0,
        maxHeat: 0.6,
      };
      const verifyStmt = mockStmt(winterLootbox);
      const notListedStmt = mockStmt({ count: 0 });
      const stoveTypesStmt = mockStmt(null, [winterStoveType]);
      const insertStmt = mockStmt(null, [], { changes: 1 });

      const unit = mockUnitSequence([
        verifyStmt,
        notListedStmt,
        stoveTypesStmt,
        insertStmt,
        insertStmt,
        insertStmt,
        insertStmt,
      ]);
      (unit as any).getLastRowId = jest.fn()
        .mockResolvedValueOnce(55)
        .mockResolvedValueOnce(7);

      const service = new LootboxService(unit);
      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(true);
      expect(result).not.toBeNull();
      expect(result?.stoveName).toBe('Festival Stove');
    });

    it('returns [false, null] when Dragon Crate rolls a rarity with no matching dragon stoves', async () => {
      const dragonLootbox = { ...sampleLootbox, lootboxTypeId: 4 };
      const verifyStmt = mockStmt(dragonLootbox);
      const notListedStmt = mockStmt({ count: 0 });
      const emptyStoveTypes = mockStmt(null, []);

      const unit = mockUnitSequence([verifyStmt, notListedStmt, emptyStoveTypes]);
      const service = new LootboxService(unit);

      const [success, result] = await service.openLootbox(1, 10);

      expect(success).toBe(false);
      expect(result).toBeNull();
    });
  });

  // --- updateLootboxOwner -----------------------------------------------

  describe('updateLootboxOwner', () => {
    it('returns true when owner is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.updateLootboxOwner(1, 20);

      expect(result).toBe(true);
    });

    it('returns false when lootbox is not found', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.updateLootboxOwner(999, 20);

      expect(result).toBe(false);
    });
  });

  // --- deleteLootbox -----------------------------------------------------

  describe('deleteLootbox', () => {
    it('returns true when lootbox is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.deleteLootbox(1);

      expect(result).toBe(true);
    });

    it('returns false when lootbox does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new LootboxService(unit);

      const result = await service.deleteLootbox(999);

      expect(result).toBe(false);
    });
  });
});