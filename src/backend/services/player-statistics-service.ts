import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerStatisticsRow } from "../../shared/model";

export class PlayerStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all player statistics.
     * @returns Array of all PlayerStatisticsRow objects.
     */
    getAll(): PlayerStatisticsRow[] {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            "SELECT * FROM PlayerStatistics ORDER BY marketActivityScore DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves statistics for a specific player.
     * @param playerId - The player ID.
     * @returns PlayerStatisticsRow or null if not found.
     */
    getByPlayerId(playerId: number): PlayerStatisticsRow | null {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            "SELECT * FROM PlayerStatistics WHERE playerId = @playerId",
            { playerId }
        );
        return stmt.get() ?? null;
    }

    /**
     * Gets top players by market activity score.
     * @param limit - Number of players to return.
     * @returns Array of PlayerStatisticsRow objects.
     */
    getTopByActivity(limit: number): PlayerStatisticsRow[] {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            "SELECT * FROM PlayerStatistics ORDER BY marketActivityScore DESC LIMIT @limit",
            { limit }
        );
        return stmt.all();
    }

    /**
     * Gets top players by net worth.
     * @param limit - Number of players to return.
     * @returns Array of PlayerStatisticsRow objects.
     */
    getTopByNetWorth(limit: number): PlayerStatisticsRow[] {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            "SELECT * FROM PlayerStatistics ORDER BY netWorthEstimate DESC LIMIT @limit",
            { limit }
        );
        return stmt.all();
    }

    /**
     * Creates initial statistics record for a player.
     * @param playerId - The player ID.
     * @returns Tuple [success, id].
     */
    create(playerId: number): [boolean, number] {
        const stmt = this.unit.prepare<PlayerStatisticsRow>(
            `INSERT INTO PlayerStatistics (playerId, totalLogins, lastLoginAt, totalSessionMinutes, longestSessionMinutes,
             totalLootboxesOpened, totalLootboxesPurchased, totalLootboxesFree, totalCoinsSpentOnLootboxes,
             bestDropRarity, totalStovesFromLootboxes, totalListingsCreated, totalListingsSold, totalListingsCancelled,
             totalListingsExpired, totalPurchases, totalSalesRevenue, totalPurchaseSpending, averageListingPrice,
             averageSalePrice, fastestSaleMinutes, totalTradesCompleted, totalMiniGamesPlayed, totalMiniGameWins,
             totalMiniGameLosses, totalCoinsFromMiniGames, totalCoinsLostInMiniGames, favoriteGameType, luckiestWin,
             totalMessagesSent, totalMessagesReceived, totalGlobalMessages, totalPrivateMessages, currentStoveCount,
             totalStovesAcquired, totalStovesSold, totalStovesTraded, rarestStoveOwned, highestCoinBalance,
             lowestCoinBalance, totalCoinsEarned, totalCoinsSpent, netWorthEstimate, marketActivityScore, updatedAt)
             VALUES (@playerId, 0, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, datetime('now'))`,
            { playerId }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Updates login statistics.
     * @param playerId - The player ID.
     * @param sessionMinutes - Session duration.
     * @returns True if updated.
     */
    recordLogin(playerId: number, sessionMinutes: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalLogins = totalLogins + 1,
             lastLoginAt = datetime('now'),
             totalSessionMinutes = totalSessionMinutes + @sessionMinutes,
             longestSessionMinutes = MAX(longestSessionMinutes, @sessionMinutes),
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, sessionMinutes }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a lootbox opening.
     * @param playerId - The player ID.
     * @param cost - Coins spent (0 for free).
     * @param rarity - Rarity of stove dropped.
     * @returns True if updated.
     */
    recordLootboxOpened(playerId: number, cost: number, rarity: string): boolean {
        const isFree = cost === 0;
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalLootboxesOpened = totalLootboxesOpened + 1,
             totalLootboxesPurchased = totalLootboxesPurchased + @purchased,
             totalLootboxesFree = totalLootboxesFree + @free,
             totalCoinsSpentOnLootboxes = totalCoinsSpentOnLootboxes + @cost,
             bestDropRarity = CASE WHEN @rarityRank > COALESCE(
                 CASE bestDropRarity 
                     WHEN 'limited' THEN 5 WHEN 'legendary' THEN 4 WHEN 'epic' THEN 3 
                     WHEN 'rare' THEN 2 ELSE 1 
                 END, 0) THEN @rarity ELSE bestDropRarity END,
             totalStovesFromLootboxes = totalStovesFromLootboxes + 1,
             currentStoveCount = currentStoveCount + 1,
             totalStovesAcquired = totalStovesAcquired + 1,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, cost, purchased: isFree ? 0 : 1, free: isFree ? 1 : 0, rarity, rarityRank: this.getRarityRank(rarity) }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a listing creation.
     * @param playerId - The player ID.
     * @param price - Listing price.
     * @returns True if updated.
     */
    recordListingCreated(playerId: number, price: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalListingsCreated = totalListingsCreated + 1,
             averageListingPrice = (averageListingPrice * (totalListingsCreated - 1) + @price) / totalListingsCreated,
             marketActivityScore = marketActivityScore + 5,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, price }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a sale.
     * @param playerId - The seller ID.
     * @param price - Sale price.
     * @param timeToSellMinutes - Time from listing to sale.
     * @returns True if updated.
     */
    recordSale(playerId: number, price: number, timeToSellMinutes: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalListingsSold = totalListingsSold + 1,
             totalSalesRevenue = totalSalesRevenue + @price,
             averageSalePrice = (averageSalePrice * (totalListingsSold - 1) + @price) / totalListingsSold,
             fastestSaleMinutes = CASE WHEN fastestSaleMinutes IS NULL OR @timeToSell < fastestSaleMinutes 
                 THEN @timeToSell ELSE fastestSaleMinutes END,
             currentStoveCount = currentStoveCount - 1,
             totalStovesSold = totalStovesSold + 1,
             marketActivityScore = marketActivityScore + 10,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, price, timeToSell: timeToSellMinutes }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a purchase.
     * @param playerId - The buyer ID.
     * @param price - Purchase price.
     * @returns True if updated.
     */
    recordPurchase(playerId: number, price: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalPurchases = totalPurchases + 1,
             totalPurchaseSpending = totalPurchaseSpending + @price,
             currentStoveCount = currentStoveCount + 1,
             totalStovesAcquired = totalStovesAcquired + 1,
             marketActivityScore = marketActivityScore + 10,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, price }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a mini-game session.
     * @param playerId - The player ID.
     * @param gameType - Type of game.
     * @param coinPayout - Coins won (0 for loss).
     * @returns True if updated.
     */
    recordMiniGame(playerId: number, gameType: string, coinPayout: number): boolean {
        const won = coinPayout > 0;
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalMiniGamesPlayed = totalMiniGamesPlayed + 1,
             totalMiniGameWins = totalMiniGameWins + @wins,
             totalMiniGameLosses = totalMiniGameLosses + @losses,
             totalCoinsFromMiniGames = totalCoinsFromMiniGames + @winnings,
             totalCoinsLostInMiniGames = totalCoinsLostInMiniGames + @lossesAmount,
             favoriteGameType = @gameType,
             luckiestWin = MAX(luckiestWin, @coinPayout),
             marketActivityScore = marketActivityScore + 2,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, gameType, wins: won ? 1 : 0, losses: won ? 0 : 1, winnings: won ? coinPayout : 0, lossesAmount: won ? 0 : 10, coinPayout }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a message sent.
     * @param playerId - The sender ID.
     * @param isGlobal - Whether it was a global message.
     * @returns True if updated.
     */
    recordMessageSent(playerId: number, isGlobal: boolean): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalMessagesSent = totalMessagesSent + 1,
             totalGlobalMessages = totalGlobalMessages + @global,
             totalPrivateMessages = totalPrivateMessages + @private,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, global: isGlobal ? 1 : 0, private: isGlobal ? 0 : 1 }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a message received.
     * @param playerId - The receiver ID.
     * @returns True if updated.
     */
    recordMessageReceived(playerId: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             totalMessagesReceived = totalMessagesReceived + 1,
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates coin balance stats.
     * @param playerId - The player ID.
     * @param currentBalance - Current coin balance.
     * @returns True if updated.
     */
    updateCoinStats(playerId: number, currentBalance: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE PlayerStatistics SET 
             highestCoinBalance = MAX(highestCoinBalance, @currentBalance),
             lowestCoinBalance = CASE WHEN lowestCoinBalance = 0 THEN @currentBalance 
                 ELSE MIN(lowestCoinBalance, @currentBalance) END,
             netWorthEstimate = @currentBalance + (currentStoveCount * 1000),
             updatedAt = datetime('now')
             WHERE playerId = @playerId`,
            { playerId, currentBalance }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes statistics for a player.
     * @param playerId - The player ID.
     * @returns True if deleted.
     */
    delete(playerId: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM PlayerStatistics WHERE playerId = @playerId",
            { playerId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    private getRarityRank(rarity: string): number {
        switch (rarity) {
            case 'limited': return 5;
            case 'legendary': return 4;
            case 'epic': return 3;
            case 'rare': return 2;
            default: return 1;
        }
    }
}
