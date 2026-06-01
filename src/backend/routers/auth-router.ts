import express from "express";
import { Unit } from "../utils/unit";
import { PlayerService } from "../services/player-service";
import type { PlayerRow } from "../../shared/model";
import { SessionService } from "../services/session-service";
import { PlayerStatisticsService } from "../services/player-statistics-service";
import { LoginHistoryService } from "../services/login-history-service";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import { isNullOrWhiteSpace } from "../utils/util";
import { hashPassword, comparePassword, isHashed } from "../utils/password";
import { TwoFactorService } from "../services/two-factor-service";
import { NotificationService } from "../services/notification-service";
import { PunishmentService } from "../services/punishment-service";
import { registerRateLimiter, loginRateLimiter, authRateLimiter, resendVerificationRateLimiter, twoFactorRateLimiter, challengeRateLimiter } from "../middleware/rate-limiter";
import { turnstileMiddleware } from "../middleware/turnstile";
import { timingGuard } from "../middleware/timing-guard";
import { headerGuard } from "../middleware/header-guard";
import { handleBotDetection, fakeAuthResponse, checkHoneypot, logBot, tarPit, setBotHeaders, getClientIp } from "../utils/bot-trap";
import { sendVerificationEmail } from "../services/email-service";

/* ─── Proof-of-work challenge store (in-memory, 10-min expiry) ─── */
interface PowChallenge {
    challenge: string;
    difficulty: number;
    expiresAt: number;
    used: boolean;
    clientIp: string;
}
const powStore = new Map<string, PowChallenge>();
const POW_DIFFICULTY = parseInt(process.env.POW_DIFFICULTY ?? "6", 10);
const POW_TTL_MS = 10 * 60 * 1000;

function createPowChallenge(clientIp: string): PowChallenge {
    const challenge = crypto.randomBytes(32).toString("hex");
    return {
        challenge,
        difficulty: POW_DIFFICULTY,
        expiresAt: Date.now() + POW_TTL_MS,
        used: false,
        clientIp,
    };
}

function verifyPow(challenge: string, nonce: string, difficulty: number): boolean {
    const hash = crypto.createHash("sha256").update(challenge + nonce).digest("hex");
    const prefix = "0".repeat(difficulty);
    return hash.startsWith(prefix);
}

/* ─── Heuristic bot-pattern detection ─── */
export const authRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" ||
           pgErr.code === "23505";
}

/** Validates registration input. Returns error message or null if valid. */
function validateRegistrationInput(username: string, password: string, email: string): string | null {
    if (username.length < 3 || username.length > 32) {
        return "Username must be between 3 and 32 characters";
    }
    if (email.length > 255) {
        return "Email must not exceed 255 characters";
    }
    if (password.length < 8 || password.length > 128) {
        return "Password must be between 8 and 128 characters";
    }
    // Require at least one letter and one number
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return "Password must contain at least one letter and one number";
    }
    return null;
}

/** Known disposable / throwaway email domains. Registrations from these are rejected. */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    "mailinator.com",
    "mailinator.net",
    "mailinator.org",
    "guerrillamail.com",
    "guerrillamail.net",
    "guerrillamail.org",
    "sharklasers.com",
    "tempmail.com",
    "temp-mail.org",
    "tempmailaddress.com",
    "throwawaymail.com",
    "yopmail.com",
    "yopmail.fr",
    "yopmail.net",
    "cool.fr.nf",
    "jetable.fr.nf",
    "nospam.ze.tc",
    "nomail.xl.cx",
    "mega.zik.dj",
    "speed.1s.fr",
    "courriel.fr.nf",
    "moncourrier.fr.nf",
    "monemail.fr.nf",
    "monmail.fr.nf",
    "10minutemail.com",
    "10minutemail.net",
    "10minute-mail.com",
    "temp-mail.ru",
    "tempmail.ninja",
    "tmpmail.org",
    "burnermail.io",
    "dispomail.eu",
    "emailondeck.com",
    "fake-email.net",
    "getairmail.com",
    "getnada.com",
    "inboxbear.com",
    "mailcatch.com",
    "maildrop.cc",
    "mailnesia.com",
    "mailnull.com",
    "mailsac.com",
    "mintemail.com",
    "mytrashmail.com",
    "nwytg.net",
    "spam4.me",
    "spamgourmet.com",
    "tempinbox.com",
    "trashmail.com",
    "trashmail.net",
    "trashmail.org",
    "trash-mail.com",
    "wegwerfmail.de",
    "wegwerfmail.net",
    "wegwerfmail.org",
]);

function isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;
    return DISPOSABLE_EMAIL_DOMAINS.has(domain);
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
/**
 * @deprecated Use `/api/auth/legacy-login` instead. This endpoint will be
 * removed in Sprint 6. The legacy endpoint has full CORS support and no
 * Turnstile requirement for backward compatibility with the mobile prototype.
 *
 * INTERNAL NOTE: Rate limiting on this endpoint is currently disabled in
 * production (see rate-limiter.ts). Cloudflare handles rate limiting at the edge.
 */
authRouter.post("/auth/login", loginRateLimiter.middleware(), timingGuard, headerGuard, turnstileMiddleware, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    console.log(`[Auth] Login attempt — usernameOrEmail=${usernameOrEmail}`);

    // Bot detection: high-confidence bots get tar-pitted but still see normal 401
    const isBot = await handleBotDetection(req, res, res.locals.turnstileFailed as boolean);
    if (isBot) {
        console.warn(`[Auth] Login blocked — bot detected (turnstileFailed=${res.locals.turnstileFailed})`);
        try {
            const punishmentUnit = await Unit.create(false);
            const punishmentService = new PunishmentService(punishmentUnit);
            const reason = res.locals.turnstileFailed ? "turnstile_failed" : "honeypot_triggered";
            await punishmentService.recordViolation(getClientIp(req), null, reason);
            await punishmentUnit.complete(true);
        } catch {
            // Ignore punishment errors
        }
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username/email or password" });
        return;
    }

    if (isNullOrWhiteSpace(usernameOrEmail) || isNullOrWhiteSpace(password)) {
        console.warn("[Auth] Login rejected — missing credentials");
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Username/email and password are required" });
        return;
    }
    if (password.length > 128) {
        console.warn("[Auth] Login rejected — password too long");
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Password too long" });
        return;
    }

    // Phase 1: Find player with a read-only unit (no transaction overhead)
    const lookupUnit = await Unit.create(true);
    const playerService = new PlayerService(lookupUnit);
    let player: PlayerRow | null = null;

    try {
        player = await playerService.getPlayerByUsername(usernameOrEmail);
        if (player === null) {
            player = await playerService.getPlayerByEmail(usernameOrEmail);
        }
        await lookupUnit.complete();
    } catch (err) {
        await lookupUnit.complete(false);
        console.error("[Auth] Login DB error during player lookup:", (err as Error).message);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        return;
    }

    if (player === null) {
        console.warn(`[Auth] Login failed — no player found for ${usernameOrEmail}`);
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username/email or password" });
        return;
    }
    console.log(`[Auth] Player found — playerId=${player.playerId}, provider=${player.provider || "local"}, emailVerified=${player.emailVerified}`);

    // Phase 2: Verify password WITHOUT holding a DB connection
    let passwordValid = false;
    if (player.password === null) {
        console.log("[Auth] Player has no password (OAuth account)");
        passwordValid = false;
    } else if (isHashed(player.password)) {
        passwordValid = await comparePassword(password, player.password);
        console.log(`[Auth] Password comparison result: ${passwordValid}`);
    } else {
        console.warn("[Auth] Player has plaintext password — forcing invalid");
        passwordValid = false;
    }

    if (!passwordValid) {
        console.warn(`[Auth] Login failed — invalid password for playerId=${player.playerId}`);
        try {
            const punishmentUnit = await Unit.create(false);
            const punishmentService = new PunishmentService(punishmentUnit);
            await punishmentService.recordViolation(getClientIp(req), player?.playerId ?? null, "brute_force_login", `Failed login for ${usernameOrEmail}`);
            await punishmentUnit.complete(true);
        } catch {
            // Ignore punishment errors
        }
        res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username/email or password" });
        return;
    }

    // Phase 3: Create session with a fresh write unit
    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const loginHistoryService = new LoginHistoryService(unit);
    const twoFactorService = new TwoFactorService(unit);
    let ok = false;

    try {
        // Reject banned players
        if (player.bannedAt) {
            console.warn(`[Auth] Login rejected — playerId=${player.playerId} is banned`);
            res.status(StatusCodes.FORBIDDEN).json({ error: "Account banned", reason: player.banReason || "No reason provided" });
            await unit.complete(false);
            return;
        }

        // SECURITY: Admin accounts MUST have a verified email — no soft-gate exception.
        // This prevents compromised admin passwords from being usable while email is unverified.
        if (player.isAdmin && !player.emailVerified && !player.provider) {
            console.warn(`[Auth] Login rejected — admin playerId=${player.playerId} email not verified`);
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid username/email or password" });
            await unit.complete(false);
            return;
        }

        // Check if 2FA is enabled
        const totpEnabled = await twoFactorService.isEnabled(player.playerId);
        console.log(`[Auth] 2FA check — playerId=${player.playerId}, totpEnabled=${totpEnabled}`);

        if (totpEnabled) {
            const challengeId = await twoFactorService.createChallenge(player.playerId);
            ok = true;
            res.status(StatusCodes.OK).json({ requires2FA: true, challengeId });
            await unit.complete(true);
            return;
        }

        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const success = await sessionService.createSession(sessionId, player.playerId, expiresAt);
        if (success) {
            await loginHistoryService.create(player.playerId, sessionId);
            ok = true;
            const requiresEmailVerification = !player.emailVerified && !player.provider;
            if (requiresEmailVerification) {
                console.log(`[Auth] Login success (unverified) — playerId=${player.playerId}, sessionId=${sessionId.slice(0, 8)}...`);
            } else {
                console.log(`[Auth] Login success — playerId=${player.playerId}, sessionId=${sessionId.slice(0, 8)}...`);
            }
            res.status(StatusCodes.OK).json({ sessionId, playerId: player.playerId, requiresEmailVerification });
        } else {
            console.error("[Auth] createSession returned false");
            throw new Error("Failed to create session");
        }
    } catch (err) {
        await unit.complete(false);
        console.error("[Auth] Login error during session creation:", (err as Error).message);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        return;
    } finally {
        if (ok) await unit.complete(true);
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
authRouter.patch("/auth/me", authRateLimiter.middleware(), async (req, res) => {
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

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        // Check if email already exists for another user
        const existingByEmail = await playerService.getPlayerByEmail(email);
        if (existingByEmail && existingByEmail.playerId !== session.playerId) {
            res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
            await unit.complete(false);
            return;
        }

        // Update email
        const success = await playerService.updatePlayerEmail(session.playerId, email);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Profile updated successfully" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        if (isConstraintError(err)) {
            const pgErr = err as { detail?: string };
            const detail = pgErr.detail || "";
            let message = "This account information conflicts with an existing account.";
            if (detail.includes("email")) {
                message = "This email is already associated with another account.";
            } else if (detail.includes("username") || detail.includes("playerName")) {
                message = "This username is already taken.";
            }
            res.status(StatusCodes.CONFLICT).json({ error: message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        await unit.complete(ok);
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
authRouter.patch("/auth/password", authRateLimiter.middleware(), async (req, res) => {
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

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            await unit.complete(false);
            return;
        }

        // Verify current password
        if (!player.password || !(await comparePassword(currentPassword, player.password))) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Current password is incorrect" });
            await unit.complete(false);
            return;
        }

        // Hash and update password
        const hashedPassword = await hashPassword(newPassword);
        const success = await playerService.updatePlayerPassword(session.playerId, hashedPassword);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Password changed successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update password" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
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
authRouter.delete("/auth/me", authRateLimiter.middleware(), async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        // Delete player (cascade will handle related data)
        const success = await playerService.deletePlayer(session.playerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Account deleted successfully" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
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
/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: List active sessions
 *     description: Returns all active sessions for the current player
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
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sessionId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   expiresAt:
 *                     type: string
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
authRouter.get("/auth/sessions", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const sessions = await sessionService.getSessionsByPlayer(session.playerId);
        // Sanitize: omit playerId from response
        const sanitized = sessions.map(s => ({
            sessionId: s.sessionId,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt
        }));
        res.status(StatusCodes.OK).json(sanitized);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /auth/sessions:
 *   delete:
 *     summary: Log out all devices
 *     description: Invalidates all sessions except the current one
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
 *         description: Sessions invalidated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 closed:
 *                   type: integer
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
authRouter.delete("/auth/sessions", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const closed = await sessionService.invalidateAllExcept(session.playerId, sessionId);
        ok = true;
        res.status(StatusCodes.OK).json({ message: "All other devices logged out", closed });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * GET /auth/challenge — Returns a proof-of-work challenge for registration.
 * The client must find a nonce such that SHA256(challenge + nonce) starts
 * with `difficulty` hex zeros.
 */
authRouter.get("/auth/challenge", challengeRateLimiter.middleware(), (req, res) => {
    const ch = createPowChallenge(getClientIp(req));
    powStore.set(ch.challenge, ch);
    // Prune expired challenges periodically (simple sweep)
    if (powStore.size > 5000) {
        const now = Date.now();
        for (const [key, val] of powStore) {
            if (val.expiresAt < now) powStore.delete(key);
        }
    }
    res.json({ challenge: ch.challenge, difficulty: ch.difficulty });
});

/**
 * @deprecated The registration flow is being replaced by OAuth-only signup.
 * This endpoint still works for testing but will be removed. The honeypot
 * validation on the backend was removed in commit f892de9 — the frontend
 * field is purely cosmetic now.
 */
authRouter.post("/auth/register", registerRateLimiter.middleware(), timingGuard, headerGuard, turnstileMiddleware, async (req, res) => {
    const { username, password, email } = req.body;

    // Bot detection — HARD BLOCK on Turnstile failure (no fake success)
    const turnstileFailed = res.locals.turnstileFailed as boolean;
    const honeypotTriggered = checkHoneypot(req);

    if (turnstileFailed) {
        logBot(req, "register-blocked: invalid-turnstile-token");
        try {
            const punishmentUnit = await Unit.create(false);
            const punishmentService = new PunishmentService(punishmentUnit);
            await punishmentService.recordViolation(getClientIp(req), null, "turnstile_failed", "Registration blocked: invalid Turnstile");
            await punishmentUnit.complete(true);
        } catch { /* ignore */ }
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Security verification failed. Please refresh the page and try again." });
        return;
    }

    if (honeypotTriggered) {
        logBot(req, "register-blocked: honeypot");
        try {
            const punishmentUnit = await Unit.create(false);
            const punishmentService = new PunishmentService(punishmentUnit);
            await punishmentService.recordViolation(getClientIp(req), null, "honeypot_triggered", "Registration blocked: honeypot filled");
            await punishmentUnit.complete(true);
        } catch { /* ignore */ }
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Registration failed. Please try again." });
        return;
    }

    // Proof-of-work verification
    const { powChallenge, powNonce } = req.body as Record<string, unknown>;
    if (!powChallenge || !powNonce || typeof powChallenge !== "string" || typeof powNonce !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing proof-of-work challenge. Please refresh the page and try again." });
        return;
    }
    const stored = powStore.get(powChallenge);
    if (!stored || stored.used || stored.expiresAt < Date.now()) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid or expired challenge. Please refresh the page and try again." });
        return;
    }
    if (stored.clientIp !== getClientIp(req)) {
        logBot(req, "register-blocked: pow-ip-mismatch");
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Security verification failed. Please refresh the page and try again." });
        return;
    }
    if (!verifyPow(powChallenge, powNonce, stored.difficulty)) {
        logBot(req, "register-blocked: invalid-pow");
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Security verification failed. Please refresh the page and try again." });
        return;
    }
    stored.used = true;
    powStore.delete(powChallenge);

    // Phase 1: Validate everything before touching the DB or hashing
    if (isNullOrWhiteSpace(username) || isNullOrWhiteSpace(password) || isNullOrWhiteSpace(email)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Username, password, and email are required" });
        return;
    }

    const validationError = validateRegistrationInput(username, password, email);
    if (validationError) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: validationError });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid email format" });
        return;
    }

    // Block disposable / throwaway email domains
    if (isDisposableEmail(email)) {
        logBot(req, "register-blocked: disposable-email");
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Please use a permanent email address." });
        return;
    }

    // Phase 2: Hash password BEFORE acquiring a DB connection.
    // bcrypt is CPU-bound and can take 50-100ms. Holding a DB connection
    // during hashing is the #1 cause of pool exhaustion under registration floods.
    const hashedPassword = await hashPassword(password);

    // Phase 3: Atomically create the player and all related records
    const unit = await Unit.create(false);
    const playerService = new PlayerService(unit);
    const playerStatisticsService = new PlayerStatisticsService(unit);
    let ok = false;

    try {
        // Check if email already exists
        const existingByEmail = await playerService.getPlayerByEmail(email);
        if (existingByEmail) {
            if (existingByEmail.emailVerified) {
                res.status(StatusCodes.CONFLICT).json({ error: "An account with this email already exists. Please log in instead." });
                await unit.complete(false);
                return;
            }
            // Email exists but is unverified — delete old account to allow re-registration
            await playerService.deletePlayer(existingByEmail.playerId);
        }

        // Check if username already exists
        const existingByUsername = await playerService.getPlayerByUsername(username);
        if (existingByUsername) {
            if (existingByUsername.emailVerified) {
                res.status(StatusCodes.CONFLICT).json({ error: "Username already taken. Please choose another." });
                await unit.complete(false);
                return;
            }
            // Username exists but is unverified — delete old account
            await playerService.deletePlayer(existingByUsername.playerId);
        }

        const [success, playerId] = await playerService.createPlayer(username, hashedPassword, email, 1000, 10);

        if (!success) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create player" });
            await unit.complete(false);
            return;
        }

        const [statsSuccess] = await playerStatisticsService.createDefaultPlayerStatistics(playerId);
        if (!statsSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create player statistics" });
            await unit.complete(false);
            return;
        }

        try {
            const notificationService = new NotificationService(unit);
            await notificationService.create(
                playerId,
                "system",
                "Welcome to Ember Exchange!",
                "Your adventure begins now. Verify your email to start trading!",
                {}
            );
        } catch {
            // Ignore notification errors
        }

        // Create email verification token (24h expiry)
        const verifyToken = crypto.randomBytes(32).toString("hex");
        const now = new Date();
        const verifyExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await unit.prepare(
            `INSERT INTO EmailVerificationToken (token, playerId, email, createdAt, expiresAt)
             VALUES (@token, @playerId, @email, @createdAt, @expiresAt)`,
            {
                token: verifyToken,
                playerId,
                email,
                createdAt: now.toISOString(),
                expiresAt: verifyExpiresAt.toISOString(),
            }
        ).run();

        ok = true;
        await unit.complete(true);

        // Send verification email OUTSIDE the DB transaction so email failure
        // doesn't roll back the account creation
        try {
            await sendVerificationEmail(email, verifyToken);
        } catch (err) {
            console.error("Failed to send verification email:", err);
            // Still return success — user can request a resend
        }

        res.status(StatusCodes.CREATED).json({
            message: "Account created! Check your email to verify your account."
        });
        return;
    } catch (err) {
        if (isConstraintError(err)) {
            const pgErr = err as { detail?: string };
            const detail = pgErr.detail || "";
            let message = "This account information is already in use.";
            if (detail.includes("email")) {
                message = "An account with this email already exists. Please log in instead.";
            } else if (detail.includes("username") || detail.includes("playerName")) {
                message = "This username is already taken. Please choose another.";
            }
            res.status(StatusCodes.CONFLICT).json({ error: message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        await unit.complete(ok);
    }
});

/**
 * GET /auth/verify-email/:token
 * Verifies an email address using a token from the verification email.
 */
authRouter.get("/auth/verify-email/:token", async (req, res) => {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid verification token" });
        return;
    }

    const unit = await Unit.create(false);
    const playerService = new PlayerService(unit);
    const sessionService = new SessionService(unit);
    let ok = false;

    try {
        // Look up the token
        const tokenStmt = unit.prepare<{
            playerId: number;
            email: string;
            expiresAt: string;
        }>(
            `SELECT playerId, email, expiresAt FROM EmailVerificationToken WHERE token = @token`,
            { token }
        );
        const row = await tokenStmt.get();

        if (!row) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid or expired verification token." });
            await unit.complete(false);
            return;
        }

        if (new Date(row.expiresAt) < new Date()) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Verification link has expired. Please request a new one." });
            await unit.complete(false);
            return;
        }

        // Verify the player's email
        await unit.prepare(
            `UPDATE Player SET emailVerified = 1, verifiedAt = @verifiedAt WHERE playerId = @playerId`,
            { playerId: row.playerId, verifiedAt: new Date().toISOString() }
        ).run();

        // Delete the used token
        await unit.prepare(
            `DELETE FROM EmailVerificationToken WHERE token = @token`,
            { token }
        ).run();

        // Create a session and auto-login
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const sessionCreated = await sessionService.createSession(sessionId, row.playerId, expiresAt);
        if (!sessionCreated) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create session" });
            await unit.complete(false);
            return;
        }

        ok = true;
        res.status(StatusCodes.OK).json({
            sessionId,
            playerId: row.playerId,
            message: "Email verified! Welcome to Ember Exchange."
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * POST /auth/resend-verification
 * Resends the verification email. Rate-limited to prevent abuse.
 */
authRouter.post("/auth/resend-verification", resendVerificationRateLimiter.middleware(), async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Email is required" });
        return;
    }

    const unit = await Unit.create(false);
    let ok = false;

    try {
        // Find unverified player by email
        const playerStmt = unit.prepare<{
            playerId: number;
            email: string;
        }>(
            `SELECT playerId, email FROM Player WHERE email = @email AND emailVerified = 0 AND provider IS NULL`,
            { email: email.toLowerCase().trim() }
        );
        const player = await playerStmt.get();

        if (!player) {
            // Return generic success to prevent email enumeration
            res.status(StatusCodes.OK).json({ message: "If an unverified account exists, a verification email has been sent." });
            ok = true;
            await unit.complete(true);
            return;
        }

        // Delete any existing token for this player
        await unit.prepare(
            `DELETE FROM EmailVerificationToken WHERE playerId = @playerId`,
            { playerId: player.playerId }
        ).run();

        // Create new token
        const token = crypto.randomBytes(32).toString("hex");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await unit.prepare(
            `INSERT INTO EmailVerificationToken (token, playerId, email, createdAt, expiresAt)
             VALUES (@token, @playerId, @email, @createdAt, @expiresAt)`,
            {
                token,
                playerId: player.playerId,
                email: player.email,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
            }
        ).run();

        ok = true;
        await unit.complete(true);

        // Send email outside transaction
        try {
            await sendVerificationEmail(player.email, token);
        } catch (err) {
            console.error("Failed to resend verification email:", err);
        }

        res.status(StatusCodes.OK).json({ message: "If an unverified account exists, a verification email has been sent." });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
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
authRouter.get("/auth/me", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Session expired" });
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }

        // Return player without sensitive fields
        const { password, totpSecret, ...playerSafe } = player;
        res.status(StatusCodes.OK).json(playerSafe);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
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
authRouter.post("/auth/logout", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or inactive session" });
            await unit.complete(false);
            return;
        }

        const success = await sessionService.invalidateSession(sessionId);
        if (success) {
            await unit.complete(true);
            res.status(StatusCodes.OK).json({ message: "Logout successful" });
        } else {
            throw new Error("Failed to invalidate session");
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

// ─── 2FA Endpoints ───

/**
 * @openapi
 * /auth/2fa/status:
 *   get:
 *     summary: Get 2FA status
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
 *         description: 2FA status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 hasBackupCodes:
 *                   type: boolean
 */
authRouter.get("/auth/2fa/status", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const twoFactorService = new TwoFactorService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const enabled = await twoFactorService.isEnabled(session.playerId);
        res.status(StatusCodes.OK).json({ enabled });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Begin 2FA setup
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
 *         description: QR code and secret
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                 qrCodeDataUrl:
 *                   type: string
 */
authRouter.post("/auth/2fa/setup", authRateLimiter.middleware(), async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    const twoFactorService = new TwoFactorService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            await unit.complete(false);
            return;
        }

        if (!player.password) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "OAuth users must set a password before enabling 2FA" });
            await unit.complete(false);
            return;
        }

        const result = await twoFactorService.generateSecret(session.playerId, player.username, player.email);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ secret: result.secret, qrCodeDataUrl: result.qrCodeDataUrl });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /auth/2fa/confirm:
 *   post:
 *     summary: Confirm 2FA setup
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
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA enabled with backup codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 backupCodes:
 *                   type: array
 *                   items:
 *                     type: string
 */
authRouter.post("/auth/2fa/confirm", authRateLimiter.middleware(), async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { token } = req.body;
    if (isNullOrWhiteSpace(token)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Token is required" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const twoFactorService = new TwoFactorService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const result = await twoFactorService.confirmSetup(session.playerId, token);
        if (!result.success) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.message });
            await unit.complete(false);
            return;
        }

        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: result.message });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA code during login
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *               - token
 *             properties:
 *               challengeId:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid challenge or code
 */
authRouter.post("/auth/2fa/verify", twoFactorRateLimiter.middleware(), async (req, res) => {
    const { challengeId, token } = req.body;
    if (isNullOrWhiteSpace(challengeId) || isNullOrWhiteSpace(token)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Challenge ID and token are required" });
        return;
    }

    const unit = await Unit.create(false);
    const twoFactorService = new TwoFactorService(unit);
    const sessionService = new SessionService(unit);
    const loginHistoryService = new LoginHistoryService(unit);

    try {
        const playerId = await twoFactorService.validateChallenge(challengeId);
        if (!playerId) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired challenge" });
            await unit.complete(false);
            return;
        }

        const result = await twoFactorService.verifyToken(playerId, token);
        if (!result.success) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), playerId, "2fa_brute_force", `Invalid 2FA code for challenge ${challengeId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.UNAUTHORIZED).json({ error: result.message });
            await unit.complete(false);
            return;
        }

        // Reject banned players even after 2FA
        const playerService = new PlayerService(unit);
        const player = await playerService.getInfoByID(playerId);
        if (player && player.bannedAt) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Account banned", reason: player.banReason || "No reason provided" });
            await unit.complete(false);
            return;
        }

        await twoFactorService.consumeChallenge(challengeId);

        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const success = await sessionService.createSession(sessionId, playerId, expiresAt);
        if (success) {
            await loginHistoryService.create(playerId, sessionId);
            await unit.complete(true);
            res.status(StatusCodes.OK).json({ sessionId, playerId });
        } else {
            throw new Error("Failed to create session");
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /auth/2fa:
 *   delete:
 *     summary: Disable 2FA
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
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA disabled
 */
authRouter.delete("/auth/2fa", authRateLimiter.middleware(), async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { password } = req.body;
    if (isNullOrWhiteSpace(password)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Password is required" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    const twoFactorService = new TwoFactorService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const player = await playerService.getInfoByID(session.playerId);
        if (!player || !player.password) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid credentials" });
            await unit.complete(false);
            return;
        }

        const passwordValid = await comparePassword(password, player.password);
        if (!passwordValid) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Incorrect password" });
            await unit.complete(false);
            return;
        }

        await twoFactorService.disable(session.playerId);
        ok = true;
        res.status(StatusCodes.OK).json({ message: "Two-factor authentication disabled" });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
