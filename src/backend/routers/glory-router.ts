import express from "express";
import { StatusCodes } from "http-status-codes";
import { Unit } from "../utils/unit";
import { GloryCustomizationService } from "../services/glory-customization-service";
import { PlayerPrestigeService } from "../services/player-prestige-service";
import { PlayerAchievementService } from "../services/player-achievement-service";
import { isNullOrWhiteSpace } from "../utils/util";

export const gloryRouter = express.Router();

/**
 * @openapi
 * /glory/customization/{playerId}:
 *   get:
 *     summary: Get full glory customization
 *     description: Retrieves all customization data for a player's Hall of Glory
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customization data
 *       404:
 *         description: Player not found
 *       500:
 *         description: Server error
 */
gloryRouter.get("/glory/customization/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    const id = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const customization = await service.getFullCustomization(Number(id));
        res.status(StatusCodes.OK).json(customization);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/showcase:
 *   post:
 *     summary: Update showcase slot
 *     description: Sets a stove in a showcase slot
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, slotIndex, stoveId]
 *             properties:
 *               playerId: { type: integer }
 *               slotIndex: { type: integer }
 *               stoveId: { type: integer }
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
gloryRouter.post("/glory/showcase", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, slotIndex, stoveId } = req.body;

    try {
        if (typeof playerId !== "number" || typeof slotIndex !== "number" || typeof stoveId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid parameters" });
            return;
        }
        if (slotIndex < 0 || slotIndex > 5) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Slot index must be 0-5" });
            return;
        }

        await service.setShowcaseSlot(playerId, slotIndex, stoveId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Showcase updated" });
    } catch (err) {
        await unit.complete(false);
        const message = String(err);
        if (message.includes("already in the showcase")) {
            res.status(StatusCodes.CONFLICT).json({ error: message });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
        }
    }
});

/**
 * @openapi
 * /glory/showcase/{playerId}/{slotIndex}:
 *   delete:
 *     summary: Remove a stove from showcase
 *     description: Clears a showcase slot for a player
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: slotIndex
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Showcase slot cleared }
 *       500: { description: Server error }
 */
