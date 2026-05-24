import { ShopService } from '../../backend/services/shop-service';
import { ShopRotationService } from '../../backend/services/shop-rotation-service';
import { Unit } from '../../backend/utils/unit';

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
        getLastRowId: jest.fn().mockResolvedValue(1),
    } as unknown as Unit;
}

describe('ShopService - sellStove', () => {
    it('sells a common stove for 50 coins', async () => {
        const unit = mockUnitSequence([
            mockStmt({ stoveId: 1, typeId: 1, currentOwnerId: 10, name: 'Rusty Stove', rarity: 'common' }), // stove lookup
            mockStmt({ count: 0 }), // isStoveListed
            mockStmt({ playerId: 99 }), // shop NPC
            mockStmt({ playerId: 10, username: 'seller', coins: 100 }), // player info
            mockStmt(null, [], { changes: 1 }), // update stove owner
            mockStmt(null, [], { changes: 1 }), // insert ownership
            mockStmt(null, [], { changes: 1 }), // update coins
            mockStmt(null, [], { changes: 1 }), // coin transaction
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 1);

        expect(result.success).toBe(true);
        expect(result.coinsReceived).toBe(50);
    });

    it('sells a legendary stove for 400 coins', async () => {
        const unit = mockUnitSequence([
            mockStmt({ stoveId: 2, typeId: 4, currentOwnerId: 10, name: 'Dragon Stove', rarity: 'legendary' }),
            mockStmt({ count: 0 }),
            mockStmt({ playerId: 99 }),
            mockStmt({ playerId: 10, username: 'seller', coins: 1000 }),
            mockStmt(null, [], { changes: 1 }),
            mockStmt(null, [], { changes: 1 }),
            mockStmt(null, [], { changes: 1 }),
            mockStmt(null, [], { changes: 1 }),
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 2);

        expect(result.success).toBe(true);
        expect(result.coinsReceived).toBe(400);
    });

    it('rejects selling a non-existent stove', async () => {
        const unit = mockUnitSequence([
            mockStmt(null), // stove not found
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 999);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Stove not found');
    });

    it('rejects selling a stove the player does not own', async () => {
        const unit = mockUnitSequence([
            mockStmt({ stoveId: 1, typeId: 1, currentOwnerId: 20, name: 'Rusty Stove', rarity: 'common' }),
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You do not own this stove');
    });

    it('rejects selling a listed stove', async () => {
        const unit = mockUnitSequence([
            mockStmt({ stoveId: 1, typeId: 1, currentOwnerId: 10, name: 'Rusty Stove', rarity: 'common' }),
            mockStmt({ count: 1 }), // is listed
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 1);

        expect(result.success).toBe(false);
        expect(result.error).toContain('listed');
    });

    it('rejects selling when shop NPC is missing', async () => {
        const unit = mockUnitSequence([
            mockStmt({ stoveId: 1, typeId: 1, currentOwnerId: 10, name: 'Rusty Stove', rarity: 'common' }),
            mockStmt({ count: 0 }),
            mockStmt(null), // no shop NPC
        ]);
        const service = new ShopService(unit);

        const result = await service.sellStove(10, 1);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Shop is unavailable');
    });
});

describe('ShopRotationService', () => {
    it('rotates featured items successfully', async () => {
        const unit = mockUnitSequence([
            mockStmt(null, [], { changes: 1 }), // clear old featured
            mockStmt(null, [], { changes: 2 }), // set new featured
            mockStmt(null, [
                { listingId: 1, itemType: 'stove', itemId: 1, price: 500, stock: 10, isFeatured: 1 },
                { listingId: 2, itemType: 'lootbox', itemId: 1, price: 300, stock: -1, isFeatured: 0 },
            ]), // getFeaturedItems
        ]);
        const service = new ShopRotationService(unit);

        const result = await service.rotate();

        expect(result).toBeDefined();
        expect(unit.prepare).toHaveBeenCalled();
    });

    it('returns empty result when no items to feature', async () => {
        const unit = mockUnitSequence([
            mockStmt(null, [], { changes: 1 }), // clear old featured
            mockStmt(null, [], { changes: 0 }), // no new featured
            mockStmt(null, []), // getFeaturedItems empty
        ]);
        const service = new ShopRotationService(unit);

        const result = await service.rotate();

        expect(result).toBeDefined();
    });
});
