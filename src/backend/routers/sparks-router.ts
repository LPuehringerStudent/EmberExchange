import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { SparksService } from "../services/sparks-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const sparksRouter = express.Router();

/**
 * @openapi
 * /player/sparks:
 *   get:
 *     summary: Get player's sparks balance
 *     description: Returns the current sparks balance for the logged-in player
 *     tags:
 *       - Sparks
 *     responses:
 *       200:
 *         description: Sparks balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sparks:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
sparksRouter.get("/player/sparks", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const sparksService = new SparksService(unit);
        const balance = await sparksService.getSparksBalance(req.playerId!);
        res.status(StatusCodes.OK).json({ sparks: balance });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /sparks/salvage:
 *   post:
 *     summary: Salvage a stove for sparks
 *     description: Burns a owned stove and awards sparks based on rarity and heat
 *     tags:
 *       - Sparks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stoveId
 *             properties:
 *               stoveId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Salvage result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
sparksRouter.post("/sparks/salvage", requireAuth, async (req, res) => {
    const { stoveId } = req.body;
    if (!stoveId || typeof stoveId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "stoveId is required" });
        return;
    }

    const unit = await Unit.create(true);
    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            return;
        }

        const sparksService = new SparksService(unit);
        const result = await sparksService.salvageStove(req.playerId!, stoveId);

        if (result.success) {
            res.status(StatusCodes.OK).json(result);
        } else {
            res.status(StatusCodes.BAD_REQUEST).json(result);
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /sparks/reroll-heat:
 *   post:
 *     summary: Re-roll a stove's heat level
 *     description: Costs 20 sparks to re-roll a stove's heat within its type's range
 *     tags:
 *       - Sparks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stoveId
 *             properties:
 *               stoveId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Re-roll result
 *       400:
 *         description: Invalid request or insufficient sparks
 *       401:
 *         description: Unauthorized
 */
sparksRouter.post("/sparks/reroll-heat", requireAuth, async (req, res) => {
    const { stoveId } = req.body;
    if (!stoveId || typeof stoveId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "stoveId is required" });
        return;
    }

    const unit = await Unit.create(true);
    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            return;
        }

        const sparksService = new SparksService(unit);
        const result = await sparksService.reRollHeat(req.playerId!, stoveId);

        if (result.success) {
            res.status(StatusCodes.OK).json(result);
        } else {
            res.status(StatusCodes.BAD_REQUEST).json(result);
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});
