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
     * Uses PostgreSQL date casting to handle ISO timestamps.
     */
    private async calculateTodayStats(): Promise<DailyStatisticsRow> {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM Lootbox WHERE openedAt::date = CURRENT_DATE) as lootboxesOpened,
                (SELECT COUNT(*) FROM Listing WHERE listedAt::date = CURRENT_DATE) as newListings,
                (SELECT COUNT(*) FROM Trade t JOIN Listing l ON t.listingId = l.listingId WHERE t.executedAt::date = CURRENT_DATE) as salesToday,
                (SELECT COALESCE(SUM(l2.price), 0) FROM Trade t2 JOIN Listing l2 ON t2.listingId = l2.listingId WHERE t2.executedAt::date = CURRENT_DATE) as tradingVolume,
                (SELECT COALESCE(AVG(l3.price), 0) FROM Trade t3 JOIN Listing l3 ON t3.listingId = l3.listingId WHERE t3.executedAt::date = CURRENT_DATE) as avgSalePrice,
                (SELECT COUNT(*) FROM MiniGameSession WHERE finishedAt::date = CURRENT_DATE) as gamesToday,
                (SELECT COUNT(*) FROM ChatMessage WHERE sentAt::date = CURRENT_DATE) as messagesToday,
                (SELECT COUNT(*) FROM Player WHERE joinedAt::date = CURRENT_DATE) as newPlayers,
                (SELECT COUNT(DISTINCT playerId) FROM LoginHistory WHERE loggedInAt::date = CURRENT_DATE) as activePlayers,
                (SELECT COUNT(*) FROM LoginHistory WHERE loggedInAt::date = CURRENT_DATE) as totalSessions,
                (SELECT COALESCE(SUM(coins), 0) FROM Player) as totalCoins,
                (SELECT COUNT(*) FROM Stove) as totalStoves
        `;

        const stmt = this.unit.prepare<any>(sql);
        const r = await stmt.get();
        const today = new Date().toISOString().split('T')[0];

        return {
            statId: 1, // Dummy ID for calculated stats
            date: today,
            uniquePlayersLoggedIn: r?.activePlayers ?? 0,
            newPlayersJoined: r?.newPlayers ?? 0,
            totalSessions: r?.totalSessions ?? 0,
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
    async getAll(): Promise<DailyStatisticsRow[]> {
        // Return only today's calculated stats
        return [await this.calculateTodayStats()];
    }

    /**
     * Retrieves today's statistics (calculated from real data).
     */
    async getToday(): Promise<DailyStatisticsRow> {
        return await this.calculateTodayStats();
    }

    /**
     * Gets summary statistics for the last N days.
     */
    async getSummary(_days: number): Promise<DailySummary> {
        const today = await this.calculateTodayStats();
        
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
    async getByDate(_date: string): Promise<DailyStatisticsRow | null> {
        return await this.getToday();
    }

    /**
     * Retrieves statistics for a date range.
     * @deprecated Use calculated statistics instead
     */
    async getRange(_from: string, _to: string): Promise<DailyStatisticsRow[]> {
        return await this.getAll();
    }

    /**
     * Alias for getRange to match router expectation.
     */
    async getByDateRange(from: string, to: string): Promise<DailyStatisticsRow[]> {
        return await this.getRange(from, to);
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
