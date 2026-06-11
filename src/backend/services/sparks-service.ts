import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { ListingService } from "./listing-service";
import { NotificationService } from "./notification-service";
import { QuestService } from "./quest-service";

const SPARKS_BASE: Record<string, number> = {
    common: 5,
    rare: 15,
    epic: 40,
    legendary: 100,
    limited: 150,
    secret: 250,
};

const REROLL_BASE_COST: Record<string, number> = {
    common: 10,
    rare: 20,
    epic: 40,
    legendary: 80,
    limited: 100,
    secret: 150,
};

const REROLL_MULTIPLIER = 1.5;

export class SparksService {
    constructor(private unit: Unit) {}

    /**
     * Calculates sparks awarded for salvaging a stove.
     * Formula: baseRarityValue * (1 + heatLevel), floored.
     */
    calculateSparks(rarity: string, heatLevel: number): number {
        const base = SPARKS_BASE[rarity.toLowerCase()] ?? 1;
        return Math.floor(base * (1 + heatLevel));
    }

    /**
     * Calculates the cost to re-roll a stove's heat.
     * Formula: baseCost * (1.5 ^ reRollCount), rounded up.
     */
    calculateReRollCost(rarity: string, reRollCount: number): number {
        const base = REROLL_BASE_COST[rarity.toLowerCase()] ?? 20;
        return Math.ceil(base * Math.pow(REROLL_MULTIPLIER, reRollCount));
    }

    /**
     * Salvages (burns) a stove, awarding sparks to the player.
     * Validates ownership and ensures the stove is not listed.
     */
    async salvageStove(playerId: number, stoveId: number): Promise<{ success: boolean; sparksAwarded?: number; newBalance?: number; error?: string }> {
        const playerService = new PlayerService(this.unit);
        const listingService = new ListingService(this.unit);

        // Verify player owns the stove
        const stoveStmt = this.unit.prepare<
            { stoveId: number; typeId: number; currentOwnerId: number; name: string; rarity: string; heatLevel: number },
            { stoveId: number }
        >(
            `SELECT Stove.stoveId, Stove.typeId, Stove.currentOwnerId, StoveType.name, StoveType.rarity, Stove.heatLevel
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.stoveId = @stoveId`,
            { stoveId }
        );
        const stove = await stoveStmt.get();
        if (!stove) {
            return { success: false, error: "Stove not found" };
        }
        if (stove.currentOwnerId !== playerId) {
            return { success: false, error: "You do not own this stove" };
        }

        // Check if stove is currently listed
        const isListed = await listingService.isStoveListed(stoveId);
        if (isListed) {
            return { success: false, error: "Cannot salvage a listed stove. Cancel the listing first." };
        }

        // Calculate sparks
        const sparksAwarded = this.calculateSparks(stove.rarity, stove.heatLevel);

        // Get current player sparks
        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }
        const newBalance = (player.sparks ?? 0) + sparksAwarded;

        // Clean up dependent records before deleting stove
        // GloryShowcase has a hard FK reference to Stove — must delete first
        await this.unit.prepare(
            `DELETE FROM GloryShowcase WHERE stoveId = @stoveId`,
            { stoveId }
        ).run();

        // Cancelled listings still reference the stove; remove them so the stove can be deleted.
        // (Active listings are already blocked above; sold listings stay for trade history.)
        await this.unit.prepare(
            `DELETE FROM Listing WHERE stoveId = @stoveId AND status = 'cancelled'`,
            { stoveId }
        ).run();

        await this.unit.prepare(
            `DELETE FROM LootboxDrop WHERE stoveId = @stoveId`,
            { stoveId }
        ).run();

        await this.unit.prepare(
            `DELETE FROM Ownership WHERE stoveId = @stoveId`,
            { stoveId }
        ).run();

        // Delete stove
        await this.unit.prepare(
            `DELETE FROM Stove WHERE stoveId = @stoveId`,
            { stoveId }
        ).run();

        // Update player sparks
        await playerService.updatePlayerSparks(playerId, newBalance);

