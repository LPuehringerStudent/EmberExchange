import express from "express";
import { Unit } from "../utils/unit";
import { PlayerService } from "../services/player-service";
import { SessionService } from "../services/session-service";
import { PlayerStatisticsService } from "../services/player-statistics-service";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import { isNullOrWhiteSpace } from "../utils/util";

export const authRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const msg = String(err);
    return msg.includes("FOREIGN KEY constraint failed") ||
           msg.includes("UNIQUE constraint failed");
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in a player
 *     description: Authenticates a player with username or email and returns a session ID
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usernameOrEmail
 *               - password
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *                 description: Username or email address
 *               password:
 *                 type: string
 *                 description: Player password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
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
authRouter.post("/auth/login", (req, res) => {
    const { usernameOrEmail, password } = req.body;
    
    if (isNullOrWhiteSpace(usernameOrEmail) || isNullOrWhiteSpace(password)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Username/email and password are required" });
        return;
    }
    
    const unit = new Unit(false);
    const playerService = new PlayerService(unit);
    const sessionService = new SessionService(unit);

    try {
        // Try to find player by username first, then by email
        let player = playerService.getPlayerByUsername(usernameOrEmail);
        if (player === null) {
            player = playerService.getPlayerByEmail(usernameOrEmail);
        }
        
        if (player === null || player.password !== password) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username/email or password" });
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
 * /auth/me:
 *   patch:
 *     summary: Update current user profile
 *     description: Updates the current user's email
 *     tags:
 *       - Authentication
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
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
authRouter.patch("/auth/me", (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { email } = req.body;
    
    if (isNullOrWhiteSpace(email)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Email is required" });
        return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid email format" });
        return;
    }

    const unit = new Unit(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            unit.complete(false);
            return;
        }

        // Check if email already exists for another user
        const existingByEmail = playerService.getPlayerByEmail(email);
        if (existingByEmail && existingByEmail.playerId !== session.playerId) {
            res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
            unit.complete(false);
            return;
        }

        // Update email
        const success = playerService.updatePlayerEmail(session.playerId, email);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Profile updated successfully" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        if (isConstraintError(err)) {
            res.status(StatusCodes.CONFLICT).json({ error: String(err) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /auth/password:
 *   patch:
 *     summary: Change password
 *     description: Change current user's password (requires current password)
 *     tags:
 *       - Authentication
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
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid session or current password
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
authRouter.patch("/auth/password", (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { currentPassword, newPassword } = req.body;
    
    if (isNullOrWhiteSpace(currentPassword) || isNullOrWhiteSpace(newPassword)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Current password and new password are required" });
        return;
    }

    if (newPassword.length < 6) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "New password must be at least 6 characters" });
        return;
    }

    const unit = new Unit(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            unit.complete(false);
            return;
        }

        const player = playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            unit.complete(false);
            return;
        }

        // Verify current password
        if (player.password !== currentPassword) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Current password is incorrect" });
            unit.complete(false);
            return;
        }

        // Update password
        const success = playerService.updatePlayerPassword(session.playerId, newPassword);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Password changed successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update password" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /auth/me:
 *   delete:
 *     summary: Delete current user account
 *     description: Permanently deletes the current user's account and all associated data
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
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: Invalid session
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
authRouter.delete("/auth/me", (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = new Unit(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            unit.complete(false);
            return;
        }

        // Delete player (cascade will handle related data)
        const success = playerService.deletePlayer(session.playerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Account deleted successfully" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new player
 *     description: Creates a new player account and returns a session ID (auto-login)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Username or email already exists
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
authRouter.post("/auth/register", (req, res) => {
    const { username, password, email } = req.body;
    const unit = new Unit(false);
    const playerService = new PlayerService(unit);
    const playerStatisticsService = new PlayerStatisticsService(unit);
    const sessionService = new SessionService(unit);
    let ok = false;

    try {
        // Validation
        if (isNullOrWhiteSpace(username) || isNullOrWhiteSpace(password) || isNullOrWhiteSpace(email)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Username, password, and email are required" });
            unit.complete(false);
            return;
        }

        if (password.length < 6) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Password must be at least 6 characters" });
            unit.complete(false);
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid email format" });
            unit.complete(false);
            return;
        }

        // Check if username or email already exists
        const existingByUsername = playerService.getPlayerByUsername(username);
        if (existingByUsername) {
            res.status(StatusCodes.CONFLICT).json({ error: "Username already exists" });
            unit.complete(false);
            return;
        }

        const existingByEmail = playerService.getPlayerByEmail(email);
        if (existingByEmail) {
            res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
            unit.complete(false);
            return;
        }

        // Create player with default values (1000 coins, 10 lootboxes)
        const [success, playerId] = playerService.createPlayer(username, password, email, 1000, 10);

        if (!success) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create player" });
            unit.complete(false);
            return;
        }

        // Create player statistics record
        const [statsSuccess] = playerStatisticsService.createDefaultPlayerStatistics(playerId);
        if (!statsSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create player statistics" });
            unit.complete(false);
            return;
        }

        // Create session (auto-login)
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const sessionCreated = sessionService.createSession(sessionId, playerId, expiresAt);
        if (!sessionCreated) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create session" });
            unit.complete(false);
            return;
        }

        ok = true;
        res.status(StatusCodes.CREATED).json({ sessionId, playerId });
    } catch (err) {
        if (isConstraintError(err)) {
            res.status(StatusCodes.CONFLICT).json({ error: String(err) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the currently authenticated player's information
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
 *         description: Current player information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentUser'
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
authRouter.get("/auth/me", (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = new Unit(true);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);

    try {
        const session = sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Session expired" });
            return;
        }

        const player = playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }

        // Return player without password
        const { password, ...playerWithoutPassword } = player;
        res.status(StatusCodes.OK).json(playerWithoutPassword);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Missing session-id header
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid session
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
