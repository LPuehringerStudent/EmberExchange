import { Unit } from "../../utils/unit";
import { RoomService } from "../../services/room-service";
import { RoomPlayerService } from "../../services/room-player-service";
import { GameStateService } from "../../services/game-state-service";
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

export async function handleJoinRoom(socketId: string, payload: Record<string, unknown>): Promise<void> {
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

        const room = await roomService.getRoomByIdForUpdate(roomId);
        if (!room) {
            connectionManager.sendToSocket(socketId, {
                type: "error",
                payload: { code: ErrorCode.INVALID_STATE, message: "Room not found", recoverable: true }
            });
            return;
        }

        const existingPlayer = await roomPlayerService.getPlayerInRoom(roomId, meta.playerId);
        let seatIndex = -1;

        if (existingPlayer) {
            const liveSocketId = connectionManager.getSocketIdForPlayer(roomId, meta.playerId);
            if (existingPlayer.connectionState !== "disconnected" && liveSocketId) {
                // The player is genuinely still connected on another active socket.
                connectionManager.sendToSocket(socketId, {
                    type: "error",
                    payload: { code: ErrorCode.INVALID_STATE, message: "Already in room", recoverable: true }
                });
                return;
            }

            // Stale connected row (e.g. after a crash/reconnect or a socket that
            // closed without cleaning up). Reclaim the seat and let them rejoin.
            if (existingPlayer.connectionState === "disconnected") {
                await roomPlayerService.updateConnectionState(existingPlayer.roomPlayerId, "connected");
            }
            seatIndex = existingPlayer.seatIndex;
        } else {
            const playerCount = await roomPlayerService.countPlayersInRoom(roomId);
            if (playerCount >= room.maxPlayers) {
                connectionManager.sendToSocket(socketId, {
                    type: "error",
                    payload: { code: ErrorCode.ROOM_FULL, message: "Room is full", recoverable: true }
                });
                return;
            }

            seatIndex = await roomPlayerService.findNextSeatIndex(roomId);
            try {
                await roomPlayerService.addPlayer(roomId, meta.playerId, seatIndex);
            } catch (err) {
                const pgErr = err as { code?: string };
                if (pgErr.code === "23505") {
                    connectionManager.sendToSocket(socketId, {
                        type: "error",
                        payload: { code: ErrorCode.ROOM_FULL, message: "Seat was taken, please try again", recoverable: true }
                    });
                    return;
                }
                throw err;
            }
        }

        // Ensure game state exists
        let state = await gameStateService.getState(roomId);
        if (!state) {
            await gameStateService.createInitialState(roomId, { players: [], status: "waiting", log: [] });
            state = await gameStateService.getState(roomId);
        }

        // Rebuild players list in state blob from DB
        const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
        const baseBlob = (typeof state!.stateBlob === "object" && state!.stateBlob !== null)
            ? state!.stateBlob as Record<string, unknown>
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

        await gameStateService.updateState(roomId, newBlob, state!.version);

        // Queue messages to send after successful commit
        messages.push({
            target: "room",
            roomId,
            exclude: socketId,
            message: {
                type: "player_joined",
                payload: { playerId: meta.playerId, seatIndex }
            }
        });

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

    // Only update registries and send messages if transaction committed
    if (ok) {
        connectionManager.joinRoom(socketId, roomId);
        connectionManager.clearGraceTimer(roomId, meta.playerId);
        connectionManager.clearAutoFoldTimer(roomId, meta.playerId);
        for (const m of messages) {
            if (m.target === "socket") {
                connectionManager.sendToSocket(m.socketId!, m.message);
            } else {
                connectionManager.broadcastToRoom(m.roomId!, m.message, m.exclude);
            }
        }
    }
}
