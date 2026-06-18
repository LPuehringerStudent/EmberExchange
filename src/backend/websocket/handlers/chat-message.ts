import { connectionManager } from "../connection-manager";
import { Unit } from "../../utils/unit";
import { FriendService } from "../../services/friend-service";
import { ChatMessageService } from "../../services/chat-message-service";
import { NotificationService } from "../../services/notification-service";
import { QuestService } from "../../services/quest-service";
import { PlayerService } from "../../services/player-service";
import { PlayerSettingsService } from "../../services/player-settings-service";
import { sendChatMessageEmail } from "../../services/email-service";
import { sanitizeText } from "../../utils/sanitize";

export async function handleChatMessage(socketId: string, payload: Record<string, unknown>): Promise<void> {
    const meta = connectionManager.getMeta(socketId);
    if (!meta) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "Not authenticated", recoverable: true }
        });
        return;
    }

    const senderId = meta.playerId;
    const receiverId = payload["receiverId"] as number | undefined;
    const content = payload["content"] as string | undefined;

    if (typeof receiverId !== "number") {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "receiverId is required", recoverable: true }
        });
        return;
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "content is required", recoverable: true }
        });
        return;
    }

    const MAX_CHAT_LENGTH = 2000;
    if (content.length > MAX_CHAT_LENGTH) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: `Message too long (max ${MAX_CHAT_LENGTH} characters)`, recoverable: true }
        });
        return;
    }

    const unit = await Unit.create(false);
    let ok = false;

    try {
        const friendService = new FriendService(unit);

        // Verify friendship
        const areFriends = await friendService.areFriends(senderId, receiverId);
        if (!areFriends) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: "INVALID_STATE", message: "You are not friends with this player", recoverable: true }
            });
            await unit.complete(false);
            return;
        }

        // Check block in either direction
        const isBlocked = await friendService.isBlocked(senderId, receiverId);
        if (isBlocked) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: "INVALID_STATE", message: "Cannot send messages to this player", recoverable: true }
            });
            await unit.complete(false);
            return;
        }

        const safeContent = sanitizeText(content.trim(), MAX_CHAT_LENGTH) ?? "";
        if (!safeContent) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: "INVALID_STATE", message: "Message content is invalid", recoverable: true }
            });
            await unit.complete(false);
            return;
        }

        const chatService = new ChatMessageService(unit);
        const [success, messageId] = await chatService.create(senderId, receiverId, safeContent);

        if (!success) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: "INVALID_STATE", message: "Failed to send message", recoverable: true }
            });
            await unit.complete(false);
            return;
        }

        ok = true;

        // Track quest progress
        try {
            const questService = new QuestService(unit);
            await questService.trackProgress(senderId, 'send_messages', 1);
        } catch {
            // Ignore quest tracking errors
        }

        // Push to recipient if online
        const pushed = connectionManager.sendToPlayerGlobal(receiverId, {
            type: "chat_message",
            payload: {
                messageId,
                senderId,
                receiverId,
                content: safeContent,
                sentAt: new Date().toISOString(),
                isRead: false,
                messageType: "text",
                data: {}
            }
        });

        // If offline, create notification
        if (!pushed) {
            try {
                const notificationService = new NotificationService(unit);
                await notificationService.create(
                    receiverId,
                    "chat_message",
                    "New message",
                    safeContent.length > 60 ? safeContent.slice(0, 60) + "..." : safeContent,
                    { senderId, messageId },
                    { priority: 'normal' }
                );
            } catch {
                // Ignore notification errors
            }

            try {
                const settingsService = new PlayerSettingsService(unit);
                const settings = await settingsService.ensureSettings(receiverId);
                if (settings.notifyChatMessages) {
                    const playerService = new PlayerService(unit);
                    const [receiver, sender] = await Promise.all([
                        playerService.getInfoByID(receiverId),
                        playerService.getInfoByID(senderId),
                    ]);
                    if (receiver?.email && sender?.username) {
                        await sendChatMessageEmail({
                            email: receiver.email,
                            senderName: sender.username,
                            preview: safeContent,
                            isMarketplace: false,
                        });
                    }
                }
            } catch (err) {
                console.error("[WebSocketChat] Failed to send chat email:", err);
            }
        }

        // Acknowledge sender
        connectionManager.sendToSocket(socketId, {
            type: "chat_message",
            payload: {
                messageId,
                senderId,
                receiverId,
                content: safeContent,
                sentAt: new Date().toISOString(),
                isRead: false,
                messageType: "text",
                data: {}
            }
        });
    } catch (err) {
        console.error("Chat message handler error:", err);
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "Internal server error", recoverable: true }
        });
    } finally {
        await unit.complete(ok);
    }
}
