import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { StoveTypeStatisticsService } from "./stove-type-statistics-service";
import {
    InvestmentPosition,
    InvestmentTransaction,
    PortfolioPosition,
    LeaderboardEntry,
    StovePriceHistory,
} from "../../shared/model";

interface CacheEntry {
    price: number;
    expiresAt: number;
}

const RARITY_BASE_PRICE: Record<string, number> = {
    common: 30,
    uncommon: 75,
    rare: 180,
    epic: 450,
    legendary: 1500,
    limited: 3000,
    secret: 8000,
};

export class InvestmentService extends ServiceBase {
    private priceCache = new Map<string, CacheEntry>();

    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Get the current market price for a specific stove type.
     * Uses StoveTypeStatistics.averageSalePrice if available,
     * falls back to rarity base price.
     * Cached for 5 minutes.
     */
    async getAssetPrice(typeId: number): Promise<number> {
        const cacheKey = `stove:${typeId}`;
        const cached = this.priceCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.price;
        }

        const statsService = new StoveTypeStatisticsService(this.unit);
        const stats = await statsService.getByStoveTypeId(typeId);
        let price: number;

        if (stats && stats.averageSalePrice > 0) {
            price = stats.averageSalePrice;
        } else {
            const typeStmt = this.unit.prepare<{ rarity: string }>(
                "SELECT rarity FROM StoveType WHERE typeId = @typeId",
                { typeId }
            );
            const typeRow = await typeStmt.get();
            price = RARITY_BASE_PRICE[typeRow?.rarity?.toLowerCase() ?? "common"] ?? 30;
        }

