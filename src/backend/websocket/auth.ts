import { Unit } from "../utils/unit";
import { SessionService } from "../services/session-service";
import { PlayerService } from "../services/player-service";

export interface AuthenticatedPlayer {
    playerId: number;
    sessionId: string;
}

export async function authenticateSession(sessionId: string | null): Promise<AuthenticatedPlayer | null> {
    if (!sessionId) {
        return null;
    }

    const unit = await Unit.create(true);
    try {
        const sessionService = new SessionService(unit);
        const session = await sessionService.getSession(sessionId);

        if (!session) {
            return null;
        }

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt < now) {
            return null;
        }

        // Reject banned players at the WebSocket layer
        const playerService = new PlayerService(unit);
        const player = await playerService.getInfoByID(session.playerId);
        if (player?.bannedAt) {
            await sessionService.invalidateSession(sessionId);
            return null;
        }

        return { playerId: session.playerId, sessionId };
    } finally {
        await unit.complete();
    }
}
