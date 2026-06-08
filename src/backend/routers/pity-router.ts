import express from "express";
import { Unit } from "../utils/unit";
import { PityService } from "../services/pity-service";
import { requireAuth } from "../middleware/require-auth";
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
pityRouter.get("/player/pity", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const pityService = new PityService(unit);
        const [standard, golden, legendary, dragon, winter] = await Promise.all([
            pityService.getPityProgress(req.playerId!, 1),
            pityService.getPityProgress(req.playerId!, 2),
            pityService.getPityProgress(req.playerId!, 3),
            pityService.getPityProgress(req.playerId!, 4),
            pityService.getPityProgress(req.playerId!, 5),
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
