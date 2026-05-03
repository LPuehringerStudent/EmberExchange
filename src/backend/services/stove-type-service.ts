import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { StoveTypeRow, Rarity } from "../../shared/model";

export class StoveTypeService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all stove types from the database.
     * @returns An array of all StoveTypeRow objects.
     */
    async getAllStoveTypes(): Promise<StoveTypeRow[]> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            "SELECT * FROM StoveType"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a stove type by its unique ID.
     * @param id - The unique stove type ID.
     * @returns The StoveTypeRow object if found, otherwise null.
     */
    async getStoveTypeById(id: number): Promise<StoveTypeRow | null> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            "SELECT * FROM StoveType WHERE typeId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves stove types by rarity.
     * @param rarity - The rarity level to filter by ("common" | "rare" | "epic" | "legendary" | "limited").
     * @returns An array of StoveTypeRow objects with the specified rarity.
     */
    async getStoveTypesByRarity(rarity: Rarity): Promise<StoveTypeRow[]> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            "SELECT * FROM StoveType WHERE rarity = @rarity",
            { rarity }
        );
        return await stmt.all();
    }

    /**
     * Creates a new stove type.
     * @param name - The unique name for the stove type.
     * @param imageUrl - URL to the stove's image.
     * @param rarity - The rarity level ("common" | "rare" | "epic" | "legendary" | "limited").
     * @param lootboxWeight - Weight used for lootbox drop probability calculation.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new stove type's ID (if successful).
     */
    async createStoveType(
        name: string,
        imageUrl: string,
        rarity: Rarity,
        lootboxWeight: number
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            `INSERT INTO StoveType (name, imageUrl, rarity, lootboxWeight) 
             VALUES (@name, @imageUrl, @rarity, @lootboxWeight)`,
            { name, imageUrl, rarity, lootboxWeight }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Updates the lootbox weight of a stove type.
     * @param id - The stove type's unique ID.
     * @param lootboxWeight - The new lootbox weight to set.
     * @returns True if exactly one stove type was updated, false otherwise.
     */
    async updateLootboxWeight(id: number, lootboxWeight: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE StoveType SET lootboxWeight = @lootboxWeight WHERE typeId = @id",
            { id, lootboxWeight }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates the image URL of a stove type.
     * @param id - The stove type's unique ID.
     * @param imageUrl - The new image URL to set.
     * @returns True if exactly one stove type was updated, false otherwise.
     */
    async updateImageUrl(id: number, imageUrl: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE StoveType SET imageUrl = @imageUrl WHERE typeId = @id",
            { id, imageUrl }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a stove type from the database.
     * @param id - The stove type's unique ID.
     * @returns True if exactly one stove type was deleted, false otherwise.
     */
    async deleteStoveType(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM StoveType WHERE typeId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Retrieves a stove type by its name.
     * @param name - The name to search for.
     * @returns The StoveTypeRow object if found, otherwise null.
     */
    async getStoveTypeByName(name: string): Promise<StoveTypeRow | null> {
        const stmt = this.unit.prepare<StoveTypeRow>(
            "SELECT * FROM StoveType WHERE name = @name",
            { name }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Calculates the total lootbox weight for all stove types.
     * Used for probability calculations when rolling drops.
     * @returns The sum of all lootbox weights.
     */
    async getTotalLootboxWeight(): Promise<number> {
        const stmt = this.unit.prepare<{ total: number }>(
            "SELECT SUM(lootboxWeight) as total FROM StoveType"
        );
        const result = await stmt.get();
        return result?.total ?? 0;
    }
}
