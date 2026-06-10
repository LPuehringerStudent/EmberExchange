import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { QuestService } from "../services/quest-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const questRouter = express.Router();

/**
 * @openapi
 * /quests:
 *   get:
 *     summary: Get active quests
 *     description: Returns daily and weekly quests for the logged-in player
 *     tags:
 *       - Quests
 *     responses:
 *       200:
 *         description: Active quests
 *       401:
 *         description: Unauthorized
 */
questRouter.get("/quests", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const questService = new QuestService(unit);
        const quests = await questService.getActiveQuests(req.playerId!);
        res.status(StatusCodes.OK).json(quests);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /quests/stats:
 *   get:
 *     summary: Get quest statistics
 *     description: Returns aggregated quest stats for the logged-in player
 *     tags:
 *       - Quests
 *     responses:
 *       200:
 *         description: Quest stats
 *       401:
 *         description: Unauthorized
 */
questRouter.get("/quests/stats", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const questService = new QuestService(unit);
        const stats = await questService.getQuestStats(req.playerId!);
        res.status(StatusCodes.OK).json(stats);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /quests/history:
 *   get:
 *     summary: Get quest history
 *     description: Returns claimed quest history for the logged-in player
 *     tags:
 *       - Quests
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Quest history
 *       401:
 *         description: Unauthorized
 */
questRouter.get("/quests/history", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const questService = new QuestService(unit);
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        const history = await questService.getQuestHistory(req.playerId!, limit);
        res.status(StatusCodes.OK).json(history);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /quests/claim-all:
 *   post:
 *     summary: Claim all quest rewards
 *     description: Claims rewards for all completed unclaimed quests at once
 *     tags:
 *       - Quests
 *     responses:
 *       200:
 *         description: Rewards claimed
 *       400:
 *         description: No quests to claim
 *       401:
 *         description: Unauthorized
 */
questRouter.post("/quests/claim-all", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const questService = new QuestService(unit);
        const result = await questService.claimAllRewards(req.playerId!);

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

/**
 * @openapi
 * /quests/{id}/claim:
 *   post:
 *     summary: Claim quest reward
 *     description: Claims the reward for a completed quest
 *     tags:
 *       - Quests
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reward claimed
 *       400:
 *         description: Quest not completed or already claimed
 *       401:
 *         description: Unauthorized
 */
questRouter.post("/quests/:id/claim", requireAuth, async (req, res) => {
    const questId = parseInt(req.params.id as string, 10);
    if (isNaN(questId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid quest ID" });
        return;
    }

    const unit = await Unit.create(false);
    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const questService = new QuestService(unit);
        const result = await questService.claimReward(req.playerId!, questId);

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
