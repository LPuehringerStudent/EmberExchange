import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { NotificationRow } from "../../shared/model";
import { PlayerSettingsService } from "./player-settings-service";

export class NotificationService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all notifications for a player, newest first.
     */
    async getByPlayerId(playerId: number, limit: number = 50, offset: number = 0): Promise<NotificationRow[]> {
        const stmt = this.unit.prepare<NotificationRow>(
            `SELECT * FROM Notification
             WHERE playerId = @playerId
             ORDER BY createdAt DESC
             LIMIT @limit OFFSET @offset`,
            { playerId, limit, offset }
        );
        return await stmt.all();
    }

    /**
     * Counts unread notifications for a player.
     */
    async getUnreadCount(playerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Notification
             WHERE playerId = @playerId AND isRead = 0`,
            { playerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Creates a notification if the player's settings allow it.
     * System notifications are always created.
     */
    async create(
        playerId: number,
        type: NotificationRow["type"],
        title: string,
        message: string,
        data: Record<string, unknown> = {}
    ): Promise<[boolean, number]> {
        // System notifications bypass settings
        if (type !== "system") {
            const settingsService = new PlayerSettingsService(this.unit);
            const settings = await settingsService.getSettings(playerId);
            if (settings) {
                let allowed = true;
                switch (type) {
                    case "friend_request":
                        allowed = settings.notifyFriendRequests;
                        break;
                    case "chat_message":
                        allowed = settings.notifyChatMessages;
                        break;
                    case "trade_offer":
                        allowed = settings.notifyTradeOffers;
                        break;
                    case "daily_reward":
                        allowed = settings.notifyDailyReward;
                        break;
                }
                if (!allowed) {
                    return [false, 0];
                }
            }
        }

        const stmt = this.unit.prepare<NotificationRow>(
            `INSERT INTO Notification (playerId, type, title, message, data, isRead, createdAt)
             VALUES (@playerId, @type, @title, @message, @data, 0, NOW())`,
            { playerId, type, title, message, data: JSON.stringify(data) }
        );
        return await this.executeStmt(stmt);
    }

    /**
     * Marks a single notification as read.
     */
    async markAsRead(notificationId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `UPDATE Notification SET isRead = 1 WHERE notificationId = @notificationId`,
            { notificationId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Marks all notifications for a player as read.
     */
    async markAllAsRead(playerId: number): Promise<number> {
        const stmt = this.unit.prepare(
            `UPDATE Notification SET isRead = 1 WHERE playerId = @playerId AND isRead = 0`,
            { playerId }
        );
        const result = await stmt.run();
        return result.changes;
    }

    /**
     * Deletes a notification.
     */
    async delete(notificationId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `DELETE FROM Notification WHERE notificationId = @notificationId`,
            { notificationId }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes all notifications for a player.
     */
    async deleteAllForPlayer(playerId: number): Promise<number> {
        const stmt = this.unit.prepare(
            `DELETE FROM Notification WHERE playerId = @playerId`,
            { playerId }
        );
        const result = await stmt.run();
        return result.changes;
    }
}
