import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LootboxRow, LootboxTypeRow, LootboxDropRow } from "../../shared/model";

export class LootboxService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all lootboxes from the database.
     * @returns An array of all LootboxRow objects in the database.
     */
    getAllLootboxes(): LootboxRow[] {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox"
        );
        return stmt.all();
    }

    /**
     * Retrieves a lootbox by its unique ID.
     * @param id - The unique lootbox ID.
     * @returns The LootboxRow object if found, otherwise null.
     */
    getLootboxById(id: number): LootboxRow | null {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE lootboxId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all lootboxes opened by a specific player.
     * @param playerId - The player's unique ID.
     * @returns An array of LootboxRow objects belonging to the player.
     */
    getLootboxesByPlayerId(playerId: number): LootboxRow[] {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE playerId = @playerId",
            { playerId }
        );
        return stmt.all();
    }

    /**
     * Creates a new lootbox opened by a player.
     * @param lootboxTypeId - The type of lootbox being opened.
     * @param playerId - The player who opened the lootbox.
     * @param acquiredHow - How the lootbox was acquired ("free", "purchase", "reward").
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new lootbox's ID (if successful).
     */
    createLootbox(lootboxTypeId: number, playerId: number, acquiredHow: "free" | "purchase" | "reward"): [boolean, number] {
        const stmt = this.unit.prepare<LootboxRow>(
            `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
             VALUES (@lootboxTypeId, @playerId, datetime('now'), @acquiredHow)`,
            { lootboxTypeId, playerId, acquiredHow }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Retrieves all lootbox types from the database.
     * @returns An array of all LootboxTypeRow objects.
     */
    getAllLootboxTypes(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType"
        );
        return stmt.all();
    }

    /**
     * Retrieves a lootbox type by its unique ID.
     * @param id - The unique lootbox type ID.
     * @returns The LootboxTypeRow object if found, otherwise null.
     */
    getLootboxTypeById(id: number): LootboxTypeRow | null {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all available lootbox types.
     * @returns An array of available LootboxTypeRow objects.
     */
    getAvailableLootboxTypes(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE isAvailable = 1"
        );
        return stmt.all();
    }

    /**
     * Retrieves all drops for a specific lootbox.
     * @param lootboxId - The lootbox ID to get drops for.
     * @returns An array of LootboxDropRow objects.
     */
    getDropsByLootboxId(lootboxId: number): LootboxDropRow[] {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE lootboxId = @lootboxId",
            { lootboxId }
        );
        return stmt.all();
    }

    /**
     * Creates a new lootbox drop linking a stove to a lootbox.
     * @param lootboxId - The lootbox that produced the drop.
     * @param stoveId - The stove that was dropped.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new drop's ID (if successful).
     */
    createLootboxDrop(lootboxId: number, stoveId: number): [boolean, number] {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        return this.executeStmt(stmt);
    }

    /**
     * Atomically opens a lootbox: creates a stove, records the lootbox,
     * links them via a drop, and decrements the player's lootbox count.
     * @param lootboxTypeId - The type of lootbox being opened.
     * @param playerId - The player who opened the lootbox.
     * @param acquiredHow - How the lootbox was acquired ("free", "purchase", "reward").
     * @returns Tuple [success, { stoveId, lootboxId, dropId }] or [false, null] on failure.
     */
    openLootbox(
        stoveTypeId: number,
        playerId: number,
        acquiredHow: "free" | "purchase" | "reward"
    ): [boolean, { stoveId: number; lootboxId: number; dropId: number } | null] {
        const lootboxTypeId = 1; // Standard Lootbox

        // 1. Create stove
        const stoveStmt = this.unit.prepare<{ stoveId: number }>(
            `INSERT INTO Stove (typeId, currentOwnerId, mintedAt) 
             VALUES (@typeId, @playerId, datetime('now'))`,
            { typeId: stoveTypeId, playerId }
        );
        const stoveResult = stoveStmt.run();
        const stoveId = Number(stoveResult.lastInsertRowid);
        if (!stoveId) return [false, null];

        // 2. Create lootbox
        const lootboxStmt = this.unit.prepare<LootboxRow>(
            `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
             VALUES (@lootboxTypeId, @playerId, datetime('now'), @acquiredHow)`,
            { lootboxTypeId, playerId, acquiredHow }
        );
        const lootboxResult = lootboxStmt.run();
        const lootboxId = Number(lootboxResult.lastInsertRowid);
        if (!lootboxId) return [false, null];

        // 3. Create lootbox drop
        const dropStmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        const dropResult = dropStmt.run();
        const dropId = Number(dropResult.lastInsertRowid);
        if (!dropId) return [false, null];

        // 4. Decrement player lootbox count
        const playerStmt = this.unit.prepare(
            `UPDATE Player SET lootboxCount = lootboxCount - 1 WHERE playerId = @playerId AND lootboxCount > 0`,
            { playerId }
        );
        playerStmt.run();

        return [true, { stoveId, lootboxId, dropId }];
    }

    /**
     * Deletes a lootbox and its associated drops from the database.
     * @param id - The lootbox's unique ID.
     * @returns True if exactly one lootbox was deleted, false otherwise.
     */
    deleteLootbox(id: number): boolean {
        const stmt = this.unit.prepare(
            "DELETE FROM Lootbox WHERE lootboxId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }
}