gloryRouter.delete("/glory/showcase/:playerId/:slotIndex", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const playerId = Number(req.params.playerId);
    const slotIndex = Number(req.params.slotIndex);

    try {
        await service.removeShowcaseSlot(playerId, slotIndex);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Showcase slot cleared" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/achievements:
 *   post:
 *     summary: Pin an achievement
 *     description: Pins an achievement to the profile
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, achievementId, slotIndex]
 *             properties:
 *               playerId: { type: integer }
 *               achievementId: { type: string }
 *               slotIndex: { type: integer }
 */
gloryRouter.post("/glory/achievements", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, achievementId, slotIndex } = req.body;

    try {
        await service.setFeaturedAchievement(playerId, achievementId, slotIndex);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Achievement pinned" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/achievements/{playerId}/{achievementId}:
 *   delete:
 *     summary: Unpin an achievement
 *     description: Removes an achievement from the featured section
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *       - name: achievementId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Achievement unpinned }
 *       500: { description: Server error }
 */
gloryRouter.delete("/glory/achievements/:playerId/:achievementId", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, achievementId } = req.params;

    try {
        await service.removeFeaturedAchievement(Number(playerId), achievementId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Achievement unpinned" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/themes/{playerId}:
 *   get:
 *     summary: Get player themes
 *     description: Returns all unlocked themes for a player with active status
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of player themes }
 *       500: { description: Server error }
 */
// Themes
gloryRouter.get("/glory/themes/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const themes = await service.getPlayerThemes(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(themes);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/theme:
 *   post:
 *     summary: Activate a theme
 *     description: Sets a theme as active for a player
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, themeId]
 *             properties:
 *               playerId: { type: integer }
 *               themeId: { type: integer }
 *     responses:
 *       200: { description: Theme activated }
 *       500: { description: Server error }
 */
gloryRouter.post("/glory/theme", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, themeId } = req.body;

    try {
        await service.activateTheme(playerId, themeId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Theme activated" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/titles/{playerId}:
 *   get:
 *     summary: Get player titles
 *     description: Returns all unlocked titles for a player with active status
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of player titles }
 *       500: { description: Server error }
 */
// Titles
gloryRouter.get("/glory/titles/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const titles = await service.getPlayerTitles(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(titles);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/title:
 *   post:
 *     summary: Activate a title
 *     description: Sets a title as active for a player
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, titleId]
 *             properties:
 *               playerId: { type: integer }
 *               titleId: { type: string }
 *     responses:
 *       200: { description: Title activated }
 *       500: { description: Server error }
 */
gloryRouter.post("/glory/title", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, titleId } = req.body;

    try {
        await service.activateTitle(playerId, titleId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Title activated" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/banners/{playerId}:
 *   get:
 *     summary: Get player banners
 *     description: Returns all unlocked banners for a player with active status
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of player banners }
 *       500: { description: Server error }
 */
// Banners
gloryRouter.get("/glory/banners/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const banners = await service.getPlayerBanners(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(banners);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/banner:
 *   post:
 *     summary: Activate a banner
 *     description: Sets a banner as active for a player
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, bannerId]
 *             properties:
 *               playerId: { type: integer }
 *               bannerId: { type: integer }
 *     responses:
 *       200: { description: Banner activated }
 *       500: { description: Server error }
 */
gloryRouter.post("/glory/banner", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, bannerId } = req.body;

    try {
        await service.activateBanner(playerId, bannerId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Banner activated" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/visits/{playerId}:
 *   get:
 *     summary: Get visit stats
 *     description: Returns visit count and recent visitors for a player's profile
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Visit count and recent visitors }
 *       500: { description: Server error }
 */
/**
 * @openapi
 * /glory/visit:
 *   post:
 *     summary: Record a profile visit
 *     description: Records that a player visited another player's Hall of Glory profile
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitorId, profileId]
 *             properties:
 *               visitorId: { type: integer }
 *               profileId: { type: integer }
 *     responses:
 *       200: { description: Visit recorded }
 *       500: { description: Server error }
 */
gloryRouter.post("/glory/visit", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { visitorId, profileId } = req.body;

    try {
        if (typeof visitorId !== "number" || typeof profileId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid parameters" });
            return;
        }
        if (visitorId === profileId) {
            res.status(StatusCodes.OK).json({ message: "Self-visits are not recorded" });
            return;
        }
        await service.recordVisit(profileId, visitorId);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Visit recorded" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

// Visits
gloryRouter.get("/glory/visits/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const count = await service.getVisitCount(Number(req.params.playerId));
        const visitors = await service.getRecentVisitors(Number(req.params.playerId), 5);
        res.status(StatusCodes.OK).json({ count, visitors });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/guestbook/{playerId}:
 *   get:
 *     summary: Get guestbook entries
 *     description: Returns guestbook messages for a player's profile
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of guestbook entries }
 *       500: { description: Server error }
 */
// Guestbook
gloryRouter.get("/glory/guestbook/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const entries = await service.getGuestbook(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(entries);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /glory/guestbook:
 *   post:
 *     summary: Add guestbook entry
 *     description: Posts a message to a player's guestbook
 *     tags:
 *       - Glory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, authorId, message]
 *             properties:
 *               playerId: { type: integer }
 *               authorId: { type: integer }
 *               message: { type: string, maxLength: 200 }
 *     responses:
 *       200: { description: Entry added }
 *       400: { description: Invalid message length }
 *       500: { description: Server error }
 */
gloryRouter.post("/glory/guestbook", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { playerId, authorId, message } = req.body;

    try {
        if (!message || message.length > 200) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Message must be 1-200 characters" });
            return;
        }
        await service.addGuestbookEntry(playerId, authorId, message);
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Guestbook entry added" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/guestbook/{entryId}:
 *   delete:
 *     summary: Delete guestbook entry
 *     description: Removes a guestbook entry (profile owner or author only)
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: entryId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestingPlayerId]
 *             properties:
 *               requestingPlayerId: { type: integer }
 *     responses:
 *       200: { description: Entry deleted }
 *       403: { description: Not authorized }
 *       500: { description: Server error }
 */
gloryRouter.delete("/glory/guestbook/:entryId", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new GloryCustomizationService(unit);
    const { requestingPlayerId } = req.body;

    try {
        const success = await service.deleteGuestbookEntry(Number(req.params.entryId), requestingPlayerId);
        if (!success) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Not authorized to delete this entry" });
            return;
        }
        await unit.complete(true);
        res.status(StatusCodes.OK).json({ message: "Entry deleted" });
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/trophies/{playerId}:
 *   get:
 *     summary: Get player trophies
 *     description: Returns all trophies awarded to a player
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of player trophies }
 *       500: { description: Server error }
 */
// Trophies
gloryRouter.get("/glory/trophies/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new GloryCustomizationService(unit);
    try {
        const trophies = await service.getPlayerTrophies(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(trophies);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/prestige:
 *   get:
 *     summary: Get player prestige
 *     description: Returns prestige level, XP, and next level threshold
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Prestige data }
 *       404: { description: Prestige data not found }
 *       500: { description: Server error }
 */
// Prestige
gloryRouter.get("/players/:playerId/prestige", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerPrestigeService(unit);
    try {
        const prestige = await service.getPrestige(Number(req.params.playerId));
        if (!prestige) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Prestige data not found" });
            return;
        }
        const nextLevelXP = PlayerPrestigeService.xpForLevel(prestige.currentLevel + 1);
        res.status(StatusCodes.OK).json({ ...prestige, nextLevelXP });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/prestige:
 *   post:
 *     summary: Prestige a player
 *     description: Performs prestige if player meets requirements
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Prestige successful }
 *       400: { description: Not eligible for prestige }
 *       500: { description: Server error }
 */
gloryRouter.post("/players/:playerId/prestige", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerPrestigeService(unit);
    try {
        const can = await service.canPrestige(Number(req.params.playerId));
        if (!can) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Not eligible for prestige" });
            return;
        }
        const result = await service.doPrestige(Number(req.params.playerId));
        await unit.complete(true);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /glory/achievements/{playerId}:
 *   get:
 *     summary: Get player achievements
 *     description: Returns all achievements for a player
 *     tags:
 *       - Glory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of achievements }
 *       500: { description: Server error }
 */
// Player Achievements
gloryRouter.get("/glory/achievements/:playerId", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerAchievementService(unit);
    try {
        const achievements = await service.getByPlayerId(Number(req.params.playerId));
        res.status(StatusCodes.OK).json(achievements);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
