import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { PlayerPrestigeService } from "./player-prestige-service";
import { NotificationService } from "./notification-service";

export interface ShopItemDisplay {
    listingId: number;
    itemType: 'stove' | 'lootbox';
    itemId: number;
    price: number;
    stock: number;
    rotationDate: string | null;
    isFeatured: boolean;
    createdAt: string;
    name: string;
    imageUrl: string;
    rarity: string;
}

export interface PurchaseResult {
    success: boolean;
    itemId?: number;
    error?: string;
}

export interface DailyRewardStatus {
    canClaim: boolean;
    streakCount: number;
    nextClaimAt: Date | null;
    reward: DailyReward;
}

export interface DailyReward {
    coins: number;
    lootboxes: number;
}

export interface DailyClaimResult {
    success: boolean;
    reward: DailyReward;
    newStreak: number;
    error?: string;
}

const REWARD_TABLE: DailyReward[] = [
    { coins: 0, lootboxes: 0 },   // index 0 (unused)
    { coins: 100, lootboxes: 0 },
    { coins: 200, lootboxes: 0 },
    { coins: 300, lootboxes: 0 },
    { coins: 400, lootboxes: 0 },
    { coins: 500, lootboxes: 0 },
    { coins: 750, lootboxes: 0 },
    { coins: 1000, lootboxes: 1 },
];

export class ShopService {
    constructor(private unit: Unit) {}

