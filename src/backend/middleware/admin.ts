import type { Request, Response, NextFunction } from "express";
import { Unit } from "../utils/unit";
import { SessionService } from "../services/session-service";
import { PlayerService } from "../services/player-service";
import { StatusCodes } from "http-status-codes";

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    try {
        const sessionService = new SessionService(unit);
        const playerService = new PlayerService(unit);

        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete();
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player || !player.isAdmin) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Admin access required" });
            await unit.complete();
            return;
        }

        (req as Request & { adminPlayerId: number }).adminPlayerId = player.playerId;
        await unit.complete();
        next();
    } catch (err) {
        try { await unit.complete(false); } catch { /* ignore */ }
        next(err);
    }
}
