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

    const unit = await Unit.create(true);
    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            return;
        }

        const questService = new QuestService(unit);
        const result = await questService.claimReward(req.playerId!, questId);

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
