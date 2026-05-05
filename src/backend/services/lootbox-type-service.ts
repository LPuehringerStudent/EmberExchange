import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LootboxTypeRow } from "../../shared/model";

export class LootboxTypeService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all lootbox types.
     * @returns Array of all LootboxTypeRow objects.
     */
    async getAll(): Promise<LootboxTypeRow[]> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType ORDER BY lootboxTypeId"
        );
        return await stmt.all();
    }

    /**
     * Retrieves available lootbox types (isAvailable = true).
     * @returns Array of available LootboxTypeRow objects.
     */
    async getAvailable(): Promise<LootboxTypeRow[]> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE isAvailable = 1 ORDER BY costCoins"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a lootbox type by ID.
     * @param id - The lootbox type ID.
     * @returns LootboxTypeRow or null if not found.
     */
    async getById(id: number): Promise<LootboxTypeRow | null> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Creates a new lootbox type.
     * @param name - Type name.
     * @param description - Type description (can be null).
     * @param costCoins - Cost in coins.
     * @param costFree - Whether it's free (true/false).
     * @param dailyLimit - Daily limit (null for unlimited).
     * @param isAvailable - Availability status.
     * @returns Tuple [success, id].
     */
    async create(
        name: string,
        description: string | null,
        costCoins: number,
        costFree: boolean,
        dailyLimit: number | null,
        isAvailable: boolean
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            `INSERT INTO LootboxType (name, description, costCoins, costFree, dailyLimit, isAvailable) 
             VALUES (@name, @description, @costCoins, @costFree, @dailyLimit, @isAvailable)`,
            {
                name,
                description,
                costCoins,
                costFree: costFree ? 1 : 0,
                dailyLimit,
                isAvailable: isAvailable ? 1 : 0
            }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Updates a lootbox type.
     * @param id - Lootbox type ID.
     * @param name - New name.
     * @param description - New description.
     * @param costCoins - New cost.
     * @param costFree - New free status.
     * @param dailyLimit - New daily limit.
     * @param isAvailable - New availability.
     * @returns True if updated.
     */
    async update(
        id: number,
        name: string,
        description: string | null,
        costCoins: number,
        costFree: boolean,
        dailyLimit: number | null,
        isAvailable: boolean
    ): Promise<boolean> {
        const stmt = this.unit.prepare(
            `UPDATE LootboxType 
             SET name = @name, description = @description, costCoins = @costCoins, 
                 costFree = @costFree, dailyLimit = @dailyLimit, isAvailable = @isAvailable 
             WHERE lootboxTypeId = @id`,
            {
                id,
                name,
                description,
                costCoins,
                costFree: costFree ? 1 : 0,
                dailyLimit,
                isAvailable: isAvailable ? 1 : 0
            }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates availability status.
     * @param id - Lootbox type ID.
     * @param isAvailable - New availability.
     * @returns True if updated.
     */
    async updateAvailability(id: number, isAvailable: boolean): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE LootboxType SET isAvailable = @isAvailable WHERE lootboxTypeId = @id",
            { id, isAvailable: isAvailable ? 1 : 0 }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a lootbox type.
     * @param id - Lootbox type ID.
     * @returns True if deleted.
     */
    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total lootbox types.
     * @returns Count.
     */
    async count(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxType"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts available lootbox types.
     * @returns Count of available types.
     */
    async countAvailable(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxType WHERE isAvailable = 1"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
