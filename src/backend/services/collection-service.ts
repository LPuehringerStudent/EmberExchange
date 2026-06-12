import { Unit } from "../utils/unit";
import { Rarity } from "../../shared/model";
import { PlayerService } from "./player-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { PlayerPrestigeService, PrestigeData } from "./player-prestige-service";

export interface CollectionProgress {
    name: string;
    total: number;
    owned: number;
    completed: boolean;
    bonusDescription: string;
    stoves: CollectionStoveProgress[];
}

export interface CollectionStoveProgress {
    typeId: number;
    name: string;
    imageUrl: string;
    rarity: Rarity;
    discovered: boolean;
    rewardClaimed: boolean;
    rewardCoins: number;
    rewardXP: number;
}

export interface ClaimCollectionRewardResult {
    success: boolean;
    typeId?: number;
    rewardCoins?: number;
    rewardXP?: number;
    newCoins?: number;
    prestige?: PrestigeData;
    error?: string;
}

const COLLECTION_BONUSES: Record<string, string> = {
    Industrial: "+10% coal from all sources",
    Dragon: "+5% sparks from salvage",
    Winter: "+1 free Standard Lootbox per day",
};

export class CollectionService {
    constructor(private unit: Unit) {}

    async getPlayerCollections(playerId: number): Promise<CollectionProgress[]> {
        await this.ensureCollectionSchema();
        await this.tryBackfillPlayerDiscoveries(playerId);

        const allTypesStmt = this.unit.prepare<{
            typeId: number;
            name: string;
            imageUrl: string;
            rarity: Rarity;
            collection: string;
            rewardClaimedAt: string | null;
            discoveredAt: string | null;
        }>(
            `SELECT st.typeId, st.name, st.imageUrl, st.rarity, st.collection,
                    pce.rewardClaimedAt,
                    COALESCE(pce.discoveredAt, currentOwned.discoveredAt, ownershipHistory.discoveredAt) as discoveredAt
             FROM StoveType st
             LEFT JOIN PlayerCollectionEntry pce
                    ON pce.typeId = st.typeId AND pce.playerId = @playerId
             LEFT JOIN (
                    SELECT s.typeId, COALESCE(MIN(s.mintedAt), CURRENT_TIMESTAMP::TEXT) as discoveredAt
                    FROM Stove s
                    WHERE s.currentOwnerId = @playerId
                    GROUP BY s.typeId
             ) currentOwned ON currentOwned.typeId = st.typeId
             LEFT JOIN (
                    SELECT s.typeId, COALESCE(MIN(o.acquiredAt), CURRENT_TIMESTAMP::TEXT) as discoveredAt
                    FROM Ownership o
                    JOIN Stove s ON s.stoveId = o.stoveId
                    WHERE o.playerId = @playerId
                    GROUP BY s.typeId
             ) ownershipHistory ON ownershipHistory.typeId = st.typeId
             WHERE st.rarity <> 'limited'
               AND st.name <> 'One of a Kind'
             ORDER BY st.collection ASC,
                      CASE st.rarity
                        WHEN 'common' THEN 1
                        WHEN 'rare' THEN 2
                        WHEN 'epic' THEN 3
                        WHEN 'legendary' THEN 4
                        WHEN 'secret' THEN 5
                        ELSE 99
                      END ASC,
                      st.name ASC`,
            { playerId }
        );
        const allTypes = await this.runStep("read collection progress", () => allTypesStmt.all());

        const grouped = new Map<string, CollectionStoveProgress[]>();
        for (const type of allTypes) {
            if (this.isExcludedStoveType(type.name, type.rarity)) continue;

            const list = grouped.get(type.collection) ?? [];
            list.push({
                typeId: type.typeId,
                name: type.name,
                imageUrl: type.imageUrl,
                rarity: type.rarity,
                discovered: type.discoveredAt !== null,
                rewardClaimed: type.rewardClaimedAt !== null,
                ...this.rewardForRarity(type.rarity),
            });
            grouped.set(type.collection, list);
        }

        return Array.from(grouped.entries()).map(([name, stoves]) => {
            const owned = stoves.filter(stove => stove.discovered).length;
            const total = stoves.length;
            return {
                name,
                total,
                owned,
                completed: total > 0 && owned >= total,
                bonusDescription: COLLECTION_BONUSES[name] ?? "",
                stoves,
            };
        });
    }

