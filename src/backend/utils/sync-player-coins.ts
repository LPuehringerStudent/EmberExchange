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

    const updates: { playerId: number; coins: number }[] = players
        .filter((p): p is StatePlayer & { playerId: number; stack: number } =>
            typeof p.playerId === "number" && typeof p.stack === "number"
        )
        .map(p => ({ playerId: p.playerId, coins: p.stack }));

    if (updates.length === 0) return [];

    const playerService = new PlayerService(unit);
    const changed = await playerService.updatePlayerCoinsBatch(updates);

    if (changed !== updates.length) {
        console.error(`[coins] Batch update changed ${changed} rows but expected ${updates.length}`);
    }

    return updates.map(u => u.playerId);
}
