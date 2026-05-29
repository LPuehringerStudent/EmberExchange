import express from "express";
import { Unit } from "../utils/unit";
import { QuestService } from "../services/quest-service";
import { SessionService } from "../services/session-service";
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
questRouter.get("/quests", async (req, res) => {
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

        const questService = new QuestService(unit);
        const quests = await questService.getActiveQuests(session.playerId);
        res.status(StatusCodes.OK).json(quests);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
questRouter.post("/quests/:id/claim", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Missing session-id header" });
        return;
    }

    const questId = parseInt(req.params.id, 10);
    if (isNaN(questId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid quest ID" });
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

        const questService = new QuestService(unit);
        const result = await questService.claimReward(session.playerId, questId);

        if (result.success) {
            res.status(StatusCodes.OK).json(result);
        } else {
            res.status(StatusCodes.BAD_REQUEST).json(result);
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
