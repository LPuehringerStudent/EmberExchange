import { connectionManager } from "../connection-manager";
import { sanitizeText } from "../../utils/sanitize";

const MAX_CHAT_LENGTH = 500;

export async function handleRoomChat(socketId: string, payload: Record<string, unknown>): Promise<void> {
    const meta = connectionManager.getMeta(socketId);
    if (!meta) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "Not authenticated", recoverable: true }
        });
        return;
    }

    const senderId = meta.playerId;
    const roomId = payload["roomId"] as string | undefined;
    const content = payload["content"] as string | undefined;

    if (!roomId || typeof roomId !== "string") {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "roomId is required", recoverable: true }
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

    if (content.length > MAX_CHAT_LENGTH) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: `Message too long (max ${MAX_CHAT_LENGTH} characters)`, recoverable: true }
        });
        return;
    }

    const safeContent = sanitizeText(content.trim(), MAX_CHAT_LENGTH) ?? "";
    if (!safeContent) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: "INVALID_STATE", message: "Message content is invalid", recoverable: true }
        });
        return;
    }

    // Broadcast to all sockets in the room
    connectionManager.broadcastToRoom(roomId, {
        type: "room_chat_message",
        payload: {
            playerId: senderId,
            content: safeContent,
            timestamp: Date.now()
        }
    });
}
