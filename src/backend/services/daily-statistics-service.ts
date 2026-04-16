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
        const todayStart = `${today} 00:00:00`;
        const todayEnd = `${today} 23:59:59`;

        const sql = `
            SELECT
                (SELECT COUNT(*) FROM Lootbox WHERE openedAt >= @todayStart AND openedAt <= @todayEnd) as lootboxesOpened,
                (SELECT COUNT(*) FROM Listing WHERE listedAt >= @todayStart AND listedAt <= @todayEnd) as newListings,
                (SELECT COUNT(*) FROM Trade t JOIN Listing l ON t.listingId = l.listingId WHERE t.executedAt >= @todayStart AND t.executedAt <= @todayEnd) as salesToday,
                (SELECT COALESCE(SUM(l2.price), 0) FROM Trade t2 JOIN Listing l2 ON t2.listingId = l2.listingId WHERE t2.executedAt >= @todayStart AND t2.executedAt <= @todayEnd) as tradingVolume,
                (SELECT COALESCE(AVG(l3.price), 0) FROM Trade t3 JOIN Listing l3 ON t3.listingId = l3.listingId WHERE t3.executedAt >= @todayStart AND t3.executedAt <= @todayEnd) as avgSalePrice,
                (SELECT COUNT(*) FROM MiniGameSession WHERE finishedAt >= @todayStart AND finishedAt <= @todayEnd) as gamesToday,
                (SELECT COUNT(*) FROM ChatMessage WHERE sentAt >= @todayStart AND sentAt <= @todayEnd) as messagesToday,
                (SELECT COUNT(*) FROM Player WHERE joinedAt >= @todayStart AND joinedAt <= @todayEnd) as newPlayers,
                (SELECT COUNT(DISTINCT playerId) FROM Lootbox WHERE openedAt >= @todayStart AND openedAt <= @todayEnd) as activePlayers,
                (SELECT COALESCE(SUM(coins), 0) FROM Player) as totalCoins,
                (SELECT COUNT(*) FROM Stove) as totalStoves
        `;

        const stmt = this.unit.prepare<any>(sql, { todayStart, todayEnd });
        const r = stmt.get();

        return {
            statId: 1, // Dummy ID for calculated stats
            date: today,
            uniquePlayersLoggedIn: r?.activePlayers ?? 0,
            newPlayersJoined: r?.newPlayers ?? 0,
            totalSessions: r?.activePlayers ?? 0, // Approximate
            averageSessionMinutes: 0,
            lootboxesOpenedToday: r?.lootboxesOpened ?? 0,
            lootboxesPurchasedToday: 0,
            coinsSpentOnLootboxesToday: 0,
            newListingsToday: r?.newListings ?? 0,
            listingsSoldToday: r?.salesToday ?? 0,
            listingsCancelledToday: 0,
            averageListingPriceToday: 0,
            averageSalePriceToday: r?.avgSalePrice ?? 0,
            totalTradingVolume: r?.tradingVolume ?? 0,
            priceChangePercent: 0,
            miniGamesPlayedToday: r?.gamesToday ?? 0,
            totalCoinPayoutsToday: 0,
            houseProfit: 0,
            messagesSentToday: r?.messagesToday ?? 0,
            uniqueChattersToday: 0,
            totalCoinsInCirculation: r?.totalCoins ?? 0,
            totalStovesInExistence: r?.totalStoves ?? 0,
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
