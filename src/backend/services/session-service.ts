import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { SessionRow } from "../../shared/model";

export class SessionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async createSession(sessionId: string, playerId: number, expiresAt: Date): Promise<boolean> {
        const stmt = this.unit.prepare(
            `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
             VALUES (@sessionId, @playerId, NOW(), @expiresAt, 1)`,
            { sessionId, playerId, expiresAt: expiresAt.toISOString() }
        );
        return (await stmt.run()).changes === 1;
    }

    async getSession(sessionId: string): Promise<SessionRow | null> {
        const stmt = this.unit.prepare<SessionRow>(
            `SELECT * FROM Session
             WHERE sessionId = @sessionId
               AND isActive = 1
               AND expiresAt::timestamptz > NOW()`,
            { sessionId }
        );
        return (await stmt.get()) ?? null;
    }

    async invalidateSession(sessionId: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Session SET isActive = 0 WHERE sessionId = @sessionId",
            { sessionId }
        );
        return (await stmt.run()).changes === 1;
    }

    async getSessionsByPlayer(playerId: number): Promise<SessionRow[]> {
        const stmt = this.unit.prepare<SessionRow>(
            `SELECT * FROM Session WHERE playerId = @playerId AND isActive = 1 AND expiresAt::timestamptz > NOW() ORDER BY createdAt DESC`,
            { playerId }
        );
        return await stmt.all();
    }

    async invalidateAllExcept(playerId: number, keepSessionId: string): Promise<number> {
        const stmt = this.unit.prepare(
            "UPDATE Session SET isActive = 0 WHERE playerId = @playerId AND sessionId != @keepSessionId AND isActive = 1",
            { playerId, keepSessionId }
        );
        const result = await stmt.run();
        return result.changes ?? 0;
    }
}
