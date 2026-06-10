import { Unit } from "../utils/unit";
import { PlayerService } from "./player-service";
import { PlayerPrestigeService } from "./player-prestige-service";
import { LootboxService } from "./lootbox-service";

export interface QuestTemplate {
    templateId: string;
    label: string;
    targetValue: number;
    rewardCoins: number;
    rewardXP: number;
    rewardLootboxTypeId?: number;
}

export interface PlayerQuestRow {
    questId: number;
    playerId: number;
    questType: string;
    templateId: string;
    label: string;
    targetValue: number;
    currentValue: number;
    rewardCoins: number;
    rewardXP: number;
    rewardLootboxTypeId: number | null;
    isCompleted: number;
    isClaimed: number;
    expiresAt: string;
    createdAt: string;
}

const DAILY_TEMPLATES: QuestTemplate[] = [
    { templateId: 'open_lootboxes', label: 'Open 3 lootboxes', targetValue: 3, rewardCoins: 200, rewardXP: 50 },
    { templateId: 'forge_stove', label: 'Forge 1 stove', targetValue: 1, rewardCoins: 300, rewardXP: 75 },
    { templateId: 'list_item', label: 'List 1 item on the marketplace', targetValue: 1, rewardCoins: 150, rewardXP: 25 },
    { templateId: 'claim_daily', label: 'Claim your daily reward', targetValue: 1, rewardCoins: 100, rewardXP: 20 },
    { templateId: 'salvage_stove', label: 'Salvage 1 stove', targetValue: 1, rewardCoins: 100, rewardXP: 20 },
    { templateId: 'send_messages', label: 'Send 5 chat messages', targetValue: 5, rewardCoins: 150, rewardXP: 30 },
    { templateId: 'visit_glory', label: 'Visit a player profile', targetValue: 1, rewardCoins: 100, rewardXP: 20 },
    { templateId: 'win_minigame', label: 'Win 1 mini-game', targetValue: 1, rewardCoins: 250, rewardXP: 50 },
];

const WEEKLY_TEMPLATES: QuestTemplate[] = [
    { templateId: 'open_20_lootboxes', label: 'Open 20 lootboxes', targetValue: 20, rewardCoins: 1500, rewardXP: 300, rewardLootboxTypeId: 2 },
    { templateId: 'forge_5_stoves', label: 'Forge 5 stoves', targetValue: 5, rewardCoins: 2000, rewardXP: 400, rewardLootboxTypeId: 2 },
    { templateId: 'complete_10_trades', label: 'Complete 10 trades', targetValue: 10, rewardCoins: 2000, rewardXP: 400 },
    { templateId: 'earn_minigame_coins', label: 'Earn 5,000 coins from mini-games', targetValue: 5000, rewardCoins: 3000, rewardXP: 500, rewardLootboxTypeId: 2 },
    { templateId: 'salvage_10_stoves', label: 'Salvage 10 stoves', targetValue: 10, rewardCoins: 1000, rewardXP: 200 },
];

