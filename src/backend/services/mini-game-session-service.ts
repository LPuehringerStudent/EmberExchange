import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { MiniGameSessionRow } from "../../shared/model";
import { PlayerPrestigeService } from "./player-prestige-service";
import { QuestService } from "./quest-service";

export class MiniGameSessionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all mini-game sessions.
     * @returns Array of all MiniGameSessionRow objects.
     */
    async getAll(limit: number = 100, offset: number = 0): Promise<MiniGameSessionRow[]> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession ORDER BY finishedAt DESC LIMIT @limit OFFSET @offset",
            { limit, offset }
        );
        return await stmt.all();
    }

    /**
     * Retrieves a session by ID.
     * @param id - The session ID.
     * @returns MiniGameSessionRow or null if not found.
     */
    async getById(id: number): Promise<MiniGameSessionRow | null> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE sessionId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves sessions by player ID.
     * @param playerId - The player ID.
     * @returns Array of MiniGameSessionRow objects.
     */
    async getByPlayerId(playerId: number): Promise<MiniGameSessionRow[]> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE playerId = @playerId ORDER BY finishedAt DESC",
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves sessions by game type.
     * @param gameType - The game type.
     * @returns Array of MiniGameSessionRow objects.
     */
    async getByGameType(gameType: string): Promise<MiniGameSessionRow[]> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE gameType = @gameType ORDER BY finishedAt DESC",
            { gameType }
        );
        return await stmt.all();
    }

    /**
     * Creates a new mini-game session.
     * @param playerId - The player ID.
     * @param gameType - The game type.
     * @param result - The result.
     * @param coinPayout - The coin payout.
     * @returns Tuple [success, id].
     */
    async create(playerId: number, gameType: string, result: string, coinPayout: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            `INSERT INTO MiniGameSession (playerId, gameType, result, coinPayout, finishedAt) 
             VALUES (@playerId, @gameType, @result, @coinPayout, NOW())`,
            { playerId, gameType, result, coinPayout }
        );
        const [success, id] = await this.executeStmt(stmt);

        // Award XP for winning
        if (success && result.toLowerCase() === 'win') {
            try {
                await this.unit.savepoint('xp_award');
                const prestigeService = new PlayerPrestigeService(this.unit);
                await prestigeService.addXP(playerId, 150, 'mini_game_win', `Won ${gameType}`);
            } catch {
                try { await this.unit.rollbackToSavepoint('xp_award'); } catch { /* ignore */ }
            }
        }

        // Check achievements
        if (success) {
            try {
                await this.unit.savepoint('achievements');
                const { AchievementEngine } = await import("./achievement-engine");
                const engine = new AchievementEngine(this.unit);
                await engine.checkMiniGameAchievements(playerId);
                await engine.checkWealthAchievements(playerId);
            } catch {
                try { await this.unit.rollbackToSavepoint('achievements'); } catch { /* ignore */ }
            }
        }

        // Track quest progress
        if (success) {
            try {
                const questService = new QuestService(this.unit);
                if (result.toLowerCase() === 'win') {
                    await questService.trackProgress(playerId, 'win_minigame', 1);
                }
                if (coinPayout > 0) {
                    await questService.trackProgress(playerId, 'earn_minigame_coins', coinPayout);
                }
            } catch {
                // Ignore quest tracking errors
            }
        }

        return [success, id];
    }

    /**
     * Updates the result of a session.
     * @param id - Session ID.
     * @param result - New result.
     * @param coinPayout - New coin payout.
     * @returns True if updated.
     */
    async updateResult(id: number, result: string, coinPayout: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE MiniGameSession SET result = @result, coinPayout = @coinPayout WHERE sessionId = @id",
            { id, result, coinPayout }
        );
        const runResult = await stmt.run();
        return runResult.changes === 1;
    }

    /**
     * Deletes a session.
     * @param id - Session ID.
     * @returns True if deleted.
     */
    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM MiniGameSession WHERE sessionId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total sessions.
     * @returns Count.
     */
    async count(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts sessions for a player.
     * @param playerId - The player ID.
     * @returns Count.
     */
    async countByPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Gets total coin payout for a player.
     * @param playerId - The player ID.
     * @returns Total coins earned.
     */
    async getTotalPayoutByPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT SUM(coinPayout) as total FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const result = await stmt.get();
        return result?.total ?? 0;
    }

    /**
     * Gets recent sessions (last N).
     * @param limit - Number of sessions to return.
     * @returns Array of MiniGameSessionRow objects.
     */
    async getRecent(limit: number): Promise<MiniGameSessionRow[]> {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession ORDER BY finishedAt DESC LIMIT @limit",
            { limit }
        );
        return await stmt.all();
    }
}
