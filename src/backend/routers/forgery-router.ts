import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { ForgeryService } from "../services/forgery-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const forgeryRouter = express.Router();

/**
 * @openapi
 * /forgery:
 *   post:
 *     summary: Forge a new stove from 6 input stoves
 *     description: |
 *       Consumes 6 stoves of the same rarity and produces 1 new stove
 *       of the next rarity tier. Output collection is weighted by
 *       input collection mix. Output heatLevel is calculated from
 *       the average input heatLevel mapped to the output stove type's range.
 *     tags:
 *       - Forgery
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stoveIds
 *             properties:
 *               stoveIds:
 *                 type: array
 *                 minItems: 6
 *                 maxItems: 6
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Forge successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 newStove:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       403:
 *         description: Stoves not owned or invalid rarity
 *       500:
 *         description: Server error
 */
forgeryRouter.post("/forgery", requireAuth, async (req, res) => {
    const { stoveIds } = req.body;
    if (!Array.isArray(stoveIds) || stoveIds.length !== 6 || !stoveIds.every((id: unknown) => typeof id === "number")) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "stoveIds must be an array of exactly 6 integers" });
        return;
    }

    const unit = await Unit.create(false);
    const forgeryService = new ForgeryService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await forgeryService.forge(req.playerId!, stoveIds);
        if (result.success) {
            await unit.complete(true);
            res.status(StatusCodes.OK).json(result);
        } else {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json(result);
        }
    } catch (err) {
        await unit.complete(false);
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
});
