import { PriceHistoryService } from '../../backend/services/price-history-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { PriceHistoryRow } from '../../shared/model';

describe('PriceHistoryService', () => {
    let mockUnit: MockUnit;
    let service: PriceHistoryService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new PriceHistoryService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllPriceHistory', () => {
        it('should return all price history records', async () => {
            const mockHistory: PriceHistoryRow[] = [
                { historyId: 1, typeId: 1, salePrice: 100, saleDate: new Date('2024-01-01') },
                { historyId: 2, typeId: 2, salePrice: 200, saleDate: new Date('2024-01-02') }
            ];
            mockStmt.all.mockReturnValue(mockHistory);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllPriceHistory();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM PriceHistory');
            expect(result).toEqual(mockHistory);
        });
    });

    describe('getPriceHistoryById', () => {
        it('should return record when found', async () => {
            const mockRecord: PriceHistoryRow = { historyId: 1, typeId: 1, salePrice: 100, saleDate: new Date('2024-01-01') };
            mockStmt.get.mockReturnValue(mockRecord);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPriceHistoryById(1);

            expect(result).toEqual(mockRecord);
        });

        it('should return null when not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPriceHistoryById(999);

            expect(result).toBeNull();
        });
    });

    describe('getPriceHistoryByTypeId', () => {
        it('should return history ordered by sale date DESC', async () => {
            const mockHistory: PriceHistoryRow[] = [
                { historyId: 2, typeId: 1, salePrice: 200, saleDate: new Date('2024-02-01') },
                { historyId: 1, typeId: 1, salePrice: 100, saleDate: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockHistory);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getPriceHistoryByTypeId(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM PriceHistory WHERE typeId = @typeId ORDER BY saleDate DESC',
                { typeId: 1 }
            );
            expect(result).toEqual(mockHistory);
        });
    });

    describe('recordSale', () => {
        it('should record sale successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 10 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.recordSale(1, 500);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);

            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO PriceHistory');
            expect(params).toEqual({
                typeId: 1,
                salePrice: 500,
            });

            expect(success).toBe(true);
            expect(id).toBe(10);
        });
    });

    describe('getAveragePrice', () => {
        it('should return average price', async () => {
            mockStmt.get.mockReturnValue({ average: 150.5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAveragePrice(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT AVG(salePrice) as average FROM PriceHistory WHERE typeId = @typeId',
                { typeId: 1 }
            );
            expect(result).toBe(150.5);
        });

        it('should return 0 when no sales', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAveragePrice(1);

            expect(result).toBe(0);
        });

        it('should return 0 when average is null', async () => {
            mockStmt.get.mockReturnValue({ average: null });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAveragePrice(1);

            expect(result).toBe(0);
        });
    });

    describe('getMinPrice', () => {
        it('should return minimum price', async () => {
            mockStmt.get.mockReturnValue({ min: 50 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getMinPrice(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT MIN(salePrice) as min FROM PriceHistory WHERE typeId = @typeId',
                { typeId: 1 }
            );
            expect(result).toBe(50);
        });

        it('should return 0 when no sales', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getMinPrice(1);

            expect(result).toBe(0);
        });
    });

    describe('getMaxPrice', () => {
        it('should return maximum price', async () => {
            mockStmt.get.mockReturnValue({ max: 500 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getMaxPrice(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT MAX(salePrice) as max FROM PriceHistory WHERE typeId = @typeId',
                { typeId: 1 }
            );
            expect(result).toBe(500);
        });

        it('should return 0 when no sales', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getMaxPrice(1);

            expect(result).toBe(0);
        });
    });

    describe('getRecentPrices', () => {
        it('should return recent prices with default limit', async () => {
            const mockHistory: PriceHistoryRow[] = [
                { historyId: 1, typeId: 1, salePrice: 100, saleDate: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockHistory);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getRecentPrices(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM PriceHistory WHERE typeId = @typeId ORDER BY saleDate DESC LIMIT @limit',
                { typeId: 1, limit: 10 }
            );
            expect(result).toEqual(mockHistory);
        });

        it('should return recent prices with custom limit', async () => {
            const mockHistory: PriceHistoryRow[] = [
                { historyId: 1, typeId: 1, salePrice: 100, saleDate: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockHistory);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getRecentPrices(1, 5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                expect.any(String),
                { typeId: 1, limit: 5 }
            );
            expect(result).toEqual(mockHistory);
        });
    });

    describe('countSales', () => {
        it('should return correct count', async () => {
            mockStmt.get.mockReturnValue({ count: 15 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countSales(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM PriceHistory WHERE typeId = @typeId',
                { typeId: 1 }
            );
            expect(result).toBe(15);
        });

        it('should return 0 when undefined', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countSales(1);

            expect(result).toBe(0);
        });
    });

    describe('deletePriceHistory', () => {
        it('should delete record successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deletePriceHistory(1);

            expect(result).toBe(true);
        });

        it('should return false when record not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deletePriceHistory(999);

            expect(result).toBe(false);
        });
    });
});