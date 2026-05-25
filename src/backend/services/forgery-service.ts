import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { ForgeryResult, ForgedStove, Rarity, StoveTypeRow, StoveRow } from "../../shared/model";

const RARITY_ORDER = [
    Rarity.COMMON,
    Rarity.RARE,
    Rarity.EPIC,
    Rarity.LEGENDARY,
    Rarity.LIMITED,
    Rarity.SECRET,
];

interface InputStove extends StoveRow {
    name: string;
    rarity: Rarity;
    collection: string;
    minHeat: number;
    maxHeat: number;
}

export class ForgeryService extends ServiceBase {
    private randomFn: () => number;

    constructor(unit: Unit, randomFn: () => number = Math.random) {
        super(unit);
        this.randomFn = randomFn;
    }

    async forge(playerId: number, stoveIds: number[]): Promise<ForgeryResult> {
        // 1. Validate count
        if (stoveIds.length !== 6) {
            return { success: false, error: "Exactly 6 stoves are required for forging" };
        }

        // 2. Fetch input stoves with type details
        const placeholders = stoveIds.map((_, i) => `@id${i}`).join(", ");
        const params: Record<string, number> = {};
        stoveIds.forEach((id, i) => { params[`id${i}`] = id; });

        const stmt = this.unit.prepare<InputStove>(
            `SELECT Stove.*, StoveType.name, StoveType.rarity, StoveType.collection, StoveType.minHeat, StoveType.maxHeat
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.stoveId IN (${placeholders})
               AND Stove.currentOwnerId = @playerId`,
            { ...params, playerId }
        );
        const inputs = await stmt.all();

        if (inputs.length !== 6) {
            return { success: false, error: "One or more stoves are not owned by you" };
        }

        // 3. Validate all same rarity and not limited/secret
        const inputRarities = new Set(inputs.map(s => s.rarity));
        if (inputRarities.size !== 1) {
            return { success: false, error: "All 6 stoves must be of the same rarity" };
        }

        const inputRarity = inputs[0].rarity;
        const inputTier = RARITY_ORDER.indexOf(inputRarity);

        if (inputTier < 0 || inputTier >= RARITY_ORDER.length - 2) {
            return { success: false, error: "Cannot forge Limited or Secret stoves" };
        }

        const outputRarity = RARITY_ORDER[inputTier + 1];

        // 4. Determine output collection by weighted random
        const collectionCounts: Record<string, number> = {};
        for (const s of inputs) {
            collectionCounts[s.collection] = (collectionCounts[s.collection] || 0) + 1;
        }
        const entries = Object.entries(collectionCounts);
        const roll = this.randomFn() * 6;
        let cumulative = 0;
        let outputCollection = entries[0][0];
        for (const [collection, count] of entries) {
            cumulative += count;
            if (roll < cumulative) {
                outputCollection = collection;
                break;
            }
        }

        // 5. Pick output stove type
        const outputTypesStmt = this.unit.prepare<StoveTypeRow>(
            `SELECT * FROM StoveType WHERE collection = @collection AND rarity = @rarity`,
            { collection: outputCollection, rarity: outputRarity }
        );
        const outputTypes = await outputTypesStmt.all();

        if (outputTypes.length === 0) {
            return { success: false, error: `No ${outputRarity} stoves available in the ${outputCollection} collection` };
        }

        const outputType = outputTypes[Math.floor(this.randomFn() * outputTypes.length)];

        // 6. Calculate output heatLevel
        const avgHeat = inputs.reduce((sum, s) => sum + s.heatLevel, 0) / 6;
        const outputHeat = avgHeat * (outputType.maxHeat - outputType.minHeat) + outputType.minHeat;
        const clampedHeat = Math.max(outputType.minHeat, Math.min(outputType.maxHeat, outputHeat));

        // 7. Execute atomic transaction
        // Clean up dependent records before deleting stoves
        const cleanupLootboxDropStmt = this.unit.prepare(
            `DELETE FROM LootboxDrop WHERE stoveId IN (${placeholders})`,
            params
        );
        await cleanupLootboxDropStmt.run();

        // Delete input stoves
        const deleteStmt = this.unit.prepare(
            `DELETE FROM Stove WHERE stoveId IN (${placeholders})`,
            params
        );
        await deleteStmt.run();

        // Insert new stove
        const insertStmt = this.unit.prepare<StoveRow>(
            `INSERT INTO Stove (typeId, currentOwnerId, mintedAt, heatLevel)
             VALUES (@typeId, @currentOwnerId, NOW(), @heatLevel)`,
            { typeId: outputType.typeId, currentOwnerId: playerId, heatLevel: clampedHeat }
        );
        await insertStmt.run();

        const newStoveId = await this.unit.getLastRowId();

        // Insert ownership record
        const ownershipStmt = this.unit.prepare(
            `INSERT INTO Ownership (stoveId, playerId, acquiredAt, acquiredHow)
             VALUES (@stoveId, @playerId, NOW(), 'craft')`,
            { stoveId: newStoveId, playerId }
        );
        await ownershipStmt.run();

        // Update PlayerStatistics
        const statsStmt = this.unit.prepare(
            `UPDATE PlayerStatistics
             SET totalStovesCrafted = totalStovesCrafted + 1
             WHERE playerId = @playerId`,
            { playerId }
        );
        await statsStmt.run();

        const newStove: ForgedStove = {
            stoveId: newStoveId,
            typeId: outputType.typeId,
            currentOwnerId: playerId,
            mintedAt: new Date(),
            heatLevel: clampedHeat,
            name: outputType.name,
            rarity: outputRarity,
            imageUrl: outputType.imageUrl,
            collection: outputType.collection,
        };

        return { success: true, newStove };
    }
}
