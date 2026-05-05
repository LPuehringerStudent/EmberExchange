import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LoginHistoryRow } from "../../shared/model";

export class LoginHistoryService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getAll(): Promise<LoginHistoryRow[]> {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory ORDER BY loggedInAt DESC"
        );
        return await stmt.all();
    }

    async getById(id: number): Promise<LoginHistoryRow | null> {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory WHERE loginHistoryId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    async getByPlayerId(playerId: number): Promise<LoginHistoryRow[]> {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            "SELECT * FROM LoginHistory WHERE playerId = @playerId ORDER BY loggedInAt DESC",
            { playerId }
        );
        return await stmt.all();
    }

    async create(playerId: number, sessionId: string | null = null): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<LoginHistoryRow>(
            `INSERT INTO LoginHistory (playerId, loggedInAt, sessionId) 
             VALUES (@playerId, NOW(), @sessionId)`,
            { playerId, sessionId }
        );
        return await this.executeStmt(stmt);
    }

    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM LoginHistory WHERE loginHistoryId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async countByPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LoginHistory WHERE playerId = @playerId",
            { playerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
