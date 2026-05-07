import { Unit } from "../../utils/unit";
import { RoomService } from "../../services/room-service";
import { RoomPlayerService } from "../../services/room-player-service";
import { GameStateService } from "../../services/game-state-service";
import { EventLogService } from "../../services/event-log-service";
import { connectionManager } from "../connection-manager";
import { isValidUUID } from "../validators";
import { ErrorCode } from "../../../shared/model";
import { engineRegistry } from "../../game-engines";
import { startTurnTimer, clearTurnTimer } from "../turn-timer";

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

        const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
        const connectedPlayers = playersInRoom.filter(p => p.connectionState === "connected");

        if (!engineRegistry.has(room.gameType)) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: `No engine for game type: ${room.gameType}`, recoverable: true }
            });
            return;
        }

        const engine = engineRegistry.get(room.gameType);

        if (connectedPlayers.length < engine.minPlayers) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: `Need at least ${engine.minPlayers} players`, recoverable: true }
            });
            return;
        }

        await roomService.updateRoomStatus(roomId, "active");

        const initialState = engine.createInitialState(connectedPlayers);

        const existingState = await gameStateService.getState(roomId);
        if (existingState) {
            await gameStateService.updateState(roomId, initialState, existingState.version);
        } else {
            await gameStateService.createInitialState(roomId, initialState);
        }

        await eventLogService.logEvent(roomId, "start_game", { startedBy: meta.playerId }, meta.playerId);

        const currentState = await gameStateService.getState(roomId);
        if (!currentState) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Failed to create game state", recoverable: true }
            });
            return;
        }

        // Send personalized views to each connected player
        for (const player of connectedPlayers) {
            const view = engine.getPlayerView(currentState.stateBlob as Record<string, unknown>, player.playerId);
            const targetSocket = connectionManager.getSocketIdForPlayer(roomId, player.playerId);
            if (targetSocket) {
                connectionManager.sendToSocket(targetSocket, {
                    type: "state_update",
                    payload: {
                        stateBlob: view,
                        version: currentState.version,
                        actingPlayer: meta.playerId
                    }
                });
            }
        }

        // Start turn timer for first active player
        clearTurnTimer(roomId);
        const blob = currentState.stateBlob as Record<string, unknown>;
        const activePlayer = blob.activePlayer as number;
        if (activePlayer !== -1) {
            startTurnTimer(roomId, activePlayer, currentState.version);
        }

        ok = true;
    } finally {
        await unit.complete(ok);
    }
}
