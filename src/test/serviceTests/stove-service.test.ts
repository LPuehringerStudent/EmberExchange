import { StoveService } from '../../backend/services/stove-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { StoveRow } from '../../shared/model';

describe('StoveService', () => {
    let mockUnit: MockUnit;
    let service: StoveService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new StoveService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllStoves', () => {
        it('should return all stoves', () => {
            const mockStoves: StoveRow[] = [
                { stoveId: 1, typeId: 1, currentOwnerId: 1, mintedAt: new Date('2024-01-01') },
                { stoveId: 2, typeId: 2, currentOwnerId: 2, mintedAt: new Date('2024-01-02') }
            ];
            mockStmt.all.mockReturnValue(mockStoves);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllStoves();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Stove');
            expect(result).toEqual(mockStoves);
        });
    });

    describe('getStoveById', () => {
        it('should return stove when found', () => {
            const mockStove: StoveRow = { stoveId: 1, typeId: 1, currentOwnerId: 1, mintedAt: new Date('2024-01-01') };
            mockStmt.get.mockReturnValue(mockStove);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveById(1);

            expect(result).toEqual(mockStove);
        });

        it('should return null when stove not found', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveById(999);

            expect(result).toBeNull();
        });
    });

    describe('getStovesByOwnerId', () => {
        it('should return stoves for specific owner', () => {
            const mockStoves: StoveRow[] = [
                { stoveId: 1, typeId: 1, currentOwnerId: 5, mintedAt: new Date('2024-01-01') },
                { stoveId: 2, typeId: 2, currentOwnerId: 5, mintedAt: new Date('2024-01-02') }
            ];
            mockStmt.all.mockReturnValue(mockStoves);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStovesByOwnerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(`SELECT Stove.*, StoveType.imageUrl
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.currentOwnerId = @playerId`, { playerId: 5 });
            expect(result).toEqual(mockStoves);
        });
    });

    describe('getStovesByTypeId', () => {
        it('should return stoves of specific type', () => {
            const mockStoves: StoveRow[] = [{ stoveId: 1, typeId: 3, currentOwnerId: 1, mintedAt: new Date('2024-01-01') }];
            mockStmt.all.mockReturnValue(mockStoves);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStovesByTypeId(3);

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Stove WHERE typeId = @typeId', { typeId: 3 });
            expect(result).toEqual(mockStoves);
        });
    });

    describe('createStove', () => {
        it('should create stove successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 10 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createStove(1, 5);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);
            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO Stove');
            expect(params).toEqual({ typeId: 1, currentOwnerId: 5 });
            expect(success).toBe(true);
            expect(id).toBe(10);
        });
    });

    describe('updateOwner', () => {
        it('should update owner successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updateOwner(1, 10);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'UPDATE Stove SET currentOwnerId = @newOwnerId WHERE stoveId = @id',
                { id: 1, newOwnerId: 10 }
            );
            expect(result).toBe(true);
        });

        it('should return false when stove not found', () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updateOwner(999, 10);

            expect(result).toBe(false);
        });
    });

    describe('deleteStove', () => {
        it('should delete stove successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteStove(1);

            expect(result).toBe(true);
        });

        it('should return false when stove not found', () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteStove(999);

            expect(result).toBe(false);
        });
    });

    describe('countStovesByOwner', () => {
        it('should return correct count', () => {
            mockStmt.get.mockReturnValue({ count: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesByOwner(1);

            expect(result).toBe(5);
        });

        it('should return 0 when result is undefined', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesByOwner(1);

            expect(result).toBe(0);
        });

        it('should return 0 when count is undefined', () => {
            mockStmt.get.mockReturnValue({});
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesByOwner(1);

            expect(result).toBe(0);
        });
    });

    describe('countStovesByType', () => {
        it('should return correct count for type', () => {
            mockStmt.get.mockReturnValue({ count: 3 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesByType(2);

            expect(result).toBe(3);
        });
    });
});