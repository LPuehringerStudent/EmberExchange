import { ShopRotationService } from '../../backend/services/shop-rotation-service';
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

describe('ShopRotationService', () => {
  describe('rotate', () => {
    it('selects new featured items and returns previous + new', async () => {
      const listings = [
        { listingId: 1, isFeatured: 1 },
        { listingId: 2, isFeatured: 0 },
        { listingId: 3, isFeatured: 0 },
        { listingId: 4, isFeatured: 1 },
      ];
      const allStmt = mockStmt(null, listings);
      const unfeatureStmt = mockStmt();
      const featureStmt = mockStmt();
      let callCount = 0;
      const unit = mockUnit();
      (unit.prepare as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return allStmt;
        if (callCount === 2) return unfeatureStmt;
        return featureStmt;
      });

      const service = new ShopRotationService(unit);
      const result = await service.rotate(2);

      expect(result.previousFeatured).toEqual([1, 4]);
      expect(result.newFeatured).toHaveLength(2);
      expect(unfeatureStmt.run).toHaveBeenCalled();
      expect(featureStmt.run).toHaveBeenCalled();
    });

    it('handles empty shop gracefully', async () => {
      const allStmt = mockStmt(null, []);
      const unfeatureStmt = mockStmt();
      let callCount = 0;
      const unit = mockUnit();
      (unit.prepare as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return allStmt;
        return unfeatureStmt;
      });

      const service = new ShopRotationService(unit);
      const result = await service.rotate(2);

      expect(result.previousFeatured).toEqual([]);
      expect(result.newFeatured).toEqual([]);
    });
  });

  describe('setRotationDays', () => {
    it('updates rotationDate for a listing', async () => {
      const stmt = mockStmt();
      const unit = mockUnit(stmt);
      const service = new ShopRotationService(unit);

      await service.setRotationDays(1, 7);

      expect(unit.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ShopListing SET rotationDate'),
        expect.objectContaining({ listingId: 1 })
      );
      expect(stmt.run).toHaveBeenCalled();
    });
  });
});
