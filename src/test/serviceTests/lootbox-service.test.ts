import { LootboxService } from '../../backend/services/lootbox-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { LootboxRow, LootboxTypeRow, LootboxDropRow } from '../../shared/model';

describe('LootboxService', () => {
    let mockUnit: MockUnit;
    let service: LootboxService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new LootboxService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllLootboxes', () => {
        it('should return all lootboxes', () => {
            const mockLootboxes: LootboxRow[] = [
                { lootboxId: 1, lootboxTypeId: 1, playerId: 1, openedAt: new Date('2024-01-01'), acquiredHow: 'free' },
                { lootboxId: 2, lootboxTypeId: 2, playerId: 2, openedAt: new Date('2024-01-02'), acquiredHow: 'purchase' }
            ];
            mockStmt.all.mockReturnValue(mockLootboxes);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllLootboxes();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM Lootbox');
            expect(result).toEqual(mockLootboxes);
        });
    });

    describe('getLootboxById', () => {
        it('should return lootbox when found', () => {
            const mockLootbox: LootboxRow = { lootboxId: 1, lootboxTypeId: 1, playerId: 1, openedAt: new Date('2024-01-01'), acquiredHow: 'free' };
            mockStmt.get.mockReturnValue(mockLootbox);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getLootboxById(1);

            expect(result).toEqual(mockLootbox);
        });

        it('should return null when not found', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getLootboxById(999);

            expect(result).toBeNull();
        });
    });

    describe('getLootboxesByPlayerId', () => {
        it('should return unopened lootboxes for specific player', () => {
            const mockLootboxes: LootboxRow[] = [
                { lootboxId: 1, lootboxTypeId: 1, playerId: 5, openedAt: null, acquiredHow: 'free' }
            ];
            const countStmt = { get: jest.fn().mockReturnValue({ lootboxCount: 1 }) };
            mockStmt.all.mockReturnValueOnce(mockLootboxes);
            mockUnit.prepare
                .mockReturnValueOnce(mockStmt)
                .mockReturnValueOnce(countStmt);

            const result = service.getLootboxesByPlayerId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM Lootbox WHERE playerId = @playerId AND openedAt IS NULL',
                { playerId: 5 }
            );
            expect(result).toEqual(mockLootboxes);
        });
    });

    describe('createLootbox', () => {
        it('should create lootbox with free acquisition and increment player count', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 10 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createLootbox(1, 5, 'free');

            expect(mockUnit.prepare).toHaveBeenCalledTimes(2); // INSERT Lootbox + UPDATE Player
            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO Lootbox');
            expect(params).toEqual({ lootboxTypeId: 1, playerId: 5, acquiredHow: 'free' });
            expect(success).toBe(true);
            expect(id).toBe(10);
        });

        it('should create lootbox with purchase acquisition and increment player count', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 11 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createLootbox(2, 5, 'purchase');

            expect(mockUnit.prepare).toHaveBeenCalledTimes(2);
            expect(success).toBe(true);
            expect(id).toBe(11);
        });

        it('should create lootbox with reward acquisition', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 12 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createLootbox(1, 5, 'reward');

            expect(success).toBe(true);
            expect(id).toBe(12);
        });
    });

    describe('getAllLootboxTypes', () => {
        it('should return all lootbox types', () => {
            const mockTypes: LootboxTypeRow[] = [
                { lootboxTypeId: 1, name: 'Standard', description: 'A standard box', costCoins: 0, costFree: true, dailyLimit: null, isAvailable: true },
                { lootboxTypeId: 2, name: 'Premium', description: 'A premium box', costCoins: 500, costFree: false, dailyLimit: 3, isAvailable: true }
            ];
            mockStmt.all.mockReturnValue(mockTypes);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllLootboxTypes();

            expect(result).toEqual(mockTypes);
        });
    });

    describe('getLootboxTypeById', () => {
        it('should return type when found', () => {
            const mockType: LootboxTypeRow = { lootboxTypeId: 1, name: 'Standard', description: 'A box', costCoins: 0, costFree: true, dailyLimit: null, isAvailable: true };
            mockStmt.get.mockReturnValue(mockType);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getLootboxTypeById(1);

            expect(result).toEqual(mockType);
        });

        it('should return null when not found', () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getLootboxTypeById(999);

            expect(result).toBeNull();
        });
    });

    describe('getAvailableLootboxTypes', () => {
        it('should return only available types', () => {
            const mockTypes: LootboxTypeRow[] = [
                { lootboxTypeId: 1, name: 'Standard', description: 'A box', costCoins: 0, costFree: true, dailyLimit: null, isAvailable: true }
            ];
            mockStmt.all.mockReturnValue(mockTypes);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAvailableLootboxTypes();

            expect(mockUnit.prepare).toHaveBeenCalledWith('SELECT * FROM LootboxType WHERE isAvailable = 1');
            expect(result).toEqual(mockTypes);
        });
    });

    describe('getDropsByLootboxId', () => {
        it('should return drops for lootbox', () => {
            const mockDrops: LootboxDropRow[] = [
                { dropId: 1, lootboxId: 5, stoveId: 10 }
            ];
            mockStmt.all.mockReturnValue(mockDrops);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getDropsByLootboxId(5);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM LootboxDrop WHERE lootboxId = @lootboxId',
                { lootboxId: 5 }
            );
            expect(result).toEqual(mockDrops);
        });
    });

    describe('createLootboxDrop', () => {
        it('should create drop successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 20 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createLootboxDrop(5, 10);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);
            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO LootboxDrop');
            expect(params).toEqual({ lootboxId: 5, stoveId: 10 });
            expect(success).toBe(true);
            expect(id).toBe(20);
        });
    });

    describe('deleteLootbox', () => {
        it('should delete lootbox successfully', () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteLootbox(1);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'DELETE FROM Lootbox WHERE lootboxId = @id',
                { id: 1 }
            );
            expect(result).toBe(true);
        });

        it('should return false when lootbox not found', () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteLootbox(999);

            expect(result).toBe(false);
        });
    });
});