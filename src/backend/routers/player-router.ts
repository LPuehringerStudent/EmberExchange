import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/admin";
import { PlayerService } from "../services/player-service";
import { SessionService } from "../services/session-service";
import { PlayerSettingsService } from "../services/player-settings-service";
import { StoveService } from "../services/stove-service";
import { PlayerStatisticsService } from "../services/player-statistics-service";
import { GloryCustomizationService } from "../services/glory-customization-service";
import { PlayerPrestigeService } from "../services/player-prestige-service";
import { PlayerAchievementService } from "../services/player-achievement-service";
import { PunishmentService } from "../services/punishment-service";
import { ACHIEVEMENT_DEFINITIONS } from "../services/achievement-engine";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { sanitizeText } from "../utils/sanitize";
import crypto from "crypto";
import { sendVerificationEmail } from "../services/email-service";

export const playerRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

function getClientIp(req: express.Request): string {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.length > 0) return cfIp.trim();
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        const hops = forwarded.split(",").map(s => s.trim()).filter(Boolean);
        if (hops.length > 0) return hops[hops.length - 1];
    }
    return req.socket.remoteAddress ?? "unknown";
}

/**
 * @openapi
 * /players:
 *   get:
 *     summary: Get all players
 *     description: Retrieves a list of all players in the system
 *     tags:
 *       - Players
 *     responses:
 *       200:
 *         description: List of all players
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Player'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
playerRouter.get("/players", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerService(unit);

    try {
        const response = await service.getAllPublicPlayers();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{id}:
 *   get:
 *     summary: Get player by ID
 *     description: Retrieves a single player by their unique ID
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Player'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
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
 * /players/{id}/profile:
 *   patch:
 *     summary: Update player profile
 *     description: Updates username, email, and motto for the current player
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               motto:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
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
 *         description: Unauthorized
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
playerRouter.patch("/players/:id/profile", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const id = req.params.id;
    if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
        return;
    }

    const playerId = Number(id);
    const { username, email, motto, isPublic } = req.body;
    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const playerService = new PlayerService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session || session.playerId !== playerId) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
            await unit.complete(false);
            return;
        }

        if (await checkPlayerBanned(unit, playerId, res)) {
            await unit.complete(false);
            return;
        }

        if (username !== undefined) {
            const existing = await playerService.getPlayerByUsername(username);
            if (existing && existing.playerId !== playerId) {
                res.status(StatusCodes.CONFLICT).json({ error: "Username already exists" });
                await unit.complete(false);
                return;
            }
            const success = await playerService.updatePlayerUsername(playerId, username);
            if (!success) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update username" });
                await unit.complete(false);
                return;
            }
        }

        if (email !== undefined) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid email format" });
                await unit.complete(false);
                return;
            }
            const existing = await playerService.getPlayerByEmail(email);
            if (existing && existing.playerId !== playerId) {
                res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
                await unit.complete(false);
                return;
            }

            const player = await playerService.getInfoByID(playerId);
            const isLocalAccount = !player?.provider;
            let success: boolean;
            if (isLocalAccount) {
                success = await playerService.updatePlayerEmailAndResetVerification(playerId, email);
            } else {
                success = await playerService.updatePlayerEmail(playerId, email);
            }
            if (!success) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update email" });
                await unit.complete(false);
                return;
            }

            // For local accounts, send a new verification email
            if (isLocalAccount) {
                try {
                    await unit.prepare(
                        `DELETE FROM EmailVerificationToken WHERE playerId = @playerId`,
                        { playerId }
                    ).run();
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
                    await unit.complete(true);
                    try {
                        await sendVerificationEmail(email, verifyToken);
                    } catch (err) {
                        console.error("Failed to send verification email after email change:", err);
                    }
                    res.status(StatusCodes.OK).json({ message: "Profile updated. Please verify your new email address — a verification link has been sent." });
                    return;
                } catch {
                    // Fall through to normal response if token creation fails
                }
            }
        }

        if (motto !== undefined) {
            const safeMotto = sanitizeText(motto, 100);
            if (safeMotto === null) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "motto must be a non-empty string (max 100 characters)" });
                await unit.complete(false);
                return;
            }
            const success = await playerService.updatePlayerMotto(playerId, safeMotto);
            if (!success) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update motto" });
                await unit.complete(false);
                return;
            }
        }

        if (isPublic !== undefined) {
            const success = await playerService.updatePlayerIsPublic(playerId, Boolean(isPublic));
            if (!success) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update privacy setting" });
                await unit.complete(false);
                return;
            }
        }

        ok = true;
        res.status(StatusCodes.OK).json({ message: "Profile updated successfully" });
    } catch (err) {
        if (isConstraintError(err)) {
            res.status(StatusCodes.CONFLICT).json({ error: String(err) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{id}/settings:
 *   get:
 *     summary: Get player notification settings
 *     description: Returns notification preferences for the player
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayerSettings'
 *       401:
 *         description: Unauthorized
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
playerRouter.get("/players/:id/settings", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const id = req.params.id;
    if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
        return;
    }

    const playerId = Number(id);
    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const settingsService = new PlayerSettingsService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session || session.playerId !== playerId) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
            return;
        }

        const settings = await settingsService.ensureSettings(playerId);
        res.status(StatusCodes.OK).json(settings);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{id}/settings:
 *   patch:
 *     summary: Update player notification settings
 *     description: Updates notification preferences for the player
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
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
 *             $ref: '#/components/schemas/PlayerSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: Unauthorized
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
playerRouter.patch("/players/:id/settings", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const id = req.params.id;
    if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
        return;
    }

    const playerId = Number(id);
    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const settingsService = new PlayerSettingsService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session || session.playerId !== playerId) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
            await unit.complete(false);
            return;
        }

        if (await checkPlayerBanned(unit, playerId, res)) {
            await unit.complete(false);
            return;
        }

        const success = await settingsService.updateSettings(playerId, req.body);
        ok = true;
        if (success) {
            res.status(StatusCodes.OK).json({ message: "Settings updated successfully" });
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "No valid fields to update" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

playerRouter.get("/players/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({
                error: "ID must be a valid number"
            });
            return;
        }

        const response = await service.getPublicPlayerById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        } else {
            res.status(StatusCodes.OK).json(response);
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/lookup/{username}:
 *   get:
 *     summary: Look up player by username
 *     description: Retrieves a player's ID and username by their username
 *     tags:
 *       - Players
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         description: Player username
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 playerId:
 *                   type: integer
 *                 username:
 *                   type: string
 *       400:
 *         description: Invalid username
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
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
playerRouter.get("/players/lookup/:username", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerService(unit);
    const username = req.params.username;

    try {
        if (isNullOrWhiteSpace(username)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Username is required" });
            return;
        }

        const player = await service.getPlayerByUsername(username);
        if (player === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        } else {
            res.status(StatusCodes.OK).json({ playerId: player.playerId, username: player.username });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{id}/glory:
 *   get:
 *     summary: Get public Hall of Glory profile
 *     description: Retrieves a sanitized public player profile with statistics and top rarest stoves for the Hall of Glory
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Public player profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
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
async function buildGloryProfile(
    unit: Unit,
    playerService: PlayerService,
    playerId: number
): Promise<Record<string, unknown> | null> {
    const stoveService = new StoveService(unit);
    const statsService = new PlayerStatisticsService(unit);
    const gloryService = new GloryCustomizationService(unit);
    const prestigeService = new PlayerPrestigeService(unit);

    const player = await playerService.getInfoByID(playerId);
    if (!player || player.username === '__shop__') {
        return null;
    }

    const stats = await statsService.getByPlayerId(playerId);
    const customization = await gloryService.getFullCustomization(playerId);
    const prestige = await prestigeService.getPrestige(playerId);
    const featuredAchievements = await gloryService.getFeaturedAchievements(playerId);

    const achievementService = new PlayerAchievementService(unit);
    const achievements = await achievementService.getByPlayerId(playerId);

    let displayStoves: any[];
    if (customization.showcase.length > 0) {
        const showcaseStmt = unit.prepare<
            { stoveId: number; slotIndex: number; name: string; imageUrl: string; rarity: string; heatLevel: number }
        >(
            `SELECT gs.stoveId, gs.slotIndex, st.name, st.imageUrl, st.rarity, s.heatLevel
             FROM GloryShowcase gs
             JOIN Stove s ON gs.stoveId = s.stoveId
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE gs.playerId = @playerId
             ORDER BY gs.slotIndex`,
            { playerId }
        );
        displayStoves = await showcaseStmt.all();
    } else {
        displayStoves = await stoveService.getTopStovesByRarity(playerId, 6);
    }

    const activeTheme = customization.themes.find(t => t.isActive);
    const activeTitle = customization.titles.find(t => t.isActive);
    const activeBanner = customization.banners.find(b => b.isActive);

    return {
        playerId: player.playerId,
        username: player.username,
        motto: player.motto,
        coins: player.coins,
        joinedAt: player.joinedAt,
        isAdmin: false,  // Never expose admin status on public profiles
        provider: player.provider,
        stats,
        topStoves: displayStoves,
        prestige: prestige ?? { playerId: player.playerId, totalXP: 0, currentLevel: 1, prestigeCount: 0 },
        activeTheme: activeTheme ?? null,
        activeTitle: activeTitle ?? null,
        activeBanner: activeBanner ?? null,
        trophies: customization.trophies,
        visitCount: customization.visitCount,
        featuredAchievements,
        achievements,
        achievementDefinitions: ACHIEVEMENT_DEFINITIONS,
    };
}

playerRouter.get("/players/:id/glory", async (req, res) => {
    const unit = await Unit.create(true);
    const playerService = new PlayerService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const player = await playerService.getInfoByID(Number(id));
        if (!player || player.username === '__shop__') {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }
        if (!player.isPublic) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "This profile is private" });
            return;
        }

        const profile = await buildGloryProfile(unit, playerService, Number(id));
        if (!profile) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }

        // Lazy-check social achievements on profile view
        try {
            const { AchievementEngine } = await import("../services/achievement-engine");
            const engine = new AchievementEngine(unit);
            await engine.checkSocialAchievements(Number(id));
        } catch {
            // Ignore achievement check errors
        }

        res.status(StatusCodes.OK).json(profile);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/username/{username}/glory:
 *   get:
 *     summary: Get public Hall of Glory profile by username
 *     description: Retrieves a sanitized public player profile by username
 *     tags:
 *       - Players
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         description: Player username
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public player profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Player not found
 *       500:
 *         description: Server error
 */
