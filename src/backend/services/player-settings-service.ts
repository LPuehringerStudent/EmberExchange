import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import type { PlayerSettingsRow } from "../../shared/model";

export class PlayerSettingsService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getSettings(playerId: number): Promise<PlayerSettingsRow | null> {
        const stmt = this.unit.prepare<
            { playerid: number; notifyfriendrequests: number; notifychatmessages: number; notifytradeoffers: number; notifydailyreward: number; notifyshoppurchases: number; hascompletedonboarding: number }
        >(
            "SELECT * FROM PlayerSettings WHERE playerId = @playerId",
            { playerId }
        );
        const row = await stmt.get();
        if (!row) return null;
        return {
            playerId: row.playerid,
            notifyFriendRequests: !!row.notifyfriendrequests,
            notifyChatMessages: !!row.notifychatmessages,
            notifyTradeOffers: !!row.notifytradeoffers,
            notifyDailyReward: !!row.notifydailyreward,
            notifyShopPurchases: !!row.notifyshoppurchases,
            hasCompletedOnboarding: !!row.hascompletedonboarding
        };
    }

    async ensureSettings(playerId: number): Promise<PlayerSettingsRow> {
        const existing = await this.getSettings(playerId);
        if (existing) {
            return existing;
        }
        const stmt = this.unit.prepare(
            `INSERT INTO PlayerSettings (playerId, notifyFriendRequests, notifyChatMessages, notifyTradeOffers, notifyDailyReward, notifyShopPurchases, hasCompletedOnboarding)
             VALUES (@playerId, 1, 1, 1, 1, 1, 0)`,
            { playerId }
        );
        await stmt.run();
        return {
            playerId,
            notifyFriendRequests: true,
            notifyChatMessages: true,
            notifyTradeOffers: true,
            notifyDailyReward: true,
            notifyShopPurchases: true,
            hasCompletedOnboarding: false
        };
    }

    async updateSettings(
        playerId: number,
        settings: Partial<Omit<PlayerSettingsRow, "playerId">>
    ): Promise<boolean> {
        await this.ensureSettings(playerId);
        const fields: string[] = [];
        const params: Record<string, unknown> = { playerId };
        if (settings.notifyFriendRequests !== undefined) {
            fields.push("notifyFriendRequests = @notifyFriendRequests");
            params.notifyFriendRequests = settings.notifyFriendRequests ? 1 : 0;
        }
        if (settings.notifyChatMessages !== undefined) {
            fields.push("notifyChatMessages = @notifyChatMessages");
            params.notifyChatMessages = settings.notifyChatMessages ? 1 : 0;
        }
        if (settings.notifyTradeOffers !== undefined) {
            fields.push("notifyTradeOffers = @notifyTradeOffers");
            params.notifyTradeOffers = settings.notifyTradeOffers ? 1 : 0;
        }
        if (settings.notifyDailyReward !== undefined) {
            fields.push("notifyDailyReward = @notifyDailyReward");
            params.notifyDailyReward = settings.notifyDailyReward ? 1 : 0;
        }
        if (settings.notifyShopPurchases !== undefined) {
            fields.push("notifyShopPurchases = @notifyShopPurchases");
            params.notifyShopPurchases = settings.notifyShopPurchases ? 1 : 0;
        }
        if (settings.hasCompletedOnboarding !== undefined) {
            fields.push("hasCompletedOnboarding = @hasCompletedOnboarding");
            params.hasCompletedOnboarding = settings.hasCompletedOnboarding ? 1 : 0;
        }
        if (fields.length === 0) {
            return false;
        }
        const stmt = this.unit.prepare(
            `UPDATE PlayerSettings SET ${fields.join(", ")} WHERE playerId = @playerId`,
            params
        );
        const result = await stmt.run();
        return result.changes === 1;
    }
}
