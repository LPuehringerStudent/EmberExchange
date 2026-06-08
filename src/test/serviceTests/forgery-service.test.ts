import { ForgeryService } from '../../backend/services/forgery-service';
import { Unit } from '../../backend/utils/unit';
import { Rarity } from '../../shared/model';

function mockStmt(getResult: unknown = null, allResult: unknown[] = [], runResult = { changes: 1 }) {
    return {
        get: jest.fn().mockResolvedValue(getResult),
        all: jest.fn().mockResolvedValue(allResult),
        run: jest.fn().mockResolvedValue(runResult),
    };
}

function mockUnitSequence(stmts: ReturnType<typeof mockStmt>[]) {
    let callIndex = 0;
    return {
        prepare: jest.fn().mockImplementation(() => {
            const stmt = stmts[Math.min(callIndex, stmts.length - 1)];
            callIndex++;
            return stmt;
        }),
        getLastRowId: jest.fn().mockResolvedValue(99),
    } as unknown as Unit;
}

const makeInputStove = (stoveId: number, rarity: Rarity, collection: string, heatLevel: number) => ({
    stoveId,
    typeId: stoveId + 100,
    currentOwnerId: 1,
    mintedAt: new Date(),
    heatLevel,
    name: `Stove ${stoveId}`,
    rarity,
    collection,
    minHeat: 0.0,
    maxHeat: 1.0,
});

const outputType = {
    typeId: 200,
    name: 'Upgraded Stove',
    imageUrl: '/assets/upgraded.png',
    rarity: Rarity.RARE,
    lootboxWeight: 10,
    collection: 'Industrial',
    minHeat: 0.0,
    maxHeat: 0.85,
};

