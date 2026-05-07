import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerStatisticsRow, PlayerRow } from "../../shared/model";

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'limited'];

export class PlayerStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    private rarityRank(rarity: string | null): number {
        if (!rarity) return -1;
        return RARITY_ORDER.indexOf(rarity.toLowerCase());
    }

    /**
     * Calculates real player statistics from data tables.
     */
    private async calculatePlayerStats(playerId: number): Promise<PlayerStatisticsRow | null> {
        const player = await this.getPlayer(playerId);
        if (!player) return null;

        // Count lootboxes opened
        const lootboxStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Lootbox WHERE playerId = @playerId",
            { playerId }
        );
        const lootboxesOpened = (await lootboxStmt.get())?.count ?? 0;

        // Count listings created and sold
        const listingsCreatedStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Listing WHERE sellerId = @playerId",
            { playerId }
        );
        const listingsCreated = (await listingsCreatedStmt.get())?.count ?? 0;

        const listingsSoldStmt = this.unit.prepare<{ count: number, revenue: number }>(
            `SELECT COUNT(*) as count, COALESCE(SUM(l.price), 0) as revenue 
             FROM Listing l
             JOIN Trade t ON l.listingId = t.listingId
             WHERE l.sellerId = @playerId AND l.status = 'sold'`,
            { playerId }
        );
        const listingsResult = await listingsSoldStmt.get();
        const listingsSold = listingsResult?.count ?? 0;
        const salesRevenue = listingsResult?.revenue ?? 0;

        // Count purchases made
        const purchasesStmt = this.unit.prepare<{ count: number, spent: number }>(
            `SELECT COUNT(*) as count, COALESCE(SUM(l.price), 0) as spent
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             WHERE t.buyerId = @playerId`,
            { playerId }
        );
        const purchasesResult = await purchasesStmt.get();
        const purchasesMade = purchasesResult?.count ?? 0;
        const purchaseSpending = purchasesResult?.spent ?? 0;

        // Count mini games played
        const gamesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const miniGamesPlayed = (await gamesStmt.get())?.count ?? 0;

        // Count stoves currently owned
        const stovesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE currentOwnerId = @playerId",
            { playerId }
        );
        const stovesOwned = (await stovesStmt.get())?.count ?? 0;

        // Total logins from LoginHistory
        const loginsStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LoginHistory WHERE playerId = @playerId",
            { playerId }
        );
        const totalLogins = (await loginsStmt.get())?.count ?? 0;

        // Total coins earned and spent from CoinTransaction
        const coinsEarnedStmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount > 0",
            { playerId }
        );
        const totalCoinsEarned = (await coinsEarnedStmt.get())?.total ?? 0;

        const coinsSpentStmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount < 0",
            { playerId }
        );
        const totalCoinsSpent = (await coinsSpentStmt.get())?.total ?? 0;

        // Best drop rarity from actual lootbox drops
        const bestRarityStmt = this.unit.prepare<{ bestRarity: string }>(
            `SELECT st.rarity as bestRarity
             FROM LootboxDrop ld
             JOIN Lootbox lb ON ld.lootboxId = lb.lootboxId
             JOIN Stove sv ON ld.stoveId = sv.stoveId
             JOIN StoveType st ON sv.typeId = st.typeId
             WHERE lb.playerId = @playerId
             ORDER BY CASE st.rarity
               WHEN 'common' THEN 0
               WHEN 'uncommon' THEN 1
               WHEN 'rare' THEN 2
               WHEN 'epic' THEN 3
               WHEN 'legendary' THEN 4
               WHEN 'limited' THEN 5
               ELSE -1
             END DESC
             LIMIT 1`,
            { playerId }
        );
        const bestRarityRow = await bestRarityStmt.get();
        const bestDropRarity = bestRarityRow?.bestRarity ?? null;

        // Calculate net worth (coins + value of owned stoves)
        const stoveValueStmt = this.unit.prepare<{ value: number }>(
            `SELECT COALESCE(SUM(COALESCE(ph.salePrice, 500)), 0) as value
             FROM Stove s
             LEFT JOIN PriceHistory ph ON s.typeId = ph.typeId
             WHERE s.currentOwnerId = @playerId`,
            { playerId }
        );
        const stoveValue = (await stoveValueStmt.get())?.value ?? 0;
        const netWorth = player.coins + stoveValue;

        // Calculate market activity score (simple formula)
        const marketActivityScore = (listingsCreated * 10) + (listingsSold * 20) + (purchasesMade * 15);

        return {
            statId: playerId,
            playerId: player.playerId,
            totalLogins: totalLogins,
            lastLoginAt: new Date(),
            totalSessionMinutes: 0,
            longestSessionMinutes: 0,
            totalLootboxesOpened: lootboxesOpened,
            totalLootboxesPurchased: 0,
            totalLootboxesFree: lootboxesOpened,
            totalCoinsSpentOnLootboxes: 0,
            bestDropRarity: bestDropRarity as any,
            totalStovesFromLootboxes: lootboxesOpened,
            totalListingsCreated: listingsCreated,
            totalListingsSold: listingsSold,
            totalListingsCancelled: 0,
            totalListingsExpired: 0,
            totalPurchases: purchasesMade,
            totalSalesRevenue: salesRevenue,
            totalPurchaseSpending: purchaseSpending,
            averageListingPrice: listingsCreated > 0 ? salesRevenue / listingsCreated : 0,
            averageSalePrice: listingsSold > 0 ? salesRevenue / listingsSold : 0,
            fastestSaleMinutes: null,
            totalTradesCompleted: listingsSold + purchasesMade,
            totalMiniGamesPlayed: miniGamesPlayed,
            totalMiniGameWins: 0,
            totalMiniGameLosses: 0,
            totalCoinsFromMiniGames: 0,
            totalCoinsLostInMiniGames: 0,
            favoriteGameType: null,
            luckiestWin: 0,
            totalMessagesSent: 0,
            totalMessagesReceived: 0,
            totalGlobalMessages: 0,
            totalPrivateMessages: 0,
            currentStoveCount: stovesOwned,
            totalStovesAcquired: lootboxesOpened + purchasesMade,
            totalStovesSold: listingsSold,
            totalStovesTraded: 0,
            rarestStoveOwned: null,
            highestCoinBalance: player.coins,
            lowestCoinBalance: player.coins,
            totalCoinsEarned: totalCoinsEarned,
            totalCoinsSpent: totalCoinsSpent,
            netWorthEstimate: netWorth,
            marketActivityScore: marketActivityScore,
            updatedAt: new Date()
        };
    }

    private async getPlayer(playerId: number): Promise<PlayerRow | null> {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE playerId = @playerId",
            { playerId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all player statistics (calculated from real data).
     */
    async getAll(): Promise<PlayerStatisticsRow[]> {
        const sql = `
            SELECT 
                p.playerId,
                p.coins,
                p.username,
                (SELECT COUNT(*) FROM Lootbox l WHERE l.playerId = p.playerId) as lootboxesOpened,
                (SELECT COUNT(*) FROM Listing lc WHERE lc.sellerId = p.playerId) as listingsCreated,
                (SELECT COUNT(*) FROM Listing ls JOIN Trade t ON ls.listingId = t.listingId WHERE ls.sellerId = p.playerId AND ls.status = 'sold') as listingsSold,
                (SELECT COALESCE(SUM(ls2.price), 0) FROM Listing ls2 JOIN Trade t2 ON ls2.listingId = t2.listingId WHERE ls2.sellerId = p.playerId AND ls2.status = 'sold') as salesRevenue,
                (SELECT COUNT(*) FROM Trade t3 JOIN Listing l3 ON t3.listingId = l3.listingId WHERE t3.buyerId = p.playerId) as purchasesMade,
                (SELECT COALESCE(SUM(l4.price), 0) FROM Trade t4 JOIN Listing l4 ON t4.listingId = l4.listingId WHERE t4.buyerId = p.playerId) as purchaseSpending,
                (SELECT COUNT(*) FROM MiniGameSession mgs WHERE mgs.playerId = p.playerId) as miniGamesPlayed,
                (SELECT COUNT(*) FROM Stove s WHERE s.currentOwnerId = p.playerId) as stovesOwned,
                (SELECT COALESCE(SUM(COALESCE(ph.salePrice, 500)), 0) FROM Stove s2 LEFT JOIN PriceHistory ph ON s2.typeId = ph.typeId WHERE s2.currentOwnerId = p.playerId) as stoveValue,
                (SELECT COUNT(*) FROM LoginHistory lh WHERE lh.playerId = p.playerId) as totalLogins,
                (SELECT COALESCE(SUM(amount), 0) FROM CoinTransaction ct WHERE ct.playerId = p.playerId AND ct.amount > 0) as totalCoinsEarned,
                (SELECT COALESCE(SUM(ABS(amount)), 0) FROM CoinTransaction ct WHERE ct.playerId = p.playerId AND ct.amount < 0) as totalCoinsSpent,
                (SELECT st.rarity FROM LootboxDrop ld JOIN Lootbox lb ON ld.lootboxId = lb.lootboxId JOIN Stove sv ON ld.stoveId = sv.stoveId JOIN StoveType st ON sv.typeId = st.typeId WHERE lb.playerId = p.playerId ORDER BY CASE st.rarity WHEN 'common' THEN 0 WHEN 'uncommon' THEN 1 WHEN 'rare' THEN 2 WHEN 'epic' THEN 3 WHEN 'legendary' THEN 4 WHEN 'limited' THEN 5 ELSE -1 END DESC LIMIT 1) as bestDropRarity
            FROM Player p
            WHERE p.isAdmin = 0
        `;
        
        const stmt = this.unit.prepare<any>(sql);
        const results = await stmt.all();
        
        return results.map(r => {
            const marketActivityScore = (r.listingsCreated * 10) + (r.listingsSold * 20) + (r.purchasesMade * 15);
            const netWorth = r.coins + r.stoveValue;
            
            return {
                statId: r.playerId,
                playerId: r.playerId,
                totalLogins: r.totalLogins ?? 0,
                lastLoginAt: new Date(),
                totalSessionMinutes: 0,
                longestSessionMinutes: 0,
                totalLootboxesOpened: r.lootboxesOpened,
                totalLootboxesPurchased: 0,
                totalLootboxesFree: r.lootboxesOpened,
                totalCoinsSpentOnLootboxes: 0,
                bestDropRarity: r.bestDropRarity ?? null,
                totalStovesFromLootboxes: r.lootboxesOpened,
                totalListingsCreated: r.listingsCreated,
                totalListingsSold: r.listingsSold,
                totalListingsCancelled: 0,
                totalListingsExpired: 0,
                totalPurchases: r.purchasesMade,
                totalSalesRevenue: r.salesRevenue,
                totalPurchaseSpending: r.purchaseSpending,
                averageListingPrice: r.listingsCreated > 0 ? r.salesRevenue / r.listingsCreated : 0,
                averageSalePrice: r.listingsSold > 0 ? r.salesRevenue / r.listingsSold : 0,
                fastestSaleMinutes: null,
                totalTradesCompleted: r.listingsSold + r.purchasesMade,
                totalMiniGamesPlayed: r.miniGamesPlayed,
                totalMiniGameWins: 0,
                totalMiniGameLosses: 0,
                totalCoinsFromMiniGames: 0,
                totalCoinsLostInMiniGames: 0,
                favoriteGameType: null,
                luckiestWin: 0,
                totalMessagesSent: 0,
                totalMessagesReceived: 0,
                totalGlobalMessages: 0,
                totalPrivateMessages: 0,
                currentStoveCount: r.stovesOwned,
                totalStovesAcquired: r.lootboxesOpened + r.purchasesMade,
                totalStovesSold: r.listingsSold,
                totalStovesTraded: 0,
                rarestStoveOwned: null,
                highestCoinBalance: r.coins,
                lowestCoinBalance: r.coins,
                totalCoinsEarned: r.totalCoinsEarned ?? 0,
                totalCoinsSpent: r.totalCoinsSpent ?? 0,
                netWorthEstimate: netWorth,
                marketActivityScore: marketActivityScore,
                updatedAt: new Date()
            };
        }).sort((a, b) => b.marketActivityScore - a.marketActivityScore);
    }

    /**
     * Retrieves statistics for a specific player.
     */
    async getByPlayerId(playerId: number): Promise<PlayerStatisticsRow | null> {
        return await this.calculatePlayerStats(playerId);
    }

    /**
     * Gets top players by market activity score.
     */
    async getTopByActivity(limit: number): Promise<PlayerStatisticsRow[]> {
        return (await this.getAll()).slice(0, limit);
    }

    /**
     * Gets top players by net worth.
     */
    async getTopByNetWorth(limit: number): Promise<PlayerStatisticsRow[]> {
        return (await this.getAll())
            .sort((a, b) => b.netWorthEstimate - a.netWorthEstimate)
            .slice(0, limit);
    }

    /**
     * Creates initial statistics record for a player.
     * @deprecated Statistics are now calculated on-demand
     */
    create(playerId: number): [boolean, number] {
        return [true, playerId];
    }

    /**
     * Deletes player statistics.
     * @deprecated Statistics are now calculated on-demand
     */
    delete(_playerId: number): boolean {
        return true;
    }

    /**
     * Creates default player statistics for a new player.
     * @param playerId - The player's ID
     * @returns Tuple [success, statId]
     */
    async createDefaultPlayerStatistics(playerId: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            `INSERT INTO PlayerStatistics (
                playerId, totalLogins, lastLoginAt, totalSessionMinutes, longestSessionMinutes,
                totalLootboxesOpened, totalLootboxesPurchased, totalLootboxesFree, totalCoinsSpentOnLootboxes,
                bestDropRarity, totalStovesFromLootboxes, totalListingsCreated, totalListingsSold,
                totalListingsCancelled, totalListingsExpired, totalPurchases, totalSalesRevenue,
                totalPurchaseSpending, averageListingPrice, averageSalePrice, fastestSaleMinutes,
                totalTradesCompleted, totalMiniGamesPlayed, totalMiniGameWins, totalMiniGameLosses,
                totalCoinsFromMiniGames, totalCoinsLostInMiniGames, favoriteGameType, luckiestWin,
                totalMessagesSent, totalMessagesReceived, totalGlobalMessages, totalPrivateMessages,
                currentStoveCount, totalStovesAcquired, totalStovesSold, totalStovesTraded, rarestStoveOwned,
                highestCoinBalance, lowestCoinBalance, totalCoinsEarned, totalCoinsSpent, netWorthEstimate,
                marketActivityScore, updatedAt
            ) VALUES (
                @playerId, 0, null, 0, 0, 0, 0, 0, 0, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null,
                0, 0, 0, 0, 0, 0, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, null, 1000, 1000, 1000, 0, 1000, 0, NOW()
            )`,
            { playerId }
        );
        return await this.executeStmt(stmt);
    }
}
