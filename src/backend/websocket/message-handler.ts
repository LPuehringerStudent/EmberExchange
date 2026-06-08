import { ClientMessage, ErrorCode } from "../../shared/model";
import { connectionManager } from "./connection-manager";
import { rateLimiter } from "./rate-limiter";
import { handleJoinRoom } from "./handlers/join-room";
import { handleLeaveRoom } from "./handlers/leave-room";
import { handlePlayerAction } from "./handlers/player-action";
import { handleRequestSync } from "./handlers/request-sync";
import { handleStartGame } from "./handlers/start-game";
import { handleChatMessage } from "./handlers/chat-message";

export async function handleMessage(socketId: string, clientIp: string, data: unknown): Promise<void> {
    const msg = data as Partial<ClientMessage> & Record<string, unknown>;
    if (!msg || typeof msg !== "object") {
        sendError(socketId, ErrorCode.INVALID_STATE, "Invalid message format");
        return;
    }

    const type = msg.type as string | undefined;
    if (!type || typeof type !== "string") {
        sendError(socketId, ErrorCode.INVALID_STATE, "Missing message type");
        return;
    }

    // Support both snake_case and camelCase from clients
    const sequenceNumber = (msg.sequenceNumber as number | undefined) ?? (msg.sequence_number as number | undefined);
    if (typeof sequenceNumber !== "number") {
        sendError(socketId, ErrorCode.INVALID_STATE, "Missing sequenceNumber");
        return;
    }

    // Rate limit by IP (not socketId) to prevent connection cycling evasion
    if (!rateLimiter.checkLimit(clientIp)) {
        sendError(socketId, ErrorCode.RATE_LIMITED, "Too many messages");
        return;
    }

    // Idempotency
    if (connectionManager.isDuplicate(socketId, sequenceNumber)) {
        return; // silently drop
    }

    try {
        switch (type) {
            case "join_room":
                await handleJoinRoom(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            case "leave_room":
                await handleLeaveRoom(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            case "player_action":
                await handlePlayerAction(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            case "request_sync":
                await handleRequestSync(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            case "start_game":
                await handleStartGame(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            case "chat_message":
                await handleChatMessage(socketId, (msg.payload as Record<string, unknown>) || {});
                break;
            default:
                sendError(socketId, ErrorCode.INVALID_STATE, `Unknown message type: ${type}`);
        }
    } catch (err) {
        console.error("Message handler error:", err);
        sendError(socketId, ErrorCode.INVALID_STATE, "Internal server error");
    }
}

function sendError(socketId: string, code: ErrorCode, message: string): void {
    connectionManager.sendToSocket(socketId, {
        type: "error",
        payload: { code, message, recoverable: true }
    });
}
