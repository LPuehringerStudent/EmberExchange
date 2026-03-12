import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { StoveTypeStatisticsRow } from "../../shared/model";

export class StoveTypeStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all stove type statistics.
     * @returns Array of all StoveTypeStatisticsRow objects.
     */
    getAll(): StoveTypeStatisticsRow[] {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            "SELECT * FROM StoveTypeStatistics ORDER BY rarityRank DESC, totalSales DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves statistics for a specific stove type.
     * @param stoveTypeId - The stove type ID.
     * @returns StoveTypeStatisticsRow or null if not found.
     */
    getByStoveTypeId(stoveTypeId: number): StoveTypeStatisticsRow | null {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            "SELECT * FROM StoveTypeStatistics WHERE stoveTypeId = @stoveTypeId",
            { stoveTypeId }
        );
        return stmt.get() ?? null;
    }

    /**
     * Gets top performing stove types by sales.
     * @param limit - Number of types to return.
     * @returns Array of StoveTypeStatisticsRow objects.
     */
    getTopBySales(limit: number): StoveTypeStatisticsRow[] {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            "SELECT * FROM StoveTypeStatistics ORDER BY totalSales DESC LIMIT @limit",
            { limit }
        );
        return stmt.all();
    }

    /**
     * Gets stove types by demand trend.
     * @param trend - The trend direction.
     * @returns Array of StoveTypeStatisticsRow objects.
     */
    getByDemandTrend(trend: "increasing" | "stable" | "decreasing"): StoveTypeStatisticsRow[] {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            "SELECT * FROM StoveTypeStatistics WHERE demandTrend = @trend ORDER BY priceTrend7d DESC",
            { trend }
        );
        return stmt.all();
    }

    /**
     * Gets most viewed stove types.
     * @param limit - Number of types to return.
     * @returns Array of StoveTypeStatisticsRow objects.
     */
    getMostViewed(limit: number): StoveTypeStatisticsRow[] {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            "SELECT * FROM StoveTypeStatistics ORDER BY viewsCount DESC LIMIT @limit",
            { limit }
        );
        return stmt.all();
    }

    /**
     * Creates initial statistics record for a stove type.
     * @param stoveTypeId - The stove type ID.
     * @param expectedDropRate - Expected drop rate from lootbox weight.
     * @param rarityRank - Rarity ranking.
     * @returns Tuple [success, id].
     */
    create(stoveTypeId: number, expectedDropRate: number, rarityRank: number): [boolean, number] {
        const stmt = this.unit.prepare<StoveTypeStatisticsRow>(
            `INSERT INTO StoveTypeStatistics (stoveTypeId, totalMinted, currentlyOwned, currentlyListed,
             listedPercent, averageListingPrice, averageSalePrice, priceHistory7d, priceHistory30d,
             totalSales, salesLast7Days, salesLast30Days, viewsCount, totalDroppedFromLootboxes,
             actualDropRate, percentOfTotalSupply, rarityRank, priceTrend7d, priceTrend30d, demandTrend, updatedAt)
             VALUES (@stoveTypeId, 0, 0, 0, 0, 0, 0, '[]', '[]', 0, 0, 0, 0, 0, @expectedDropRate, 0, @rarityRank, 0, 0, 'stable', datetime('now'))`,
            { stoveTypeId, expectedDropRate, rarityRank }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Records a stove being minted/created.
     * @param stoveTypeId - The stove type ID.
     * @param fromLootbox - Whether it came from a lootbox.
     * @returns True if updated.
     */
    recordMint(stoveTypeId: number, fromLootbox: boolean): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             totalMinted = totalMinted + 1,
             currentlyOwned = currentlyOwned + 1,
             totalDroppedFromLootboxes = totalDroppedFromLootboxes + @fromLootbox,
             listedPercent = (CAST(currentlyListed AS REAL) / (currentlyOwned + 1)) * 100,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, fromLootbox: fromLootbox ? 1 : 0 }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a listing being created.
     * @param stoveTypeId - The stove type ID.
     * @param price - Listing price.
     * @returns True if updated.
     */
    recordListing(stoveTypeId: number, price: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             currentlyListed = currentlyListed + 1,
             currentLowestPrice = CASE WHEN currentLowestPrice IS NULL OR @price < currentLowestPrice 
                 THEN @price ELSE currentLowestPrice END,
             currentHighestPrice = CASE WHEN currentHighestPrice IS NULL OR @price > currentHighestPrice 
                 THEN @price ELSE currentHighestPrice END,
             averageListingPrice = (averageListingPrice * currentlyListed + @price) / (currentlyListed + 1),
             listedPercent = (CAST(currentlyListed + 1 AS REAL) / currentlyOwned) * 100,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, price }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a listing being cancelled or sold.
     * @param stoveTypeId - The stove type ID.
     * @param wasSold - Whether it was sold (vs cancelled).
     * @param price - Sale price if sold.
     * @returns True if updated.
     */
    recordListingRemoved(stoveTypeId: number, wasSold: boolean, price?: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             currentlyListed = MAX(0, currentlyListed - 1),
             totalSales = totalSales + @wasSold,
             salesLast7Days = salesLast7Days + @wasSold,
             salesLast30Days = salesLast30Days + @wasSold,
             lastSalePrice = CASE WHEN @wasSold = 1 THEN @price ELSE lastSalePrice END,
             averageSalePrice = CASE WHEN @wasSold = 1 
                 THEN (averageSalePrice * totalSales + @price) / (totalSales + 1) 
                 ELSE averageSalePrice END,
             listedPercent = CASE WHEN currentlyOwned > 0 
                 THEN (CAST(MAX(0, currentlyListed - 1) AS REAL) / currentlyOwned) * 100 
                 ELSE 0 END,
             allTimeHighPrice = CASE WHEN @wasSold = 1 AND (@price > COALESCE(allTimeHighPrice, 0)) 
                 THEN @price ELSE allTimeHighPrice END,
             allTimeLowPrice = CASE WHEN @wasSold = 1 AND (@price < COALESCE(allTimeLowPrice, @price)) 
                 THEN @price ELSE allTimeLowPrice END,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, wasSold: wasSold ? 1 : 0, price: price ?? 0 }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a stove being transferred (sale or trade).
     * @param stoveTypeId - The stove type ID.
     * @returns True if updated.
     */
    recordTransfer(stoveTypeId: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             currentlyOwned = currentlyOwned,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Records a stove being burned/deleted.
     * @param stoveTypeId - The stove type ID.
     * @returns True if updated.
     */
    recordBurn(stoveTypeId: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             currentlyOwned = MAX(0, currentlyOwned - 1),
             listedPercent = CASE WHEN currentlyOwned > 1 
                 THEN (CAST(currentlyListed AS REAL) / (currentlyOwned - 1)) * 100 
                 ELSE 0 END,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Increments the view count.
     * @param stoveTypeId - The stove type ID.
     * @returns True if updated.
     */
    incrementViews(stoveTypeId: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             viewsCount = viewsCount + 1,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates price trends.
     * @param stoveTypeId - The stove type ID.
     * @param trend7d - 7-day price trend percentage.
     * @param trend30d - 30-day price trend percentage.
     * @returns True if updated.
     */
    updatePriceTrends(stoveTypeId: number, trend7d: number, trend30d: number): boolean {
        let demandTrend: string;
        if (trend7d > 5) demandTrend = 'increasing';
        else if (trend7d < -5) demandTrend = 'decreasing';
        else demandTrend = 'stable';

        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             priceTrend7d = @trend7d,
             priceTrend30d = @trend30d,
             demandTrend = @demandTrend,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, trend7d, trend30d, demandTrend }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates percentage of total supply.
     * @param stoveTypeId - The stove type ID.
     * @param percent - Percentage.
     * @returns True if updated.
     */
    updateSupplyPercent(stoveTypeId: number, percent: number): boolean {
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             percentOfTotalSupply = @percent,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, percent }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Calculates and updates actual drop rate.
     * @param stoveTypeId - The stove type ID.
     * @param totalLootboxesOpened - Total lootboxes opened across platform.
     * @returns True if updated.
     */
    updateActualDropRate(stoveTypeId: number, totalLootboxesOpened: number): boolean {
        if (totalLootboxesOpened === 0) return true;
        
        const stmt = this.unit.prepare(
            `UPDATE StoveTypeStatistics SET 
             actualDropRate = CAST(totalDroppedFromLootboxes AS REAL) / @totalLootboxes,
             updatedAt = datetime('now')
             WHERE stoveTypeId = @stoveTypeId`,
            { stoveTypeId, totalLootboxes: totalLootboxesOpened }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Resets the rolling sales counters (call weekly).
     * @returns True if successful.
     */
    resetWeeklySales(): boolean {
        const stmt = this.unit.prepare(
            "UPDATE StoveTypeStatistics SET salesLast7Days = 0"
        );
        const result = stmt.run();
        return true;
    }

    /**
     * Resets the monthly sales counters (call monthly).
     * @returns True if successful.
     */
    resetMonthlySales(): boolean {
        const stmt = this.unit.prepare(
            "UPDATE StoveTypeStatistics SET salesLast30Days = 0"
        );
        const result = stmt.run();
        return true;
    }

    /**
     * Deletes statistics for a stove type.
     * @param stoveTypeId - The stove type ID.
     * @returns True if deleted.
     */
    delete(stoveTypeId: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM StoveTypeStatistics WHERE stoveTypeId = @stoveTypeId",
            { stoveTypeId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Gets market summary for all stove types.
     * @returns Summary statistics.
     */
    getMarketSummary(): { totalStoves: number; totalListed: number; totalSales: number; avgListedPercent: number } {
        const stmt = this.unit.prepare<{
            totalStoves: number;
            totalListed: number;
            totalSales: number;
            avgListedPercent: number;
        }>(
            `SELECT 
                SUM(currentlyOwned) as totalStoves,
                SUM(currentlyListed) as totalListed,
                SUM(totalSales) as totalSales,
                AVG(listedPercent) as avgListedPercent
             FROM StoveTypeStatistics`
        );
        const result = stmt.get();
        return {
            totalStoves: result?.totalStoves ?? 0,
            totalListed: result?.totalListed ?? 0,
            totalSales: result?.totalSales ?? 0,
            avgListedPercent: Math.round((result?.avgListedPercent ?? 0) * 100) / 100
        };
    }
}