function getTomorrowMidnight(): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function getNextSundayMidnight(): Date {
    const d = new Date();
    const daysUntilSunday = (7 - d.getUTCDay()) % 7;
    d.setUTCDate(d.getUTCDate() + daysUntilSunday);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export class QuestService {
    constructor(private unit: Unit) {}

    async ensureDailyQuests(playerId: number): Promise<void> {
        const now = new Date().toISOString();
        const hasActive = await this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM PlayerQuest
             WHERE playerId = @playerId AND questType = 'daily' AND expiresAt > @now`,
            { playerId, now }
        ).get();

        if ((hasActive?.count ?? 0) > 0) return;

        // Generate 3 daily quests
        const templates = pickRandom(DAILY_TEMPLATES, 3);
        const expiresAt = getTomorrowMidnight().toISOString();

        for (const t of templates) {
            await this.unit.prepare(
                `INSERT INTO PlayerQuest (playerId, questType, templateId, label, targetValue, currentValue, rewardCoins, rewardXP, rewardLootboxTypeId, isCompleted, isClaimed, expiresAt, createdAt)
                 VALUES (@playerId, 'daily', @templateId, @label, @targetValue, 0, @rewardCoins, @rewardXP, @rewardLootboxTypeId, 0, 0, @expiresAt, @createdAt)`,
                { playerId, templateId: t.templateId, label: t.label, targetValue: t.targetValue, rewardCoins: t.rewardCoins, rewardXP: t.rewardXP, rewardLootboxTypeId: t.rewardLootboxTypeId ?? null, expiresAt, createdAt: now }
            ).run();
        }
    }

    async ensureWeeklyQuests(playerId: number): Promise<void> {
        const now = new Date().toISOString();
        const hasActive = await this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM PlayerQuest
             WHERE playerId = @playerId AND questType = 'weekly' AND expiresAt > @now`,
            { playerId, now }
        ).get();

        if ((hasActive?.count ?? 0) > 0) return;

        // Generate 2 weekly quests
        const templates = pickRandom(WEEKLY_TEMPLATES, 2);
        const expiresAt = getNextSundayMidnight().toISOString();

        for (const t of templates) {
            await this.unit.prepare(
                `INSERT INTO PlayerQuest (playerId, questType, templateId, label, targetValue, currentValue, rewardCoins, rewardXP, rewardLootboxTypeId, isCompleted, isClaimed, expiresAt, createdAt)
                 VALUES (@playerId, 'weekly', @templateId, @label, @targetValue, 0, @rewardCoins, @rewardXP, @rewardLootboxTypeId, 0, 0, @expiresAt, @createdAt)`,
                { playerId, templateId: t.templateId, label: t.label, targetValue: t.targetValue, rewardCoins: t.rewardCoins, rewardXP: t.rewardXP, rewardLootboxTypeId: t.rewardLootboxTypeId ?? null, expiresAt, createdAt: now }
            ).run();
        }
    }

    async getActiveQuests(playerId: number): Promise<PlayerQuestRow[]> {
        await this.ensureDailyQuests(playerId);
        await this.ensureWeeklyQuests(playerId);

        const now = new Date().toISOString();
        const stmt = this.unit.prepare<PlayerQuestRow>(
            `SELECT * FROM PlayerQuest
             WHERE playerId = @playerId AND expiresAt > @now
             ORDER BY questType, questId`,
            { playerId, now }
        );
        return await stmt.all();
    }

    async trackProgress(playerId: number, templateId: string, amount: number = 1): Promise<void> {
        const now = new Date().toISOString();
        const quests = await this.unit.prepare<PlayerQuestRow>(
            `SELECT * FROM PlayerQuest
             WHERE playerId = @playerId AND templateId = @templateId AND expiresAt > @now AND isCompleted = 0`,
            { playerId, templateId, now }
        ).all();

        for (const quest of quests) {
            const newValue = Math.min(quest.targetValue, quest.currentValue + amount);
            const completed = newValue >= quest.targetValue ? 1 : 0;
            await this.unit.prepare(
                `UPDATE PlayerQuest SET currentValue = @newValue, isCompleted = @completed WHERE questId = @questId`,
                { newValue, completed, questId: quest.questId }
            ).run();

            if (completed === 1 && quest.isCompleted === 0) {
                try {
                    const notificationService = new (await import("./notification-service")).NotificationService(this.unit);
                    await notificationService.create(
                        playerId,
                        "quest_complete",
                        "Quest completed!",
                        `You completed "${quest.label}". Claim your reward!`,
                        { questId: quest.questId, templateId: quest.templateId, label: quest.label },
                        { priority: 'high' }
                    );
                } catch {
                    // Ignore notification errors
                }
            }
        }
    }

    async claimReward(playerId: number, questId: number): Promise<{ success: boolean; error?: string; rewards?: { coins: number; xp: number; lootboxTypeId?: number } }> {
        const quest = await this.unit.prepare<PlayerQuestRow>(
            `SELECT * FROM PlayerQuest WHERE questId = @questId AND playerId = @playerId`,
            { questId, playerId }
        ).get();

        if (!quest) return { success: false, error: "Quest not found" };
        if (!quest.isCompleted) return { success: false, error: "Quest not completed" };
        if (quest.isClaimed) return { success: false, error: "Reward already claimed" };

        // Award coins
        const playerService = new PlayerService(this.unit);
        if (quest.rewardCoins > 0) {
            await playerService.addCoinsAtomic(playerId, quest.rewardCoins);
        }

        // Award XP
        try {
            const prestigeService = new PlayerPrestigeService(this.unit);
            await prestigeService.addXP(playerId, quest.rewardXP, 'quest_complete', `Completed quest: ${quest.templateId}`);
        } catch {
            // ignore XP errors
        }

        // Check level achievements after XP gain
        try {
            const { AchievementEngine } = await import("./achievement-engine");
            const engine = new AchievementEngine(this.unit);
            await engine.checkLevelAchievements(playerId);
        } catch {
            // ignore achievement errors
        }

        // Award lootbox if applicable
        if (quest.rewardLootboxTypeId) {
            const lootboxService = new LootboxService(this.unit);
            await lootboxService.createLootbox(quest.rewardLootboxTypeId, playerId, 'reward');
        }

        // Mark claimed
        await this.unit.prepare(
            `UPDATE PlayerQuest SET isClaimed = 1 WHERE questId = @questId`,
            { questId }
        ).run();

        // Notify about reward
        try {
            const notificationService = new (await import("./notification-service")).NotificationService(this.unit);
            const rewardParts: string[] = [];
            if (quest.rewardCoins > 0) rewardParts.push(`${quest.rewardCoins} coins`);
            if (quest.rewardXP > 0) rewardParts.push(`${quest.rewardXP} XP`);
            if (quest.rewardLootboxTypeId) rewardParts.push(`1 lootbox`);
            await notificationService.create(
                playerId,
                "system",
                "Quest reward claimed",
                `You claimed ${rewardParts.join(" + ")} for "${quest.label}"`,
                { questId, rewards: { coins: quest.rewardCoins, xp: quest.rewardXP, lootboxTypeId: quest.rewardLootboxTypeId ?? undefined } },
                { priority: 'normal' }
            );
        } catch {
            // Ignore notification errors
        }

        return {
            success: true,
            rewards: {
                coins: quest.rewardCoins,
                xp: quest.rewardXP,
                lootboxTypeId: quest.rewardLootboxTypeId ?? undefined,
            },
        };
    }
}
