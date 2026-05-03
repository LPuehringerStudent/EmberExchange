import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { StoveRow } from "../../shared/model";

export class StoveService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all stoves from the database.
     * @returns An array of all StoveRow objects.
     */
    async getAllStoves(): Promise<StoveRow[]> {
        const stmt = this.unit.prepare<StoveRow>(
            "SELECT * FROM Stove"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a stove by its unique ID.
     * @param id - The unique stove ID.
     * @returns The StoveRow object if found, otherwise null.
     */
    async getStoveById(id: number): Promise<StoveRow | null> {
        const stmt = this.unit.prepare<StoveRow>(
            "SELECT * FROM Stove WHERE stoveId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all stoves owned by a specific player.
     * @param playerId - The owner's unique ID.
     * @returns An array of StoveRow objects belonging to the player.
     */
    async getStovesByOwnerId(playerId: number): Promise<(StoveRow & { imageUrl: string })[]> {
        const stmt = this.unit.prepare<StoveRow & { imageUrl: string }>(
            `SELECT Stove.*, StoveType.imageUrl
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.currentOwnerId = @playerId`,
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves all stoves of a specific type.
     * @param typeId - The stove type ID.
     * @returns An array of StoveRow objects of the specified type.
     */
    async getStovesByTypeId(typeId: number): Promise<StoveRow[]> {
        const stmt = this.unit.prepare<StoveRow>(
            "SELECT * FROM Stove WHERE typeId = @typeId",
            { typeId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new stove instance (minting).
     * @param typeId - The stove type ID.
     * @param currentOwnerId - The initial owner's player ID.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new stove's ID (if successful).
     */
    async createStove(typeId: number, currentOwnerId: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<StoveRow>(
            `INSERT INTO Stove (typeId, currentOwnerId, mintedAt) 
             VALUES (@typeId, @currentOwnerId, NOW())`,
            { typeId, currentOwnerId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Updates the owner of a stove (for trades/transfers).
     * @param id - The stove's unique ID.
     * @param newOwnerId - The new owner's player ID.
     * @returns True if exactly one stove was updated, false otherwise.
     */
    async updateOwner(id: number, newOwnerId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Stove SET currentOwnerId = @newOwnerId WHERE stoveId = @id",
            { id, newOwnerId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a stove from the database.
     * @param id - The stove's unique ID.
     * @returns True if exactly one stove was deleted, false otherwise.
     */
    async deleteStove(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM Stove WHERE stoveId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts the number of stoves owned by a player.
     * @param playerId - The player's unique ID.
     * @returns The count of stoves owned by the player.
     */
    async countStovesByOwner(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE currentOwnerId = @playerId",
            { playerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts the total number of stoves of a specific type.
     * @param typeId - The stove type ID.
     * @returns The count of stoves of the specified type.
     */
    async countStovesByType(typeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Stove WHERE typeId = @typeId",
            { typeId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