        // Create notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "system",
                "Stove Salvaged",
                `You salvaged ${stove.name} for ${sparksAwarded} sparks`,
                { stoveId, stoveName: stove.name, sparksAwarded, newBalance },
                { priority: 'normal' }
            );
        } catch {
            // Ignore notification errors
        }

        // Track quest progress
        try {
            const questService = new QuestService(this.unit);
            await questService.trackProgress(playerId, 'salvage_stove', 1);
            await questService.trackProgress(playerId, 'salvage_10_stoves', 1);
        } catch {
            // Ignore quest tracking errors
        }

        return { success: true, sparksAwarded, newBalance };
    }

    /**
     * Re-rolls a stove's heat level within its type's min/max range.
     * Cost scales with rarity and increases exponentially per re-roll on the same stove.
     */
    async reRollHeat(playerId: number, stoveId: number): Promise<{ success: boolean; newHeatLevel?: number; cost?: number; newSparksBalance?: number; error?: string }> {
        const playerService = new PlayerService(this.unit);
        const listingService = new ListingService(this.unit);

        // Verify player owns the stove and fetch all needed data
        const stoveStmt = this.unit.prepare<
            { stoveId: number; currentOwnerId: number; name: string; rarity: string; minHeat: number; maxHeat: number; heatLevel: number; reRollCount: number },
            { stoveId: number }
        >(
            `SELECT Stove.stoveId, Stove.currentOwnerId, StoveType.name, StoveType.rarity, 
                    StoveType.minHeat, StoveType.maxHeat, Stove.heatLevel, Stove.reRollCount
             FROM Stove
             JOIN StoveType ON Stove.typeId = StoveType.typeId
             WHERE Stove.stoveId = @stoveId`,
            { stoveId }
        );
        const stove = await stoveStmt.get();
        if (!stove) {
            return { success: false, error: "Stove not found" };
        }
        if (stove.currentOwnerId !== playerId) {
            return { success: false, error: "You do not own this stove" };
        }

        // Check if listed
        const isListed = await listingService.isStoveListed(stoveId);
        if (isListed) {
            return { success: false, error: "Cannot re-roll heat on a listed stove" };
        }

        // Calculate dynamic cost
        const cost = this.calculateReRollCost(stove.rarity, stove.reRollCount);

        // Check sparks balance
        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }
        if ((player.sparks ?? 0) < cost) {
            return { success: false, error: `Insufficient sparks. This re-roll costs ${cost} sparks.` };
        }

        // Re-roll heat
        let newHeatLevel = stove.minHeat + Math.random() * (stove.maxHeat - stove.minHeat);
        // Secret stoves should never be extinguished (heat > 0.55)
        if (stove.rarity.toLowerCase() === 'secret') {
            newHeatLevel = Math.min(newHeatLevel, 0.55);
        }

        // Update stove heat and increment re-roll count
        await this.unit.prepare(
            `UPDATE Stove SET heatLevel = @heatLevel, reRollCount = reRollCount + 1 WHERE stoveId = @stoveId`,
            { heatLevel: newHeatLevel, stoveId }
        ).run();

        // Deduct sparks
        const newSparksBalance = (player.sparks ?? 0) - cost;
        await playerService.updatePlayerSparks(playerId, newSparksBalance);

        // Notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "system",
                "Heat Re-rolled",
                `Re-rolled ${stove.name} heat to ${(newHeatLevel * 100).toFixed(1)}% for ${cost} sparks`,
                { stoveId, stoveName: stove.name, newHeatLevel, cost },
                { priority: 'normal' }
            );
        } catch {
            // Ignore
        }

        return { success: true, newHeatLevel, cost, newSparksBalance };
    }

    /**
     * Returns the player's current sparks balance.
     */
    async getSparksBalance(playerId: number): Promise<number> {
        const playerService = new PlayerService(this.unit);
        const player = await playerService.getInfoByID(playerId);
        return player?.sparks ?? 0;
    }
}
