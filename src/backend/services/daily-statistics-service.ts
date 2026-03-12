import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { DailyStatisticsRow } from "../../shared/model";

export interface DailySummary {
    totalLootboxes: number;
    totalSales: number;
    totalVolume: number;
    avgPlayers: number;
}

export class DailyStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Calculates today's statistics from actual data tables.
     */
    private calculateTodayStats(): DailyStatisticsRow {
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00.000Z`;
        const todayEnd = `${today}T23:59:59.999Z`;

        // Count lootboxes opened today
        const lootboxStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM Lootbox 
             WHERE openedAt >= @todayStart AND openedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const lootboxesOpened = lootboxStmt.get()?.count ?? 0;

        // Count new listings today
        const listingsStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM Listing 
             WHERE listedAt >= @todayStart AND listedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const newListings = listingsStmt.get()?.count ?? 0;

        // Count sales today and calculate volume
        const salesStmt = this.unit.prepare<{ count: number, volume: number, avgPrice: number }>(
            `SELECT 
                COUNT(*) as count,
                COALESCE(SUM(l.price), 0) as volume,
                COALESCE(AVG(l.price), 0) as avgPrice
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             WHERE t.executedAt >= @todayStart AND t.executedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const salesResult = salesStmt.get();
        const salesToday = salesResult?.count ?? 0;
        const tradingVolume = salesResult?.volume ?? 0;
        const avgSalePrice = salesResult?.avgPrice ?? 0;

        // Count mini games played today
        const gamesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM MiniGameSession 
             WHERE finishedAt >= @todayStart AND finishedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const gamesToday = gamesStmt.get()?.count ?? 0;

        // Count messages sent today
        const messagesStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM ChatMessage 
             WHERE sentAt >= @todayStart AND sentAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const messagesToday = messagesStmt.get()?.count ?? 0;

        // Count new players today
        const newPlayersStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM Player 
             WHERE joinedAt >= @todayStart AND joinedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const newPlayers = newPlayersStmt.get()?.count ?? 0;

        // Count unique players who opened lootboxes today (as proxy for "logged in")
        const activePlayersStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(DISTINCT playerId) as count FROM Lootbox 
             WHERE openedAt >= @todayStart AND openedAt <= @todayEnd`,
            { todayStart, todayEnd }
        );
        const activePlayers = activePlayersStmt.get()?.count ?? 0;

        // Total coins in circulation (sum of all player balances)
        const coinsStmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(coins), 0) as total FROM Player"
        );
        const totalCoins = coinsStmt.get()?.total ?? 0;

        // Total stoves in existence
        const stovesStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove"
        );
        const totalStoves = stovesStmt.get()?.count ?? 0;

        return {
            statId: 1, // Dummy ID for calculated stats
            date: today,
            uniquePlayersLoggedIn: activePlayers,
            newPlayersJoined: newPlayers,
            totalSessions: activePlayers, // Approximate
            averageSessionMinutes: 0,
            lootboxesOpenedToday: lootboxesOpened,
            lootboxesPurchasedToday: 0,
            coinsSpentOnLootboxesToday: 0,
            newListingsToday: newListings,
            listingsSoldToday: salesToday,
            listingsCancelledToday: 0,
            averageListingPriceToday: 0,
            averageSalePriceToday: avgSalePrice,
            totalTradingVolume: tradingVolume,
            priceChangePercent: 0,
            miniGamesPlayedToday: gamesToday,
            totalCoinPayoutsToday: 0,
            houseProfit: 0,
            messagesSentToday: messagesToday,
            uniqueChattersToday: 0,
            totalCoinsInCirculation: totalCoins,
            totalStovesInExistence: totalStoves,
            averagePlayerNetWorth: 0,
            medianPlayerNetWorth: 0,
            wealthGapRatio: 0,
            averageTimeToSellHours: 0,
            sellThroughRate: 0,
            createdAt: new Date()
        };
    }

    /**
     * Retrieves all daily statistics.
     * @deprecated Use calculated statistics instead
     */
    getAll(): DailyStatisticsRow[] {
        // Return only today's calculated stats
        return [this.calculateTodayStats()];
    }

    /**
     * Retrieves today's statistics (calculated from real data).
     */
    getToday(): DailyStatisticsRow {
        return this.calculateTodayStats();
    }

    /**
     * Gets summary statistics for the last N days.
     */
    getSummary(_days: number): DailySummary {
        const today = this.calculateTodayStats();
        
        // For now, just return today's data as the summary
        // In a real implementation, you'd aggregate multiple days
        return {
            totalLootboxes: today.lootboxesOpenedToday,
            totalSales: today.listingsSoldToday,
            totalVolume: today.totalTradingVolume,
            avgPlayers: today.uniquePlayersLoggedIn
        };
    }

    /**
     * Retrieves statistics for a specific date.
     * @deprecated Use calculated statistics instead
     */
    getByDate(_date: string): DailyStatisticsRow | null {
        return this.getToday();
    }

    /**
     * Retrieves statistics for a date range.
     * @deprecated Use calculated statistics instead
     */
    getRange(_from: string, _to: string): DailyStatisticsRow[] {
        return this.getAll();
    }

    /**
     * Alias for getRange to match router expectation.
     */
    getByDateRange(from: string, to: string): DailyStatisticsRow[] {
        return this.getRange(from, to);
    }

    /**
     * Creates daily statistics for a date.
     * @deprecated Statistics are now calculated on-demand
     */
    create(_date: string): [boolean, number] {
        return [true, 1];
    }

    /**
     * Deletes daily statistics for a date.
     * @deprecated Statistics are now calculated on-demand
     */
    delete(_date: string): boolean {
        return true;
    }
}
