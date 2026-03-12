import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { MiniGameSessionRow } from "../../shared/model";

export class MiniGameSessionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all mini-game sessions.
     * @returns Array of all MiniGameSessionRow objects.
     */
    getAll(): MiniGameSessionRow[] {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession ORDER BY finishedAt DESC"
        );
        return stmt.all();
    }

    /**
     * Retrieves a session by ID.
     * @param id - The session ID.
     * @returns MiniGameSessionRow or null if not found.
     */
    getById(id: number): MiniGameSessionRow | null {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE sessionId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves sessions by player ID.
     * @param playerId - The player ID.
     * @returns Array of MiniGameSessionRow objects.
     */
    getByPlayerId(playerId: number): MiniGameSessionRow[] {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE playerId = @playerId ORDER BY finishedAt DESC",
            { playerId }
        );
        return stmt.all();
    }

    /**
     * Retrieves sessions by game type.
     * @param gameType - The game type.
     * @returns Array of MiniGameSessionRow objects.
     */
    getByGameType(gameType: string): MiniGameSessionRow[] {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession WHERE gameType = @gameType ORDER BY finishedAt DESC",
            { gameType }
        );
        return stmt.all();
    }

    /**
     * Creates a new mini-game session.
     * @param playerId - The player ID.
     * @param gameType - The game type.
     * @param result - The result.
     * @param coinPayout - The coin payout.
     * @returns Tuple [success, id].
     */
    create(playerId: number, gameType: string, result: string, coinPayout: number): [boolean, number] {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            `INSERT INTO MiniGameSession (playerId, gameType, result, coinPayout, finishedAt) 
             VALUES (@playerId, @gameType, @result, @coinPayout, datetime('now'))`,
            { playerId, gameType, result, coinPayout }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Updates the result of a session.
     * @param id - Session ID.
     * @param result - New result.
     * @param coinPayout - New coin payout.
     * @returns True if updated.
     */
    updateResult(id: number, result: string, coinPayout: number): boolean {
        const stmt = this.unit.prepare(
            "UPDATE MiniGameSession SET result = @result, coinPayout = @coinPayout WHERE sessionId = @id",
            { id, result, coinPayout }
        );
        const runResult = stmt.run();
        return runResult.changes === 1;
    }

    /**
     * Deletes a session.
     * @param id - Session ID.
     * @returns True if deleted.
     */
    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM MiniGameSession WHERE sessionId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total sessions.
     * @returns Count.
     */
    count(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession"
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts sessions for a player.
     * @param playerId - The player ID.
     * @returns Count.
     */
    countByPlayer(playerId: number): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Gets total coin payout for a player.
     * @param playerId - The player ID.
     * @returns Total coins earned.
     */
    getTotalPayoutByPlayer(playerId: number): number {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT SUM(coinPayout) as total FROM MiniGameSession WHERE playerId = @playerId",
            { playerId }
        );
        const result = stmt.get();
        return result?.total ?? 0;
    }

    /**
     * Gets recent sessions (last N).
     * @param limit - Number of sessions to return.
     * @returns Array of MiniGameSessionRow objects.
     */
    getRecent(limit: number): MiniGameSessionRow[] {
        const stmt = this.unit.prepare<MiniGameSessionRow>(
            "SELECT * FROM MiniGameSession ORDER BY finishedAt DESC LIMIT @limit",
            { limit }
        );
        return stmt.all();
    }
}
