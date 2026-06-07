import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { NotificationService } from "./notification-service";

export interface RedeemCodeRow {
    codeId: number;
    code: string;
    rewardCoins: number;
    rewardLootboxes: number;
    rewardSparks: number;
    rewardSpins: number;
    maxUses: number | null;
    usedCount: number;
    expiresAt: string | null;
    isActive: number;
    createdAt: string;
}

export interface RedeemCodeInput {
    code: string;
    rewardCoins: number;
    rewardLootboxes: number;
    rewardSparks: number;
    rewardSpins: number;
    maxUses: number | null;
    expiresAt: string | null;
    isActive: boolean;
}

export interface RedeemResult {
    success: boolean;
    rewardCoins?: number;
    rewardLootboxes?: number;
    rewardSparks?: number;
    rewardSpins?: number;
    error?: string;
}

export class RedeemCodeService {
    constructor(private unit: Unit) {}

    async listCodes(): Promise<RedeemCodeRow[]> {
        const stmt = this.unit.prepare<RedeemCodeRow>(
            `SELECT codeId, code, rewardCoins, rewardLootboxes, rewardSparks, rewardSpins, maxUses, usedCount, expiresAt, isActive, createdAt
             FROM RedeemCode
             ORDER BY createdAt DESC`
        );
        return await stmt.all() ?? [];
    }

    async getCodeById(codeId: number): Promise<RedeemCodeRow | null> {
        const stmt = this.unit.prepare<RedeemCodeRow>(
            `SELECT codeId, code, rewardCoins, rewardLootboxes, rewardSparks, rewardSpins, maxUses, usedCount, expiresAt, isActive, createdAt
             FROM RedeemCode WHERE codeId = @codeId`,
            { codeId }
        );
        return await stmt.get() ?? null;
    }

    async createCode(data: RedeemCodeInput): Promise<number> {
        const stmt = this.unit.prepare<{ codeId: number }>(
            `INSERT INTO RedeemCode (code, rewardCoins, rewardLootboxes, rewardSparks, rewardSpins, maxUses, expiresAt, isActive, createdAt)
             VALUES (@code, @rewardCoins, @rewardLootboxes, @rewardSparks, @rewardSpins, @maxUses, @expiresAt, @isActive, @createdAt)
             RETURNING codeId`,
            {
                code: data.code.trim().toUpperCase(),
                rewardCoins: Math.max(0, data.rewardCoins),
                rewardLootboxes: Math.max(0, data.rewardLootboxes),
                rewardSparks: Math.max(0, data.rewardSparks),
                rewardSpins: Math.max(0, data.rewardSpins),
                maxUses: data.maxUses,
                expiresAt: data.expiresAt,
                isActive: data.isActive ? 1 : 0,
                createdAt: new Date().toISOString(),
            }
        );
        const result = await stmt.get();
        return result?.codeId ?? 0;
    }

