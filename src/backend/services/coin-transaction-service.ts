import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { CoinTransactionRow } from "../../shared/model";

export class CoinTransactionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    getAll(): CoinTransactionRow[] {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction ORDER BY createdAt DESC"
        );
        return stmt.all();
    }

    getById(id: number): CoinTransactionRow | null {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction WHERE transactionId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    getByPlayerId(playerId: number): CoinTransactionRow[] {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction WHERE playerId = @playerId ORDER BY createdAt DESC",
            { playerId }
        );
        return stmt.all();
    }

    create(
        playerId: number,
        amount: number,
        type: string,
        description: string | null = null
    ): [boolean, number] {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            `INSERT INTO CoinTransaction (playerId, amount, type, description, createdAt) 
             VALUES (@playerId, @amount, @type, @description, datetime('now'))`,
            { playerId, amount, type, description }
        );
        return this.executeStmt(stmt);
    }

    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM CoinTransaction WHERE transactionId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    getTotalEarnedByPlayer(playerId: number): number {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount > 0",
            { playerId }
        );
        const result = stmt.get();
        return result?.total ?? 0;
    }

    getTotalSpentByPlayer(playerId: number): number {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount < 0",
            { playerId }
        );
        const result = stmt.get();
        return result?.total ?? 0;
    }
}