describe('ForgeryService', () => {
    describe('input validation', () => {
        it('rejects fewer than 6 stoves', async () => {
            const unit = mockUnitSequence([]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Exactly 6 stoves');
        });

        it('rejects more than 6 stoves', async () => {
            const unit = mockUnitSequence([]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6, 7]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Exactly 6 stoves');
        });

        it('rejects when a stove is not owned', async () => {
            const inputs = [
                makeInputStove(1, Rarity.COMMON, 'Industrial', 0.1),
                makeInputStove(2, Rarity.COMMON, 'Industrial', 0.2),
                makeInputStove(3, Rarity.COMMON, 'Industrial', 0.3),
                makeInputStove(4, Rarity.COMMON, 'Industrial', 0.4),
                makeInputStove(5, Rarity.COMMON, 'Industrial', 0.5),
            ];
            // Only 5 returned — stoveId 6 missing
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
            ]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('not owned');
        });

        it('rejects mixed rarities', async () => {
            const inputs = [
                makeInputStove(1, Rarity.COMMON, 'Industrial', 0.1),
                makeInputStove(2, Rarity.COMMON, 'Industrial', 0.2),
                makeInputStove(3, Rarity.COMMON, 'Industrial', 0.3),
                makeInputStove(4, Rarity.COMMON, 'Industrial', 0.4),
                makeInputStove(5, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(6, Rarity.RARE, 'Industrial', 0.6),
            ];
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
            ]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('same rarity');
        });

        it('rejects Legendary stoves as input', async () => {
            const inputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.LEGENDARY, 'Special', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
            ]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot forge Legendary, Limited, or Secret');
        });

        it('rejects Limited stoves as input', async () => {
            const inputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.LIMITED, 'Special', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
            ]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot forge Legendary, Limited, or Secret');
        });

        it('rejects Secret stoves as input', async () => {
            const inputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.SECRET, 'Nature', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
            ]);
            const service = new ForgeryService(unit);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot forge Legendary, Limited, or Secret');
        });
    });

    describe('successful forge', () => {
        it('forges 6 Common stoves into 1 Rare', async () => {
            const inputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.COMMON, 'Industrial', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, inputs),        // fetch inputs
                mockStmt(null, [outputType]),  // fetch output types
                mockStmt(),                    // cleanup lootboxdrop
                mockStmt(),                    // delete inputs
                mockStmt(),                    // insert new stove
                mockStmt(),                    // insert ownership
                mockStmt(),                    // update stats
            ]);
            const service = new ForgeryService(unit, () => 0); // deterministic random
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(true);
            expect(result.newStove).toBeDefined();
            expect(result.newStove!.rarity).toBe(Rarity.RARE);
            expect(result.newStove!.stoveId).toBe(99);
        });

        it('selects output collection by weighted mix', async () => {
            // 4 Industrial + 2 Nature → 66.7% Industrial, 33.3% Nature
            const inputs = [
                ...Array.from({ length: 4 }, (_, i) => makeInputStove(i + 1, Rarity.COMMON, 'Industrial', 0.1)),
                ...Array.from({ length: 2 }, (_, i) => makeInputStove(i + 5, Rarity.COMMON, 'Nature', 0.2)),
            ];
            const natureType = { ...outputType, collection: 'Nature', typeId: 201 };
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
                mockStmt(null, [natureType]),
                mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(),
            ]);
            // random=0.5 → roll=3.0 → cumulative: Industrial=4 (hit), Nature=6
            // Actually with roll=0.5*6=3.0: Industrial(4) >= 3.0, so Industrial wins
            // Let's use random=0.8 → roll=4.8 → Industrial(4) < 4.8, so Nature wins
            const service = new ForgeryService(unit, () => 0.8);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(true);
            expect(result.newStove!.collection).toBe('Nature');
        });

        it('calculates output heatLevel correctly', async () => {
            const inputs = [
                makeInputStove(1, Rarity.COMMON, 'Industrial', 0.0),
                makeInputStove(2, Rarity.COMMON, 'Industrial', 0.0),
                makeInputStove(3, Rarity.COMMON, 'Industrial', 0.0),
                makeInputStove(4, Rarity.COMMON, 'Industrial', 0.0),
                makeInputStove(5, Rarity.COMMON, 'Industrial', 0.0),
                makeInputStove(6, Rarity.COMMON, 'Industrial', 0.0),
            ];
            // outputType.maxHeat = 0.85, minHeat = 0.0
            // avgHeat = 0.0 → outputHeat = 0.0 * (0.85 - 0.0) + 0.0 = 0.0
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
                mockStmt(null, [outputType]),
                mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(),
            ]);
            const service = new ForgeryService(unit, () => 0);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(true);
            expect(result.newStove!.heatLevel).toBeCloseTo(0.0, 5);
        });

        it('calculates output heatLevel with non-zero average', async () => {
            const inputs = [
                makeInputStove(1, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(2, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(3, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(4, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(5, Rarity.COMMON, 'Industrial', 0.5),
                makeInputStove(6, Rarity.COMMON, 'Industrial', 0.5),
            ];
            // avgHeat = 0.5
            // outputType.maxHeat = 0.85, minHeat = 0.0
            // outputHeat = 0.5 * (0.85 - 0.0) + 0.0 = 0.425
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
                mockStmt(null, [outputType]),
                mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(),
            ]);
            const service = new ForgeryService(unit, () => 0);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(true);
            expect(result.newStove!.heatLevel).toBeCloseTo(0.425, 5);
        });

        it('upgrades Epic → Legendary', async () => {
            const epicInputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.EPIC, 'Dragon', 0.1)
            );
            const legendaryType = {
                typeId: 300,
                name: 'Dragon Lord',
                imageUrl: '/assets/dragon-lord.png',
                rarity: Rarity.LEGENDARY,
                lootboxWeight: 5,
                collection: 'Dragon',
                minHeat: 0.0,
                maxHeat: 0.55,
            };
            const unit = mockUnitSequence([
                mockStmt(null, epicInputs),
                mockStmt(null, [legendaryType]),
                mockStmt(), mockStmt(), mockStmt(), mockStmt(), mockStmt(),
            ]);
            const service = new ForgeryService(unit, () => 0);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(true);
            expect(result.newStove!.rarity).toBe(Rarity.LEGENDARY);
        });

        it('rejects Legendary → Limited upgrade', async () => {
            const legendaryInputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.LEGENDARY, 'Special', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, legendaryInputs),
            ]);
            const service = new ForgeryService(unit, () => 0);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cannot forge Legendary, Limited, or Secret');
        });
    });

    describe('error when no output types available', () => {
        it('returns error if target collection has no stoves at output rarity', async () => {
            const inputs = Array.from({ length: 6 }, (_, i) =>
                makeInputStove(i + 1, Rarity.COMMON, 'Industrial', 0.1)
            );
            const unit = mockUnitSequence([
                mockStmt(null, inputs),
                mockStmt(null, []), // no output types available
            ]);
            const service = new ForgeryService(unit, () => 0);
            const result = await service.forge(1, [1, 2, 3, 4, 5, 6]);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No rare stoves available');
        });
    });
});
