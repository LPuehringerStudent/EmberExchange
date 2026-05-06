import { Unit } from "../../utils/unit";
import { RoomService } from "../../services/room-service";
import { RoomPlayerService } from "../../services/room-player-service";
import { GameStateService } from "../../services/game-state-service";
import { EventLogService } from "../../services/event-log-service";
import { connectionManager } from "../connection-manager";
import { isValidUUID } from "../validators";
import { ErrorCode } from "../../../shared/model";

export async function handlePlayerAction(socketId: string, payload: Record<string, unknown>): Promise<void> {
    const roomId = payload.roomId;
    const actionType = payload.actionType as string;
    const actionData = payload.actionData as Record<string, unknown>;
    const expectedVersion = payload.expectedVersion as number;

    if (!isValidUUID(roomId)) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: ErrorCode.INVALID_STATE, message: "roomId must be a valid UUID", recoverable: true }
        });
        return;
    }

    if (typeof expectedVersion !== "number") {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: ErrorCode.INVALID_STATE, message: "expectedVersion is required", recoverable: true }
        });
        return;
    }

    const meta = connectionManager.getMeta(socketId);
    if (!meta) return;

    const unit = await Unit.create(false);
    let ok = false;
    let broadcastMessage: { type: "state_update"; payload: Record<string, unknown> } | null = null;

    try {
        const roomService = new RoomService(unit);
        const roomPlayerService = new RoomPlayerService(unit);
        const gameStateService = new GameStateService(unit);
        const eventLogService = new EventLogService(unit);

        const room = await roomService.getRoomById(roomId);
        if (!room) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Room not found", recoverable: true }
            });
            return;
        }

        if (room.status !== "active") {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Game is not active", recoverable: true }
            });
            return;
        }

        // Verify player is in room and connected
        const roomPlayer = await roomPlayerService.getPlayerInRoom(roomId, meta.playerId);
        if (!roomPlayer || roomPlayer.connectionState !== "connected") {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Not in room", recoverable: true }
            });
            return;
        }

        const state = await gameStateService.getState(roomId);
        if (!state) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Game state not found", recoverable: true }
            });
            return;
        }

        // MVP: append action to log; server is the single source of truth
        const baseBlob = (typeof state.stateBlob === "object" && state.stateBlob !== null)
            ? state.stateBlob as Record<string, unknown>
            : { players: [], status: "waiting", log: [] };

        const log = Array.isArray(baseBlob.log) ? baseBlob.log : [];
        const newBlob = {
            ...baseBlob,
            log: [
                ...log,
                {
                    playerId: meta.playerId,
                    actionType: actionType || "unknown",
                    actionData: actionData || {},
                    timestamp: Date.now()
                }
            ]
        };

        const updateResult = await gameStateService.updateState(roomId, newBlob, expectedVersion);
        if (!updateResult.success) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.VERSION_MISMATCH, message: "Optimistic lock failed", recoverable: true }
            });
            return;
        }

        await eventLogService.logEvent(
            roomId,
            actionType || "unknown",
            { actionData, expectedVersion },
            meta.playerId,
            (payload.sequenceNumber as number | undefined) ?? null,
            (payload.clientTimestamp as number | undefined) ?? null
        );

        broadcastMessage = {
            type: "state_update",
            payload: {
                stateBlob: newBlob,
                version: updateResult.newVersion,
                actingPlayer: meta.playerId
            }
        };

        ok = true;
    } finally {
        await unit.complete(ok);
    }

    if (ok && broadcastMessage) {
        // Send directly to acting player
        connectionManager.sendToSocket(socketId, broadcastMessage);
        // Broadcast to others in room
        connectionManager.broadcastToRoom(roomId, broadcastMessage, socketId);
    }
}
