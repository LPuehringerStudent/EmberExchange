import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";

export interface PrestigeData {
    playerId: number;
    totalXP: number;
    currentLevel: number;
    prestigeCount: number;
    updatedAt: string;
}

export class PlayerPrestigeService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    static xpForLevel(level: number): number {
        return Math.pow(level - 1, 2) * 10;
    }

    static levelFromXP(xp: number): number {
        return Math.floor(Math.sqrt(xp / 10)) + 1;
    }

    async getPrestige(playerId: number): Promise<PrestigeData | null> {
        const stmt = this.unit.prepare<PrestigeData>(
            "SELECT playerId, totalXP, currentLevel, prestigeCount, updatedAt FROM PlayerPrestige WHERE playerId = @playerId",
            { playerId }
        );
        return (await stmt.get()) ?? null;
    }

    async addXP(playerId: number, amount: number, source: string, description?: string): Promise<PrestigeData> {
        // Get current prestige
        const current = await this.getPrestige(playerId);
        if (!current) {
            // Initialize if missing
            await this.unit.prepare(
                `INSERT INTO PlayerPrestige (playerId, totalXP, currentLevel, prestigeCount, updatedAt)
                 VALUES (@playerId, 0, 1, 0, @updatedAt)`,
                { playerId, updatedAt: new Date().toISOString() }
            ).run();
        }

        // Log the XP gain
        await this.unit.prepare(
            `INSERT INTO PrestigeLog (playerId, source, xpAmount, description, createdAt)
             VALUES (@playerId, @source, @amount, @description, @createdAt)`,
            { playerId, source, amount, description: description ?? null, createdAt: new Date().toISOString() }
        ).run();

        // Update prestige
        const newXP = (current?.totalXP ?? 0) + amount;
        const newLevel = PlayerPrestigeService.levelFromXP(newXP);
        const prestigeCount = current?.prestigeCount ?? 0;

        await this.unit.prepare(
            `UPDATE PlayerPrestige
             SET totalXP = @newXP, currentLevel = @newLevel, updatedAt = @updatedAt
             WHERE playerId = @playerId`,
            { playerId, newXP, newLevel, updatedAt: new Date().toISOString() }
        ).run();

        // Check level-based achievements & cosmetic unlocks
        try {
            await this.unit.savepoint('prestige_achievements');
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkLevelAchievements(playerId);
            await engine.checkCosmeticUnlocks(playerId);
        } catch {
            try { await this.unit.rollbackToSavepoint('prestige_achievements'); } catch { /* ignore */ }
        }

        return {
            playerId,
            totalXP: newXP,
            currentLevel: newLevel,
            prestigeCount,
            updatedAt: new Date().toISOString(),
        };
    }

    async canPrestige(playerId: number): Promise<boolean> {
        const p = await this.getPrestige(playerId);
        return p !== null && p.currentLevel >= 100;
    }

    async doPrestige(playerId: number): Promise<PrestigeData> {
        const can = await this.canPrestige(playerId);
        if (!can) throw new Error("Player is not eligible for prestige");

        const current = await this.getPrestige(playerId);
        const newPrestigeCount = (current?.prestigeCount ?? 0) + 1;

        await this.unit.prepare(
            `UPDATE PlayerPrestige
             SET totalXP = 0, currentLevel = 1, prestigeCount = @newPrestigeCount, updatedAt = @updatedAt
             WHERE playerId = @playerId`,
            { playerId, newPrestigeCount, updatedAt: new Date().toISOString() }
        ).run();

        // Check prestige-related achievements & cosmetic unlocks
        try {
            await this.unit.savepoint('prestige_achievements');
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkLevelAchievements(playerId);
            await engine.checkWealthAchievements(playerId);
        } catch {
            try { await this.unit.rollbackToSavepoint('prestige_achievements'); } catch { /* ignore */ }
        }

        return {
            playerId,
            totalXP: 0,
            currentLevel: 1,
            prestigeCount: newPrestigeCount,
            updatedAt: new Date().toISOString(),
        };
    }
}
