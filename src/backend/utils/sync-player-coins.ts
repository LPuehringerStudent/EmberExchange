import { Unit } from "./unit";
import { PlayerService } from "../services/player-service";

interface StatePlayer {
    playerId: number;
    stack?: number;
}

/**
 * Reads player stacks from a game-state blob and writes them back to
 * Player.coins so winnings / losses are actually persisted.
 *
 * Safely skips blobs that don't have a recognised `players` array or
 * entries without a `stack` field (e.g. waiting-room metadata).
 *
 * Returns the list of playerIds whose coins were updated.
 */
export async function syncPlayerCoinsFromState(
    unit: Unit,
    stateBlob: Record<string, unknown>
): Promise<number[]> {
    const players = stateBlob.players as StatePlayer[] | undefined;

    if (!players || !Array.isArray(players)) {
        return [];
    }

    const playerService = new PlayerService(unit);
    const updated: number[] = [];

    for (const p of players) {
        if (
            typeof p.playerId === "number" &&
            typeof p.stack === "number"
        ) {
            const success = await playerService.updatePlayerCoins(p.playerId, p.stack);
            if (success) {
                updated.push(p.playerId);
                // Coin sync succeeded
            } else {
                console.error(`[coins] FAILED to sync player ${p.playerId}`);
            }
        }
    }

    return updated;
}