playerRouter.get("/players/username/:username/glory", async (req, res) => {
    const unit = await Unit.create(true);
    const playerService = new PlayerService(unit);
    const username = req.params.username;

    try {
        if (isNullOrWhiteSpace(username)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Username is required" });
            return;
        }

        const player = await playerService.getPlayerByUsername(username);
        if (!player || player.username === '__shop__') {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }
        if (!player.isPublic) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "This profile is private" });
            return;
        }

        const profile = await buildGloryProfile(unit, playerService, player.playerId);
        if (!profile) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }

        // Lazy-check social achievements on profile view
        try {
            const { AchievementEngine } = await import("../services/achievement-engine");
            const engine = new AchievementEngine(unit);
            await engine.checkSocialAchievements(player.playerId);
        } catch {
            // Ignore achievement check errors
        }

        res.status(StatusCodes.OK).json(profile);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players:
 *   post:
 *     summary: Create a new player
 *     description: |
 *       **DEPRECATED — Use `/auth/register` instead.**
 *       This endpoint is disabled. All player creation must go through
 *       `/auth/register` which enforces rate limiting, Turnstile, honeypot,
 *       timing analysis, proof-of-work, and disposable-email blocking.
 *     tags:
 *       - Players
 *     responses:
 *       410:
 *         description: Player creation via this endpoint has been permanently disabled.
 */
