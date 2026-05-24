import { connectionManager } from "../connection-manager";
import { Unit } from "../../utils/unit";
import { FriendService } from "../../services/friend-service";
import { ChatMessageService } from "../../services/chat-message-service";
import { NotificationService } from "../../services/notification-service";

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

        const chatService = new ChatMessageService(unit);
        const [success, messageId] = await chatService.create(senderId, receiverId, content.trim());

        if (!success) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: "INVALID_STATE", message: "Failed to send message", recoverable: true }
            });
            await unit.complete(false);
            return;
        }

        ok = true;

        // Push to recipient if online
        const pushed = connectionManager.sendToPlayerGlobal(receiverId, {
            type: "chat_message",
            payload: {
                messageId,
                senderId,
                receiverId,
                content: content.trim(),
                sentAt: new Date().toISOString(),
                isRead: false,
                messageType: "text",
                data: {}
            }
        });

        // If offline, create notification
        if (!pushed) {
            const notificationService = new NotificationService(unit);
            await notificationService.create(
                receiverId,
                "chat_message",
                "New message",
                content.trim().length > 60 ? content.trim().slice(0, 60) + "..." : content.trim(),
                { senderId, messageId }
            );
        }

        // Acknowledge sender
        connectionManager.sendToSocket(socketId, {
            type: "chat_message",
            payload: {
                messageId,
                senderId,
                receiverId,
                content: content.trim(),
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
