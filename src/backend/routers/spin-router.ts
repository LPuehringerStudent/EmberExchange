import express from "express";
import { Unit } from "../utils/unit";
import { DailySpinService } from "../services/daily-spin-service";
import { requireAuth } from "../middleware/require-auth";
import { checkPlayerBanned } from "../middleware/ban-check";
import { StatusCodes } from "http-status-codes";

export const spinRouter = express.Router();

/**
 * @openapi
 * /spin/status:
 *   get:
 *     summary: Get daily spin status
 *     description: Returns whether the player can spin, when the next spin is available, and total lifetime spins
 *     tags:
 *       - Spin
 *     security:
 *       - sessionId: []
 *     responses:
 *       200:
 *         description: Spin status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 canSpin:
 *                   type: boolean
 *                 nextSpinAt:
 *                   type: string
 *                   nullable: true
 *                 totalSpins:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
spinRouter.get("/spin/status", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const spinService = new DailySpinService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }
        const status = await spinService.getStatus(req.playerId!);
        await unit.complete();
        res.status(StatusCodes.OK).json(status);
    } catch (err) {
        console.error("[SPIN] Status error:", err);
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get spin status" });
    }
});

/**
 * @openapi
 * /spin:
 *   post:
 *     summary: Spin the daily lucky wheel
 *     description: Awards a random prize and starts the 24h cooldown
 *     tags:
 *       - Spin
 *     security:
 *       - sessionId: []
 *     responses:
 *       200:
 *         description: Spin result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 prize:
 *                   type: object
 *                 amount:
 *                   type: integer
 *                 totalSpins:
 *                   type: integer
 *       400:
 *         description: Spin not available yet
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
spinRouter.post("/spin", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const spinService = new DailySpinService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }
        const result = await spinService.spin(req.playerId!);
        await unit.complete(true);
        res.status(StatusCodes.OK).json(result);
    } catch (err: any) {
        console.error("[SPIN] Spin error:", err);
        await unit.complete(false);
        if (err?.message === "Spin not available yet") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Spin not available yet" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Spin failed" });
        }
    }
});
