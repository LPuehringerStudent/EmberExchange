import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { LootboxService } from "./lootbox-service";
import { CoinTransactionService } from "./coin-transaction-service";
import { NotificationService } from "./notification-service";
import { QuestService } from "./quest-service";

export interface SpinPrize {
    id: string;
    label: string;
    icon: string;
    minAmount: number;
    maxAmount: number;
    color: string;
    weight: number;
}

export interface SpinResult {
    prize: SpinPrize;
    amount: number;
    totalSpins: number;
    nextSpinAt: string | null;
    bonusSpins: number;
}

export interface SpinStatus {
    canSpin: boolean;
    nextSpinAt: string | null;
    totalSpins: number;
    bonusSpins: number;
}

// 7-tier prize wheel — weights sum to 100
export const PRIZE_WHEEL: SpinPrize[] = [
    { id: "coins_small",  label: "50 Coal",     icon: "coins",  minAmount: 50,   maxAmount: 100,  color: "#94a3b8", weight: 25 },  // common grey
    { id: "coins_medium", label: "150 Coal",    icon: "coins",  minAmount: 100,  maxAmount: 200,  color: "#22c55e", weight: 20 },  // uncommon green
    { id: "coins_large",  label: "400 Coal",    icon: "coins",  minAmount: 200,  maxAmount: 500,  color: "#3b82f6", weight: 18 },  // rare blue
    { id: "sparks",       label: "25 Sparks",   icon: "sparks", minAmount: 10,   maxAmount: 50,   color: "#a855f7", weight: 15 },  // epic purple
    { id: "coins_jackpot",label: "1,000 Coal",  icon: "coins",  minAmount: 500,  maxAmount: 1000, color: "#f59e0b", weight: 12 },  // legendary gold
    { id: "lootbox",      label: "Lootbox",     icon: "box",    minAmount: 1,    maxAmount: 1,    color: "#e85d04", weight: 7 },   // accent orange
    { id: "coins_max",    label: "5,000 Coal",  icon: "coins",  minAmount: 1000, maxAmount: 5000, color: "#ffd700", weight: 3 },   // secret gold
];

const COOLDOWN_HOURS = 24;

export class DailySpinService {
    constructor(private unit: Unit) {}

