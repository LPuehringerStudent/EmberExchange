import { Unit } from "../../utils/unit";
import { RoomPlayerService } from "../../services/room-player-service";
import { GameStateService } from "../../services/game-state-service";
import { connectionManager } from "../connection-manager";
import { isValidUUID } from "../validators";
import { ErrorCode, ServerMessage } from "../../../shared/model";
import { syncPlayerCoinsFromState } from "../../utils/sync-player-coins";

interface QueuedMessage {
    target: "room";
    roomId: string;
    message: ServerMessage;
}

export async function handleLeaveRoom(socketId: string, payload: Record<string, unknown>): Promise<void> {
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
        const roomPlayerService = new RoomPlayerService(unit);
        const gameStateService = new GameStateService(unit);

        const existingPlayer = await roomPlayerService.getPlayerInRoom(roomId, meta.playerId);

        // If player was never in this room, don't broadcast anything
        if (!existingPlayer) {
            ok = true;
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "You are not in this room", recoverable: true }
            });
            return;
        }

        const state = await gameStateService.getState(roomId);
        if (state) {
            await syncPlayerCoinsFromState(unit, state.stateBlob as Record<string, unknown>);
        }

        await roomPlayerService.removePlayer(existingPlayer.roomPlayerId);

        if (state) {
            const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
            const baseBlob = (typeof state.stateBlob === "object" && state.stateBlob !== null)
                ? state.stateBlob as Record<string, unknown>
                : { players: [], status: "waiting", log: [] };

            const newBlob = {
                ...baseBlob,
                players: playersInRoom.map(p => ({
                    playerId: p.playerId,
                    username: p.username,
                    activeTitle: p.activeTitle,
                    activeBanner: p.activeBanner,
                    connectionState: p.connectionState,
                    seatIndex: p.seatIndex
                }))
            };
            await gameStateService.updateState(roomId, newBlob, state.version);
        }

        messages.push({
            target: "room",
            roomId,
            message: {
                type: "player_left",
                payload: { playerId: meta.playerId, reason: "left" }
            }
        });

        const currentState = await gameStateService.getState(roomId);
        if (currentState) {
            messages.push({
                target: "room",
                roomId,
                message: {
                    type: "state_update",
                    payload: {
                        stateBlob: currentState.stateBlob,
                        version: currentState.version,
                        actingPlayer: meta.playerId
                    }
                }
            });
        }

        ok = true;
    } finally {
        await unit.complete(ok);
    }

    if (ok) {
        connectionManager.leaveRoom(socketId, roomId);
        connectionManager.clearGraceTimer(roomId, meta.playerId);
        for (const m of messages) {
            connectionManager.broadcastToRoom(m.roomId, m.message);
        }
    }
}
