import express from "express";
import { Unit } from "../utils/unit";
import { PlayerService } from "../services/player-service";
import { SessionService } from "../services/session-service";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";

export const authRouter = express.Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in a player
 *     description: Authenticates a player and returns a session ID
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 playerId:
 *                   type: integer
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
authRouter.post("/auth/login", (req, res) => {
    const { username, password } = req.body;
    const unit = new Unit(false);
    const playerService = new PlayerService(unit);
    const sessionService = new SessionService(unit);

    try {
        const player = playerService.getPlayerByUsername(username);
        if (player === null || player.password !== password) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username or password" });
            unit.complete(false);
            return;
        }

        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour session

        const success = sessionService.createSession(sessionId, player.playerId, expiresAt);
        if (success) {
            unit.complete(true);
            res.status(StatusCodes.OK).json({ sessionId, playerId: player.playerId });
        } else {
            throw new Error("Failed to create session");
        }
    } catch (err) {
        unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out a player
 *     description: Invalidate a session
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
authRouter.post("/auth/logout", (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = new Unit(false);
    const sessionService = new SessionService(unit);

    try {
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or inactive session" });
            unit.complete(false);
            return;
        }

        const success = sessionService.invalidateSession(sessionId);
        if (success) {
            unit.complete(true);
            res.status(StatusCodes.OK).json({ message: "Logout successful" });
        } else {
            throw new Error("Failed to invalidate session");
        }
    } catch (err) {
        unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});
