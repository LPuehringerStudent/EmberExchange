import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerRow, StoveTypeRow } from "../../shared/model";
import { PlayerService } from "./player-service";
import { StoveTypeService } from "./stove-type-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { PlayerStatisticsService } from "./player-statistics-service";

export interface PlayerListItem {
    playerId: number;
    username: string;
    email: string;
    coins: number;
    lootboxCount: number;
    isAdmin: boolean;
    isPublic: boolean;
    joinedAt: string;
    bannedAt: string | null;
}

export interface PlayerListResult {
    players: PlayerListItem[];
    total: number;
    page: number;
    limit: number;
}

export interface AdminPlayerDetail {
    player: PlayerRow;
    stats: {
        totalTradesCompleted: number;
        totalCoinsEarned: number;
        totalCoinsSpent: number;
        stovesOwned: number;
    };
}

export interface AdminSystemStats {
    totalPlayers: number;
    totalStoves: number;
    totalTrades: number;
    totalCoinsInCirculation: number;
    totalLootboxesOpened: number;
    recentSignups7d: number;
    activePlayers24h: number;
    bannedPlayers: number;
    totalListings: number;
    totalCoinTransactions: number;
    totalEligiblePlayers: number;
}

export interface CoinAdjustmentRequest {
    amount: number;
    reason: string;
}

export interface BanRequest {
    banned: boolean;
    reason?: string;
}

export interface PlayerFilters {
    search?: string;
    banned?: 'all' | 'banned' | 'active';
    minCoins?: number;
    maxCoins?: number;
    isAdmin?: 'all' | 'admin' | 'user';
    sortBy?: string;
}

