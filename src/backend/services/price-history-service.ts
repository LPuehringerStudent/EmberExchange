import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PriceHistoryRow } from "../../shared/model";

export class PriceHistoryService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all price history records from the database.
     * @returns An array of all PriceHistoryRow objects.
     */
    async getAllPriceHistory(): Promise<PriceHistoryRow[]> {
        const stmt = this.unit.prepare<PriceHistoryRow>(
            "SELECT * FROM PriceHistory"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a price history record by its unique ID.
     * @param id - The unique price history ID.
     * @returns The PriceHistoryRow object if found, otherwise null.
     */
    async getPriceHistoryById(id: number): Promise<PriceHistoryRow | null> {
        const stmt = this.unit.prepare<PriceHistoryRow>(
            "SELECT * FROM PriceHistory WHERE historyId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves price history for a specific stove type.
     * @param typeId - The stove type ID.
     * @returns An array of PriceHistoryRow objects for the type, ordered by sale date.
     */
    async getPriceHistoryByTypeId(typeId: number): Promise<PriceHistoryRow[]> {
        const stmt = this.unit.prepare<PriceHistoryRow>(
            "SELECT * FROM PriceHistory WHERE typeId = @typeId ORDER BY saleDate DESC",
            { typeId }
        );
        return await stmt.all();
    }

    /**
     * Records a new sale price for a stove type.
     * @param typeId - The stove type ID.
     * @param salePrice - The price the stove was sold for.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new price history record's ID (if successful).
     */
    async recordSale(typeId: number, salePrice: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<PriceHistoryRow>(
            `INSERT INTO PriceHistory (typeId, salePrice, saleDate) 
             VALUES (@typeId, @salePrice, NOW())`,
            { typeId, salePrice }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Calculates the average sale price for a stove type.
     * @param typeId - The stove type ID.
     * @returns The average sale price, or 0 if no sales recorded.
     */
    async getAveragePrice(typeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ average: number }>(
            "SELECT AVG(salePrice) as average FROM PriceHistory WHERE typeId = @typeId",
            { typeId }
        );
        const result = await stmt.get();
        return result?.average ?? 0;
    }

    /**
     * Calculates the minimum sale price for a stove type.
     * @param typeId - The stove type ID.
     * @returns The minimum sale price, or 0 if no sales recorded.
     */
    async getMinPrice(typeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ min: number }>(
            "SELECT MIN(salePrice) as min FROM PriceHistory WHERE typeId = @typeId",
            { typeId }
        );
        const result = await stmt.get();
        return result?.min ?? 0;
    }

    /**
     * Calculates the maximum sale price for a stove type.
     * @param typeId - The stove type ID.
     * @returns The maximum sale price, or 0 if no sales recorded.
     */
    async getMaxPrice(typeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ max: number }>(
            "SELECT MAX(salePrice) as max FROM PriceHistory WHERE typeId = @typeId",
            { typeId }
        );
        const result = await stmt.get();
        return result?.max ?? 0;
    }

    /**
     * Retrieves the most recent sale prices for a stove type.
     * @param typeId - The stove type ID.
     * @param limit - Maximum number of records to return (default: 10).
     * @returns An array of recent PriceHistoryRow objects.
     */
    async getRecentPrices(typeId: number, limit: number = 10): Promise<PriceHistoryRow[]> {
        const stmt = this.unit.prepare<PriceHistoryRow>(
            "SELECT * FROM PriceHistory WHERE typeId = @typeId ORDER BY saleDate DESC LIMIT @limit",
            { typeId, limit }
        );
        return await stmt.all();
    }

    /**
     * Counts the number of sales recorded for a stove type.
     * @param typeId - The stove type ID.
     * @returns The count of price history records for the type.
     */
    async countSales(typeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM PriceHistory WHERE typeId = @typeId",
            { typeId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Deletes a price history record from the database.
     * @param id - The price history record's unique ID.
     * @returns True if exactly one record was deleted, false otherwise.
     */
    async deletePriceHistory(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM PriceHistory WHERE historyId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }
}
