import express from "express";
import { Unit } from "../utils/unit";
import { SupportService } from "../services/support-service";
import { PlayerService } from "../services/player-service";
import { requireAuth } from "../middleware/require-auth";
import { supportRateLimiter } from "../middleware/rate-limiter";
import { timingGuard } from "../middleware/timing-guard";
import { headerGuard } from "../middleware/header-guard";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { sanitizeText } from "../utils/sanitize";
import { logSecurityEvent } from "../services/security-event-service";
import { getClientIp } from "../utils/bot-trap";

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
 *       429:
 *         description: Too many tickets
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
supportRouter.post(
    "/support",
    supportRateLimiter.middleware(),
    timingGuard,
    headerGuard,
    requireAuth,
    async (req, res) => {
        const unit = await Unit.create(false);
        const supportService = new SupportService(unit);
        const playerService = new PlayerService(unit);
        let ok = false;
        const clientIp = getClientIp(req);

        try {
            const player = await playerService.getInfoByID(req.playerId!);
            if (!player) {
                res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
                return;
            }

            const { title, description, type, priority } = req.body;

            /* ── Type validation (prevents crashes on non-string input) ── */
            if (typeof title !== "string") {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "title must be a string" });
                return;
            }
            if (typeof description !== "string") {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "description must be a string" });
                return;
            }

            /* ── Content validation ── */
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

            /* ── Per-player ticket quota (anti-spam) ── */
            const openCount = await supportService.countOpenTickets(player.playerId);
            if (openCount >= 3) {
                logSecurityEvent({
                    ipAddress: clientIp,
                    userAgent: req.headers["user-agent"] as string | undefined,
                    playerId: player.playerId,
                    eventType: "ticket_abuse",
                    path: req.path,
                    method: req.method,
                    details: `Ticket quota exceeded: ${openCount} open tickets`,
                });
                res.status(StatusCodes.TOO_MANY_REQUESTS).json({
                    error: "You already have 3 open support tickets. Please wait for a response before submitting more."
                });
                return;
            }

            const recentCount = await supportService.countTicketsInLastHours(player.playerId, 24);
            if (recentCount >= 5) {
                logSecurityEvent({
                    ipAddress: clientIp,
                    userAgent: req.headers["user-agent"] as string | undefined,
                    playerId: player.playerId,
                    eventType: "ticket_abuse",
                    path: req.path,
                    method: req.method,
                    details: `Daily ticket quota exceeded: ${recentCount} tickets in last 24h`,
                });
                res.status(StatusCodes.TOO_MANY_REQUESTS).json({
                    error: "You have reached the daily limit of 5 support tickets. Please try again tomorrow."
                });
                return;
            }

            /* ── Sanitize (strict — no fallback bypass) ── */
            const safeTitle = sanitizeText(title.trim(), 200);
            const safeDescription = sanitizeText(description.trim(), 5000);
            if (!safeTitle || !safeDescription) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid input after sanitization" });
                return;
            }

            const [success, ticketId] = await supportService.create(
                player.playerId,
                clientIp,
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
            console.error("Route error:", err);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
        } finally {
            await unit.complete(ok);
        }
    }
);
