import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { LootboxRow, LootboxTypeRow, LootboxDropRow } from "../../shared/model";
import { ListingService } from "./listing-service";
import { PlayerPrestigeService } from "./player-prestige-service";
import { AchievementEngine } from "./achievement-engine";
import { PityService } from "./pity-service";
import { QuestService } from "./quest-service";

interface DropTable {
    rarity: string;
    weight: number;
}

const DROP_TABLES: Record<number, DropTable[]> = {
    1: [ // Standard Lootbox
        { rarity: 'common', weight: 75 },
        { rarity: 'rare', weight: 20 },
        { rarity: 'epic', weight: 4 },
        { rarity: 'legendary', weight: 1 },
        { rarity: 'secret', weight: 0 }
    ],
    2: [ // Golden Lootbox
        { rarity: 'common', weight: 45 },
        { rarity: 'rare', weight: 35 },
        { rarity: 'epic', weight: 15 },
        { rarity: 'legendary', weight: 4 },
        { rarity: 'secret', weight: 1 }
    ],
    3: [ // Legendary Crate
        { rarity: 'common', weight: 0 },
        { rarity: 'rare', weight: 25 },
        { rarity: 'epic', weight: 40 },
        { rarity: 'legendary', weight: 30 },
        { rarity: 'secret', weight: 5 }
    ],
    4: [ // Dragon Crate
        { rarity: 'common', weight: 30 },
        { rarity: 'rare', weight: 30 },
        { rarity: 'epic', weight: 25 },
        { rarity: 'legendary', weight: 12 },
        { rarity: 'secret', weight: 3 }
    ],
    5: [ // Winter Crate
        { rarity: 'common', weight: 49 },
        { rarity: 'rare', weight: 30 },
        { rarity: 'epic', weight: 15 },
        { rarity: 'legendary', weight: 5 },
        { rarity: 'secret', weight: 1 }
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

    private async pickStoveTypeByRarity(rarity: string): Promise<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number } | null> {
        const stmt = this.unit.prepare<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number }>(
            "SELECT typeId, name, rarity, imageUrl, minHeat, maxHeat FROM StoveType WHERE rarity = @rarity AND name NOT LIKE '%Upgraded%'",
            { rarity }
        );
        const rows = await stmt.all();
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)];
    }

    private async pickDragonStoveTypeByRarity(rarity: string): Promise<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number } | null> {
        const stmt = this.unit.prepare<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number }>(
            "SELECT typeId, name, rarity, imageUrl, minHeat, maxHeat FROM StoveType WHERE LOWER(name) LIKE '%dragon%' AND rarity = @rarity AND name NOT LIKE '%Upgraded%'",
            { rarity }
        );
        const rows = await stmt.all();
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)];
    }

    private async pickWinterStoveTypeByRarity(rarity: string): Promise<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number } | null> {
        const stmt = this.unit.prepare<{ typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number }>(
            "SELECT typeId, name, rarity, imageUrl, minHeat, maxHeat FROM StoveType WHERE collection = 'Winter' AND rarity = @rarity",
            { rarity }
        );
        const rows = await stmt.all();
        if (rows.length === 0) return null;
        return rows[Math.floor(Math.random() * rows.length)];
    }

    /**
     * Retrieves all lootboxes from the database.
     */
    async getAllLootboxes(limit: number = 100, offset: number = 0): Promise<LootboxRow[]> {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox LIMIT @limit OFFSET @offset",
            { limit, offset }
        );
        return await stmt.all();
    }

    /**
     * Retrieves the N most recent lootbox openings across all players,
     * including player username, stove name, and rarity.
     */
    async getRecentPulls(limit = 20): Promise<Array<{ username: string; name: string; rarity: string; imageUrl: string; openedAt: string }>> {
        const stmt = this.unit.prepare<{ username: string; name: string; rarity: string; imageUrl: string; openedAt: string }>(`
            SELECT
                p.username,
                st.name,
                st.rarity,
                st.imageUrl,
                l.openedAt
            FROM Lootbox l
            JOIN Player p ON l.playerId = p.playerId
            JOIN LootboxDrop ld ON l.lootboxId = ld.lootboxId
            JOIN Stove s ON ld.stoveId = s.stoveId
            JOIN StoveType st ON s.typeId = st.typeId
            WHERE l.openedAt IS NOT NULL
            ORDER BY l.openedAt DESC
            LIMIT @limit
        `, { limit });
        return await stmt.all();
    }

    /**
     * Retrieves a lootbox by its unique ID.
     */
    async getLootboxById(id: number): Promise<LootboxRow | null> {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE lootboxId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all unopened lootboxes belonging to a specific player.
     */
    async getLootboxesByPlayerId(playerId: number): Promise<LootboxRow[]> {
        const stmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE playerId = @playerId AND openedAt IS NULL",
            { playerId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new unopened lootbox for a player.
     */
    async createLootbox(lootboxTypeId: number, playerId: number, acquiredHow: "free" | "purchase" | "reward"): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<LootboxRow>(
            `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
             VALUES (@lootboxTypeId, @playerId, null, @acquiredHow)`,
            { lootboxTypeId, playerId, acquiredHow }
        );
        const [success, id] = await this.executeStmt(stmt);
        if (success) {
            await this.unit.prepare(
                "UPDATE Player SET lootboxCount = lootboxCount + 1 WHERE playerId = @playerId",
                { playerId }
            ).run();
        }
        return [success, id];
    }

    /**
     * Retrieves all available lootbox types.
     */
    async getAvailableLootboxTypes(): Promise<LootboxTypeRow[]> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE isAvailable = 1"
        );
        return await stmt.all();
    }

    /**
     * Retrieves a lootbox type by its unique ID.
     */
    async getLootboxTypeById(id: number): Promise<LootboxTypeRow | null> {
        const stmt = this.unit.prepare<LootboxTypeRow>(
            "SELECT * FROM LootboxType WHERE lootboxTypeId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all lootbox types.
     */
    async getAllLootboxTypes(): Promise<LootboxTypeRow[]> {
        const stmt = this.unit.prepare<LootboxTypeRow>("SELECT * FROM LootboxType");
        return await stmt.all();
    }

    /**
     * Retrieves all drops for a specific lootbox.
     */
    async getDropsByLootboxId(lootboxId: number): Promise<LootboxDropRow[]> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            "SELECT * FROM LootboxDrop WHERE lootboxId = @lootboxId",
            { lootboxId }
        );
        return await stmt.all();
    }

    /**
     * Creates a new lootbox drop linking a stove to a lootbox.
     */
    async createLootboxDrop(lootboxId: number, stoveId: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<LootboxDropRow>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)`,
            { lootboxId, stoveId }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Atomically opens a lootbox from the player's inventory.
     * Determines the drop server-side based on lootbox type.
     * @param lootboxId - The unopened lootbox ID.
     * @param playerId - The player who owns the lootbox.
     * @returns Tuple [success, result] where result contains stoveId, stoveName, rarity, etc.
     */
    async openLootbox(
        lootboxId: number,
        playerId: number
    ): Promise<[boolean, { stoveId: number; stoveName: string; rarity: string; imageUrl: string; lootboxId: number } | null]> {
        // 1. Verify lootbox exists, is unopened, and belongs to player (lock row)
        const verifyStmt = this.unit.prepare<LootboxRow>(
            "SELECT * FROM Lootbox WHERE lootboxId = @lootboxId AND playerId = @playerId AND openedAt IS NULL FOR UPDATE",
            { lootboxId, playerId }
        );
        const lootbox = await verifyStmt.get();
        if (!lootbox) return [false, null];

        // 1b. Verify lootbox is not currently listed on the marketplace
        const listingService = new ListingService(this.unit);
        if (await listingService.isLootboxListed(lootboxId)) {
            return [false, null];
        }

        // 2. Determine drop
        const dropTable = DROP_TABLES[lootbox.lootboxTypeId] ?? DROP_TABLES[1];
        let rarity = this.weightedRarity(dropTable);

        // 2b. Check pity system
        const pityService = new PityService(this.unit);
        const guaranteedRarity = await pityService.checkPity(playerId, lootbox.lootboxTypeId, rarity);
        if (guaranteedRarity) {
            rarity = guaranteedRarity;
        }

        let stoveType: { typeId: number; name: string; rarity: string; imageUrl: string; minHeat: number; maxHeat: number } | null = null;
        if (lootbox.lootboxTypeId === 4) {
            // Dragon Crate: dragon stoves of the rolled rarity
            stoveType = await this.pickDragonStoveTypeByRarity(rarity);
        } else if (lootbox.lootboxTypeId === 5) {
            // Winter Crate: winter-themed stoves of the rolled rarity
            stoveType = await this.pickWinterStoveTypeByRarity(rarity);
        } else {
            stoveType = await this.pickStoveTypeByRarity(rarity);
        }
        if (!stoveType) return [false, null];

        // 2c. Update pity counter
        const rarityPriority: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3, limited: 4, secret: 5 };
        if ((rarityPriority[rarity.toLowerCase()] ?? 0) >= 3) {
            // Legendary or better — reset counter (so legendary pity can actually be reached)
            await pityService.resetCounter(playerId, lootbox.lootboxTypeId);
        } else {
            await pityService.incrementCounter(playerId, lootbox.lootboxTypeId);
        }

        // 3. Create stove with randomized heat level
        let heatLevel = stoveType.minHeat + Math.random() * (stoveType.maxHeat - stoveType.minHeat);
        // Secret stoves should never be extinguished (heat > 0.55)
        if (stoveType.rarity.toLowerCase() === 'secret') {
            heatLevel = Math.min(heatLevel, 0.55);
        }
        const stoveStmt = this.unit.prepare<{ stoveId: number }>(
            `INSERT INTO Stove (typeId, currentOwnerId, mintedAt, heatLevel) 
             VALUES (@typeId, @playerId, NOW(), @heatLevel)
             RETURNING stoveId`,
            { typeId: stoveType.typeId, playerId, heatLevel }
        );
        const stoveRow = await stoveStmt.get();
        if (!stoveRow) return [false, null];
        const stoveId = stoveRow.stoveId;

        // 4. Mark lootbox as opened
        const opened = await this.unit.prepare(
            `UPDATE Lootbox SET openedAt = NOW() WHERE lootboxId = @lootboxId AND openedAt IS NULL`,
            { lootboxId }
        ).run();
        if (opened.changes !== 1) {
            return [false, null];
        }

        // 5. Create lootbox drop
        const dropStmt = this.unit.prepare<{ dropId: number }>(
            `INSERT INTO LootboxDrop (lootboxId, stoveId) 
             VALUES (@lootboxId, @stoveId)
             RETURNING dropId`,
            { lootboxId, stoveId }
        );
        const dropRow = await dropStmt.get();
        if (!dropRow) return [false, null];
        const dropId = dropRow.dropId;

        // 6. Sync player lootbox count to actual unopened lootbox count
        await this.unit.prepare(
            `UPDATE Player SET lootboxCount = (
                SELECT COUNT(*) FROM Lootbox WHERE playerId = @playerId AND openedAt IS NULL
            ) WHERE playerId = @playerId`,
            { playerId }
        ).run();

        // Award XP for opening lootbox
        try {
            await this.unit.savepoint('lootbox_xp');
            const prestigeService = new PlayerPrestigeService(this.unit);
            await prestigeService.addXP(playerId, 100, 'lootbox_open', 'Opened a lootbox');
        } catch {
            try { await this.unit.rollbackToSavepoint('lootbox_xp'); } catch { /* ignore */ }
        }

        // Check achievements & cosmetic unlocks
        try {
            await this.unit.savepoint('lootbox_achievements');
            const engine = new AchievementEngine(this.unit);
            await engine.checkLootboxAchievements(playerId);
            await engine.checkWealthAchievements(playerId);
        } catch {
            try { await this.unit.rollbackToSavepoint('lootbox_achievements'); } catch { /* ignore */ }
        }

        // Track quest progress
        try {
            const questService = new QuestService(this.unit);
            await questService.trackProgress(playerId, 'open_lootboxes', 1);
            await questService.trackProgress(playerId, 'open_20_lootboxes', 1);
        } catch {
            // Ignore quest tracking errors
        }

        return [true, { stoveId, stoveName: stoveType.name, rarity: stoveType.rarity, imageUrl: stoveType.imageUrl, lootboxId }];
    }

    /**
     * Updates the owner (playerId) of a lootbox.
     * @param lootboxId - The lootbox's unique ID.
     * @param playerId - The new owner's player ID.
     * @param expectedCurrentOwnerId - If provided, the update only succeeds if the lootbox is currently owned by this player.
     * @returns True if exactly one lootbox was updated, false otherwise.
     */
    async updateLootboxOwner(lootboxId: number, playerId: number, expectedCurrentOwnerId?: number): Promise<boolean> {
        const sql = expectedCurrentOwnerId !== undefined
            ? "UPDATE Lootbox SET playerId = @playerId WHERE lootboxId = @lootboxId AND playerId = @expectedCurrentOwnerId"
            : "UPDATE Lootbox SET playerId = @playerId WHERE lootboxId = @lootboxId";
        const params = expectedCurrentOwnerId !== undefined
            ? { lootboxId, playerId, expectedCurrentOwnerId }
            : { lootboxId, playerId };
        const stmt = this.unit.prepare(sql, params);
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a lootbox and its associated drops from the database.
     */
    async deleteLootbox(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM Lootbox WHERE lootboxId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }
}
