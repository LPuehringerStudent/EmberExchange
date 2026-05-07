import { ListingService } from '../../backend/services/listing-service';
import { Unit } from '../../backend/utils/unit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal async mock statement. */
function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
  return {
    get: jest.fn().mockResolvedValue(getResult),
    all: jest.fn().mockResolvedValue(allResult),
    run: jest.fn().mockResolvedValue(runResult),
  };
}

/** Build a Unit mock whose prepare() always returns the given stmt mock. */
function mockUnit(stmt = mockStmt()) {
  return {
    prepare: jest.fn().mockReturnValue(stmt),
    getLastRowId: jest.fn().mockResolvedValue(1),
  } as unknown as Unit;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleListing = {
  listingId: 1,
  sellerId: 10,
  sellerName: 'Alice',
  stoveId: 5,
  lootboxId: null,
  price: 200,
  listedAt: '2026-01-01',
  status: 'active',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ListingService', () => {

  // --- getAllListings ------------------------------------------------------

  describe('getAllListings', () => {
    it('returns all listings from the database', async () => {
      const stmt = mockStmt(null, [sampleListing]);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getAllListings();

      expect(unit.prepare).toHaveBeenCalledTimes(1);
      expect(stmt.all).toHaveBeenCalledTimes(1);
      expect(result).toEqual([sampleListing]);
    });

    it('returns an empty array when there are no listings', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getAllListings();

      expect(result).toEqual([]);
    });
  });

  // --- getListingById -----------------------------------------------------

  describe('getListingById', () => {
    it('returns the listing when it exists', async () => {
      const stmt = mockStmt(sampleListing);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getListingById(1);

      expect(result).toEqual(sampleListing);
    });

    it('returns null when listing does not exist', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getListingById(999);

      expect(result).toBeNull();
    });
  });

  // --- getActiveListings --------------------------------------------------

  describe('getActiveListings', () => {
    it('returns only active listings', async () => {
      const stmt = mockStmt(null, [sampleListing]);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListings();

      expect(result).toEqual([sampleListing]);
    });

    it('returns an empty array when no active listings exist', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListings();

      expect(result).toEqual([]);
    });
  });

  // --- getListingsBySellerId ---------------------------------------------

  describe('getListingsBySellerId', () => {
    it('returns listings for a given seller', async () => {
      const stmt = mockStmt(null, [sampleListing]);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getListingsBySellerId(10);

      expect(result).toEqual([sampleListing]);
    });

    it('returns empty array when seller has no listings', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getListingsBySellerId(99);

      expect(result).toEqual([]);
    });
  });

  // --- getActiveListingsBySellerId ----------------------------------------

  describe('getActiveListingsBySellerId', () => {
    it('returns active listings for a given seller', async () => {
      const stmt = mockStmt(null, [sampleListing]);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingsBySellerId(10);

      expect(result).toEqual([sampleListing]);
    });

    it('returns empty array when seller has no active listings', async () => {
      const stmt = mockStmt(null, []);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingsBySellerId(10);

      expect(result).toEqual([]);
    });
  });

  // --- getActiveListingByStoveId ------------------------------------------

  describe('getActiveListingByStoveId', () => {
    it('returns the active listing for a stove', async () => {
      const stmt = mockStmt(sampleListing);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingByStoveId(5);

      expect(result).toEqual(sampleListing);
    });

    it('returns null when stove has no active listing', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingByStoveId(5);

      expect(result).toBeNull();
    });
  });

  // --- getActiveListingByLootboxId ----------------------------------------

  describe('getActiveListingByLootboxId', () => {
    it('returns the active listing for a lootbox', async () => {
      const lootboxListing = { ...sampleListing, stoveId: null, lootboxId: 3 };
      const stmt = mockStmt(lootboxListing);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingByLootboxId(3);

      expect(result).toEqual(lootboxListing);
    });

    it('returns null when lootbox has no active listing', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.getActiveListingByLootboxId(3);

      expect(result).toBeNull();
    });
  });

  // --- createListing ------------------------------------------------------

  describe('createListing', () => {
    it('returns [true, id] on successful stove listing creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const [success, id] = await service.createListing(10, 200, 5, null);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [true, id] on successful lootbox listing creation', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const [success, id] = await service.createListing(10, 150, null, 3);

      expect(success).toBe(true);
      expect(id).toBe(1);
    });

    it('returns [false, 0] when insert fails', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = {
        prepare: jest.fn().mockReturnValue(stmt),
        getLastRowId: jest.fn().mockResolvedValue(0),
      } as unknown as Unit;
      const service = new ListingService(unit);

      const [success, id] = await service.createListing(10, 200, 5, null);

      expect(success).toBe(false);
      expect(id).toBe(0);
    });
  });

  // --- updatePrice --------------------------------------------------------

  describe('updatePrice', () => {
    it('returns true when price is updated', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.updatePrice(1, 300);

      expect(result).toBe(true);
    });

    it('returns false when listing not found or not active', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.updatePrice(999, 300);

      expect(result).toBe(false);
    });
  });

  // --- markAsSold ---------------------------------------------------------

  describe('markAsSold', () => {
    it('returns true when listing is marked as sold', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.markAsSold(1);

      expect(result).toBe(true);
    });

    it('returns false when listing does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.markAsSold(999);

      expect(result).toBe(false);
    });
  });

  // --- cancelListing ------------------------------------------------------

  describe('cancelListing', () => {
    it('returns true when active listing is cancelled', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.cancelListing(1);

      expect(result).toBe(true);
    });

    it('returns false when listing is not active or does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.cancelListing(999);

      expect(result).toBe(false);
    });
  });

  // --- deleteListing ------------------------------------------------------

  describe('deleteListing', () => {
    it('returns true when listing is deleted', async () => {
      const stmt = mockStmt(null, [], { changes: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.deleteListing(1);

      expect(result).toBe(true);
    });

    it('returns false when listing does not exist', async () => {
      const stmt = mockStmt(null, [], { changes: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.deleteListing(999);

      expect(result).toBe(false);
    });
  });

  // --- isStoveListed ------------------------------------------------------

  describe('isStoveListed', () => {
    it('returns true when stove has an active listing', async () => {
      const stmt = mockStmt({ count: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.isStoveListed(5);

      expect(result).toBe(true);
    });

    it('returns false when stove has no active listing', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.isStoveListed(5);

      expect(result).toBe(false);
    });

    it('returns false when count result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.isStoveListed(5);

      expect(result).toBe(false);
    });
  });

  // --- isLootboxListed ----------------------------------------------------

  describe('isLootboxListed', () => {
    it('returns true when lootbox has an active listing', async () => {
      const stmt = mockStmt({ count: 1 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.isLootboxListed(3);

      expect(result).toBe(true);
    });

    it('returns false when lootbox has no active listing', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.isLootboxListed(3);

      expect(result).toBe(false);
    });
  });

  // --- countActiveListingsBySeller ----------------------------------------

  describe('countActiveListingsBySeller', () => {
    it('returns the count of active listings for a seller', async () => {
      const stmt = mockStmt({ count: 4 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.countActiveListingsBySeller(10);

      expect(result).toBe(4);
    });

    it('returns 0 when seller has no active listings', async () => {
      const stmt = mockStmt({ count: 0 });
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.countActiveListingsBySeller(10);

      expect(result).toBe(0);
    });

    it('returns 0 when query result is undefined', async () => {
      const stmt = mockStmt(undefined);
      const unit = mockUnit(stmt);
      const service = new ListingService(unit);

      const result = await service.countActiveListingsBySeller(10);

      expect(result).toBe(0);
    });
  });
});