import { Unit } from "../../utils/unit";
import { GameStateService } from "../../services/game-state-service";
import { RoomPlayerService } from "../../services/room-player-service";
import { EventLogService } from "../../services/event-log-service";
import { connectionManager } from "../connection-manager";
import { isValidUUID } from "../validators";
import { ErrorCode, ServerMessage } from "../../../shared/model";

export async function handleRequestSync(socketId: string, payload: Record<string, unknown>): Promise<void> {
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

    const unit = await Unit.create(true);
    let messages: ServerMessage[] = [];

    try {
        const roomPlayerService = new RoomPlayerService(unit);
        const gameStateService = new GameStateService(unit);

        const roomPlayer = await roomPlayerService.getPlayerInRoom(roomId, meta.playerId);
        if (!roomPlayer) {
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

        messages.push({
            type: "state_update",
            payload: {
                stateBlob: state.stateBlob,
                version: state.version,
                actingPlayer: null
            }
        });

        // Replay missed events if client provided a last known sequence number
        const lastSeq = payload.lastSequenceNumber as number | undefined;
        if (typeof lastSeq === "number") {
            const eventLogService = new EventLogService(unit);
            const missedEvents = await eventLogService.getEventsAfter(roomId, lastSeq);
            for (const event of missedEvents) {
                messages.push({
                    type: "event_replay",
                    payload: {
                        type: event.type,
                        payload: event.payload,
                        sequenceNumber: event.sequenceNumber,
                        clientTimestamp: event.clientTimestamp,
                        serverTimestamp: event.serverTimestamp
                    }
                });
            }
        }
    } finally {
        await unit.complete();
    }

    for (const msg of messages) {
        connectionManager.sendToSocket(socketId, msg);
    }
}