playerRouter.post("/players", (_req, res) => {
    res.status(StatusCodes.GONE).json({
        error: "This endpoint is permanently disabled. Use /auth/register instead."
    });
});

/**
 * @openapi
 * /players/{id}/coins:
 *   patch:
 *     summary: Update player coins
 *     description: Updates the coin balance of a specific player
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coins
 *             properties:
 *               coins:
 *                 type: integer
 *                 description: New coin amount (must be non-negative)
 *                 example: 2000
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Coins updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Coins updated"
 *       400:
 *         description: Invalid ID or coins value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation (e.g., foreign key constraint)
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
playerRouter.patch("/players/:id/coins", requireAdmin, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const playerId = Number(id);

        if (await checkPlayerBanned(unit, playerId, res)) {
            return;
        }

        const { coins } = req.body;
        if (typeof coins !== "number" || coins < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Coins must be a non-negative number" });
            return;
        }

        const success = await service.updatePlayerCoins(playerId, coins);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Coins updated" });
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
 * /players/{id}/lootboxes:
 *   patch:
 *     summary: Update player lootbox count
 *     description: Updates the number of lootboxes a player owns
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lootboxCount
 *             properties:
 *               lootboxCount:
 *                 type: integer
 *                 description: New lootbox count (must be non-negative)
 *                 example: 15
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Lootbox count updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Lootbox count updated"
 *       400:
 *         description: Invalid ID or lootbox count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation (e.g., foreign key constraint)
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
playerRouter.patch("/players/:id/lootboxes", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const playerId = Number(id);
        if (req.playerId !== playerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "lootbox_tampering", `Attempted to modify lootboxes for player ${playerId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only update your own lootbox count" });
            await unit.complete(false);
            return;
        }
        if (await checkPlayerBanned(unit, playerId, res)) {
            return;
        }

        const { lootboxCount } = req.body;
        if (typeof lootboxCount !== "number" || lootboxCount < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "LootboxCount must be a non-negative number" });
            return;
        }

        const success = await service.updatePlayerLootboxCount(playerId, lootboxCount);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Lootbox count updated" });
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
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{id}:
 *   delete:
 *     summary: Delete a player
 *     description: Permanently removes a player from the system
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Player deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete player with existing references (stoves, listings, etc.)
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
playerRouter.delete("/players/:id", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const playerId = Number(id);
        if (req.playerId !== playerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "account_deletion_attempt", `Attempted to delete player ${playerId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only delete your own account" });
            await unit.complete(false);
            return;
        }
        if (await checkPlayerBanned(unit, playerId, res)) {
            return;
        }

        const success = await service.deletePlayer(playerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Player deleted" });
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
        await unit.complete(ok);
    }
});
