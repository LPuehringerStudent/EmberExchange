import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { TradeRow } from "../../shared/model";

export class TradeService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all trades from the database.
     * @returns An array of all TradeRow objects.
     */
    async getAllTrades(): Promise<TradeRow[]> {
        const stmt = this.unit.prepare<TradeRow>(
            "SELECT * FROM Trade"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a trade by its unique ID.
     * @param id - The unique trade ID.
     * @returns The TradeRow object if found, otherwise null.
     */
    async getTradeById(id: number): Promise<TradeRow | null> {
        const stmt = this.unit.prepare<TradeRow>(
            "SELECT * FROM Trade WHERE tradeId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves trades by listing ID.
     * @param listingId - The listing's unique ID.
     * @returns The TradeRow object if found, otherwise null.
     */
    async getTradeByListingId(listingId: number): Promise<TradeRow | null> {
        const stmt = this.unit.prepare<TradeRow>(
            "SELECT * FROM Trade WHERE listingId = @listingId",
            { listingId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all trades where a player was the buyer.
     * @param buyerId - The buyer's unique player ID.
     * @returns An array of TradeRow objects.
     */
    async getTradesByBuyerId(buyerId: number): Promise<TradeRow[]> {
        const stmt = this.unit.prepare<TradeRow>(
            "SELECT * FROM Trade WHERE buyerId = @buyerId ORDER BY executedAt DESC",
            { buyerId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new trade record.
     * @param listingId - The listing that was purchased.
     * @param buyerId - The buyer's player ID.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new trade's ID (if successful).
     */
    async createTrade(listingId: number, buyerId: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<TradeRow>(
            `INSERT INTO Trade (listingId, buyerId, executedAt) 
             VALUES (@listingId, @buyerId, NOW())`,
            { listingId, buyerId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Retrieves recent trades.
     * @param limit - Maximum number of records to return (default: 10).
     * @returns An array of recent TradeRow objects.
     */
    async getRecentTrades(limit: number = 10): Promise<TradeRow[]> {
        const stmt = this.unit.prepare<TradeRow>(
            "SELECT * FROM Trade ORDER BY executedAt DESC LIMIT @limit",
            { limit }
        );
        return await stmt.all();
    }

    /**
     * Deletes a trade record from the database.
     * @param id - The trade's unique ID.
     * @returns True if exactly one trade was deleted, false otherwise.
     */
    async deleteTrade(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM Trade WHERE tradeId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total number of trades.
     * @returns The total count of trades.
     */
    async countTrades(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Trade"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts trades for a specific buyer.
     * @param buyerId - The buyer's player ID.
     * @returns The count of trades by the buyer.
     */
    async countTradesByBuyer(buyerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Trade WHERE buyerId = @buyerId",
            { buyerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