    async recordDiscovery(playerId: number, typeId: number, source: string): Promise<void> {
        await this.ensureCollectionSchema();
        await this.unit.prepare(
            `INSERT INTO PlayerCollectionEntry (playerId, typeId, discoveredAt, source)
             SELECT @playerId, @typeId, NOW(), @source
             WHERE EXISTS (
                SELECT 1 FROM StoveType
                WHERE typeId = @typeId
                  AND rarity <> 'limited'
                  AND name <> 'One of a Kind'
             )
             ON CONFLICT (playerId, typeId) DO NOTHING`,
            { playerId, typeId, source }
        ).run();
    }

    async recordDiscoveryForStove(stoveId: number, playerId: number, source: string): Promise<void> {
        const stove = await this.unit.prepare<{ typeId: number }, { stoveId: number }>(
            `SELECT typeId FROM Stove WHERE stoveId = @stoveId`,
            { stoveId }
        ).get();
        if (!stove) return;
        await this.recordDiscovery(playerId, stove.typeId, source);
    }

    async claimStoveReward(playerId: number, typeId: number): Promise<ClaimCollectionRewardResult> {
        await this.ensureCollectionSchema();
        await this.tryBackfillPlayerDiscoveries(playerId);
        await this.ensureDiscoveredEntryForType(playerId, typeId);

        const stoveType = await this.unit.prepare<{ name: string; rarity: Rarity }, { typeId: number }>(
            `SELECT name, rarity FROM StoveType WHERE typeId = @typeId`,
            { typeId }
        ).get();
        if (!stoveType) {
            return { success: false, error: "Stove type not found" };
        }
        if (this.isExcludedStoveType(stoveType.name, stoveType.rarity)) {
            return { success: false, error: "This stove is not part of collections" };
        }

        const entry = await this.unit.prepare<{
            rewardClaimedAt: string | null;
            name: string;
            rarity: Rarity;
        }, { playerId: number; typeId: number }>(
            `SELECT pce.rewardClaimedAt, st.name, st.rarity
             FROM PlayerCollectionEntry pce
             JOIN StoveType st ON st.typeId = pce.typeId
             WHERE pce.playerId = @playerId AND pce.typeId = @typeId`,
            { playerId, typeId }
        ).get();

        if (!entry) {
            return { success: false, error: "Discover this stove before claiming its reward" };
        }
        if (entry.rewardClaimedAt !== null) {
            return { success: false, error: "Collection reward already claimed" };
        }

        const claimed = await this.unit.prepare<{ typeId: number }, { playerId: number; typeId: number }>(
            `UPDATE PlayerCollectionEntry
             SET rewardClaimedAt = NOW()
             WHERE playerId = @playerId AND typeId = @typeId AND rewardClaimedAt IS NULL
             RETURNING typeId`,
            { playerId, typeId }
        ).get();
        if (!claimed) {
            return { success: false, error: "Collection reward already claimed" };
        }

        const reward = this.rewardForRarity(entry.rarity);
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);
        const prestigeService = new PlayerPrestigeService(this.unit);

        const coinsAdded = await playerService.addCoinsAtomic(playerId, reward.rewardCoins);
        if (!coinsAdded) {
            throw new Error("Failed to award collection coins");
        }

        await coinService.create(
            playerId,
            reward.rewardCoins,
            "collection_reward",
            `Collection reward: ${entry.name}`
        );

        const prestige = await prestigeService.addXP(
            playerId,
            reward.rewardXP,
            "collection_reward",
            `Collection reward: ${entry.name}`
        );

        const player = await playerService.getInfoByID(playerId);