    /**
     * Returns whether the player can spin, when their next spin is available,
     * and their lifetime spin count.
     */
    async getStatus(playerId: number): Promise<SpinStatus> {
        const row = await this.unit.prepare<
            { lastSpinAt: string | null; totalSpins: number; bonusSpins: number }
        >(
            `SELECT lastSpinAt, totalSpins, bonusSpins FROM PlayerDailySpin WHERE playerId = @playerId`,
            { playerId }
        ).get();

        const totalSpins = row?.totalSpins ?? 0;
        const bonusSpins = row?.bonusSpins ?? 0;
        const lastSpinAt = row?.lastSpinAt ? new Date(row.lastSpinAt) : null;
        const now = new Date();

        let canSpin = false;
        let nextSpinAt: string | null = null;

        if (bonusSpins > 0) {
            canSpin = true;
        } else if (!lastSpinAt) {
            canSpin = true;
        } else {
            const hoursSince = (now.getTime() - lastSpinAt.getTime()) / (1000 * 60 * 60);
            canSpin = hoursSince >= COOLDOWN_HOURS;
            if (!canSpin) {
                const next = new Date(lastSpinAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
                nextSpinAt = next.toISOString();
            }
        }

        return { canSpin, nextSpinAt, totalSpins, bonusSpins };
    }

    /**
     * Performs a weighted-random spin for the player, awards the prize,
     * updates cooldown state, and triggers achievements.
     */
    async spin(playerId: number): Promise<SpinResult> {
        const status = await this.getStatus(playerId);
        if (!status.canSpin) {
            throw new Error("Spin not available yet");
        }

        // Weighted random selection
        const totalWeight = PRIZE_WHEEL.reduce((sum, p) => sum + p.weight, 0);
        let roll = Math.random() * totalWeight;
        let prize = PRIZE_WHEEL[0];
        for (const p of PRIZE_WHEEL) {
            roll -= p.weight;
            if (roll <= 0) {
                prize = p;
                break;
            }
        }

        // Determine amount within range
        const amount = Math.floor(prize.minAmount + Math.random() * (prize.maxAmount - prize.minAmount + 1));

        // Award prize
        const playerService = new PlayerService(this.unit);
        const coinService = new CoinTransactionService(this.unit);

        if (prize.id.startsWith("coins_")) {
            await playerService.addCoinsAtomic(playerId, amount);
            await coinService.create(playerId, amount, "daily_reward", `Won ${prize.label} from Lucky Wheel`);
        } else if (prize.id === "sparks") {
            const player = await playerService.getInfoByID(playerId);
            const newBalance = (player?.sparks ?? 0) + amount;
            await playerService.updatePlayerSparks(playerId, newBalance);
        } else if (prize.id === "lootbox") {
            const lootboxService = new LootboxService(this.unit);
            // Use lootbox type 1 (basic/standard) as the daily spin reward
            await lootboxService.createLootbox(1, playerId, "reward");
        }

        // Update spin record
        const now = new Date();
        const nowIso = now.toISOString();
        const newTotal = status.totalSpins + 1;
        const currentBonus = (await this.unit.prepare<{ bonusSpins: number }>(
            `SELECT bonusSpins FROM PlayerDailySpin WHERE playerId = @playerId`,
            { playerId }
        ).get())?.bonusSpins ?? 0;

        if (currentBonus > 0) {
            // Consume a bonus spin without touching the cooldown
            await this.unit.prepare(
                `INSERT INTO PlayerDailySpin (playerId, lastSpinAt, totalSpins, bonusSpins)
                 VALUES (@playerId, (SELECT lastSpinAt FROM PlayerDailySpin WHERE playerId = @playerId), @totalSpins, @bonusSpins)
                 ON CONFLICT (playerId)
                 DO UPDATE SET totalSpins = @totalSpins, bonusSpins = @bonusSpins`,
                { playerId, totalSpins: newTotal, bonusSpins: currentBonus - 1 }
            ).run();
        } else {
            await this.unit.prepare(
                `INSERT INTO PlayerDailySpin (playerId, lastSpinAt, totalSpins, bonusSpins)
                 VALUES (@playerId, @lastSpinAt, @totalSpins, 0)
                 ON CONFLICT (playerId)
                 DO UPDATE SET lastSpinAt = @lastSpinAt, totalSpins = @totalSpins`,
                { playerId, lastSpinAt: nowIso, totalSpins: newTotal }
            ).run();
        }

        // Notification
        try {
            const notifService = new NotificationService(this.unit);
            await notifService.create(
                playerId,
                "system",
                "Lucky Wheel Win!",
                `You won ${prize.label} from the Lucky Wheel!`,
                { prizeId: prize.id, prizeLabel: prize.label, amount }
            );
        } catch {
            // Ignore notification errors
        }

        // Quest tracking
        try {
            const questService = new QuestService(this.unit);
            await questService.trackProgress(playerId, "claim_daily", 1);
        } catch {
            // Ignore quest errors
        }

        // Achievements
        try {
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkSpinAchievements(playerId, newTotal, prize.id, amount);
        } catch {
            // Ignore achievement errors
        }

        // Determine next spin availability based on remaining bonus spins / cooldown
        const remainingBonus = currentBonus > 0 ? currentBonus - 1 : 0;
        let nextSpinAt: string | null = null;

        if (remainingBonus === 0) {
            // No bonus spins left — check regular cooldown
            const rowAfter = await this.unit.prepare<
                { lastSpinAt: string | null }
            >(
                `SELECT lastSpinAt FROM PlayerDailySpin WHERE playerId = @playerId`,
                { playerId }
            ).get();
            const lastSpin = rowAfter?.lastSpinAt ? new Date(rowAfter.lastSpinAt) : null;
            if (lastSpin) {
                nextSpinAt = new Date(lastSpin.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
            }
            // If lastSpinAt is null, nextSpinAt stays null (player can spin immediately)
        }

        return { prize, amount, totalSpins: newTotal, nextSpinAt, bonusSpins: remainingBonus };
    }
}
