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
    private async calculateStoveTypeStats(stoveTypeId: number): Promise<StoveTypeStatisticsRow | null> {
        // Check if stove type exists
        const typeStmt = this.unit.prepare<{ stoveTypeId: number; name: string; rarity: string }>(
            "SELECT typeId as stoveTypeId, name, rarity FROM StoveType WHERE typeId = @typeId",
            { typeId: stoveTypeId }
        );
        const stoveType = await typeStmt.get();
        if (!stoveType) return null;

        // Total minted (count of stoves of this type)
        const mintedStmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE typeId = @typeId",
            { typeId: stoveTypeId }
        );
        const totalMinted = (await mintedStmt.get())?.count ?? 0;

        // Currently owned (should equal total minted)
        const ownedStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM Stove 
             WHERE typeId = @typeId AND currentOwnerId IS NOT NULL`,
            { typeId: stoveTypeId }
        );
        const currentlyOwned = (await ownedStmt.get())?.count ?? 0;

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
        const listedResult = await listedStmt.get();
        const currentlyListed = listedResult?.count ?? 0;
        const averageListingPrice = listedResult?.avgPrice ?? 0;
        const currentLowestPrice = listedResult && listedResult.minPrice > 0 ? listedResult.minPrice : null;
        const currentHighestPrice = listedResult && listedResult.maxPrice > 0 ? listedResult.maxPrice : null;

        // Calculate listed percentage
        const listedPercent = totalMinted > 0 ? (currentlyListed / totalMinted) * 100 : 0;

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
        const salesResult = await salesStmt.get();
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
        const totalVolumeTraded = (await volumeStmt.get())?.volume ?? 0;

        // Sales in last 7 days
        const sales7dStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId 
             AND t.executedAt >= NOW() - INTERVAL '7 days'`,
            { typeId: stoveTypeId }
        );
        const salesLast7Days = (await sales7dStmt.get())?.count ?? 0;

        // Sales in last 30 days
        const sales30dStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM Trade t
             JOIN Listing l ON t.listingId = l.listingId
             JOIN Stove s ON l.stoveId = s.stoveId
             WHERE s.typeId = @typeId 
             AND t.executedAt >= NOW() - INTERVAL '30 days'`,
            { typeId: stoveTypeId }
        );
        const salesLast30Days = (await sales30dStmt.get())?.count ?? 0;

        // Percent of total supply
        const totalStoves = await this.getTotalStoveCount();
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
            totalVolumeTraded: totalVolumeTraded,
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

    private async getTotalStoveCount(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove"
        );
        return (await stmt.get())?.count ?? 0;
    }

    /**
     * Retrieves all stove type statistics (calculated from real data).
     */
    async getAll(): Promise<StoveTypeStatisticsRow[]> {
        const totalStoveCount = await this.getTotalStoveCount();
        const sql = `
            SELECT 
                st.typeId as stoveTypeId,
                st.name,
                st.rarity,
                COALESCE(s_stats.totalMinted, 0) as totalMinted,
                COALESCE(l_stats.currentlyListed, 0) as currentlyListed,
                COALESCE(l_stats.averageListingPrice, 0) as averageListingPrice,
                l_stats.currentLowestPrice,
                l_stats.currentHighestPrice,
                COALESCE(t_stats.totalSales, 0) as totalSales,
                COALESCE(t_stats.totalVolumeTraded, 0) as totalVolumeTraded,
                COALESCE(t_stats.averageSalePrice, 0) as averageSalePrice,
                t_stats.highestSalePrice as allTimeHighPrice,
                t_stats.lowestSalePrice as allTimeLowPrice,
                (SELECT l_sub.price FROM Trade t_sub 
                 JOIN Listing l_sub ON t_sub.listingId = l_sub.listingId 
                 JOIN Stove s_sub ON l_sub.stoveId = s_sub.stoveId 
                 WHERE s_sub.typeId = st.typeId 
                 ORDER BY t_sub.executedAt DESC LIMIT 1) as lastSalePrice,
                COALESCE(t_stats.salesLast7Days, 0) as salesLast7Days,
                COALESCE(t_stats.salesLast30Days, 0) as salesLast30Days
            FROM StoveType st
            LEFT JOIN (
                SELECT typeId, 
                       COUNT(*) as totalMinted,
                       COUNT(currentOwnerId) as currentlyOwned
                FROM Stove GROUP BY typeId
            ) s_stats ON st.typeId = s_stats.typeId
            LEFT JOIN (
                SELECT 
                    s.typeId,
                    COUNT(*) as currentlyListed,
                    AVG(l.price) as averageListingPrice,
                    MIN(l.price) as currentLowestPrice,
                    MAX(l.price) as currentHighestPrice
                FROM Listing l
                JOIN Stove s ON l.stoveId = s.stoveId
                WHERE l.status = 'active'
                GROUP BY s.typeId
            ) l_stats ON st.typeId = l_stats.typeId
            LEFT JOIN (
                SELECT 
                    s.typeId,
                    COUNT(*) as totalSales,
                    SUM(l.price) as totalVolumeTraded,
                    AVG(l.price) as averageSalePrice,
                    MAX(l.price) as highestSalePrice,
                    MIN(l.price) as lowestSalePrice,
                    SUM(CASE WHEN t.executedAt >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as salesLast7Days,
                    SUM(CASE WHEN t.executedAt >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as salesLast30Days
                FROM Trade t
                JOIN Listing l ON t.listingId = l.listingId
                JOIN Stove s ON l.stoveId = s.stoveId
                GROUP BY s.typeId
            ) t_stats ON st.typeId = t_stats.typeId
            ORDER BY st.typeId
        `;
        
        const stmt = this.unit.prepare<any>(sql);
        const results = await stmt.all();
        
        const totalOverallStoves = totalStoveCount || 1; // Prevent division by zero
        
        return results.map(r => {
            const totalMinted = r.totalMinted || 0;
            return {
                statId: r.stoveTypeId,
                stoveTypeId: r.stoveTypeId,
                name: r.name,
                rarity: r.rarity,
                totalMinted: totalMinted,
                currentlyOwned: r.currentlyOwned || 0,
                currentlyListed: r.currentlyListed,
                listedPercent: totalMinted > 0 ? (r.currentlyListed / totalMinted) * 100 : 0,
                averageListingPrice: r.averageListingPrice,
                currentLowestPrice: r.currentLowestPrice,
                currentHighestPrice: r.currentHighestPrice,
                lastSalePrice: r.lastSalePrice,
                averageSalePrice: r.averageSalePrice,
                priceHistory7d: "[]",
                priceHistory30d: "[]",
                allTimeHighPrice: r.allTimeHighPrice,
                allTimeLowPrice: r.allTimeLowPrice,
                totalVolumeTraded: r.totalVolumeTraded,
                totalSales: r.totalSales,
                salesLast7Days: r.salesLast7Days,
                salesLast30Days: r.salesLast30Days,
                viewsCount: 0,
                totalDroppedFromLootboxes: totalMinted,
                actualDropRate: 0,
                percentOfTotalSupply: (totalMinted / totalOverallStoves) * 100,
                rarityRank: 0,
                priceTrend7d: 0,
                priceTrend30d: 0,
                demandTrend: "stable",
                updatedAt: new Date()
            };
        });
    }

    /**
     * Retrieves statistics for a specific stove type.
     */
    async getByStoveTypeId(stoveTypeId: number): Promise<StoveTypeStatisticsRow | null> {
        return await this.calculateStoveTypeStats(stoveTypeId);
    }

    /**
     * Gets top stove types by sales volume.
     */
    async getTopBySales(limit: number): Promise<StoveTypeStatisticsRow[]> {
        return (await this.getAll())
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, limit);
    }

    /**
     * Gets most viewed stove types.
     * @deprecated Views not tracked yet
     */
    async getMostViewed(limit: number): Promise<StoveTypeStatisticsRow[]> {
        return (await this.getAll()).slice(0, limit);
    }

    /**
     * Gets market summary across all stove types.
     */
    async getMarketSummary(): Promise<MarketSummary> {
        const allStats = await this.getAll();
        
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
    async getByTrend(_trend: 'increasing' | 'stable' | 'decreasing'): Promise<StoveTypeStatisticsRow[]> {
        return await this.getAll();
    }

    /**
     * Alias for getByTrend to match router expectation.
     */
    async getByDemandTrend(trend: 'increasing' | 'stable' | 'decreasing'): Promise<StoveTypeStatisticsRow[]> {
        return await this.getByTrend(trend);
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