        return {
            success: true,
            typeId,
            rewardCoins: reward.rewardCoins,
            rewardXP: reward.rewardXP,
            newCoins: player?.coins ?? undefined,
            prestige,
        };
    }

    private rewardForRarity(rarity: string): { rewardCoins: number; rewardXP: number } {
        switch (rarity.toLowerCase()) {
            case "legendary":
                return { rewardCoins: 500, rewardXP: 100 };
            case "secret":
                return { rewardCoins: 1000, rewardXP: 200 };
            default:
                return { rewardCoins: 250, rewardXP: 15 };
        }
    }

    async backfillPlayerDiscoveries(playerId: number): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerCollectionEntry (playerId, typeId, discoveredAt, source)
             SELECT s.currentOwnerId, s.typeId, COALESCE(MIN(s.mintedAt), CURRENT_TIMESTAMP::TEXT), 'current_owner'
             FROM Stove s
             JOIN StoveType st ON st.typeId = s.typeId
             WHERE s.currentOwnerId = @playerId
               AND st.rarity <> 'limited'
               AND st.name <> 'One of a Kind'
             GROUP BY s.currentOwnerId, s.typeId
             ON CONFLICT (playerId, typeId) DO NOTHING`,
            { playerId }
        ).run();

        await this.unit.prepare(
            `INSERT INTO PlayerCollectionEntry (playerId, typeId, discoveredAt, source)
             SELECT o.playerId, s.typeId, COALESCE(MIN(o.acquiredAt), CURRENT_TIMESTAMP::TEXT), 'ownership'
             FROM Ownership o
             JOIN Stove s ON s.stoveId = o.stoveId
             JOIN StoveType st ON st.typeId = s.typeId
             WHERE o.playerId = @playerId
               AND st.rarity <> 'limited'
               AND st.name <> 'One of a Kind'
             GROUP BY o.playerId, s.typeId
             ON CONFLICT (playerId, typeId) DO NOTHING`,
            { playerId }
        ).run();
    }

    private async ensureCollectionSchema(): Promise<void> {
        await this.runStep("create PlayerCollectionEntry table", () => this.unit.prepare(
            `CREATE TABLE IF NOT EXISTS PlayerCollectionEntry (
                playerId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId) ON DELETE CASCADE,
                discoveredAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                source TEXT NOT NULL DEFAULT 'unknown',
                rewardClaimedAt TEXT,
                PRIMARY KEY (playerId, typeId)
            )`
        ).run());
        await this.runStep("add PlayerCollectionEntry columns", () => this.unit.prepare(
            `ALTER TABLE PlayerCollectionEntry
                ADD COLUMN IF NOT EXISTS discoveredAt TEXT,
                ADD COLUMN IF NOT EXISTS source TEXT,
                ADD COLUMN IF NOT EXISTS rewardClaimedAt TEXT`
        ).run());
        await this.runStep("repair PlayerCollectionEntry discoveredAt", () => this.unit.prepare(
            `UPDATE PlayerCollectionEntry
             SET discoveredAt = CURRENT_TIMESTAMP
             WHERE discoveredAt IS NULL`
        ).run());
        await this.runStep("repair PlayerCollectionEntry source", () => this.unit.prepare(
            `UPDATE PlayerCollectionEntry
             SET source = 'unknown'
             WHERE source IS NULL`
        ).run());
        await this.runStep("enforce PlayerCollectionEntry defaults", () => this.unit.prepare(
            `ALTER TABLE PlayerCollectionEntry
                ALTER COLUMN discoveredAt SET DEFAULT CURRENT_TIMESTAMP,
                ALTER COLUMN discoveredAt SET NOT NULL,
                ALTER COLUMN source SET DEFAULT 'unknown',
                ALTER COLUMN source SET NOT NULL`
        ).run());
    }

    private async tryBackfillPlayerDiscoveries(playerId: number): Promise<void> {
        try {
            await this.unit.savepoint("collection_backfill");
            await this.backfillPlayerDiscoveries(playerId);
        } catch (err) {
            console.warn("Collection backfill failed; serving derived progress instead:", err);
            try {
                await this.unit.rollbackToSavepoint("collection_backfill");
            } catch {
                // If savepoints are not available in a test/mock, continue with derived progress.
            }
        }
    }

    private async ensureDiscoveredEntryForType(playerId: number, typeId: number): Promise<void> {
        await this.unit.prepare(
            `INSERT INTO PlayerCollectionEntry (playerId, typeId, discoveredAt, source)
             SELECT @playerId, @typeId, COALESCE(MIN(sourceRows.discoveredAt), CURRENT_TIMESTAMP::TEXT), 'derived'
             FROM (
                SELECT s.mintedAt as discoveredAt
                FROM Stove s
                JOIN StoveType st ON st.typeId = s.typeId
                WHERE s.currentOwnerId = @playerId
                  AND s.typeId = @typeId
                  AND st.rarity <> 'limited'
                  AND st.name <> 'One of a Kind'

                UNION ALL

                SELECT o.acquiredAt as discoveredAt
                FROM Ownership o
                JOIN Stove s ON s.stoveId = o.stoveId
                JOIN StoveType st ON st.typeId = s.typeId
                WHERE o.playerId = @playerId
                  AND s.typeId = @typeId
                  AND st.rarity <> 'limited'
                  AND st.name <> 'One of a Kind'
             ) sourceRows
             HAVING COUNT(*) > 0
             ON CONFLICT (playerId, typeId) DO NOTHING`,
            { playerId, typeId }
        ).run();
    }

    private isExcludedStoveType(name: string, rarity: string): boolean {
        return rarity.toLowerCase() === "limited" || name === "One of a Kind";
    }

    private async runStep<T>(step: string, action: () => Promise<T>): Promise<T> {
        try {
            return await action();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Collections ${step} failed: ${message}`);
        }
    }
}
