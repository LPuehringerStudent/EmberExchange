import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { DailyStatisticsRow } from "../../shared/model";

export class DailyStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all daily statistics.
     * @returns Array of all DailyStatisticsRow objects.
     */
    getAll(): DailyStatisticsRow[] {
        const stmt = this.unit.prepare<DailyStatisticsRow>(
            "SELECT * FROM DailyStatistics ORDER BY date DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves statistics for a specific date.
     * @param date - The date (YYYY-MM-DD).
     * @returns DailyStatisticsRow or null if not found.
     */
    getByDate(date: string): DailyStatisticsRow | null {
        const stmt = this.unit.prepare<DailyStatisticsRow>(
            "SELECT * FROM DailyStatistics WHERE date = @date",
            { date }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves statistics for a date range.
     * @param fromDate - Start date (YYYY-MM-DD).
     * @param toDate - End date (YYYY-MM-DD).
     * @returns Array of DailyStatisticsRow objects.
     */
    getByDateRange(fromDate: string, toDate: string): DailyStatisticsRow[] {
        const stmt = this.unit.prepare<DailyStatisticsRow>(
            "SELECT * FROM DailyStatistics WHERE date BETWEEN @fromDate AND @toDate ORDER BY date DESC",
            { fromDate, toDate }
        );
        return stmt.all();
    }

    /**
     * Gets today's statistics.
     * @returns DailyStatisticsRow or null if not found.
     */
    getToday(): DailyStatisticsRow | null {
        const today = new Date().toISOString().split('T')[0];
        return this.getByDate(today);
    }

    /**
     * Creates a new daily statistics record.
     * @param date - The date (YYYY-MM-DD).
     * @returns Tuple [success, id].
     */
    create(date: string): [boolean, number] {
        const stmt = this.unit.prepare<DailyStatisticsRow>(
            `INSERT INTO DailyStatistics (date, uniquePlayersLoggedIn, newPlayersJoined, totalSessions,
             averageSessionMinutes, lootboxesOpenedToday, lootboxesPurchasedToday, coinsSpentOnLootboxesToday,
             newListingsToday, listingsSoldToday, listingsCancelledToday, averageListingPriceToday,
             averageSalePriceToday, totalTradingVolume, priceChangePercent, miniGamesPlayedToday,
             totalCoinPayoutsToday, houseProfit, messagesSentToday, uniqueChattersToday,
             totalCoinsInCirculation, totalStovesInExistence, averagePlayerNetWorth, medianPlayerNetWorth,
             wealthGapRatio, averageTimeToSellHours, sellThroughRate, createdAt)
             VALUES (@date, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, datetime('now'))`,
            { date }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Gets or creates today's record.
     * @returns The statId for today.
     */
    getOrCreateToday(): number {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.getByDate(today);
        if (existing) {
            return existing.statId;
        }
        const [success, id] = this.create(today);
        if (!success) {
            throw new Error("Failed to create daily statistics record");
        }
        return id;
    }

    /**
     * Records a player login.
     * @param date - The date (YYYY-MM-DD).
     * @returns True if updated.
     */
    recordLogin(date: string): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             uniquePlayersLoggedIn = uniquePlayersLoggedIn + 1,
             totalSessions = totalSessions + 1
             WHERE date = @date`,
            { date }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a new player joining.
     * @param date - The date (YYYY-MM-DD).
     * @returns True if updated.
     */
    recordNewPlayer(date: string): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             newPlayersJoined = newPlayersJoined + 1
             WHERE date = @date`,
            { date }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records session time.
     * @param date - The date (YYYY-MM-DD).
     * @param minutes - Session duration.
     * @returns True if updated.
     */
    recordSessionTime(date: string, minutes: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             averageSessionMinutes = (averageSessionMinutes * (totalSessions - 1) + @minutes) / totalSessions
             WHERE date = @date`,
            { date, minutes }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a lootbox opening.
     * @param date - The date (YYYY-MM-DD).
     * @param cost - Coins spent.
     * @returns True if updated.
     */
    recordLootboxOpened(date: string, cost: number): boolean {
        const purchased = cost > 0 ? 1 : 0;
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             lootboxesOpenedToday = lootboxesOpenedToday + 1,
             lootboxesPurchasedToday = lootboxesPurchasedToday + @purchased,
             coinsSpentOnLootboxesToday = coinsSpentOnLootboxesToday + @cost
             WHERE date = @date`,
            { date, cost, purchased }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a listing created.
     * @param date - The date (YYYY-MM-DD).
     * @param price - Listing price.
     * @returns True if updated.
     */
    recordListingCreated(date: string, price: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             newListingsToday = newListingsToday + 1,
             averageListingPriceToday = (averageListingPriceToday * newListingsToday + @price) / (newListingsToday + 1)
             WHERE date = @date`,
            { date, price }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a sale.
     * @param date - The date (YYYY-MM-DD).
     * @param price - Sale price.
     * @returns True if updated.
     */
    recordSale(date: string, price: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             listingsSoldToday = listingsSoldToday + 1,
             totalTradingVolume = totalTradingVolume + @price,
             averageSalePriceToday = (averageSalePriceToday * listingsSoldToday + @price) / (listingsSoldToday + 1)
             WHERE date = @date`,
            { date, price }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a cancelled listing.
     * @param date - The date (YYYY-MM-DD).
     * @returns True if updated.
     */
    recordListingCancelled(date: string): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             listingsCancelledToday = listingsCancelledToday + 1
             WHERE date = @date`,
            { date }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a mini-game session.
     * @param date - The date (YYYY-MM-DD).
     * @param coinPayout - Coins paid out.
     * @returns True if updated.
     */
    recordMiniGame(date: string, coinPayout: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             miniGamesPlayedToday = miniGamesPlayedToday + 1,
             totalCoinPayoutsToday = totalCoinPayoutsToday + @coinPayout,
             houseProfit = houseProfit - @coinPayout
             WHERE date = @date`,
            { date, coinPayout }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a message sent.
     * @param date - The date (YYYY-MM-DD).
     * @returns True if updated.
     */
    recordMessageSent(date: string): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             messagesSentToday = messagesSentToday + 1
             WHERE date = @date`,
            { date }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates economic metrics.
     * @param date - The date (YYYY-MM-DD).
     * @param totalCoins - Total coins in circulation.
     * @param totalStoves - Total stoves in existence.
     * @param avgNetWorth - Average player net worth.
     * @returns True if updated.
     */
    updateEconomicMetrics(date: string, totalCoins: number, totalStoves: number, avgNetWorth: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             totalCoinsInCirculation = @totalCoins,
             totalStovesInExistence = @totalStoves,
             averagePlayerNetWorth = @avgNetWorth
             WHERE date = @date`,
            { date, totalCoins, totalStoves, avgNetWorth }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates market velocity metrics.
     * @param date - The date (YYYY-MM-DD).
     * @param avgTimeToSellHours - Average time to sell.
     * @param sellThroughRate - Percentage of listings that sell.
     * @returns True if updated.
     */
    updateMarketVelocity(date: string, avgTimeToSellHours: number, sellThroughRate: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE DailyStatistics SET 
             averageTimeToSellHours = @avgTimeToSellHours,
             sellThroughRate = @sellThroughRate
             WHERE date = @date`,
            { date, avgTimeToSellHours, sellThroughRate }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a daily statistics record.
     * @param date - The date (YYYY-MM-DD).
     * @returns True if deleted.
     */
    delete(date: string): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM DailyStatistics WHERE date = @date",
            { date }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Gets summary statistics for the last N days.
     * @param days - Number of days.
     * @returns Summary object.
     */
    getSummary(days: number): { totalLootboxes: number; totalSales: number; totalVolume: number; avgPlayers: number } {
        const stmt = this.unit.prepare<{
            totalLootboxes: number;
            totalSales: number;
            totalVolume: number;
            avgPlayers: number;
        }>(
            `SELECT 
                SUM(lootboxesOpenedToday) as totalLootboxes,
                SUM(listingsSoldToday) as totalSales,
                SUM(totalTradingVolume) as totalVolume,
                AVG(uniquePlayersLoggedIn) as avgPlayers
             FROM DailyStatistics 
             WHERE date >= date('now', '-' || @days || ' days')`,
            { days }
        );
        const result = stmt.get();
        return {
            totalLootboxes: result?.totalLootboxes ?? 0,
            totalSales: result?.totalSales ?? 0,
            totalVolume: result?.totalVolume ?? 0,
            avgPlayers: Math.round(result?.avgPlayers ?? 0)
        };
    }
}
