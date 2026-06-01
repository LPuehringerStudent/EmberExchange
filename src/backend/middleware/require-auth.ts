import type { Request, Response, NextFunction } from "express";
import { Unit } from "../utils/unit";
import { SessionService } from "../services/session-service";
import { PlayerService } from "../services/player-service";
import { StatusCodes } from "http-status-codes";

declare global {
    namespace Express {
        interface Request {
            playerId?: number;
        }
    }
}

/**
 * Express middleware that requires a valid session-id header.
 * Attaches `req.playerId` if the session is valid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    try {
        const sessionService = new SessionService(unit);
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete();
            return;
        }

        // Check if player is banned
        const playerService = new PlayerService(unit);
        const player = await playerService.getInfoByID(session.playerId);
        if (player?.bannedAt) {
            // Invalidate the session so the banned player can't reuse it
            await sessionService.invalidateSession(sessionId);
            res.status(StatusCodes.FORBIDDEN).json({ error: "Account banned", reason: player.banReason || "No reason provided" });
            await unit.complete();
            return;
        }

        req.playerId = session.playerId;
        await unit.complete();
        next();
    } catch (err) {
        try { await unit.complete(false); } catch { /* ignore */ }
        next(err);
    }
}
