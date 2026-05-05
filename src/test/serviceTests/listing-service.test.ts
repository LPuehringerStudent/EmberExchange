import { ListingService } from '../../backend/services/listing-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { ListingRow } from '../../shared/model';

describe('ListingService', () => {
    let mockUnit: MockUnit;
    let service: ListingService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new ListingService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllListings', () => {
        it('should return all listings', async () => {
            const mockListings: ListingRow[] = [
                { listingId: 1, sellerId: 1, stoveId: 1, price: 100, listedAt: new Date('2024-01-01'), status: 'active' },
                { listingId: 2, sellerId: 2, stoveId: 2, price: 200, listedAt: new Date('2024-01-02'), status: 'sold' }
            ];
            mockStmt.all.mockReturnValue(mockListings);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllListings();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Listing');
            expect(result).toEqual(mockListings);
        });
    });

    describe('getListingById', () => {
        it('should return listing when found', async () => {
            const mockListing: ListingRow = { listingId: 1, sellerId: 1, stoveId: 1, price: 100, listedAt: new Date('2024-01-01'), status: 'active' };
            mockStmt.get.mockReturnValue(mockListing);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getListingById(1);

            expect(result).toEqual(mockListing);
        });

        it('should return null when not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getListingById(999);

            expect(result).toBeNull();
        });
    });

    describe('getActiveListings', () => {
        it('should return only active listings ordered by listedAt DESC', async () => {
            const mockListings: ListingRow[] = [
                { listingId: 2, sellerId: 2, stoveId: 2, price: 200, listedAt: new Date('2024-01-02'), status: 'active' },
                { listingId: 1, sellerId: 1, stoveId: 1, price: 100, listedAt: new Date('2024-01-01'), status: 'active' }
            ];
            mockStmt.all.mockReturnValue(mockListings);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getActiveListings();

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "SELECT * FROM Listing WHERE status = 'active' ORDER BY listedAt DESC"
            );
            expect(result).toEqual(mockListings);
        });
    });

    describe('getListingsBySellerId', () => {
        it('should return seller listings ordered by date', async () => {
            const mockListings: ListingRow[] = [
                { listingId: 1, sellerId: 5, stoveId: 1, price: 100, listedAt: new Date('2024-01-01'), status: 'active' }
            ];
            mockStmt.all.mockReturnValue(mockListings);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getListingsBySellerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Listing WHERE sellerId = @sellerId ORDER BY listedAt DESC',
                { sellerId: 5 }
            );
            expect(result).toEqual(mockListings);
        });
    });

    describe('getActiveListingsBySellerId', () => {
        it('should return only active listings for seller', async () => {
            const mockListings: ListingRow[] = [
                { listingId: 1, sellerId: 5, stoveId: 1, price: 100, listedAt: new Date('2024-01-01'), status: 'active' }
            ];
            mockStmt.all.mockReturnValue(mockListings);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getActiveListingsBySellerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "SELECT * FROM Listing WHERE sellerId = @sellerId AND status = 'active' ORDER BY listedAt DESC",
                { sellerId: 5 }
            );
            expect(result).toEqual(mockListings);
        });
    });

    describe('getActiveListingByStoveId', () => {
        it('should return active listing for stove', async () => {
            const mockListing: ListingRow = { listingId: 1, sellerId: 1, stoveId: 10, price: 100, listedAt: new Date('2024-01-01'), status: 'active' };
            mockStmt.get.mockReturnValue(mockListing);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getActiveListingByStoveId(10);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "SELECT * FROM Listing WHERE stoveId = @stoveId AND status = 'active'",
                { stoveId: 10 }
            );
            expect(result).toEqual(mockListing);
        });

        it('should return null when no active listing', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getActiveListingByStoveId(999);

            expect(result).toBeNull();
        });
    });

    describe('createListing', () => {
        it('should create listing with active status and current timestamp', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createListing(1, 10, 500);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);
            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO Listing');
            expect(params).toEqual({ sellerId: 1, stoveId: 10, price: 500 });
            expect(success).toBe(true);
            expect(id).toBe(5);
        });
    });

    describe('updatePrice', () => {
        it('should update price for active listing', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updatePrice(1, 750);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "UPDATE Listing SET price = @price WHERE listingId = @id AND status = 'active'",
                { id: 1, price: 750 }
            );
            expect(result).toBe(true);
        });

        it('should return false when listing not active or not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updatePrice(999, 750);

            expect(result).toBe(false);
        });
    });

    describe('markAsSold', () => {
        it('should mark listing as sold', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.markAsSold(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "UPDATE Listing SET status = 'sold' WHERE listingId = @id",
                { id: 1 }
            );
            expect(result).toBe(true);
        });

        it('should return false when listing not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.markAsSold(999);

            expect(result).toBe(false);
        });
    });

    describe('cancelListing', () => {
        it('should cancel active listing', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.cancelListing(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "UPDATE Listing SET status = 'cancelled' WHERE listingId = @id AND status = 'active'",
                { id: 1 }
            );
            expect(result).toBe(true);
        });

        it('should return false when listing not active', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.cancelListing(1);

            expect(result).toBe(false);
        });
    });

    describe('deleteListing', () => {
        it('should delete listing', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteListing(1);

            expect(result).toBe(true);
        });

        it('should return false when listing not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteListing(999);

            expect(result).toBe(false);
        });
    });

    describe('isStoveListed', () => {
        it('should return true when stove has active listing', async () => {
            mockStmt.get.mockReturnValue({ count: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.isStoveListed(10);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                "SELECT COUNT(*) as count FROM Listing WHERE stoveId = @stoveId AND status = 'active'",
                { stoveId: 10 }
            );
            expect(result).toBe(true);
        });

        it('should return false when stove has no active listing', async () => {
            mockStmt.get.mockReturnValue({ count: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.isStoveListed(10);

            expect(result).toBe(false);
        });

        it('should return false when result is undefined', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.isStoveListed(10);

            expect(result).toBe(false);
        });
    });

    describe('countActiveListingsBySeller', () => {
        it('should return correct count', async () => {
            mockStmt.get.mockReturnValue({ count: 3 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countActiveListingsBySeller(1);

            expect(result).toBe(3);
        });

        it('should return 0 when seller has no active listings', async () => {
            mockStmt.get.mockReturnValue({ count: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countActiveListingsBySeller(1);

            expect(result).toBe(0);
        });

        it('should return 0 when result is undefined', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countActiveListingsBySeller(1);

            expect(result).toBe(0);
        });
    });
});