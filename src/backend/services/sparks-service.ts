import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { ListingService } from "./listing-service";
import { NotificationService } from "./notification-service";

const SPARKS_BASE: Record<string, number> = {
    common: 5,
    rare: 15,
    epic: 40,
    legendary: 100,
    limited: 150,
    secret: 250,
};

const HEAT_REROLL_COST = 20;

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
                { stoveId, stoveName: stove.name, sparksAwarded, newBalance }
            );
        } catch {
            // Ignore notification errors
        }

        return { success: true, sparksAwarded, newBalance };
    }

    /**
     * Re-rolls a stove's heat level within its type's min/max range.
     * Costs 20 sparks.
     */
    async reRollHeat(playerId: number, stoveId: number): Promise<{ success: boolean; newHeatLevel?: number; error?: string }> {
        const playerService = new PlayerService(this.unit);
        const listingService = new ListingService(this.unit);

        // Verify player owns the stove
        const stoveStmt = this.unit.prepare<
            { stoveId: number; currentOwnerId: number; name: string; minHeat: number; maxHeat: number; heatLevel: number },
            { stoveId: number }
        >(
            `SELECT Stove.stoveId, Stove.currentOwnerId, StoveType.name, StoveType.minHeat, StoveType.maxHeat, Stove.heatLevel
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

        // Check sparks balance
        const player = await playerService.getInfoByID(playerId);
        if (!player) {
            return { success: false, error: "Player not found" };
        }
        if ((player.sparks ?? 0) < HEAT_REROLL_COST) {
            return { success: false, error: `Insufficient sparks. Re-roll costs ${HEAT_REROLL_COST} sparks.` };
        }

        // Re-roll heat
        const newHeatLevel = stove.minHeat + Math.random() * (stove.maxHeat - stove.minHeat);

        // Update stove
        await this.unit.prepare(
            `UPDATE Stove SET heatLevel = @heatLevel WHERE stoveId = @stoveId`,
            { heatLevel: newHeatLevel, stoveId }
        ).run();

        // Deduct sparks
        await playerService.updatePlayerSparks(playerId, (player.sparks ?? 0) - HEAT_REROLL_COST);

        // Notification
        try {
            const notificationService = new NotificationService(this.unit);
            await notificationService.create(
                playerId,
                "system",
                "Heat Re-rolled",
                `Re-rolled ${stove.name} heat to ${(newHeatLevel * 100).toFixed(1)}%`,
                { stoveId, stoveName: stove.name, newHeatLevel }
            );
        } catch {
            // Ignore
        }

        return { success: true, newHeatLevel };
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
