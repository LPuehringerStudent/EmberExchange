import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { SessionRow } from "../../shared/model";

export class SessionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    createSession(sessionId: string, playerId: number, expiresAt: Date): boolean {
        const stmt = this.unit.prepare(
            `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
             VALUES (@sessionId, @playerId, datetime('now'), @expiresAt, 1)`,
            { sessionId, playerId, expiresAt: expiresAt.toISOString() }
        );
        return stmt.run().changes === 1;
    }

    getSession(sessionId: string): SessionRow | null {
        const stmt = this.unit.prepare<SessionRow>(
            "SELECT * FROM Session WHERE sessionId = @sessionId AND isActive = 1",
            { sessionId }
        );
        return stmt.get() ?? null;
    }

    invalidateSession(sessionId: string): boolean {
        const stmt = this.unit.prepare(
            "UPDATE Session SET isActive = 0 WHERE sessionId = @sessionId",
            { sessionId }
        );
        return stmt.run().changes === 1;
    }
}
