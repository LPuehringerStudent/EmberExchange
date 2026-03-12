import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { StoveTypeStatisticsRow } from "../../shared/model";

export interface MarketSummary {
    totalStoves: number;
    totalListed: number;
    totalSales: number;
    avgListedPercent: number;
}

export class StoveTypeStatisticsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Calculates statistics for a specific stove type from actual data.
     */
    private calculateStoveTypeStats(stoveTypeId: number): StoveTypeStatisticsRow | null {
        // Check if stove type exists
        const typeStmt = this.unit.prepare<{ stoveTypeId: number; name: string; rarity: string }>(
            "SELECT typeId as stoveTypeId, name, rarity FROM StoveType WHERE typeId = @typeId",
            { typeId: stoveTypeId }
        );
        const stoveType = typeStmt.get();
        if (!stoveType) return null;

        // Total minted (count of stoves of this type)
        const mintedStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE typeId = @typeId",
            { typeId: stoveTypeId }
        );
        const totalMinted = mintedStmt.get()?.count ?? 0;

        // Currently owned (should equal total minted)
        const ownedStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM Stove 
             WHERE typeId = @typeId AND currentOwnerId IS NOT NULL`,
            { typeId: stoveTypeId }
        );
        const currentlyOwned = ownedStmt.get()?.count ?? 0;

        // Currently listed
        const listedStmt = this.unit.prepare<{ count: number; avgPrice: number; minPrice: number; maxPrice: number }>(
            `SELECT 
                COUNT(*) as count,
                COALESCE(AVG(price), 0) as avgPrice,
                COALESCE(MIN(price), 0) as minPrice,
                COALESCE(MAX(price), 0) as maxPrice
             FROM Listing l
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId AND l.status = 'active'`,
            { typeId: stoveTypeId }
        );
        const listedResult = listedStmt.get();
        const currentlyListed = listedResult?.count ?? 0;
        const averageListingPrice = listedResult?.avgPrice ?? 0;
        const currentLowestPrice = listedResult && listedResult.minPrice > 0 ? listedResult.minPrice : null;
        const currentHighestPrice = listedResult && listedResult.maxPrice > 0 ? listedResult.maxPrice : null;

        // Calculate listed percentage
        const totalStoves = this.getTotalStoveCount();
        const listedPercent = totalStoves > 0 ? (currentlyListed / totalStoves) * 100 : 0;

        // Sales statistics
        const salesStmt = this.unit.prepare<{ 
            count: number; 
            avgPrice: number; 
            maxPrice: number; 
            minPrice: number;
            lastPrice: number;
        }>(
            `SELECT 
                COUNT(*) as count,
                COALESCE(AVG(l.price), 0) as avgPrice,
                COALESCE(MAX(l.price), 0) as maxPrice,
                COALESCE(MIN(l.price), 0) as minPrice,
                COALESCE((SELECT price FROM Trade t2 
                  JOIN Listing l2 ON t2.listingId = l2.listingId
                  JOIN Stove s2 ON l2.stoveId = s2.stoveId
                  WHERE s2.typeId = @typeId
                  ORDER BY t2.executedAt DESC LIMIT 1), 0) as lastPrice
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId`,
            { typeId: stoveTypeId }
        );
        const salesResult = salesStmt.get();
        const totalSales = salesResult?.count ?? 0;
        const averageSalePrice = salesResult?.avgPrice ?? 0;
        const highestSalePrice = salesResult && salesResult.maxPrice > 0 ? salesResult.maxPrice : null;
        const lowestSalePrice = salesResult && salesResult.minPrice > 0 ? salesResult.minPrice : null;
        const lastSalePrice = salesResult && salesResult.lastPrice > 0 ? salesResult.lastPrice : null;

        // Calculate total volume traded
        const volumeStmt = this.unit.prepare<{ volume: number }>(
            `SELECT COALESCE(SUM(l.price), 0) as volume
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId`,
            { typeId: stoveTypeId }
        );
        const totalVolumeTraded = volumeStmt.get()?.volume ?? 0;

        // Sales in last 7 days
        const sales7dStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId 
             AND t.executedAt >= datetime('now', '-7 days')`,
            { typeId: stoveTypeId }
        );
        const salesLast7Days = sales7dStmt.get()?.count ?? 0;

        // Sales in last 30 days
        const sales30dStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId 
             AND t.executedAt >= datetime('now', '-30 days')`,
            { typeId: stoveTypeId }
        );
        const salesLast30Days = sales30dStmt.get()?.count ?? 0;

        // Percent of total supply
        const percentOfTotalSupply = totalStoves > 0 ? (totalMinted / totalStoves) * 100 : 0;

        return {
            statId: stoveTypeId,
            stoveTypeId: stoveTypeId,
            totalMinted: totalMinted,
            currentlyOwned: currentlyOwned,
            currentlyListed: currentlyListed,
            listedPercent: listedPercent,
            currentLowestPrice: currentLowestPrice,
            currentHighestPrice: currentHighestPrice,
            averageListingPrice: averageListingPrice,
            lastSalePrice: lastSalePrice,
            averageSalePrice: averageSalePrice,
            priceHistory7d: "[]", // Would need price history aggregation
            priceHistory30d: "[]",
            allTimeHighPrice: highestSalePrice,
            allTimeLowPrice: lowestSalePrice,
            totalSales: totalSales,
            salesLast7Days: salesLast7Days,
            salesLast30Days: salesLast30Days,
            viewsCount: 0, // Would need a views table
            totalDroppedFromLootboxes: totalMinted, // Assume all came from lootboxes
            actualDropRate: 0, // Would need to calculate from lootbox openings
            percentOfTotalSupply: percentOfTotalSupply,
            rarityRank: 0, // Would need to calculate based on totalMinted
            priceTrend7d: 0,
            priceTrend30d: 0,
            demandTrend: "stable",
            updatedAt: new Date()
        };
    }

    private getTotalStoveCount(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove"
        );
        return stmt.get()?.count ?? 0;
    }

    /**
     * Retrieves all stove type statistics (calculated from real data).
     */
    getAll(): StoveTypeStatisticsRow[] {
        const stmt = this.unit.prepare<{ typeId: number }>(
            "SELECT typeId FROM StoveType ORDER BY typeId"
        );
        const types = stmt.all();
        
        return types
            .map(t => this.calculateStoveTypeStats(t.typeId))
            .filter((s): s is StoveTypeStatisticsRow => s !== null);
    }

    /**
     * Retrieves statistics for a specific stove type.
     */
    getByStoveTypeId(stoveTypeId: number): StoveTypeStatisticsRow | null {
        return this.calculateStoveTypeStats(stoveTypeId);
    }

    /**
     * Gets top stove types by sales volume.
     */
    getTopBySales(limit: number): StoveTypeStatisticsRow[] {
        return this.getAll()
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, limit);
    }

    /**
     * Gets most viewed stove types.
     * @deprecated Views not tracked yet
     */
    getMostViewed(limit: number): StoveTypeStatisticsRow[] {
        return this.getAll().slice(0, limit);
    }

    /**
     * Gets market summary across all stove types.
     */
    getMarketSummary(): MarketSummary {
        const allStats = this.getAll();
        
        const totalStoves = allStats.reduce((sum, s) => sum + s.totalMinted, 0);
        const totalListed = allStats.reduce((sum, s) => sum + s.currentlyListed, 0);
        const totalSales = allStats.reduce((sum, s) => sum + s.totalSales, 0);
        const avgListedPercent = allStats.length > 0
            ? allStats.reduce((sum, s) => sum + s.listedPercent, 0) / allStats.length
            : 0;

        return {
            totalStoves,
            totalListed,
            totalSales,
            avgListedPercent
        };
    }

    /**
     * Gets stove types by demand trend.
     * @deprecated Trends not calculated yet
     */
    getByTrend(_trend: 'increasing' | 'stable' | 'decreasing'): StoveTypeStatisticsRow[] {
        return this.getAll();
    }

    /**
     * Alias for getByTrend to match router expectation.
     */
    getByDemandTrend(trend: 'increasing' | 'stable' | 'decreasing'): StoveTypeStatisticsRow[] {
        return this.getByTrend(trend);
    }

    /**
     * Creates statistics for a stove type.
     * @deprecated Statistics are now calculated on-demand
     */
    create(_stoveTypeId: number, _expectedDropRate: number, _rarityRank: number): [boolean, number] {
        return [true, 1];
    }

    /**
     * Increments view count for a stove type.
     * @deprecated Views not tracked yet
     */
    incrementViews(_stoveTypeId: number): boolean {
        return true;
    }

    /**
     * Deletes stove type statistics.
     * @deprecated Statistics are now calculated on-demand
     */
    delete(_stoveTypeId: number): boolean {
        return true;
    }
}
