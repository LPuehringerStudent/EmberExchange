import { TradeService } from '../../backend/services/trade-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { TradeRow } from '../../shared/model';

describe('TradeService', () => {
    let mockUnit: MockUnit;
    let service: TradeService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new TradeService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllTrades', () => {
        it('should return all trades', async () => {
            const mockTrades: TradeRow[] = [
                { tradeId: 1, listingId: 1, buyerId: 2, executedAt: new Date('2024-01-01') },
                { tradeId: 2, listingId: 2, buyerId: 3, executedAt: new Date('2024-01-02') }
            ];
            mockStmt.all.mockReturnValue(mockTrades);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllTrades();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Trade');
            expect(result).toEqual(mockTrades);
        });
    });

    describe('getTradeById', () => {
        it('should return trade when found', async () => {
            const mockTrade: TradeRow = { tradeId: 1, listingId: 1, buyerId: 2, executedAt: new Date('2024-01-01') };
            mockStmt.get.mockReturnValue(mockTrade);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTradeById(1);

            expect(result).toEqual(mockTrade);
        });

        it('should return null when not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTradeById(999);

            expect(result).toBeNull();
        });
    });

    describe('getTradeByListingId', () => {
        it('should return trade for listing', async () => {
            const mockTrade: TradeRow = { tradeId: 1, listingId: 5, buyerId: 2, executedAt: new Date('2024-01-01') };
            mockStmt.get.mockReturnValue(mockTrade);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTradeByListingId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Trade WHERE listingId = @listingId',
                { listingId: 5 }
            );
            expect(result).toEqual(mockTrade);
        });

        it('should return null when no trade for listing', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTradeByListingId(999);

            expect(result).toBeNull();
        });
    });

    describe('getTradesByBuyerId', () => {
        it('should return trades ordered by execution date DESC', async () => {
            const mockTrades: TradeRow[] = [
                { tradeId: 2, listingId: 2, buyerId: 5, executedAt: new Date('2024-02-01') },
                { tradeId: 1, listingId: 1, buyerId: 5, executedAt: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockTrades);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTradesByBuyerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Trade WHERE buyerId = @buyerId ORDER BY executedAt DESC',
                { buyerId: 5 }
            );
            expect(result).toEqual(mockTrades);
        });
    });

    describe('createTrade', () => {
        it('should create trade successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 10 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createTrade(1, 5);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);

            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO Trade');
            expect(params).toEqual({ listingId: 1, buyerId: 5 });

            expect(success).toBe(true);
            expect(id).toBe(10);
        });
    });

    describe('getRecentTrades', () => {
        it('should return recent trades with default limit', async () => {
            const mockTrades: TradeRow[] = [
                { tradeId: 1, listingId: 1, buyerId: 2, executedAt: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockTrades);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getRecentTrades();

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Trade ORDER BY executedAt DESC LIMIT @limit',
                { limit: 10 }
            );
            expect(result).toEqual(mockTrades);
        });

        it('should return recent trades with custom limit', async () => {
            const mockTrades: TradeRow[] = [
                { tradeId: 1, listingId: 1, buyerId: 2, executedAt: new Date('2024-01-01') }
            ];
            mockStmt.all.mockReturnValue(mockTrades);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getRecentTrades(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                expect.any(String),
                { limit: 5 }
            );
            expect(result).toEqual(mockTrades);
        });
    });

    describe('deleteTrade', () => {
        it('should delete trade successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteTrade(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'DELETE FROM Trade WHERE tradeId = @id',
                { id: 1 }
            );
            expect(result).toBe(true);
        });

        it('should return false when trade not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteTrade(999);

            expect(result).toBe(false);
        });
    });

    describe('countTrades', () => {
        it('should return total count', async () => {
            mockStmt.get.mockReturnValue({ count: 100 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countTrades();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM Trade');
            expect(result).toBe(100);
        });

        it('should return 0 when no trades', async () => {
            mockStmt.get.mockReturnValue({ count: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countTrades();

            expect(result).toBe(0);
        });

        it('should return 0 when undefined', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countTrades();

            expect(result).toBe(0);
        });
    });

    describe('countTradesByBuyer', () => {
        it('should return count for specific buyer', async () => {
            mockStmt.get.mockReturnValue({ count: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countTradesByBuyer(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM Trade WHERE buyerId = @buyerId',
                { buyerId: 1 }
            );
            expect(result).toBe(5);
        });

        it('should return 0 when buyer has no trades', async () => {
            mockStmt.get.mockReturnValue({ count: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countTradesByBuyer(999);

            expect(result).toBe(0);
        });
    });
});