import express from "express";
import { Unit } from "../utils/unit";
import { CollectionService } from "../services/collection-service";
import { requireAuth } from "../middleware/require-auth";
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
collectionRouter.get("/player/collections", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const collectionService = new CollectionService(unit);
        const collections = await collectionService.getPlayerCollections(req.playerId!);
        res.status(StatusCodes.OK).json(collections);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
