import { OwnershipService } from '../../backend/services/ownership-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { OwnershipRow } from '../../shared/model';

describe('OwnershipService', () => {
    let mockUnit: MockUnit;
    let service: OwnershipService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new OwnershipService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllOwnerships', () => {
        it('should return all ownership records', async () => {
            const mockOwnerships: OwnershipRow[] = [
                { ownershipId: 1, stoveId: 1, playerId: 1, acquiredAt: new Date('2024-01-01'), acquiredHow: 'lootbox' },
                { ownershipId: 2, stoveId: 2, playerId: 2, acquiredAt: new Date('2024-01-02'), acquiredHow: 'trade' }
            ];
            mockStmt.all.mockReturnValue(mockOwnerships);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllOwnerships();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Ownership');
            expect(result).toEqual(mockOwnerships);
        });
    });

    describe('getOwnershipById', () => {
        it('should return ownership when found', async () => {
            const mockOwnership: OwnershipRow = { ownershipId: 1, stoveId: 1, playerId: 1, acquiredAt: new Date('2024-01-01'), acquiredHow: 'lootbox' };
            mockStmt.get.mockReturnValue(mockOwnership);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getOwnershipById(1);

            expect(result).toEqual(mockOwnership);
        });

        it('should return null when not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getOwnershipById(999);

            expect(result).toBeNull();
        });
    });

    describe('getOwnershipHistoryByStoveId', () => {
        it('should return ownership history ordered by acquisition date ASC', async () => {
            const mockHistory: OwnershipRow[] = [
                { ownershipId: 1, stoveId: 5, playerId: 1, acquiredAt: new Date('2024-01-01'), acquiredHow: 'lootbox' },
                { ownershipId: 2, stoveId: 5, playerId: 2, acquiredAt: new Date('2024-02-01'), acquiredHow: 'trade' }
            ];
            mockStmt.all.mockReturnValue(mockHistory);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getOwnershipHistoryByStoveId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Ownership WHERE stoveId = @stoveId ORDER BY acquiredAt ASC',
                { stoveId: 5 }
            );
            expect(result).toEqual(mockHistory);
        });
    });

    describe('getOwnershipsByPlayerId', () => {
        it('should return player ownerships ordered by date DESC', async () => {
            const mockOwnerships: OwnershipRow[] = [
                { ownershipId: 2, stoveId: 2, playerId: 5, acquiredAt: new Date('2024-02-01'), acquiredHow: 'trade' },
                { ownershipId: 1, stoveId: 1, playerId: 5, acquiredAt: new Date('2024-01-01'), acquiredHow: 'lootbox' }
            ];
            mockStmt.all.mockReturnValue(mockOwnerships);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getOwnershipsByPlayerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Ownership WHERE playerId = @playerId ORDER BY acquiredAt DESC',
                { playerId: 5 }
            );
            expect(result).toEqual(mockOwnerships);
        });
    });

    describe('createOwnership', () => {
        it('should create ownership with lootbox acquisition', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 10 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createOwnership(1, 5, 'lootbox');

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);

            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO Ownership');
            expect(params).toEqual({
                stoveId: 1,
                playerId: 5,
                acquiredHow: 'lootbox'
            });
            expect(success).toBe(true);
            expect(id).toBe(10);
        });

        it('should create ownership with trade acquisition', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 11 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createOwnership(2, 5, 'trade');

            expect(success).toBe(true);
            expect(id).toBe(11);
        });

        it('should create ownership with mini-game acquisition', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 12 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createOwnership(3, 5, 'mini-game');

            expect(success).toBe(true);
            expect(id).toBe(12);
        });
    });

    describe('getCurrentOwnership', () => {
        it('should return most recent ownership for stove', async () => {
            const mockOwnership: OwnershipRow = { ownershipId: 2, stoveId: 1, playerId: 5, acquiredAt: new Date('2024-02-01'), acquiredHow: 'trade' };
            mockStmt.get.mockReturnValue(mockOwnership);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getCurrentOwnership(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Ownership WHERE stoveId = @stoveId ORDER BY acquiredAt DESC LIMIT 1',
                { stoveId: 1 }
            );
            expect(result).toEqual(mockOwnership);
        });

        it('should return null when no ownership records', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getCurrentOwnership(999);

            expect(result).toBeNull();
        });
    });

    describe('deleteOwnership', () => {
        it('should delete ownership successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteOwnership(1);

            expect(result).toBe(true);
        });

        it('should return false when ownership not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteOwnership(999);

            expect(result).toBe(false);
        });
    });

    describe('countOwnershipChanges', () => {
        it('should return correct count', async () => {
            mockStmt.get.mockReturnValue({ count: 3 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countOwnershipChanges(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM Ownership WHERE stoveId = @stoveId',
                { stoveId: 1 }
            );
            expect(result).toBe(3);
        });

        it('should return 0 when undefined', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countOwnershipChanges(1);

            expect(result).toBe(0);
        });
    });

    describe('countStovesAcquiredByPlayer', () => {
        it('should return correct count', async () => {
            mockStmt.get.mockReturnValue({ count: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesAcquiredByPlayer(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT COUNT(*) as count FROM Ownership WHERE playerId = @playerId',
                { playerId: 1 }
            );
            expect(result).toBe(5);
        });

        it('should return 0 when player has no acquisitions', async () => {
            mockStmt.get.mockReturnValue({ count: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.countStovesAcquiredByPlayer(1);

            expect(result).toBe(0);
        });
    });
});