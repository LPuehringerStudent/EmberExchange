import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LootboxDropRow } from "../../shared/model";

export class LootboxDropService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all lootbox drops.
     * @returns Array of all LootboxDropRow objects.
     */
    async getAll(): Promise<LootboxDropRow[]> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop ORDER BY dropId"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a lootbox drop by ID.
     * @param id - The drop ID.
     * @returns LootboxDropRow or null if not found.
     */
    async getById(id: number): Promise<LootboxDropRow | null> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE dropId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves the drop for a specific lootbox.
     * @param lootboxId - The lootbox ID.
     * @returns LootboxDropRow or null if not found.
     */
    async getByLootboxId(lootboxId: number): Promise<LootboxDropRow | null> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE lootboxId = @lootboxId",
            { lootboxId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves the drop for a specific stove.
     * @param stoveId - The stove ID.
     * @returns LootboxDropRow or null if not found.
     */
    async getByStoveId(stoveId: number): Promise<LootboxDropRow | null> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE stoveId = @stoveId",
            { stoveId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all drops for a specific player (via their lootboxes).
     * @param playerId - The player ID.
     * @returns Array of LootboxDropRow objects.
     */
    async getByPlayerId(playerId: number): Promise<LootboxDropRow[]> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `SELECT ld.* FROM LootboxDrop ld
             JOIN Lootbox l ON ld.lootboxId = l.lootboxId
             WHERE l.playerId = @playerId
             ORDER BY l.openedAt DESC`,
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new lootbox drop.
     * @param lootboxId - The lootbox ID.
     * @param stoveId - The stove ID that was dropped.
     * @returns Tuple [success, id].
     */
    async create(lootboxId: number, stoveId: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Updates the stove for a drop (rarely used).
     * @param id - Drop ID.
     * @param stoveId - New stove ID.
     * @returns True if updated.
     */
    async updateStove(id: number, stoveId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE LootboxDrop SET stoveId = @stoveId WHERE dropId = @id",
            { id, stoveId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a lootbox drop.
     * @param id - Drop ID.
     * @returns True if deleted.
     */
    async delete(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM LootboxDrop WHERE dropId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total drops.
     * @returns Count.
     */
    async count(): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxDrop"
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts drops for a specific lootbox type.
     * @param lootboxTypeId - The lootbox type ID.
     * @returns Count.
     */
    async countByLootboxType(lootboxTypeId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM LootboxDrop ld
             JOIN Lootbox l ON ld.lootboxId = l.lootboxId
             WHERE l.lootboxTypeId = @lootboxTypeId`,
            { lootboxTypeId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
