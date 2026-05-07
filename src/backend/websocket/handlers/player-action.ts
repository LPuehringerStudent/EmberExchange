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

        if (!engineRegistry.has(room.gameType)) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: `No engine for game type: ${room.gameType}`, recoverable: true }
            });
            return;
        }

        const engine = engineRegistry.get(room.gameType);

        // Handle next_hand meta-action
        if (actionType === "next_hand") {
            const blob = state.stateBlob as Record<string, unknown>;
            const phase = blob.phase as string;
            if (phase !== "showdown" && phase !== "waiting") {
                connectionManager.sendToSocket(socketId, {
                    type: "error",
                    payload: { code: ErrorCode.INVALID_STATE, message: "Can only start next hand after showdown", recoverable: true }
                });
                return;
            }

            const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
            const newState = engine.resetForNextHand(state.stateBlob as Record<string, unknown>, playersInRoom);

            const updateResult = await gameStateService.updateState(roomId, newState, expectedVersion);
            if (!updateResult.success) {
                connectionManager.sendToSocket(socketId, {
                    type: "error",
                    payload: { code: ErrorCode.VERSION_MISMATCH, message: "Optimistic lock failed", recoverable: true }
                });
                return;
            }

            await eventLogService.logEvent(
                roomId,
                "next_hand",
                { expectedVersion },
                meta.playerId,
                (payload.sequenceNumber as number | undefined) ?? null,
                (payload.clientTimestamp as number | undefined) ?? null
            );

            for (const player of playersInRoom) {
                const view = engine.getPlayerView(newState, player.playerId);
                const targetSocket = connectionManager.getSocketIdForPlayer(roomId, player.playerId);
                if (targetSocket) {
                    connectionManager.sendToSocket(targetSocket, {
                        type: "state_update",
                        payload: {
                            stateBlob: view,
                            version: updateResult.newVersion,
                            actingPlayer: meta.playerId
                        }
                    });
                }
            }

            // Start turn timer for new hand
            clearTurnTimer(roomId);
            const newBlob = newState as Record<string, unknown>;
            const activePlayer = newBlob.activePlayer as number;
            if (activePlayer !== -1) {
                startTurnTimer(roomId, activePlayer, updateResult.newVersion);
            }

            ok = true;
            return;
        }

        const result = engine.processAction(
            state.stateBlob as Record<string, unknown>,
            { type: actionType, amount: actionData?.amount as number | undefined },
            meta.playerId
        );

        if (!result.valid) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: result.errorMessage === "Not your turn" ? ErrorCode.OUT_OF_TURN : ErrorCode.INVALID_STATE, message: result.errorMessage, recoverable: true }
            });
            return;
        }

        const updateResult = await gameStateService.updateState(roomId, result.newFullState!, expectedVersion);
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

        // Send personalized views to each player in the room
        const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
        for (const player of playersInRoom) {
            const view = result.playerViews!.get(player.playerId);
            if (view) {
                const targetSocket = connectionManager.getSocketIdForPlayer(roomId, player.playerId);
                if (targetSocket) {
                    connectionManager.sendToSocket(targetSocket, {
                        type: "state_update",
                        payload: {
                            stateBlob: view,
                            version: updateResult.newVersion,
                            actingPlayer: meta.playerId
                        }
                    });
                }
            }
        }

        // Restart turn timer for next active player
        clearTurnTimer(roomId);
        const newState = await gameStateService.getState(roomId);
        if (newState) {
            const blob = newState.stateBlob as Record<string, unknown>;
            const activePlayer = blob.activePlayer as number;
            if (activePlayer !== -1) {
                startTurnTimer(roomId, activePlayer, newState.version);
            }
        }

        ok = true;
    } finally {
        await unit.complete(ok);
    }
}
