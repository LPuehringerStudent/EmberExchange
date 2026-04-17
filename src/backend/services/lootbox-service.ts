import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LootboxRow, LootboxTypeRow, LootboxDropRow } from "../../shared/model";

interface DropTable {
    rarity: string;
    weight: number;
}

const DROP_TABLES: Record<number, DropTable[]> = {
    1: [ // Standard Lootbox
        { rarity: 'common', weight: 50 },
        { rarity: 'rare', weight: 30 },
        { rarity: 'epic', weight: 15 },
        { rarity: 'legendary', weight: 5 }
    ],
    2: [ // Premium Lootbox
        { rarity: 'common', weight: 30 },
        { rarity: 'rare', weight: 40 },
        { rarity: 'epic', weight: 20 },
        { rarity: 'legendary', weight: 10 }
    ],
    3: [ // Legendary Crate
        { rarity: 'common', weight: 0 },
        { rarity: 'rare', weight: 30 },
        { rarity: 'epic', weight: 40 },
        { rarity: 'legendary', weight: 30 }
    ]
};

export class LootboxService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    private weightedRarity(dropTable: DropTable[]): string {
        const sum = dropTable.reduce((a, b) => a + b.weight, 0);
        if (sum <= 0) return 'common';
        let r = Math.random() * sum;
        for (const entry of dropTable) {
            if ((r -= entry.weight) <= 0) return entry.rarity;
        }
        return dropTable[0].rarity;
    }

    private pickStoveTypeByRarity(rarity: string): { typeId: number; name: string; imageUrl: string } | null {
        const stmt = this.unit.prepare<{ typeId: number; name: string; imageUrl: string }>(
            "SELECT typeId, name, imageUrl FROM StoveType WHERE rarity = @rarity",
            { rarity }
        );
        const rows = stmt.all();
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)];
    }

    /**
     * Retrieves all lootboxes from the database.
     */
    getAllLootboxes(): LootboxRow[] {
        const stmt = this.unit.prepare<LootboxRow>("SELECT * FROM Lootbox");
        return stmt.all();
    }

    /**
     * Retrieves a lootbox by its unique ID.
     */
    getLootboxById(id: number): LootboxRow | null {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE lootboxId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all unopened lootboxes belonging to a specific player.
     */
    getLootboxesByPlayerId(playerId: number): LootboxRow[] {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE playerId = @playerId AND openedAt IS NULL",
            { playerId }
        );
        let lootboxes = stmt.all();

        // Reconcile: if Player.lootboxCount exceeds actual unopened rows, create missing ones
        const countStmt = this.unit.prepare<{ lootboxCount: number }>(
            "SELECT lootboxCount FROM Player WHERE playerId = @playerId",
            { playerId }
        );
        const player = countStmt.get();
        const expectedCount = player?.lootboxCount ?? 0;

        if (lootboxes.length === 0 && expectedCount > 0) {
            for (let i = 0; i < expectedCount; i++) {
                const insertStmt = this.unit.prepare<LootboxRow>(
                    `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
                     VALUES (@lootboxTypeId, @playerId, null, @acquiredHow)`,
                    { lootboxTypeId: 1, playerId, acquiredHow: 'reward' }
                );
                insertStmt.run();
            }
            lootboxes = stmt.all();
        }

        return lootboxes;
    }

    /**
     * Creates a new unopened lootbox for a player.
     */
    createLootbox(lootboxTypeId: number, playerId: number, acquiredHow: "free" | "purchase" | "reward"): [boolean, number] {
        const stmt = this.unit.prepare<LootboxRow>(
            `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
             VALUES (@lootboxTypeId, @playerId, null, @acquiredHow)`,
            { lootboxTypeId, playerId, acquiredHow }
        );
        const [success, id] = this.executeStmt(stmt);
        if (success) {
            this.unit.prepare(
                "UPDATE Player SET lootboxCount = lootboxCount + 1 WHERE playerId = @playerId",
                { playerId }
            ).run();
        }
        return [success, id];
    }

    /**
     * Retrieves all available lootbox types.
     */
    getAvailableLootboxTypes(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE isAvailable = 1"
        );
        return stmt.all();
    }

    /**
     * Retrieves a lootbox type by its unique ID.
     */
    getLootboxTypeById(id: number): LootboxTypeRow | null {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves all lootbox types.
     */
    getAllLootboxTypes(): LootboxTypeRow[] {
        const stmt = this.unit.prepare<LootboxTypeRow>("SELECT * FROM LootboxType");
        return stmt.all();
    }

    /**
     * Retrieves all drops for a specific lootbox.
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
     * Atomically opens a lootbox from the player's inventory.
     * Determines the drop server-side based on lootbox type.
     * @param lootboxId - The unopened lootbox ID.
     * @param playerId - The player who owns the lootbox.
     * @returns Tuple [success, result] where result contains stoveId, stoveName, rarity, etc.
     */
    openLootbox(
        lootboxId: number,
        playerId: number
    ): [boolean, { stoveId: number; stoveName: string; rarity: string; imageUrl: string; lootboxId: number } | null] {
        // 1. Verify lootbox exists, is unopened, and belongs to player
        const verifyStmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE lootboxId = @lootboxId AND playerId = @playerId AND openedAt IS NULL",
            { lootboxId, playerId }
        );
        const lootbox = verifyStmt.get();
        if (!lootbox) return [false, null];

        // 2. Determine drop
        const dropTable = DROP_TABLES[lootbox.lootboxTypeId] ?? DROP_TABLES[1];
        const rarity = this.weightedRarity(dropTable);
        const stoveType = this.pickStoveTypeByRarity(rarity);
        if (!stoveType) return [false, null];

        // 3. Create stove
        const stoveStmt = this.unit.prepare<{ stoveId: number }>(
            `INSERT INTO Stove (typeId, currentOwnerId, mintedAt) 
             VALUES (@typeId, @playerId, datetime('now'))`,
            { typeId: stoveType.typeId, playerId }
        );
        const stoveResult = stoveStmt.run();
        const stoveId = Number(stoveResult.lastInsertRowid);
        if (!stoveId) return [false, null];

        // 4. Mark lootbox as opened
        this.unit.prepare(
            `UPDATE Lootbox SET openedAt = datetime('now') WHERE lootboxId = @lootboxId`,
            { lootboxId }
        ).run();

        // 5. Create lootbox drop
        const dropStmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        const dropResult = dropStmt.run();
        const dropId = Number(dropResult.lastInsertRowid);
        if (!dropId) return [false, null];

        // 6. Decrement player lootbox count for original frontend compatibility
        this.unit.prepare(
            "UPDATE Player SET lootboxCount = lootboxCount - 1 WHERE playerId = @playerId",
            { playerId }
        ).run();

        return [true, { stoveId, stoveName: stoveType.name, rarity, imageUrl: stoveType.imageUrl, lootboxId }];
    }

    /**
     * Deletes a lootbox and its associated drops from the database.
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
