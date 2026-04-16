import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LoginHistoryRow } from "../../shared/model";

export class LoginHistoryService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    getAll(): LoginHistoryRow[] {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory ORDER BY loggedInAt DESC"
        );
        return stmt.all();
    }

    getById(id: number): LoginHistoryRow | null {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory WHERE loginHistoryId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    getByPlayerId(playerId: number): LoginHistoryRow[] {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory WHERE playerId = @playerId ORDER BY loggedInAt DESC",
            { playerId }
        );
        return stmt.all();
    }

    create(playerId: number, sessionId: string | null = null): [boolean, number] {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            `INSERT INTO LoginHistory (playerId, loggedInAt, sessionId) 
             VALUES (@playerId, datetime('now'), @sessionId)`,
            { playerId, sessionId }
        );
        return this.executeStmt(stmt);
    }

    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM LoginHistory WHERE loginHistoryId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    countByPlayer(playerId: number): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LoginHistory WHERE playerId = @playerId",
            { playerId }
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }
}