    async updateCode(codeId: number, data: Partial<RedeemCodeInput>): Promise<boolean> {
        const existing = await this.getCodeById(codeId);
        if (!existing) return false;

        const fields: string[] = [];
        const params: Record<string, unknown> = { codeId };

        if (data.code !== undefined) { fields.push("code = @code"); params.code = data.code.trim().toUpperCase(); }
        if (data.rewardCoins !== undefined) { fields.push("rewardCoins = @rewardCoins"); params.rewardCoins = Math.max(0, data.rewardCoins); }
        if (data.rewardLootboxes !== undefined) { fields.push("rewardLootboxes = @rewardLootboxes"); params.rewardLootboxes = Math.max(0, data.rewardLootboxes); }
        if (data.rewardSparks !== undefined) { fields.push("rewardSparks = @rewardSparks"); params.rewardSparks = Math.max(0, data.rewardSparks); }
        if (data.rewardSpins !== undefined) { fields.push("rewardSpins = @rewardSpins"); params.rewardSpins = Math.max(0, data.rewardSpins); }
        if (data.maxUses !== undefined) { fields.push("maxUses = @maxUses"); params.maxUses = data.maxUses; }
        if (data.expiresAt !== undefined) { fields.push("expiresAt = @expiresAt"); params.expiresAt = data.expiresAt; }
        if (data.isActive !== undefined) { fields.push("isActive = @isActive"); params.isActive = data.isActive ? 1 : 0; }

        if (fields.length === 0) return false;

        const stmt = this.unit.prepare(
            `UPDATE RedeemCode SET ${fields.join(", ")} WHERE codeId = @codeId`,
            params
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async deleteCode(codeId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `DELETE FROM RedeemCode WHERE codeId = @codeId`,
            { codeId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async redeemCode(playerId: number, rawCode: string): Promise<RedeemResult> {
        const code = rawCode.trim().toUpperCase();
        if (!code) {
            return { success: false, error: "Code is required" };
        }

        const codeStmt = this.unit.prepare<RedeemCodeRow>(
            `SELECT codeId, code, rewardCoins, rewardLootboxes, rewardSparks, rewardSpins, maxUses, usedCount, expiresAt, isActive
             FROM RedeemCode WHERE code = @code`,
            { code }
        );
        const row = await codeStmt.get();
        if (!row) {
            return { success: false, error: "Invalid code" };
        }

        if (!row.isActive) {
            return { success: false, error: "This code is no longer active" };
        }

        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
            return { success: false, error: "This code has expired" };
        }

        if (row.maxUses !== null && row.maxUses !== undefined && row.usedCount >= row.maxUses) {
            return { success: false, error: "This code has reached its maximum uses" };
        }

        // Check if player already redeemed
        const alreadyStmt = this.unit.prepare<{ cnt: number }>(
            `SELECT COUNT(*)::int as cnt FROM PlayerRedeemedCode WHERE codeId = @codeId AND playerId = @playerId`,
            { codeId: row.codeId, playerId }
        );
        const already = await alreadyStmt.get();
        if (already && already.cnt > 0) {
            return { success: false, error: "You have already redeemed this code" };
        }

        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }

        // Record redemption
        await this.unit.prepare(
            `INSERT INTO PlayerRedeemedCode (codeId, playerId, redeemedAt)
             VALUES (@codeId, @playerId, @redeemedAt)`,
            { codeId: row.codeId, playerId, redeemedAt: new Date().toISOString() }
        ).run();

        // Increment used count
        await this.unit.prepare(
            `UPDATE RedeemCode SET usedCount = usedCount + 1 WHERE codeId = @codeId`,
            { codeId: row.codeId }
        ).run();

        // Award coins
        if (row.rewardCoins > 0) {
            await playerService.addCoinsAtomic(playerId, row.rewardCoins);
            await coinService.create(
                playerId,
                row.rewardCoins,
                "daily_reward",
                `Redeemed code: ${row.code}`
            );
        }

        // Award lootboxes
        if (row.rewardLootboxes > 0) {
            for (let i = 0; i < row.rewardLootboxes; i++) {
                await this.unit.prepare(
                    `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow)
                     VALUES (1, @playerId, NULL, 'reward')`,
                    { playerId }
                ).run();
            }
            await playerService.updatePlayerLootboxCount(playerId, player.lootboxCount + row.rewardLootboxes);
        }

        // Award sparks
        if (row.rewardSparks > 0) {
            const newSparks = (player.sparks ?? 0) + row.rewardSparks;
            await playerService.updatePlayerSparks(playerId, newSparks);
        }

        // Award bonus spins
        if (row.rewardSpins > 0) {
            await this.unit.prepare(
                `INSERT INTO PlayerDailySpin (playerId, lastSpinAt, totalSpins, bonusSpins)
                 VALUES (@playerId, NULL, 0, @rewardSpins)
                 ON CONFLICT (playerId)
                 DO UPDATE SET bonusSpins = PlayerDailySpin.bonusSpins + @rewardSpins`,
                { playerId, rewardSpins: row.rewardSpins }
            ).run();
        }

        // Build reward text for notification
        const rewardParts: string[] = [];
        if (row.rewardCoins > 0) rewardParts.push(`${row.rewardCoins} coins`);
        if (row.rewardLootboxes > 0) rewardParts.push(`${row.rewardLootboxes} lootbox${row.rewardLootboxes > 1 ? 'es' : ''}`);
        if (row.rewardSparks > 0) rewardParts.push(`${row.rewardSparks} sparks`);
        if (row.rewardSpins > 0) rewardParts.push(`${row.rewardSpins} spin${row.rewardSpins > 1 ? 's' : ''}`);
        const rewardText = rewardParts.join(' + ');

        // Create notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "system",
                "Code redeemed",
                `You redeemed code ${row.code} and received ${rewardText}`,
                { code: row.code, rewardCoins: row.rewardCoins, rewardLootboxes: row.rewardLootboxes, rewardSparks: row.rewardSparks, rewardSpins: row.rewardSpins }
            );
        } catch {
            // Ignore notification errors
        }

        return {
            success: true,
            rewardCoins: row.rewardCoins,
            rewardLootboxes: row.rewardLootboxes,
            rewardSparks: row.rewardSparks,
            rewardSpins: row.rewardSpins,
        };
    }
}
