import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { CoinTransactionRow } from "../../shared/model";

export class CoinTransactionService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getAll(): Promise<CoinTransactionRow[]> {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction ORDER BY createdAt DESC"
        );
        return await stmt.all();
    }

    async getById(id: number): Promise<CoinTransactionRow | null> {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction WHERE transactionId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    async getByPlayerId(playerId: number): Promise<CoinTransactionRow[]> {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            "SELECT * FROM CoinTransaction WHERE playerId = @playerId ORDER BY createdAt DESC",
            { playerId }
        );
        return await stmt.all();
    }

    async create(
        playerId: number,
        amount: number,
        type: string,
        description: string | null = null
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<CoinTransactionRow>(
            `INSERT INTO CoinTransaction (playerId, amount, type, description, createdAt) 
             VALUES (@playerId, @amount, @type, @description, NOW())`,
            { playerId, amount, type, description }
        );
        return await this.executeStmt(stmt);
    }

    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM CoinTransaction WHERE transactionId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async getTotalEarnedByPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount > 0",
            { playerId }
        );
        const result = await stmt.get();
        return result?.total ?? 0;
    }

    async getTotalSpentByPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM CoinTransaction WHERE playerId = @playerId AND amount < 0",
            { playerId }
        );
        const result = await stmt.get();
        return result?.total ?? 0;
    }
}
