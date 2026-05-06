import { engineRegistry } from "../game-engines";
import { RoomService } from "../services/room-service";
import { RoomPlayerService } from "../services/room-player-service";
import { GameStateService } from "../services/game-state-service";
import { connectionManager } from "./connection-manager";
import { Unit } from "../utils/unit";

const TURN_TIMEOUT_MS = 30000; // 30 seconds per turn

interface TimerEntry {
  timeout: NodeJS.Timeout;
  expectedActivePlayer: number;
  expectedVersion: number;
}

const timers = new Map<string, TimerEntry>();

export function startTurnTimer(
  roomId: string,
  expectedActivePlayer: number,
  expectedVersion: number
): void {
  clearTurnTimer(roomId);

  const timeout = setTimeout(() => {
    timers.delete(roomId);
    void handleTurnTimeout(roomId, expectedActivePlayer, expectedVersion);
  }, TURN_TIMEOUT_MS);

  timers.set(roomId, { timeout, expectedActivePlayer, expectedVersion });
}

export function clearTurnTimer(roomId: string): void {
  const entry = timers.get(roomId);
  if (entry) {
    clearTimeout(entry.timeout);
    timers.delete(roomId);
  }
}

async function handleTurnTimeout(
  roomId: string,
  expectedActivePlayer: number,
  expectedVersion: number
): Promise<void> {
  const unit = await Unit.create(true);
  let ok = false;

  try {
    const roomService = new RoomService(unit);
    const gameStateService = new GameStateService(unit);

    const room = await roomService.getRoomById(roomId);
    if (!room || room.status !== "active") return;

    const state = await gameStateService.getState(roomId);
    if (!state) return;

    const blob = state.stateBlob as Record<string, unknown>;
    const activePlayer = blob.activePlayer as number;
    const phase = blob.phase as string;

    if (
      activePlayer !== expectedActivePlayer ||
      state.version !== expectedVersion ||
      phase === "showdown" ||
      phase === "waiting" ||
      activePlayer === -1
    ) {
      return; // State has moved on, do nothing
    }

    const engine = engineRegistry.get(room.gameType);
    const result = engine.processAction(
      state.stateBlob as Record<string, unknown>,
      { type: "fold" },
      activePlayer
    );

    if (!result.valid) return;

    const updateResult = await gameStateService.updateState(
      roomId,
      result.newFullState!,
      state.version
    );
    if (!updateResult.success) return;

    const roomPlayerService = new RoomPlayerService(unit);
    const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
    for (const player of playersInRoom) {
      const view = result.playerViews!.get(player.playerId);
      if (view) {
        const targetSocket = connectionManager.getSocketIdForPlayer(
          roomId,
          player.playerId
        );
        if (targetSocket) {
          connectionManager.sendToSocket(targetSocket, {
            type: "state_update",
            payload: {
              stateBlob: view,
              version: updateResult.newVersion,
              actingPlayer: activePlayer,
            },
          });
        }
      }
    }

    // Start timer for next player if hand continues
    const newState = await gameStateService.getState(roomId);
    if (newState) {
      const newBlob = newState.stateBlob as Record<string, unknown>;
      const newActive = newBlob.activePlayer as number;
      if (newActive !== -1) {
        startTurnTimer(roomId, newActive, newState.version);
      }
    }

    ok = true;
  } finally {
    await unit.complete(ok);
  }
}
