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
    getAll(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType ORDER BY lootboxTypeId"
        );
        return stmt.all();
    }

    /**
     * Retrieves available lootbox types (isAvailable = true).
     * @returns Array of available LootboxTypeRow objects.
     */
    getAvailable(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE isAvailable = 1 ORDER BY costCoins"
        );
        return stmt.all();
    }

    /**
     * Retrieves a lootbox type by ID.
     * @param id - The lootbox type ID.
     * @returns LootboxTypeRow or null if not found.
     */
    getById(id: number): LootboxTypeRow | null {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        return stmt.get() ?? null;
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
    create(
        name: string,
        description: string | null,
        costCoins: number,
        costFree: boolean,
        dailyLimit: number | null,
        isAvailable: boolean
    ): [boolean, number] {
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
        return this.executeStmt(stmt);
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
    update(
        id: number,
        name: string,
        description: string | null,
        costCoins: number,
        costFree: boolean,
        dailyLimit: number | null,
        isAvailable: boolean
    ): boolean {
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
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates availability status.
     * @param id - Lootbox type ID.
     * @param isAvailable - New availability.
     * @returns True if updated.
     */
    updateAvailability(id: number, isAvailable: boolean): boolean {
        const stmt = this.unit.prepare(
            "UPDATE LootboxType SET isAvailable = @isAvailable WHERE lootboxTypeId = @id",
            { id, isAvailable: isAvailable ? 1 : 0 }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a lootbox type.
     * @param id - Lootbox type ID.
     * @returns True if deleted.
     */
    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total lootbox types.
     * @returns Count.
     */
    count(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxType"
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts available lootbox types.
     * @returns Count of available types.
     */
    countAvailable(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxType WHERE isAvailable = 1"
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }
}
