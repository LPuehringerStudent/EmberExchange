import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerStatisticsRow, PlayerRow } from "../../shared/model";

export class PlayerStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Calculates real player statistics from data tables.
     */
    private calculatePlayerStats(playerId: number): PlayerStatisticsRow | null {
        const player = this.getPlayer(playerId);
        if (!player) return null;

        // Count lootboxes opened
        const lootboxStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Lootbox WHERE playerId = @playerId",
            { playerId }
        );
        const lootboxesOpened = lootboxStmt.get()?.count ?? 0;

        // Count listings created and sold
        const listingsCreatedStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Listing WHERE sellerId = @playerId",
            { playerId }
        );
        const listingsCreated = listingsCreatedStmt.get()?.count ?? 0;

        const listingsSoldStmt = this.unit.prepare<{ count: number, revenue: number }>(
            `SELECT COUNT(*) as count, COALESCE(SUM(l.price), 0) as revenue 
             FROM Listing l
             JOIN Trade t ON l.listingId = t.listingId
             WHERE l.sellerId = @playerId AND l.status = 'sold'`,
            { playerId }
        );
        const listingsResult = listingsSoldStmt.get();
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
        const purchasesResult = purchasesStmt.get();
        const purchasesMade = purchasesResult?.count ?? 0;
        const purchaseSpending = purchasesResult?.spent ?? 0;

        // Count mini games played
        const gamesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const miniGamesPlayed = gamesStmt.get()?.count ?? 0;

        // Count stoves currently owned
        const stovesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE currentOwnerId = @playerId",
            { playerId }
        );
        const stovesOwned = stovesStmt.get()?.count ?? 0;

        // Calculate net worth (coins + value of owned stoves)
        // For simplicity, estimate stove value from average listing price or price history
        const stoveValueStmt = this.unit.prepare<{ value: number }>(
            `SELECT COALESCE(SUM(COALESCE(ph.salePrice, 500)), 0) as value
             FROM Stove s
             LEFT JOIN PriceHistory ph ON s.typeId = ph.typeId
             WHERE s.currentOwnerId = @playerId`,
            { playerId }
        );
        const stoveValue = stoveValueStmt.get()?.value ?? 0;
        const netWorth = player.coins + stoveValue;

        // Calculate market activity score (simple formula)
        const marketActivityScore = (listingsCreated * 10) + (listingsSold * 20) + (purchasesMade * 15);

        return {
            statId: playerId, // Use playerId as statId for calculated stats
            playerId: player.playerId,
            totalLogins: 1, // Would need login tracking table
            lastLoginAt: new Date(),
            totalSessionMinutes: 0, // Would need session tracking
            longestSessionMinutes: 0,
            totalLootboxesOpened: lootboxesOpened,
            totalLootboxesPurchased: 0, // Would need to track acquisition method better
            totalLootboxesFree: lootboxesOpened,
            totalCoinsSpentOnLootboxes: 0,
            bestDropRarity: null,
            totalStovesFromLootboxes: lootboxesOpened, // Assume 1 per lootbox
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
            totalMiniGameWins: 0, // Would need to track wins
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
            totalCoinsEarned: player.coins,
            totalCoinsSpent: purchaseSpending,
            netWorthEstimate: netWorth,
            marketActivityScore: marketActivityScore,
            updatedAt: new Date()
        };
    }

    private getPlayer(playerId: number): PlayerRow | null {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE playerId = @playerId",
            { playerId }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all player statistics (calculated from real data).
     */
    getAll(): PlayerStatisticsRow[] {
        const stmt = this.unit.prepare<{ playerId: number }>(
            "SELECT playerId FROM Player WHERE isAdmin = 0 ORDER BY playerId"
        );
        const players = stmt.all();
        
        return players
            .map(p => this.calculatePlayerStats(p.playerId))
            .filter((s): s is PlayerStatisticsRow => s !== null)
            .sort((a, b) => b.marketActivityScore - a.marketActivityScore);
    }

    /**
     * Retrieves statistics for a specific player.
     */
    getByPlayerId(playerId: number): PlayerStatisticsRow | null {
        return this.calculatePlayerStats(playerId);
    }

    /**
     * Gets top players by market activity score.
     */
    getTopByActivity(limit: number): PlayerStatisticsRow[] {
        return this.getAll().slice(0, limit);
    }

    /**
     * Gets top players by net worth.
     */
    getTopByNetWorth(limit: number): PlayerStatisticsRow[] {
        return this.getAll()
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
}
