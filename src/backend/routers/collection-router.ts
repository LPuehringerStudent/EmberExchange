import express from "express";
import { Unit } from "../utils/unit";
import { CollectionService } from "../services/collection-service";
import { SessionService } from "../services/session-service";
import { StatusCodes } from "http-status-codes";

export const collectionRouter = express.Router();

/**
 * @openapi
 * /player/collections:
 *   get:
 *     summary: Get player's collection progress
 *     description: Returns progress for all stove collections
 *     tags:
 *       - Collections
 *     responses:
 *       200:
 *         description: Collection progress array
 *       401:
 *         description: Unauthorized
 */
collectionRouter.get("/player/collections", async (req, res) => {
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

        const collectionService = new CollectionService(unit);
        const collections = await collectionService.getPlayerCollections(session.playerId);
        res.status(StatusCodes.OK).json(collections);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
