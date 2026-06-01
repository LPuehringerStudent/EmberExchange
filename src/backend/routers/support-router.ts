import express from "express";
import { Unit } from "../utils/unit";
import { SupportService } from "../services/support-service";
import { SessionService } from "../services/session-service";
import { PlayerService } from "../services/player-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { sanitizeText } from "../utils/sanitize";

export const supportRouter = express.Router();

/**
 * @openapi
 * /support:
 *   post:
 *     summary: Submit a support ticket
 *     description: Creates a support ticket and optionally forwards it to the Discord support bot.
 *     tags:
 *       - Support
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
 *               - title
 *               - description
 *               - type
 *               - priority
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [bug, feature, support]
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *     responses:
 *       201:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 ticketId:
 *                   type: integer
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
supportRouter.post("/support", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(false);
    const supportService = new SupportService(unit);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        if (new Date(session.expiresAt) < new Date()) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Session expired" });
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }

        const { title, description, type, priority } = req.body;

        if (isNullOrWhiteSpace(title)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "title is required" });
            return;
        }
        if (title.length > 200) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "title too long (max 200 characters)" });
            return;
        }
        if (isNullOrWhiteSpace(description)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "description is required" });
            return;
        }
        if (description.length > 5000) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "description too long (max 5000 characters)" });
            return;
        }
        if (!["bug", "feature", "support"].includes(type)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "type must be bug, feature, or support" });
            return;
        }
        if (!["high", "medium", "low"].includes(priority)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "priority must be high, medium, or low" });
            return;
        }

        const safeTitle = sanitizeText(title.trim(), 200) ?? title.trim().slice(0, 200);
        const safeDescription = sanitizeText(description.trim(), 5000) ?? description.trim().slice(0, 5000);

        const [success, ticketId] = await supportService.create(
            player.playerId,
            safeTitle,
            safeDescription,
            type,
            priority
        );

        if (!success) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create ticket" });
            return;
        }

        ok = true;
        res.status(StatusCodes.CREATED).json({ success: true, ticketId });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
