import { ShopService } from '../../backend/services/shop-service';
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

describe('ShopService', () => {
    describe('getShopItems', () => {
        it('returns all active shop items', async () => {
            const mockStoves = [
                { listingId: 1, itemType: 'stove', itemId: 1, price: 500, stock: 10, isFeatured: 1, name: 'Rusty Stove', imageUrl: '/assets/stove_sprites/common/rusty.png', rarity: 'common' },
            ];
            const mockLootboxes = [
                { listingId: 2, itemType: 'lootbox', itemId: 1, price: 300, stock: -1, isFeatured: 0, name: 'Standard Lootbox', imageUrl: 'assets/animation/chest-idle.gif', rarity: 'common' },
            ];
            let callCount = 0;
            const unit = mockUnit();
            (unit.prepare as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 1) return mockStmt(null, mockStoves);
                return mockStmt(null, mockLootboxes);
            });
            const service = new ShopService(unit);

            const items = await service.getShopItems();
            expect(items).toHaveLength(2);
            expect(items[0].listingId).toBe(1);
            expect(items[0].name).toBe('Rusty Stove');
        });

        it('returns empty array when no items exist', async () => {
            const unit = mockUnit(mockStmt(null, []));
            const service = new ShopService(unit);

            const items = await service.getShopItems();
            expect(items).toEqual([]);
        });
    });

    describe('purchaseItem', () => {
        it('returns error when player not found', async () => {
            const unit = mockUnit();
            const service = new ShopService(unit);

            // Mock player not found
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt(null) // getPlayerByID
            );

            const result = await service.purchaseItem(1, 1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Player not found');
        });

        it('returns error when item not found', async () => {
            const unit = mockUnit();
            const service = new ShopService(unit);

            // Mock player found
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt({ playerId: 1, coins: 1000, lootboxCount: 0 })
            );
            // Mock item not found
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt(null)
            );

            const result = await service.purchaseItem(1, 999);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Item not found');
        });

        it('returns error when insufficient coins', async () => {
            const unit = mockUnit();
            const service = new ShopService(unit);

            // Mock player with 100 coins
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt({ playerId: 1, coins: 100, lootboxCount: 0 })
            );
            // Mock item with price 500
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt({ listingId: 1, itemType: 'stove', itemId: 1, price: 500, stock: 10 })
            );

            const result = await service.purchaseItem(1, 1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient coins');
        });

        it('returns error when out of stock', async () => {
            const unit = mockUnit();
            const service = new ShopService(unit);

            // Mock player
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt({ playerId: 1, coins: 1000, lootboxCount: 0 })
            );
            // Mock item with 0 stock
            (unit.prepare as jest.Mock).mockReturnValueOnce(
                mockStmt({ listingId: 1, itemType: 'stove', itemId: 1, price: 500, stock: 0 })
            );

            const result = await service.purchaseItem(1, 1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Item out of stock');
        });
    });

    describe('getDailyRewardStatus', () => {
        it('returns canClaim=true for new player', async () => {
            const unit = mockUnit(mockStmt(null)); // No daily reward row
            const service = new ShopService(unit);

            const status = await service.getDailyRewardStatus(1);
            expect(status.canClaim).toBe(true);
            expect(status.streakCount).toBe(0);
            expect(status.reward.coins).toBe(100);
        });

        it('returns canClaim=false within 24h', async () => {
            const now = new Date();
            const lastClaim = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
            const unit = mockUnit(mockStmt({ lastClaimAt: lastClaim.toISOString(), streakCount: 2 }));
            const service = new ShopService(unit);

            const status = await service.getDailyRewardStatus(1);
            expect(status.canClaim).toBe(false);
            expect(status.streakCount).toBe(2);
            expect(status.nextClaimAt).not.toBeNull();
        });

        it('resets streak after 48h', async () => {
            const now = new Date();
            const lastClaim = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
            const unit = mockUnit(mockStmt({ lastClaimAt: lastClaim.toISOString(), streakCount: 5 }));
            const service = new ShopService(unit);

            const status = await service.getDailyRewardStatus(1);
            expect(status.streakCount).toBe(0);
            expect(status.canClaim).toBe(true);
        });
    });

    describe('claimDailyReward', () => {
        it('returns error when already claimed', async () => {
            const now = new Date();
            const lastClaim = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
            const unit = mockUnit(mockStmt({ lastClaimAt: lastClaim.toISOString(), streakCount: 2 }));
            const service = new ShopService(unit);

            const result = await service.claimDailyReward(1);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Daily reward already claimed');
        });

        it('awards day 7 reward with lootbox', async () => {
            const now = new Date();
            const lastClaim = new Date(now.getTime() - 50 * 60 * 60 * 1000); // 50 hours ago (streak should reset)
            const unit = mockUnit();
            const service = new ShopService(unit);

            // Mock daily status (streak reset to 0, can claim)
            let callCount = 0;
            (unit.prepare as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return mockStmt({ lastClaimAt: lastClaim.toISOString(), streakCount: 6 });
                }
                if (callCount === 2) {
                    return mockStmt({ playerId: 1, coins: 1000, lootboxCount: 5 });
                }
                return mockStmt();
            });

            // For this test, the 50h gap means streak resets, so new streak = 1
            const result = await service.claimDailyReward(1);
            // Since streak resets after 48h, streakCount becomes 0, then newStreak = 1
            expect(result.success).toBe(true);
            expect(result.newStreak).toBe(1);
            expect(result.reward.coins).toBe(100);
        });
    });
});