    private async getDailyPurchaseCount(listingId: number): Promise<number> {
        const today = new Date().toISOString().split("T")[0];
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM ShopPurchase
             WHERE listingId = @listingId AND SUBSTRING(purchasedAt, 1, 10) = @today`,
            { listingId, today }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    private async applyDailyLimits(items: ShopItemDisplay[]): Promise<ShopItemDisplay[]> {
        // Collect all lootbox items that need daily limit checks
        const lootboxItems = items.filter(i => i.itemType === 'lootbox');
        if (lootboxItems.length === 0) return items;

        // Fetch all daily limits in one query
        const lootboxTypeIds = lootboxItems.map(i => i.itemId);
        const placeholders = lootboxTypeIds.map((_, i) => `@ltid${i}`).join(", ");
        const limitParams: Record<string, number> = {};
        lootboxTypeIds.forEach((id, i) => { limitParams[`ltid${i}`] = id; });

        const limitsStmt = this.unit.prepare<{ lootboxTypeId: number; dailyLimit: number | null }>(
            `SELECT lootboxTypeId, dailyLimit FROM LootboxType WHERE lootboxTypeId IN (${placeholders})`,
            limitParams
        );
        const limits = await limitsStmt.all();
        const limitMap = new Map(limits.map(l => [l.lootboxTypeId, l.dailyLimit]));

        // Fetch all daily purchase counts in one query
        const listingIds = lootboxItems.map(i => i.listingId);
        const today = new Date().toISOString().split("T")[0];
        const lpPlaceholders = listingIds.map((_, i) => `@lid${i}`).join(", ");
        const purchaseParams: Record<string, unknown> = { today };
        listingIds.forEach((id, i) => { purchaseParams[`lid${i}`] = id; });

        const purchaseStmt = this.unit.prepare<{ listingId: number; count: number }>(
            `SELECT listingId, COUNT(*)::INTEGER as count FROM ShopPurchase
             WHERE listingId IN (${lpPlaceholders}) AND SUBSTRING(purchasedAt, 1, 10) = @today
             GROUP BY listingId`,
            purchaseParams
        );
        const purchases = await purchaseStmt.all();
        const purchaseMap = new Map(purchases.map(p => [p.listingId, p.count]));

        // Apply limits
        for (const item of lootboxItems) {
            const dailyLimit = limitMap.get(item.itemId) ?? null;
            if (dailyLimit !== null && dailyLimit > 0) {
                const purchased = purchaseMap.get(item.listingId) ?? 0;
                item.stock = Math.max(0, dailyLimit - purchased);
            } else if (dailyLimit === null) {
                item.stock = -1; // unlimited
            }
        }

        return items;
    }

    private async getLootboxDailyLimit(lootboxTypeId: number): Promise<number | null> {
        const stmt = this.unit.prepare<{ dailyLimit: number | null }>(
            `SELECT dailyLimit FROM LootboxType WHERE lootboxTypeId = @lootboxTypeId`,
            { lootboxTypeId }
        );
        const result = await stmt.get();
        return result?.dailyLimit ?? null;
    }

    async getShopItems(): Promise<ShopItemDisplay[]> {
        const today = new Date().toISOString().split("T")[0];

        // Stove listings joined with StoveType
        const stoveStmt = this.unit.prepare<ShopItemDisplay>(
            `SELECT sl.listingId, sl.itemType, sl.itemId, sl.price, sl.stock,
                    sl.rotationDate, sl.isFeatured, sl.createdAt,
                    st.name, st.imageUrl, st.rarity
             FROM ShopListing sl
             JOIN StoveType st ON sl.itemId = st.typeId
             WHERE sl.itemType = 'stove'
             AND (sl.rotationDate IS NULL OR sl.rotationDate >= @today)`,
            { today }
        );
        const stoves = await stoveStmt.all() ?? [];

        // Lootbox listings joined with LootboxType
        const lootboxStmt = this.unit.prepare<ShopItemDisplay>(
            `SELECT sl.listingId, sl.itemType, sl.itemId, sl.price, sl.stock,
                    sl.rotationDate, sl.isFeatured, sl.createdAt,
                    lt.name,
                    CASE lt.lootboxTypeId
                        WHEN 1 THEN 'assets/animation/chest-idle.gif'
                        WHEN 2 THEN 'assets/animation/chest-idle-gold.gif'
                        WHEN 3 THEN 'assets/animation/legendary-chest-idle-animation.gif'
                        WHEN 4 THEN 'assets/animation/dragon-chest-idle-animation.gif'
                        WHEN 5 THEN 'assets/animation/winter-chest-idle-animation.gif'
                        ELSE 'assets/animation/chest-idle.gif'
                    END as imageUrl,
                    CASE lt.lootboxTypeId
                        WHEN 1 THEN 'common'
                        WHEN 2 THEN 'rare'
                        WHEN 3 THEN 'epic'
                        WHEN 4 THEN 'legendary'
                        WHEN 5 THEN 'epic'
                        ELSE 'common'
                    END as rarity
             FROM ShopListing sl
             JOIN LootboxType lt ON sl.itemId = lt.lootboxTypeId
             WHERE sl.itemType = 'lootbox'
             AND (sl.rotationDate IS NULL OR sl.rotationDate >= @today)`,
            { today }
        );
        const lootboxes = await lootboxStmt.all() ?? [];

        // Apply daily purchase limits to lootboxes
        const limitedLootboxes = await this.applyDailyLimits(lootboxes);

        // Merge and sort: featured first, then by listingId
        const all = [...stoves, ...limitedLootboxes];
        all.sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
            return a.listingId - b.listingId;
        });
        return all;
    }

    async getShopItemById(listingId: number): Promise<ShopItemDisplay | null> {
        // Try stove first
        const stoveStmt = this.unit.prepare<ShopItemDisplay, { listingId: number }>(
            `SELECT sl.listingId, sl.itemType, sl.itemId, sl.price, sl.stock,
                    sl.rotationDate, sl.isFeatured, sl.createdAt,
                    st.name, st.imageUrl, st.rarity
             FROM ShopListing sl
             JOIN StoveType st ON sl.itemId = st.typeId
             WHERE sl.listingId = @listingId AND sl.itemType = 'stove'`,
            { listingId }
        );
        const stove = await stoveStmt.get();
        if (stove) return stove;

        // Try lootbox
        const lootboxStmt = this.unit.prepare<ShopItemDisplay, { listingId: number }>(
            `SELECT sl.listingId, sl.itemType, sl.itemId, sl.price, sl.stock,
                    sl.rotationDate, sl.isFeatured, sl.createdAt,
                    lt.name,
                    CASE lt.lootboxTypeId
                        WHEN 1 THEN 'assets/animation/chest-idle.gif'
                        WHEN 2 THEN 'assets/animation/chest-idle-gold.gif'
                        WHEN 3 THEN 'assets/animation/legendary-chest-idle-animation.gif'
                        WHEN 4 THEN 'assets/animation/dragon-chest-idle-animation.gif'
                        WHEN 5 THEN 'assets/animation/winter-chest-idle-animation.gif'
                        ELSE 'assets/animation/chest-idle.gif'
                    END as imageUrl,
                    CASE lt.lootboxTypeId
                        WHEN 1 THEN 'common'
                        WHEN 2 THEN 'rare'
                        WHEN 3 THEN 'epic'
                        WHEN 4 THEN 'legendary'
                        WHEN 5 THEN 'epic'
                        ELSE 'common'
                    END as rarity
             FROM ShopListing sl
             JOIN LootboxType lt ON sl.itemId = lt.lootboxTypeId
             WHERE sl.listingId = @listingId AND sl.itemType = 'lootbox'`,
            { listingId }
        );
        const lootbox = await lootboxStmt.get();
        if (!lootbox) return null;

        // Apply daily limit
        const limited = await this.applyDailyLimits([lootbox]);
        return limited[0];
    }

    async purchaseItem(playerId: number, listingId: number): Promise<PurchaseResult> {
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }

        const listing = await this.getShopItemById(listingId);
        if (!listing) {
            return { success: false, error: "Item not found" };
        }

        // Re-compute effective stock for lootboxes (daily limits)
        if (listing.itemType === 'lootbox') {
            const dailyLimit = await this.getLootboxDailyLimit(listing.itemId);
            if (dailyLimit !== null && dailyLimit > 0) {
                const purchased = await this.getDailyPurchaseCount(listing.listingId);
                const remaining = dailyLimit - purchased;
                if (remaining <= 0) {
                    return { success: false, error: "Daily purchase limit reached" };
                }
            }
        } else if (listing.stock === 0) {
            return { success: false, error: "Item out of stock" };
        }

        if (player.coins < listing.price) {
            return { success: false, error: "Insufficient coins" };
        }

        // Atomically deduct coins (prevents race-condition overspending)
        const deducted = await playerService.deductCoinsAtomic(playerId, listing.price);
        if (!deducted) {
            return { success: false, error: "Insufficient coins (concurrent transaction)" };
        }

        // Log transaction
        await coinService.create(
            playerId,
            -listing.price,
            "listing_purchase",
            `Purchased ${listing.itemType} from shop`
        );

        let createdItemId: number | undefined;

        if (listing.itemType === "stove") {
            // Fetch stove type heat range and rarity
            const typeStmt = this.unit.prepare<{ minHeat: number; maxHeat: number; rarity: string }>(
                "SELECT minHeat, maxHeat, rarity FROM StoveType WHERE typeId = @typeId",
                { typeId: listing.itemId }
            );
            const typeRow = await typeStmt.get();
            let heatLevel = typeRow
                ? typeRow.minHeat + Math.random() * (typeRow.maxHeat - typeRow.minHeat)
                : 0.0;
            // Secret stoves should never be extinguished (heat > 0.55)
            if (typeRow && typeRow.rarity.toLowerCase() === 'secret') {
                heatLevel = Math.min(heatLevel, 0.55);
            }

            // Create a new stove instance
            const stoveStmt = this.unit.prepare<{ stoveId: number }, { typeId: number; playerId: number; mintedAt: string; heatLevel: number }>(
                `INSERT INTO Stove (typeId, currentOwnerId, mintedAt, heatLevel)
                 VALUES (@typeId, @playerId, @mintedAt, @heatLevel)
                 RETURNING stoveId`,
                { typeId: listing.itemId, playerId, mintedAt: new Date().toISOString(), heatLevel }
            );
            const stoveRow = await stoveStmt.get();
            if (!stoveRow) {
                return { success: false, error: "Failed to create stove" };
            }
            createdItemId = stoveRow.stoveId;

            // Create ownership record
            await this.unit.prepare(
                `INSERT INTO Ownership (stoveId, playerId, acquiredAt, acquiredHow)
                 VALUES (@stoveId, @playerId, @acquiredAt, 'shop')`,
                { stoveId: createdItemId, playerId, acquiredAt: new Date().toISOString() }
            ).run();
        } else if (listing.itemType === "lootbox") {
            // Create lootbox instance
            const lbStmt = this.unit.prepare<{ lootboxId: number }, { lootboxTypeId: number; playerId: number; acquiredHow: string }>(
                `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow)
                 VALUES (@lootboxTypeId, @playerId, NULL, @acquiredHow)
                 RETURNING lootboxId`,
                { lootboxTypeId: listing.itemId, playerId, acquiredHow: "shop" }
            );
            const lbRow = await lbStmt.get();
            if (!lbRow) {
                return { success: false, error: "Failed to create lootbox" };
            }
            createdItemId = lbRow.lootboxId;

            // Increment player's lootboxCount
            await playerService.updatePlayerLootboxCount(playerId, player.lootboxCount + 1);
        }

        // Log purchase for daily limit tracking
        await this.unit.prepare(
            `INSERT INTO ShopPurchase (listingId, playerId, quantity, purchasedAt)
             VALUES (@listingId, @playerId, 1, NOW())`,
            { listingId, playerId }
        ).run();

        // Decrement stock if not unlimited (-1) and not a daily-limited lootbox
        // Atomic: only decrement if stock is still > 0
        if (listing.itemType !== 'lootbox' && listing.stock > 0) {
            const stockResult = await this.unit.prepare(
                `UPDATE ShopListing SET stock = stock - 1 WHERE listingId = @listingId AND stock > 0`,
                { listingId }
            ).run();
            if (stockResult.changes !== 1) {
                // Stock ran out between check and update — refund the buyer
                await playerService.addCoinsAtomic(playerId, listing.price);
                return { success: false, error: "Item just went out of stock" };
            }
        }

        // Create purchase notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "system",
                "Purchase successful",
                `You purchased ${listing.name} from the shop for ${listing.price} coal`,
                { listingId, itemType: listing.itemType, itemName: listing.name, price: listing.price },
                {
                    groupKey: 'shop:purchase:' + playerId + ':' + new Date().toISOString().split('T')[0],
                    priority: 'low',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            );
        } catch (e) {
            console.error("[SHOP] Notification creation failed:", e);
        }

        // Check shop achievements
        try {
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkShopAchievements(playerId);
        } catch (e) {
            console.error("[SHOP] Achievement check failed:", e);
        }

        return { success: true, itemId: createdItemId };
    }

    async getDailyRewardStatus(playerId: number): Promise<DailyRewardStatus> {
        const row = await this.unit.prepare<
            { lastClaimAt: string | null; streakCount: number },
            { playerId: number }
        >(
            `SELECT lastClaimAt, streakCount FROM PlayerDailyReward WHERE playerId = @playerId`,
            { playerId }
        ).get();

        const now = new Date();
        let streakCount = row?.streakCount ?? 0;
        let lastClaimAt = row?.lastClaimAt ? new Date(row.lastClaimAt) : null;

        // Check if streak should reset (>48h since last claim)
        if (lastClaimAt) {
            const hoursSinceClaim = (now.getTime() - lastClaimAt.getTime()) / (1000 * 60 * 60);
            if (hoursSinceClaim > 48) {
                streakCount = 0;
            }
        }

        const dayIndex = Math.min(streakCount + 1, 7);
        const reward = REWARD_TABLE[dayIndex];

        let canClaim = false;
        let nextClaimAt: Date | null = null;

        if (!lastClaimAt) {
            canClaim = true;
        } else {
            const hoursSinceClaim = (now.getTime() - lastClaimAt.getTime()) / (1000 * 60 * 60);
            canClaim = hoursSinceClaim >= 24;
            if (!canClaim) {
                nextClaimAt = new Date(lastClaimAt.getTime() + 24 * 60 * 60 * 1000);
            }
        }

        return { canClaim, streakCount, nextClaimAt, reward };
    }

    /**
     * Sells a player's stove to the shop for a bad price.
     * @param playerId - The selling player's ID.
     * @param stoveId - The stove to sell.
     * @returns Result of the sale.
     */
    async sellStove(playerId: number, stoveId: number): Promise<{ success: boolean; coinsReceived?: number; error?: string }> {
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);
        const listingService = new (await import("./listing-service")).ListingService(this.unit);

        // Verify player owns the stove
        const stoveStmt = this.unit.prepare<
            { stoveId: number; typeId: number; currentOwnerId: number; name: string; rarity: string },
            { stoveId: number }
        >(
            `SELECT Stove.stoveId, Stove.typeId, Stove.currentOwnerId, StoveType.name, StoveType.rarity
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.stoveId = @stoveId`,
            { stoveId }
        );
        const stove = await stoveStmt.get();
        if (!stove) {
            return { success: false, error: "Stove not found" };
        }
        if (stove.currentOwnerId !== playerId) {
            return { success: false, error: "You do not own this stove" };
        }

        // Check if stove is currently listed
        const isListed = await listingService.isStoveListed(stoveId);
        if (isListed) {
            return { success: false, error: "Cannot sell a listed stove. Cancel the listing first." };
        }

        // Calculate bad sell price based on rarity
        const SELL_PRICES: Record<string, number> = {
            common: 50,
            rare: 100,
            epic: 200,
            legendary: 400,
            limited: 500,
        };
        const sellPrice = SELL_PRICES[stove.rarity.toLowerCase()] ?? 25;

        // Find shop NPC
        const npcStmt = this.unit.prepare<{ playerId: number }>(
            `SELECT playerId FROM Player WHERE username = '__shop__'`
        );
        const npc = await npcStmt.get();
        if (!npc) {
            return { success: false, error: "Shop is unavailable" };
        }

        // Get player for coin update
        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }

        // Transfer stove to shop NPC
        await this.unit.prepare(
            `UPDATE Stove SET currentOwnerId = @npcId WHERE stoveId = @stoveId`,
            { npcId: npc.playerId, stoveId }
        ).run();

        // Create ownership record for shop
        await this.unit.prepare(
            `INSERT INTO Ownership (stoveId, playerId, acquiredAt, acquiredHow)
             VALUES (@stoveId, @playerId, @acquiredAt, 'shop')`,
            { stoveId, playerId: npc.playerId, acquiredAt: new Date().toISOString() }
        ).run();

        // Add coins to player
        await playerService.addCoinsAtomic(playerId, sellPrice);

        // Log transaction
        await coinService.create(
            playerId,
            sellPrice,
            "shop_sale",
            `Sold ${stove.name} to shop`
        );

        return { success: true, coinsReceived: sellPrice };
    }

    async claimDailyReward(playerId: number): Promise<DailyClaimResult> {
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        // Lock the reward row to prevent concurrent duplicate claims
        const lockRow = await this.unit.prepare<
            { lastClaimAt: string | null; streakCount: number }
        >(
            `SELECT lastClaimAt, streakCount FROM PlayerDailyReward WHERE playerId = @playerId FOR UPDATE`,
            { playerId }
        ).get();

        const now = new Date();
        let streakCount = lockRow?.streakCount ?? 0;
        let lastClaimAt = lockRow?.lastClaimAt ? new Date(lockRow.lastClaimAt) : null;

        // Re-check eligibility after locking (prevents race conditions)
        let canClaim = false;
        if (!lastClaimAt) {
            canClaim = true;
        } else {
            const hoursSinceClaim = (now.getTime() - lastClaimAt.getTime()) / (1000 * 60 * 60);
            canClaim = hoursSinceClaim >= 24;
            if (hoursSinceClaim > 48) {
                streakCount = 0; // reset streak
            }
        }

        if (!canClaim) {
            const dayIndex = Math.min(streakCount + 1, 7);
            const nextClaimAt = lastClaimAt ? new Date(lastClaimAt.getTime() + 24 * 60 * 60 * 1000) : null;
            return { success: false, reward: REWARD_TABLE[dayIndex], newStreak: streakCount, error: "Daily reward already claimed" };
        }

        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, reward: REWARD_TABLE[1], newStreak: 0, error: "Player not found" };
        }

        const newStreak = streakCount + 1;
        const dayIndex = Math.min(newStreak, 7);
        const reward = REWARD_TABLE[dayIndex];

        // Award coins
        if (reward.coins > 0) {
            await playerService.addCoinsAtomic(playerId, reward.coins);
            await coinService.create(
                playerId,
                reward.coins,
                "daily_reward",
                `Day ${dayIndex} daily reward`
            );
        }

        // Award lootboxes
        if (reward.lootboxes > 0) {
            for (let i = 0; i < reward.lootboxes; i++) {
                await this.unit.prepare(
                    `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow)
                     VALUES (1, @playerId, NULL, 'daily_reward')`,
                    { playerId }
                ).run();
            }
            await playerService.updatePlayerLootboxCount(playerId, player.lootboxCount + reward.lootboxes);
        }

        // Upsert PlayerDailyReward atomically
        const nowIso = now.toISOString();
        await this.unit.prepare(
            `INSERT INTO PlayerDailyReward (playerId, lastClaimAt, streakCount)
             VALUES (@playerId, @lastClaimAt, @streakCount)
             ON CONFLICT (playerId)
             DO UPDATE SET lastClaimAt = @lastClaimAt, streakCount = @streakCount`,
            { playerId, lastClaimAt: nowIso, streakCount: newStreak }
        ).run();

        // Award XP
        try {
            const prestigeService = new PlayerPrestigeService(this.unit);
            const xpAmount = 50 * newStreak;
            await prestigeService.addXP(playerId, xpAmount, 'daily_reward', `Day ${dayIndex} daily reward streak`);
        } catch {
            // Ignore XP errors
        }

        // Check level-based achievements & cosmetic unlocks
        try {
            await this.unit.savepoint('shop_achievements');
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkLevelAchievements(playerId);
            await engine.checkWealthAchievements(playerId);
        } catch {
            try { await this.unit.rollbackToSavepoint('shop_achievements'); } catch { /* ignore */ }
        }

        // Create daily reward notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "daily_reward",
                "Daily reward claimed",
                `You claimed your Day ${dayIndex} reward: ${reward.coins > 0 ? `${reward.coins} coins` : ""}${reward.coins > 0 && reward.lootboxes > 0 ? " + " : ""}${reward.lootboxes > 0 ? `${reward.lootboxes} lootbox` : ""}`,
                { dayIndex, reward }
            );
        } catch {
            // Ignore notification errors
        }

        return { success: true, reward, newStreak };
    }
}
