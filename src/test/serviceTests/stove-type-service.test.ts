import { StoveTypeService } from '../../backend/services/stove-type-service';
import { MockUnit, createMockUnit } from '../../backend/__mocks__/unit';
import { StoveTypeRow, Rarity } from '../../shared/model';

describe('StoveTypeService', () => {
    let mockUnit: MockUnit;
    let service: StoveTypeService;
    let mockStmt: any;

    beforeEach(() => {
        mockUnit = createMockUnit();
        service = new StoveTypeService(mockUnit as any);
        mockStmt = {
            all: jest.fn(),
            get: jest.fn(),
            run: jest.fn()
        };
    });

    describe('getAllStoveTypes', () => {
        it('should return all stove types', async () => {
            const mockTypes: StoveTypeRow[] = [
                { typeId: 1, name: 'Basic Stove', imageUrl: '/img/basic.png', rarity: Rarity.COMMON, lootboxWeight: 100 },
                { typeId: 2, name: 'Rare Stove', imageUrl: '/img/rare.png', rarity: Rarity.RARE, lootboxWeight: 50 }
            ];
            mockStmt.all.mockReturnValue(mockTypes);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getAllStoveTypes();

            expect(result).toEqual(mockTypes);
        });
    });

    describe('getStoveTypeById', () => {
        it('should return stove type when found', async () => {
            const mockType: StoveTypeRow = { typeId: 1, name: 'Test Stove', imageUrl: '/img/test.png', rarity: Rarity.COMMON, lootboxWeight: 100 };
            mockStmt.get.mockReturnValue(mockType);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveTypeById(1);

            expect(result).toEqual(mockType);
        });

        it('should return null when not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveTypeById(999);

            expect(result).toBeNull();
        });
    });

    describe('getStoveTypesByRarity', () => {
        it('should filter by rarity correctly', async () => {
            const mockTypes: StoveTypeRow[] = [
                { typeId: 1, name: 'Legendary Stove', imageUrl: '/img/leg.png', rarity: Rarity.LEGENDARY, lootboxWeight: 5 }
            ];
            mockStmt.all.mockReturnValue(mockTypes);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveTypesByRarity(Rarity.LEGENDARY);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM StoveType WHERE rarity = @rarity',
                { rarity: Rarity.LEGENDARY }
            );
            expect(result).toEqual(mockTypes);
        });

        it('should handle all rarity types', async () => {
            const rarities = [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.LIMITED];

            rarities.forEach(rarity => {
                mockStmt.all.mockReturnValue([]);
                mockUnit.prepare.mockReturnValue(mockStmt);

                service.getStoveTypesByRarity(rarity);

                expect(mockUnit.prepare).toHaveBeenCalledWith(
                    expect.any(String),
                    { rarity }
                );
            });
        });
    });

    describe('createStoveType', () => {
        it('should create stove type successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1, lastInsertRowid: 5 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const [success, id] = service.createStoveType('New Stove', '/img/new.png', Rarity.RARE, 75);

            expect(mockUnit.prepare).toHaveBeenCalledTimes(1);
            const [sql, params] = mockUnit.prepare.mock.calls[0];
            expect(sql).toContain('INSERT');
            expect(sql).toContain('INTO StoveType');
            expect(params).toEqual({
                name: 'New Stove',
                imageUrl: '/img/new.png',
                rarity: Rarity.RARE,
                lootboxWeight: 75
            });
            expect(success).toBe(true);
            expect(id).toBe(5);
        });
    });

    describe('updateLootboxWeight', () => {
        it('should update weight successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updateLootboxWeight(1, 200);

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'UPDATE StoveType SET lootboxWeight = @lootboxWeight WHERE typeId = @id',
                { id: 1, lootboxWeight: 200 }
            );
            expect(result).toBe(true);
        });

        it('should return false when type not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updateLootboxWeight(999, 200);

            expect(result).toBe(false);
        });
    });

    describe('updateImageUrl', () => {
        it('should update image URL successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.updateImageUrl(1, '/img/updated.png');

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'UPDATE StoveType SET imageUrl = @imageUrl WHERE typeId = @id',
                { id: 1, imageUrl: '/img/updated.png' }
            );
            expect(result).toBe(true);
        });
    });

    describe('deleteStoveType', () => {
        it('should delete successfully', async () => {
            mockStmt.run.mockReturnValue({ changes: 1 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteStoveType(1);

            expect(result).toBe(true);
        });

        it('should return false when type not found', async () => {
            mockStmt.run.mockReturnValue({ changes: 0 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.deleteStoveType(999);

            expect(result).toBe(false);
        });
    });

    describe('getStoveTypeByName', () => {
        it('should find by name', async () => {
            const mockType: StoveTypeRow = { typeId: 1, name: 'Unique Stove', imageUrl: '/img/uni.png', rarity: Rarity.LIMITED, lootboxWeight: 1 };
            mockStmt.get.mockReturnValue(mockType);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveTypeByName('Unique Stove');

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT * FROM StoveType WHERE name = @name',
                { name: 'Unique Stove' }
            );
            expect(result).toEqual(mockType);
        });

        it('should return null when name not found', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getStoveTypeByName('NonExistent');

            expect(result).toBeNull();
        });
    });

    describe('getTotalLootboxWeight', () => {
        it('should return total weight', async () => {
            mockStmt.get.mockReturnValue({ total: 1000 });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTotalLootboxWeight();

            expect(mockUnit.prepare).toHaveBeenCalledWith(
                'SELECT SUM(lootboxWeight) as total FROM StoveType'
            );
            expect(result).toBe(1000);
        });

        it('should return 0 when no types exist', async () => {
            mockStmt.get.mockReturnValue(undefined);
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTotalLootboxWeight();

            expect(result).toBe(0);
        });

        it('should return 0 when total is null', async () => {
            mockStmt.get.mockReturnValue({ total: null });
            mockUnit.prepare.mockReturnValue(mockStmt);

            const result = service.getTotalLootboxWeight();

            expect(result).toBe(0);
        });
    });
});