        this.priceCache.set(cacheKey, { price, expiresAt: Date.now() + 5 * 60 * 1000 });
        return price;
    }

    /**
     * Atomically buy an investment position.
     * Deducts coins, upserts the position, and records a buy transaction.
     * @returns [success, positionId]
     */
    async buyPosition(
        playerId: number,
        assetId: number,
        quantity: number,
        pricePerUnit: number
    ): Promise<[boolean, number?]> {
        const category = "stove";
        const playerService = new PlayerService(this.unit);
        const totalCost = quantity * pricePerUnit;

        const deducted = await playerService.deductCoinsAtomic(playerId, totalCost);
        if (!deducted) {
            return [false, undefined];
        }

        const upsertStmt = this.unit.prepare<{ positionId: number }>(
            `INSERT INTO InvestmentPosition (playerId, assetId, category, quantity, avgBuyPrice, totalInvested, createdAt, updatedAt)
             VALUES (@playerId, @assetId, @category, @quantity, @avgBuyPrice, @totalInvested, NOW(), NOW())
             ON CONFLICT (playerId, assetId, category) DO UPDATE SET
                 quantity = InvestmentPosition.quantity + EXCLUDED.quantity,
                 totalInvested = InvestmentPosition.totalInvested + EXCLUDED.totalInvested,
                 avgBuyPrice = (InvestmentPosition.totalInvested + EXCLUDED.totalInvested) / (InvestmentPosition.quantity + EXCLUDED.quantity),
                 updatedAt = NOW()
             RETURNING positionId`,
            {
                playerId,
                assetId,
                category,
                quantity,
                avgBuyPrice: pricePerUnit,
                totalInvested: totalCost,
            }
        );
        const row = await upsertStmt.get();
        const positionId = row?.positionId ?? 0;

        await this.unit.prepare(
            `INSERT INTO InvestmentTransaction (playerId, assetId, category, type, quantity, pricePerUnit, totalAmount, createdAt)
             VALUES (@playerId, @assetId, @category, 'buy', @quantity, @pricePerUnit, @totalAmount, NOW())`,
            {
                playerId,
                assetId,
                category,
                quantity,
                pricePerUnit,
                totalAmount: totalCost,
            }
        ).run();

        return [true, positionId];
    }

    /**
     * Atomically sell an investment position.
     * Checks cooldown, credits net coins (after 5% fee), updates the position, and records a sell transaction.
     * @returns [success, netRevenue]
     */
    async sellPosition(
        playerId: number,
        assetId: number,
        quantity: number,
        pricePerUnit: number
    ): Promise<[boolean, number?]> {
        const category = "stove";

        const canSellNow = await this.canSell(playerId, assetId);
        if (!canSellNow) {
            return [false, undefined];
        }

        const positionStmt = this.unit.prepare<InvestmentPosition>(
            `SELECT * FROM InvestmentPosition
             WHERE playerId = @playerId AND assetId = @assetId AND category = 'stove'`,
            { playerId, assetId }
        );
        const position = await positionStmt.get();
        if (!position || position.quantity < quantity) {
            return [false, undefined];
        }

        const playerService = new PlayerService(this.unit);
        const totalRevenue = quantity * pricePerUnit;
        const fee = Math.round(totalRevenue * 0.05);
        const netRevenue = totalRevenue - fee;

        const credited = await playerService.addCoinsAtomic(playerId, netRevenue);
        if (!credited) {
            return [false, undefined];
        }

        const newQty = position.quantity - quantity;
        if (newQty <= 0) {
            await this.unit.prepare(
                `DELETE FROM InvestmentPosition
                 WHERE playerId = @playerId AND assetId = @assetId AND category = 'stove'`,
                { playerId, assetId }
            ).run();
        } else {
            const newTotalInvested = Math.round(
                position.totalInvested - (position.totalInvested * quantity / position.quantity)
            );
            const newAvgBuyPrice = Math.round(newTotalInvested / newQty);
            await this.unit.prepare(
                `UPDATE InvestmentPosition
                 SET quantity = @newQty,
                     totalInvested = @newTotalInvested,
                     avgBuyPrice = @newAvgBuyPrice,
                     updatedAt = NOW()
                 WHERE playerId = @playerId AND assetId = @assetId AND category = 'stove'`,
                {
                    playerId,
                    assetId,
                    newQty,
                    newTotalInvested,
                    newAvgBuyPrice,
                }
            ).run();
        }

        await this.unit.prepare(
            `INSERT INTO InvestmentTransaction (playerId, assetId, category, type, quantity, pricePerUnit, totalAmount, createdAt)
             VALUES (@playerId, @assetId, @category, 'sell', @quantity, @pricePerUnit, @totalAmount, NOW())`,
            {
                playerId,
                assetId,
                category,
                quantity,
                pricePerUnit,
                totalAmount: totalRevenue,
            }
        ).run();

        return [true, netRevenue];
    }

    /**
     * Retrieve the full portfolio for a player with computed metrics.
     */
    async getPortfolio(
        playerId: number
    ): Promise<{
        positions: PortfolioPosition[];
        totalValue: number;
        totalCost: number;
        totalPL: number;
    }> {
        const stmt = this.unit.prepare<InvestmentPosition>(
            `SELECT * FROM InvestmentPosition WHERE playerId = @playerId AND category = 'stove'`,
            { playerId }
        );
        const rows = await stmt.all();

        let totalValue = 0;
        let totalCost = 0;
        let totalPL = 0;

        const positions: PortfolioPosition[] = [];
        for (const row of rows) {
            const currentPrice = await this.getAssetPrice(row.assetId);
            const currentValue = row.quantity * currentPrice;
            const unrealizedPL = currentValue - row.totalInvested;

            totalValue += currentValue;
            totalCost += row.totalInvested;
            totalPL += unrealizedPL;

            positions.push({
                positionId: row.positionId,
                assetId: row.assetId,
                category: row.category,
                quantity: row.quantity,
                avgBuyPrice: row.avgBuyPrice,
                currentPrice,
                currentValue,
                unrealizedPL,
            });
        }

        return { positions, totalValue, totalCost, totalPL };
    }

    /**
     * Aggregate leaderboard of investors sorted by total P&L.
     */
    async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
        const stmt = this.unit.prepare<InvestmentPosition>(
            `SELECT * FROM InvestmentPosition WHERE category = 'stove'`,
            {}
        );
        const rows = await stmt.all();

        const map = new Map<
            number,
            { totalInvested: number; totalValue: number; totalPL: number }
        >();

        for (const row of rows) {
            const currentPrice = await this.getAssetPrice(row.assetId);
            const currentValue = row.quantity * currentPrice;
            const unrealizedPL = currentValue - row.totalInvested;

            const existing = map.get(row.playerId);
            if (existing) {
                existing.totalInvested += row.totalInvested;
                existing.totalValue += currentValue;
                existing.totalPL += unrealizedPL;
            } else {
                map.set(row.playerId, {
                    totalInvested: row.totalInvested,
                    totalValue: currentValue,
                    totalPL: unrealizedPL,
                });
            }
        }

        if (map.size === 0) {
            return [];
        }

        const playerIds = Array.from(map.keys());
        const placeholders = playerIds.map((_, i) => `@pid${i}`).join(", ");
        const nameParams: Record<string, unknown> = {};
        playerIds.forEach((id, i) => {
            nameParams[`pid${i}`] = id;
        });

        const nameStmt = this.unit.prepare<{ playerId: number; username: string }>(
            `SELECT playerId, username FROM Player WHERE playerId IN (${placeholders})`,
            nameParams
        );
        const nameRows = await nameStmt.all();
        const nameMap = new Map(nameRows.map((r) => [r.playerId, r.username]));

        const entries: LeaderboardEntry[] = [];
        for (const [playerId, stats] of map.entries()) {
            const plPercent =
                stats.totalInvested > 0
                    ? Math.round((stats.totalPL / stats.totalInvested) * 10000) / 100
                    : 0;
            entries.push({
                playerId,
                name: nameMap.get(playerId) ?? "Unknown",
                totalInvested: stats.totalInvested,
                totalValue: stats.totalValue,
                totalPL: stats.totalPL,
                plPercent,
            });
        }

        entries.sort((a, b) => b.totalPL - a.totalPL);
        return entries.slice(0, Math.max(1, limit));
    }

    /**
     * Check whether a sell is allowed for this player+asset.
     * Cooldown: 24 hours after the most recent sell transaction.
     */
    async canSell(playerId: number, assetId: number): Promise<boolean> {
        const stmt = this.unit.prepare<{ createdAt: string }>(
            `SELECT createdAt FROM InvestmentTransaction
             WHERE playerId = @playerId AND assetId = @assetId AND category = 'stove' AND type = 'sell'
             ORDER BY createdAt DESC
             LIMIT 1`,
            { playerId, assetId }
        );
        const row = await stmt.get();
        if (!row) {
            return true;
        }
        const lastSell = new Date(row.createdAt).getTime();
        return Date.now() - lastSell >= 24 * 60 * 60 * 1000;
    }

    /**
     * Retrieve a single position for a player+asset.
     */
    async getPosition(
        playerId: number,
        assetId: number
    ): Promise<InvestmentPosition | null> {
        const stmt = this.unit.prepare<InvestmentPosition>(
            `SELECT * FROM InvestmentPosition
             WHERE playerId = @playerId AND assetId = @assetId AND category = 'stove'`,
            { playerId, assetId }
        );
        const row = await stmt.get();
        return row ?? null;
    }

    /**
     * Retrieve all transactions for a player (optional filtering).
     */
    async getTransactionsByPlayer(
        playerId: number,
        category?: "stove" | "lootbox",
        type?: "buy" | "sell"
    ): Promise<InvestmentTransaction[]> {
        let sql = `SELECT * FROM InvestmentTransaction WHERE playerId = @playerId`;
        const params: Record<string, unknown> = { playerId };
        if (category) {
            sql += ` AND category = @category`;
            params.category = category;
        }
        if (type) {
            sql += ` AND type = @type`;
            params.type = type;
        }
        sql += ` ORDER BY createdAt DESC`;
        const stmt = this.unit.prepare<InvestmentTransaction>(sql, params);
        return await stmt.all();
    }

    /**
     * Record current stove prices into history.
     */
    async recordPrices(): Promise<void> {
        const typeStmt = this.unit.prepare<{ typeId: number }>(
            "SELECT typeId FROM StoveType"
        );
        const types = await typeStmt.all();
        for (const type of types) {
            const price = await this.getAssetPrice(type.typeId);
            await this.unit.prepare(
                `INSERT INTO StovePriceHistory (typeId, price, timestamp) VALUES (@typeId, @price, NOW())`,
                { typeId: type.typeId, price }
            ).run();
        }
    }

    /**
     * Get price history for a stove type over a given range.
     */
    async getPriceHistory(
        typeId: number,
        range: "1d" | "1w" | "1m"
    ): Promise<StovePriceHistory[]> {
        const ms =
            range === "1d" ? 86400000 : range === "1w" ? 604800000 : 2592000000;
        const cutoff = new Date(Date.now() - ms).toISOString();
        const stmt = this.unit.prepare<StovePriceHistory>(
            `SELECT * FROM StovePriceHistory
             WHERE typeId = @typeId
               AND timestamp::TIMESTAMPTZ >= @cutoff::TIMESTAMPTZ
             ORDER BY timestamp::TIMESTAMPTZ ASC`,
            { typeId, cutoff }
        );
        return await stmt.all();
    }

    /**
     * Record a portfolio snapshot for a player.
     */
    async recordPortfolioSnapshot(playerId: number): Promise<void> {
        const portfolio = await this.getPortfolio(playerId);
        await this.unit.prepare(
            `INSERT INTO PortfolioSnapshot (playerId, totalValue, totalCost, totalPL, timestamp)
             VALUES (@playerId, @totalValue, @totalCost, @totalPL, NOW())`,
            {
                playerId,
                totalValue: portfolio.totalValue,
                totalCost: portfolio.totalCost,
                totalPL: portfolio.totalPL,
            }
        ).run();
    }
}
