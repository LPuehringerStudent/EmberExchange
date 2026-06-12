import express from "express";
import { Unit } from "../utils/unit";
import { CollectionService } from "../services/collection-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const collectionRouter = express.Router();

function collectionErrorResponse(err: unknown): { error: string } {
    if (process.env.NODE_ENV === "production") {
        return { error: "Internal server error" };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { error: message || "Internal server error" };
}

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
    const unit = await Unit.create(false);
    let ok = false;
    try {
        const collectionService = new CollectionService(unit);
        const collections = await collectionService.getPlayerCollections(req.playerId!);
        ok = true;
        res.status(StatusCodes.OK).json(collections);
    } catch (err) {
        console.error("Collection route error:", { endpoint: "GET /player/collections", playerId: req.playerId, err });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(collectionErrorResponse(err));
    } finally {
        await unit.complete(ok);
    }
});

collectionRouter.post("/player/collections/rewards/:typeId/claim", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    let ok = false;
    try {
        const typeId = Number(req.params.typeId);
        if (!Number.isInteger(typeId) || typeId <= 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid stove type" });
            return;
        }

        const collectionService = new CollectionService(unit);
        const result = await collectionService.claimStoveReward(req.playerId!, typeId);
        if (!result.success) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error ?? "Failed to claim collection reward" });
            return;
        }

        ok = true;
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        console.error("Collection route error:", { endpoint: "POST /player/collections/rewards/:typeId/claim", playerId: req.playerId, err });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(collectionErrorResponse(err));
    } finally {
        await unit.complete(ok);
    }
});
