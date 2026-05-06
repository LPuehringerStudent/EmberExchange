import { Unit } from "../../utils/unit";
import { RoomService } from "../../services/room-service";
import { RoomPlayerService } from "../../services/room-player-service";
import { GameStateService } from "../../services/game-state-service";
import { GameService } from "../../services/game-service";
import { EventLogService } from "../../services/event-log-service";
import { connectionManager } from "../connection-manager";
import { isValidUUID } from "../validators";
import { ErrorCode, ServerMessage } from "../../../shared/model";

interface QueuedMessage {
    target: "socket" | "room";
    socketId?: string;
    roomId?: string;
    exclude?: string;
    message: ServerMessage;
}

export async function handleStartGame(socketId: string, payload: Record<string, unknown>): Promise<void> {
    const roomId = payload.roomId;
    if (!isValidUUID(roomId)) {
        connectionManager.sendToSocket(socketId, {
            type: "error",
            payload: { code: ErrorCode.INVALID_STATE, message: "roomId must be a valid UUID", recoverable: true }
        });
        return;
    }

    const meta = connectionManager.getMeta(socketId);
    if (!meta) return;

    const unit = await Unit.create(false);
    let ok = false;
    const messages: QueuedMessage[] = [];

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

        if (room.status !== "waiting") {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Game has already started", recoverable: true }
            });
            return;
        }

        const roomPlayer = await roomPlayerService.getPlayerInRoom(roomId, meta.playerId);
        if (!roomPlayer || roomPlayer.connectionState !== "connected") {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Not in room", recoverable: true }
            });
            return;
        }

        const gameService = new GameService(unit);
        const game = await gameService.getGameByType(room.gameType);
        const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
        const connectedCount = playersInRoom.filter(p => p.connectionState === "connected").length;
        if (game && connectedCount < game.minPlayers) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: `Need at least ${game.minPlayers} players to start`, recoverable: true }
            });
            return;
        }

        await roomService.updateRoomStatus(roomId, "active");

        const state = await gameStateService.getState(roomId);
        const baseBlob = (typeof state?.stateBlob === "object" && state.stateBlob !== null)
            ? state.stateBlob as Record<string, unknown>
            : { players: [], status: "waiting", log: [] };

        const newBlob = { ...baseBlob, status: "active" };
        if (state) {
            await gameStateService.updateState(roomId, newBlob, state.version);
        } else {
            await gameStateService.createInitialState(roomId, newBlob);
        }

        await eventLogService.logEvent(roomId, "start_game", { startedBy: meta.playerId }, meta.playerId);

        const currentState = await gameStateService.getState(roomId);
        const stateUpdatePayload = {
            stateBlob: currentState?.stateBlob,
            version: currentState?.version,
            actingPlayer: meta.playerId
        };

        messages.push({
            target: "socket",
            socketId,
            message: {
                type: "state_update",
                payload: stateUpdatePayload
            }
        });

        messages.push({
            target: "room",
            roomId,
            exclude: socketId,
            message: {
                type: "state_update",
                payload: stateUpdatePayload
            }
        });

        ok = true;
    } finally {
        await unit.complete(ok);
    }

    if (ok) {
        for (const m of messages) {
            if (m.target === "socket") {
                connectionManager.sendToSocket(m.socketId!, m.message);
            } else {
                connectionManager.broadcastToRoom(m.roomId!, m.message, m.exclude);
            }
        }
    }
}
