import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { NotificationRow, NotificationPriority } from "../../shared/model";
import { PlayerSettingsService } from "./player-settings-service";

export class NotificationService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Deletes expired notifications.
     */
    async cleanupExpired(playerId: number): Promise<number> {
        const stmt = this.unit.prepare(
            `DELETE FROM Notification
             WHERE playerId = @playerId AND expiresAt IS NOT NULL AND expiresAt < NOW()`,
            { playerId }
        );
        const result = await stmt.run();
        return result.changes ?? 0;
    }

    /**
     * Retrieves all notifications for a player, newest first.
     */
    async getByPlayerId(playerId: number, limit: number = 50, offset: number = 0): Promise<NotificationRow[]> {
        await this.cleanupExpired(playerId);
        const stmt = this.unit.prepare<NotificationRow>(
            `SELECT * FROM Notification
             WHERE playerId = @playerId
             AND (expiresAt IS NULL OR expiresAt > NOW())
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
        await this.cleanupExpired(playerId);
        const stmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*)::INTEGER as count FROM Notification
             WHERE playerId = @playerId AND isRead = 0
             AND (expiresAt IS NULL OR expiresAt > NOW())`,
            { playerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }

    /**
     * Creates a notification if the player's settings allow it.
     * System notifications are always created unless blocked by notifyShopPurchases.
     */
    async create(
        playerId: number,
        type: NotificationRow["type"],
        title: string,
        message: string,
        data: Record<string, unknown> = {},
        options: {
            priority?: NotificationPriority;
            groupKey?: string;
            expiresAt?: Date;
        } = {}
    ): Promise<[boolean, number]> {
        const priority = options.priority ?? 'normal';
        const groupKey = options.groupKey ?? null;
        const expiresAt = options.expiresAt ?? null;

        // Shop purchase setting check for system notifications
        if (type === 'system' && groupKey?.startsWith('shop:purchase')) {
            const settingsService = new PlayerSettingsService(this.unit);
            const settings = await settingsService.getSettings(playerId);
            if (settings && !settings.notifyShopPurchases) {
                return [false, 0];
            }
        }

        // Per-type settings check for non-system notifications
        if (type !== 'system') {
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

        // If groupKey provided, check for existing unread notification within 5 min window
        if (groupKey) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const existing = await this.unit.prepare<NotificationRow>(
                `SELECT notificationId, count, message, data FROM Notification
                 WHERE playerId = @playerId AND type = @type AND groupKey = @groupKey
                 AND isRead = 0 AND updatedAt > @fiveMinutesAgo
                 ORDER BY updatedAt DESC LIMIT 1`,
                { playerId, type, groupKey, fiveMinutesAgo }
            ).get();

            if (existing) {
                const newCount = existing.count + 1;
                const mergedData = { ...existing.data, ...data, _count: newCount };
                const newMessage = `${message} (${newCount} total)`;

                await this.unit.prepare(
                    `UPDATE Notification
                     SET count = @newCount, updatedAt = NOW(),
                         data = @mergedData,
                         message = CASE WHEN @newCount > 2 THEN @newMessage ELSE message END
                     WHERE notificationId = @notificationId`,
                    { newCount, mergedData: JSON.stringify(mergedData), newMessage, notificationId: existing.notificationId }
                ).run();

                // Broadcast high-priority grouped notifications via WebSocket
                if (priority === 'high') {
                    try {
                        const { connectionManager } = await import("../websocket/connection-manager");
                        connectionManager.sendToPlayerGlobal(playerId, {
                            type: "notification",
                            payload: {
                                notificationId: existing.notificationId,
                                type,
                                title,
                                message: newCount > 2 ? newMessage : message,
                                priority,
                                count: newCount,
                                createdAt: new Date().toISOString()
                            }
                        });
                    } catch (e) {
                        console.error('[NotificationService] WebSocket broadcast failed:', e);
                    }
                }

                return [true, existing.notificationId];
            }
        }

        // No grouping match — insert new
        const stmt = this.unit.prepare<NotificationRow>(
            `INSERT INTO Notification (playerId, type, title, message, data, isRead, priority, groupKey, count, expiresAt, createdAt, updatedAt)
             VALUES (@playerId, @type, @title, @message, @data, 0, @priority, @groupKey, 1, @expiresAt, NOW(), NOW())`,
            { playerId, type, title, message, data: JSON.stringify(data), priority, groupKey, expiresAt: expiresAt?.toISOString() ?? null }
        );
        const result = await this.executeStmt(stmt);

        // Broadcast high-priority notifications via WebSocket
        if (priority === 'high' && result[0]) {
            try {
                const { connectionManager } = await import("../websocket/connection-manager");
                connectionManager.sendToPlayerGlobal(playerId, {
                    type: "notification",
                    payload: {
                        notificationId: result[1],
                        type,
                        title,
                        message,
                        priority,
                        count: 1,
                        createdAt: new Date().toISOString()
                    }
                });
            } catch (e) {
                console.error('[NotificationService] WebSocket broadcast failed:', e);
            }
        }

        return result;
    }

    /**
     * Marks a single notification as read.
     */
    async markAsRead(notificationId: number, playerId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `UPDATE Notification SET isRead = 1 WHERE notificationId = @notificationId AND playerId = @playerId`,
            { notificationId, playerId }
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
    async delete(notificationId: number, playerId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `DELETE FROM Notification WHERE notificationId = @notificationId AND playerId = @playerId`,
            { notificationId, playerId }
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
