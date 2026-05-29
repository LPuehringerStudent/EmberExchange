import express from "express";
import { Unit } from "../utils/unit";
import { PityService } from "../services/pity-service";
import { SessionService } from "../services/session-service";
import { StatusCodes } from "http-status-codes";

export const pityRouter = express.Router();

/**
 * @openapi
 * /player/pity:
 *   get:
 *     summary: Get player's pity counters
 *     description: Returns current pity progress for all lootbox types
 *     tags:
 *       - Pity
 *     responses:
 *       200:
 *         description: Pity counters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 standard:
 *                   type: object
 *                 golden:
 *                   type: object
 *                 legendary:
 *                   type: object
 *                 dragon:
 *                   type: object
 *                 winter:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
pityRouter.get("/player/pity", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    try {
        const sessionService = new SessionService(unit);
        const session = await sessionService.getSession(sessionId);
        if (!session || new Date(session.expiresAt) < new Date()) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const pityService = new PityService(unit);
        const [standard, golden, legendary, dragon, winter] = await Promise.all([
            pityService.getPityProgress(session.playerId, 1),
            pityService.getPityProgress(session.playerId, 2),
            pityService.getPityProgress(session.playerId, 3),
            pityService.getPityProgress(session.playerId, 4),
            pityService.getPityProgress(session.playerId, 5),
        ]);

        res.status(StatusCodes.OK).json({
            standard,
            golden,
            legendary,
            dragon,
            winter,
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
