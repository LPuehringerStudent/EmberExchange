import { Unit } from "./unit";
import { PlayerService } from "../services/player-service";

/**
 * Reads player stacks from a game-state blob and writes them back to
 * Player.coins so winnings / losses are actually persisted.
 *
 * Safely skips blobs that don't have a recognised `players` array or
 * entries without a `stack` field (e.g. waiting-room metadata).
 */
export async function syncPlayerCoinsFromState(
    unit: Unit,
    stateBlob: Record<string, unknown>
): Promise<void> {
    const players = stateBlob.players as
        | Array<{ playerId: number; stack?: number }>
        | undefined;

    if (!players || !Array.isArray(players)) {
        return;
    }

    const playerService = new PlayerService(unit);

    for (const p of players) {
        if (
            typeof p.playerId === "number" &&
            typeof p.stack === "number"
        ) {
            await playerService.updatePlayerCoins(p.playerId, p.stack);
        }
    }
}
