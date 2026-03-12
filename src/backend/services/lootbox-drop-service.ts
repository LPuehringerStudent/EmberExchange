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
    getAll(): LootboxDropRow[] {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop ORDER BY dropId"
        );
        return stmt.all();
    }

    /**
     * Retrieves a lootbox drop by ID.
     * @param id - The drop ID.
     * @returns LootboxDropRow or null if not found.
     */
    getById(id: number): LootboxDropRow | null {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE dropId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves the drop for a specific lootbox.
     * @param lootboxId - The lootbox ID.
     * @returns LootboxDropRow or null if not found.
     */
    getByLootboxId(lootboxId: number): LootboxDropRow | null {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE lootboxId = @lootboxId",
            { lootboxId }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves the drop for a specific stove.
     * @param stoveId - The stove ID.
     * @returns LootboxDropRow or null if not found.
     */
    getByStoveId(stoveId: number): LootboxDropRow | null {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE stoveId = @stoveId",
            { stoveId }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all drops for a specific player (via their lootboxes).
     * @param playerId - The player ID.
     * @returns Array of LootboxDropRow objects.
     */
    getByPlayerId(playerId: number): LootboxDropRow[] {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `SELECT ld.* FROM LootboxDrop ld
             JOIN Lootbox l ON ld.lootboxId = l.lootboxId
             WHERE l.playerId = @playerId
             ORDER BY l.openedAt DESC`,
            { playerId }
        );
        return stmt.all();
    }

    /**
     * Creates a new lootbox drop.
     * @param lootboxId - The lootbox ID.
     * @param stoveId - The stove ID that was dropped.
     * @returns Tuple [success, id].
     */
    create(lootboxId: number, stoveId: number): [boolean, number] {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Updates the stove for a drop (rarely used).
     * @param id - Drop ID.
     * @param stoveId - New stove ID.
     * @returns True if updated.
     */
    updateStove(id: number, stoveId: number): boolean {
        const stmt = this.unit.prepare(
            "UPDATE LootboxDrop SET stoveId = @stoveId WHERE dropId = @id",
            { id, stoveId }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a lootbox drop.
     * @param id - Drop ID.
     * @returns True if deleted.
     */
    delete(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM LootboxDrop WHERE dropId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Counts total drops.
     * @returns Count.
     */
    count(): number {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM LootboxDrop"
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Counts drops for a specific lootbox type.
     * @param lootboxTypeId - The lootbox type ID.
     * @returns Count.
     */
    countByLootboxType(lootboxTypeId: number): number {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM LootboxDrop ld
             JOIN Lootbox l ON ld.lootboxId = l.lootboxId
             WHERE l.lootboxTypeId = @lootboxTypeId`,
            { lootboxTypeId }
        );
        const result = stmt.get();
        return result?.count ?? 0;
    }
}