export class AdminService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    // ── Player Management ──────────────────────────────────────

    async getPlayers(page = 1, limit = 20, filters: PlayerFilters = {}): Promise<PlayerListResult> {
        const offset = (page - 1) * limit;
        const params: Record<string, unknown> = { limit, offset };
        let where = "WHERE username != '__shop__'";

        if (filters.search) {
            where += " AND (username ILIKE @search OR email ILIKE @search)";
            params.search = `%${filters.search}%`;
        }
        if (filters.banned === 'banned') {
            where += " AND bannedAt IS NOT NULL";
        } else if (filters.banned === 'active') {
            where += " AND bannedAt IS NULL";
        }
        if (filters.minCoins !== undefined && !isNaN(filters.minCoins)) {
            where += " AND coins >= @minCoins";
            params.minCoins = filters.minCoins;
        }
        if (filters.maxCoins !== undefined && !isNaN(filters.maxCoins)) {
            where += " AND coins <= @maxCoins";
            params.maxCoins = filters.maxCoins;
        }
        if (filters.isAdmin === 'admin') {
            where += " AND isAdmin = 1";
        } else if (filters.isAdmin === 'user') {
            where += " AND isAdmin = 0";
        }

        const orderMap: Record<string, string> = {
            'id_desc': 'playerId DESC',
            'id_asc': 'playerId ASC',
            'coins_desc': 'coins DESC',
            'coins_asc': 'coins ASC',
            'joined_desc': 'joinedAt DESC',
            'joined_asc': 'joinedAt ASC',
        };
        const orderBy = orderMap[filters.sortBy ?? ''] ?? 'playerId DESC';

        const countStmt = this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*)::int as cnt FROM Player ${where}`,
            params
        );
        const countRes = await countStmt.get();
        const total = countRes?.cnt ?? 0;

        const listStmt = this.unit.prepare<PlayerListItem>(
            `SELECT playerId, username, email, coins, lootboxCount, isAdmin, isPublic, joinedAt, bannedAt
             FROM Player ${where}
             ORDER BY ${orderBy}
             LIMIT @limit OFFSET @offset`,
            params
        );
        const players = await listStmt.all();

        return { players, total, page, limit };
    }

    async getPlayerDetail(playerId: number): Promise<AdminPlayerDetail | null> {
        const playerService = new PlayerService(this.unit);
        const statsService = new PlayerStatisticsService(this.unit);

        const player = await playerService.getInfoByID(playerId);
        if (!player) return null;

        // password and totpSecret already excluded by getInfoByID
        const playerSafe = player;

        const stats = await statsService.getByPlayerId(playerId);
        const ownershipStmt = this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Ownership WHERE playerId = @playerId",
            { playerId }
        );
        const ownershipRes = await ownershipStmt.get();

        return {
            player: playerSafe as PlayerRow,
            stats: {
                totalTradesCompleted: stats?.totalTradesCompleted ?? 0,
                totalCoinsEarned: stats?.totalCoinsEarned ?? 0,
                totalCoinsSpent: stats?.totalCoinsSpent ?? 0,
                stovesOwned: ownershipRes?.cnt ?? 0,
            }
        };
    }

    async adjustPlayerCoins(playerId: number, amount: number, reason: string): Promise<boolean> {
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        const player = await playerService.getInfoByID(playerId);
        if (!player) return false;

        const newCoins = Math.max(0, player.coins + amount);
        await playerService.updatePlayerCoins(playerId, newCoins);
        await coinService.create(playerId, amount, "admin_adjust", reason || "Admin adjustment");
        return true;
    }

    async setPlayerBan(playerId: number, banned: boolean, reason?: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            `UPDATE Player
             SET bannedAt = ${banned ? "@bannedAt" : "NULL"},
                 banReason = ${banned ? "@reason" : "NULL"}
             WHERE playerId = @playerId`,
            {
                playerId,
                bannedAt: banned ? new Date().toISOString() : null,
                reason: banned ? (reason || "Banned by admin") : null,
            }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    // ── System Stats ───────────────────────────────────────────

    async getSystemStats(): Promise<AdminSystemStats> {
        // Exclude shop NPC, WebSocket test bots, e2e test accounts, and banned players
        const eligibleWhere = "WHERE username != '__shop__' AND bannedAt IS NULL AND username NOT ILIKE 'ws_test_%' AND username NOT ILIKE 'e2e_%'";

        const totalPlayers = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Player WHERE username != '__shop__'"
        ).get();
        const totalStoves = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Stove"
        ).get();
        const totalTrades = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Trade"
        ).get();
        const totalCoins = await this.unit.prepare<{ total: string }>(
            "SELECT COALESCE(SUM(coins), 0)::bigint as total FROM Player WHERE username != '__shop__'"
        ).get();
        const totalLootboxes = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Lootbox WHERE openedAt IS NOT NULL"
        ).get();
        const recentSignups = await this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*)::int as cnt FROM Player ${eligibleWhere} AND joinedAt::timestamp > NOW() - INTERVAL '7 days'`
        ).get();
        const activePlayers = await this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(DISTINCT lh.playerId)::int as cnt FROM LoginHistory lh INNER JOIN Player p ON lh.playerId = p.playerId ${eligibleWhere.replace("WHERE", "WHERE p")} AND lh.loggedInAt::timestamp > NOW() - INTERVAL '24 hours'`
        ).get();
        const bannedPlayers = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Player WHERE bannedAt IS NOT NULL"
        ).get();
        const totalListings = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM Listing WHERE status = 'active'"
        ).get();
        const totalCoinTx = await this.unit.prepare<{ cnt: number }>(
            "SELECT COUNT(*)::int as cnt FROM CoinTransaction"
        ).get();
        const totalEligiblePlayers = await this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*)::int as cnt FROM Player ${eligibleWhere}`
        ).get();

        return {
            totalPlayers: totalPlayers?.cnt ?? 0,
            totalStoves: totalStoves?.cnt ?? 0,
            totalTrades: totalTrades?.cnt ?? 0,
            totalCoinsInCirculation: totalCoins?.total ? parseInt(totalCoins.total, 10) : 0,
            totalLootboxesOpened: totalLootboxes?.cnt ?? 0,
            recentSignups7d: recentSignups?.cnt ?? 0,
            activePlayers24h: activePlayers?.cnt ?? 0,
            bannedPlayers: bannedPlayers?.cnt ?? 0,
            totalListings: totalListings?.cnt ?? 0,
            totalCoinTransactions: totalCoinTx?.cnt ?? 0,
            totalEligiblePlayers: totalEligiblePlayers?.cnt ?? 0,
        };
    }

    // ── Stove Type Management ──────────────────────────────────

    async getStoveTypes(): Promise<StoveTypeRow[]> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            "SELECT * FROM StoveType ORDER BY typeId"
        );
        return await stmt.all();
    }

    async updateStoveType(typeId: number, data: Partial<StoveTypeRow>): Promise<boolean> {
        const fields: string[] = [];
        const params: Record<string, unknown> = { typeId };

        if (data.name !== undefined) { fields.push("name = @name"); params.name = data.name; }
        if (data.imageUrl !== undefined) { fields.push("imageUrl = @imageUrl"); params.imageUrl = data.imageUrl; }
        if (data.rarity !== undefined) { fields.push("rarity = @rarity"); params.rarity = data.rarity; }
        if (data.lootboxWeight !== undefined) { fields.push("lootboxWeight = @lootboxWeight"); params.lootboxWeight = data.lootboxWeight; }
        if (data.collection !== undefined) { fields.push("collection = @collection"); params.collection = data.collection; }
        if (data.minHeat !== undefined) { fields.push("minHeat = @minHeat"); params.minHeat = data.minHeat; }
        if (data.maxHeat !== undefined) { fields.push("maxHeat = @maxHeat"); params.maxHeat = data.maxHeat; }

        if (fields.length === 0) return false;

        const stmt = this.unit.prepare(
            `UPDATE StoveType SET ${fields.join(", ")} WHERE typeId = @typeId`,
            params
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async createStoveType(data: Omit<StoveTypeRow, 'typeId'>): Promise<[boolean, number]> {
        const stmt = this.unit.prepare(
            `INSERT INTO StoveType (name, imageUrl, rarity, lootboxWeight, collection, minHeat, maxHeat)
             VALUES (@name, @imageUrl, @rarity, @lootboxWeight, @collection, @minHeat, @maxHeat)`,
            {
                name: data.name,
                imageUrl: data.imageUrl,
                rarity: data.rarity,
                lootboxWeight: data.lootboxWeight,
                collection: data.collection,
                minHeat: data.minHeat,
                maxHeat: data.maxHeat,
            }
        );
        return await this.executeStmt(stmt);
    }
}
