import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { PlayerAchievementRow } from "../../shared/model";

export class PlayerAchievementService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getByPlayerId(playerId: number): Promise<PlayerAchievementRow[]> {
        const stmt = this.unit.prepare<PlayerAchievementRow>(
            `SELECT * FROM PlayerAchievement WHERE playerId = @playerId ORDER BY unlockedAt DESC`,
            { playerId }
        );
        return (await stmt.all()) ?? [];
    }

    async getByPlayerAndId(playerId: number, achievementId: string): Promise<PlayerAchievementRow | null> {
        const stmt = this.unit.prepare<PlayerAchievementRow>(
            `SELECT * FROM PlayerAchievement WHERE playerId = @playerId AND achievementId = @achievementId`,
            { playerId, achievementId }
        );
        return (await stmt.get()) ?? null;
    }

    async unlock(playerId: number, achievementId: string, target: number = 1): Promise<[boolean, number]> {
        const existing = await this.getByPlayerAndId(playerId, achievementId);
        if (existing) {
            if (existing.unlockedAt) {
                return [false, existing.playerAchievementId];
            }
            const stmt = this.unit.prepare(
                `UPDATE PlayerAchievement SET unlockedAt = NOW(), progress = @target WHERE playerAchievementId = @id`,
                { target, id: existing.playerAchievementId }
            );
            const result = await stmt.run();
            return [result.changes === 1, existing.playerAchievementId];
        }

        const stmt = this.unit.prepare<PlayerAchievementRow>(
            `INSERT INTO PlayerAchievement (playerId, achievementId, progress, target, unlockedAt)
             VALUES (@playerId, @achievementId, @target, @target, NOW())`,
            { playerId, achievementId, target }
        );
        return await this.executeStmt(stmt);
    }

    async setProgress(playerId: number, achievementId: string, progress: number, target: number = 1): Promise<[boolean, number]> {
        const existing = await this.getByPlayerAndId(playerId, achievementId);
        if (existing) {
            const unlockedAt = (!existing.unlockedAt && progress >= target) ? "NOW()" : undefined;
            const stmt = this.unit.prepare(
                `UPDATE PlayerAchievement
                 SET progress = @progress${unlockedAt ? ", unlockedAt = NOW()" : ""}
                 WHERE playerAchievementId = @id`,
                { progress, id: existing.playerAchievementId }
            );
            const result = await stmt.run();
            return [result.changes === 1, existing.playerAchievementId];
        }

        const stmt = this.unit.prepare<PlayerAchievementRow>(
            `INSERT INTO PlayerAchievement (playerId, achievementId, progress, target, unlockedAt)
             VALUES (@playerId, @achievementId, @progress, @target, ${progress >= target ? "NOW()" : "NULL"})`,
            { playerId, achievementId, progress, target }
        );
        return await this.executeStmt(stmt);
    }

    async deleteAllForPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare(
            `DELETE FROM PlayerAchievement WHERE playerId = @playerId`,
            { playerId }
        );
        const result = await stmt.run();
        return result.changes;
    }
}
