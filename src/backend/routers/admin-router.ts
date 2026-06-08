import express from "express";
import { Unit } from "../utils/unit";
import { AdminService } from "../services/admin-service";
import { RedeemCodeService } from "../services/redeem-code-service";
import { requireAdmin } from "../middleware/admin";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { getBotTrapLog, clearBotTrapLog } from "../utils/bot-trap";
import { PunishmentService } from "../services/punishment-service";
import { PlayerService } from "../services/player-service";
import { queryRequestLogs } from "../services/request-log-service";
import net from "net";

export const adminRouter = express.Router();

// Apply admin middleware to all routes
adminRouter.use(requireAdmin);

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Get system statistics
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     responses:
 *       200:
 *         description: System stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPlayers: { type: integer }
 *                 totalStoves: { type: integer }
 *                 totalTrades: { type: integer }
 *                 totalCoinsInCirculation: { type: integer }
 *                 totalLootboxesOpened: { type: integer }
 *                 recentSignups7d: { type: integer }
 *       403:
 *         description: Admin access required
 */
adminRouter.get("/admin/stats", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new AdminService(unit);
    try {
        const stats = await service.getSystemStats();
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
 * /admin/players:
 *   get:
 *     summary: List all players (paginated)
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated player list
 */
adminRouter.get("/admin/players", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new AdminService(unit);
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const search = req.query.search as string | undefined;
        const banned = req.query.banned as 'all' | 'banned' | 'active' | undefined;
        const minCoins = req.query.minCoins ? parseInt(req.query.minCoins as string, 10) : undefined;
        const maxCoins = req.query.maxCoins ? parseInt(req.query.maxCoins as string, 10) : undefined;
        const isAdmin = req.query.isAdmin as 'all' | 'admin' | 'user' | undefined;
        const sortBy = req.query.sortBy as string | undefined;

        const filters = {
            search,
            banned: banned && ['all', 'banned', 'active'].includes(banned) ? banned : 'all',
            minCoins: minCoins !== undefined && !isNaN(minCoins) ? minCoins : undefined,
            maxCoins: maxCoins !== undefined && !isNaN(maxCoins) ? maxCoins : undefined,
            isAdmin: isAdmin && ['all', 'admin', 'user'].includes(isAdmin) ? isAdmin : 'all',
            sortBy: sortBy && ['id_desc', 'id_asc', 'coins_desc', 'coins_asc', 'joined_desc', 'joined_asc'].includes(sortBy) ? sortBy : 'id_desc',
        };

        const result = await service.getPlayers(page, limit, filters);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /admin/players/:id:
 *   get:
 *     summary: Get detailed player info
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Player detail
 *       404:
 *         description: Player not found
 */
adminRouter.get("/admin/players/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new AdminService(unit);
    const id = req.params.id;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid player ID" });
            return;
        }
        const detail = await service.getPlayerDetail(Number(id));
        if (!detail) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
            return;
        }
        res.status(StatusCodes.OK).json(detail);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /admin/players/:id/coins:
 *   post:
 *     summary: Adjust player coins
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Coins adjusted
 *       404:
 *         description: Player not found
 */
adminRouter.post("/admin/players/:id/coins", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new AdminService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid player ID" });
            return;
        }
        const amount = req.body.amount;
        const reason = req.body.reason || "Admin adjustment";
        if (typeof amount !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "amount must be a number" });
            return;
        }
        const success = await service.adjustPlayerCoins(Number(id), amount, reason);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Coins adjusted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.get("/admin/request-logs", async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const playerId = req.query.playerId ? parseInt(req.query.playerId as string, 10) : undefined;
        const ipAddress = req.query.ip as string | undefined;
        const path = req.query.path as string | undefined;
        const since = req.query.since as string | undefined;
        const until = req.query.until as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;

        const logs = await queryRequestLogs(unit, {
            playerId: playerId && !isNaN(playerId) ? playerId : undefined,
            ipAddress: ipAddress || undefined,
            path: path || undefined,
            since: since || undefined,
            until: until || undefined,
            limit: limit && !isNaN(limit) ? limit : 500,
        });
        res.status(StatusCodes.OK).json(logs);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

// ─── Punishment / Security Admin Endpoints ───

adminRouter.get("/admin/banned-ips", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new PunishmentService(unit);
    try {
        const bans = await service.getBannedIPs();
        res.status(StatusCodes.OK).json(bans);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

adminRouter.get("/admin/violations", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PunishmentService(unit);
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const log = await service.getViolationLog(limit);
        res.status(StatusCodes.OK).json(log);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

adminRouter.post("/admin/banned-ips", async (req, res) => {
    const { ip, reason, durationHours } = req.body;
    if (!ip || typeof ip !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "IP is required" });
        return;
    }
    if (net.isIP(ip) === 0) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid IP address" });
        return;
    }
    if (!reason || typeof reason !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Reason is required" });
        return;
    }
    const unit = await Unit.create(false);
    const service = new PunishmentService(unit);
    let ok = false;
    try {
        const durationMs = typeof durationHours === "number" && durationHours > 0
            ? durationHours * 60 * 60 * 1000
            : undefined;
        await service.banIp(ip, reason, durationMs);
        ok = true;
        res.status(StatusCodes.OK).json({ message: `IP ${ip} banned` });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.post("/admin/banned-ips/unban", async (req, res) => {
    const { ip } = req.body;
    if (!ip || typeof ip !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "IP is required" });
        return;
    }
    const unit = await Unit.create(false);
    const service = new PunishmentService(unit);
    let ok = false;
    try {
        const success = await service.unbanIp(ip);
        ok = success;
        if (success) {
            res.status(StatusCodes.OK).json({ message: `IP ${ip} unbanned` });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "IP not found in ban list" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.post("/admin/players/:id/unban", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PunishmentService(unit);
    let ok = false;
    try {
        const playerId = Number(req.params.id);
        if (isNaN(playerId)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid player ID" });
            return;
        }
        const success = await service.unbanPlayer(playerId);
        ok = success;
        if (success) {
            res.status(StatusCodes.OK).json({ message: `Player ${playerId} unbanned` });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found or not banned" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /admin/bot-traps:
 *   get:
 *     summary: Get bot trap event log
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     responses:
 *       200:
 *         description: List of bot trap events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp: { type: string }
 *                   ip: { type: string }
 *                   endpoint: { type: string }
 *                   reason: { type: string }
 *                   userAgent: { type: string }
 *                   tarPitMs: { type: integer }
 *       403:
 *         description: Admin access required
 */
adminRouter.get("/admin/bot-traps", (_req, res) => {
    res.status(StatusCodes.OK).json(getBotTrapLog());
});

/**
 * @openapi
 * /admin/bot-traps:
 *   delete:
 *     summary: Clear bot trap event log
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     responses:
 *       200:
 *         description: Log cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403:
 *         description: Admin access required
 */
adminRouter.delete("/admin/bot-traps", (_req, res) => {
    clearBotTrapLog();
    res.status(StatusCodes.OK).json({ message: "Bot trap log cleared" });
});

/**
 * @openapi
 * /admin/players/:id/ban:
 *   post:
 *     summary: Ban or unban a player
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [banned]
 *             properties:
 *               banned: { type: boolean }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Ban status updated
 */
adminRouter.delete("/admin/players/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid player ID" });
            return;
        }
        const playerId = Number(id);

        // Prevent self-deletion
        if ((req as any).adminPlayerId === playerId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You cannot delete your own account" });
            return;
        }

        // Prevent deleting the shop account
        const player = await unit.prepare<{ username: string }>("SELECT username FROM Player WHERE playerId = @playerId", { playerId }).get();
        if (player && player.username === "__shop__") {
            res.status(StatusCodes.FORBIDDEN).json({ error: "The shop account cannot be deleted" });
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
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.post("/admin/players/:id/ban", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new AdminService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid player ID" });
            return;
        }
        const banned = req.body.banned;
        if (typeof banned !== "boolean") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "banned must be a boolean" });
            return;
        }
        const success = await service.setPlayerBan(Number(id), banned, req.body.reason);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: banned ? "Player banned" : "Player unbanned" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /admin/stove-types:
 *   get:
 *     summary: List all stove types
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     responses:
 *       200:
 *         description: Stove type list
 */
adminRouter.get("/admin/stove-types", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new AdminService(unit);
    try {
        const types = await service.getStoveTypes();
        res.status(StatusCodes.OK).json(types);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /admin/stove-types/:id:
 *   patch:
 *     summary: Update a stove type
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               imageUrl: { type: string }
 *               rarity: { type: string }
 *               lootboxWeight: { type: integer }
 *               collection: { type: string }
 *               minHeat: { type: number }
 *               maxHeat: { type: number }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
adminRouter.patch("/admin/stove-types/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new AdminService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid stove type ID" });
            return;
        }
        const success = await service.updateStoveType(Number(id), req.body);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Stove type updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove type not found" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /admin/stove-types:
 *   post:
 *     summary: Create a new stove type
 *     tags: [Admin]
 *     security:
 *       - SessionId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, rarity, lootboxWeight, collection]
 *             properties:
 *               name: { type: string }
 *               imageUrl: { type: string }
 *               rarity: { type: string }
 *               lootboxWeight: { type: integer }
 *               collection: { type: string }
 *               minHeat: { type: number }
 *               maxHeat: { type: number }
 *     responses:
 *       201:
 *         description: Created
 */
adminRouter.post("/admin/stove-types", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new AdminService(unit);
    let ok = false;
    try {
        const { name, rarity, lootboxWeight, collection } = req.body;
        if (isNullOrWhiteSpace(name) || isNullOrWhiteSpace(rarity) || isNullOrWhiteSpace(collection)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "name, rarity, and collection are required" });
            return;
        }
        if (typeof lootboxWeight !== "number" || lootboxWeight < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "lootboxWeight must be a non-negative number" });
            return;
        }
        const [success, id] = await service.createStoveType({
            name,
            imageUrl: req.body.imageUrl || "",
            rarity,
            lootboxWeight,
            collection,
            minHeat: req.body.minHeat ?? 0.0,
            maxHeat: req.body.maxHeat ?? 1.0,
        });
        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ typeId: id, name });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create stove type" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

// ─── Redeem Code Management ─────────────────────────────────

adminRouter.get("/admin/redeem-codes", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new RedeemCodeService(unit);
    try {
        const codes = await service.listCodes();
        res.status(StatusCodes.OK).json(codes);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

adminRouter.post("/admin/redeem-codes", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new RedeemCodeService(unit);
    let ok = false;
    try {
        const { code, rewardCoins, rewardLootboxes, rewardSparks, rewardSpins, maxUses, expiresAt, isActive } = req.body;
        if (isNullOrWhiteSpace(code)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "code is required" });
            return;
        }
        const id = await service.createCode({
            code,
            rewardCoins: typeof rewardCoins === "number" ? rewardCoins : 0,
            rewardLootboxes: typeof rewardLootboxes === "number" ? rewardLootboxes : 0,
            rewardSparks: typeof rewardSparks === "number" ? rewardSparks : 0,
            rewardSpins: typeof rewardSpins === "number" ? rewardSpins : 0,
            maxUses: typeof maxUses === "number" ? maxUses : null,
            expiresAt: typeof expiresAt === "string" ? expiresAt : null,
            isActive: typeof isActive === "boolean" ? isActive : true,
        });
        ok = true;
        res.status(StatusCodes.CREATED).json({ codeId: id, code: code.trim().toUpperCase() });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.patch("/admin/redeem-codes/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new RedeemCodeService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid code ID" });
            return;
        }
        const data: Partial<{ code: string; rewardCoins: number; rewardLootboxes: number; rewardSparks: number; rewardSpins: number; maxUses: number | null; expiresAt: string | null; isActive: boolean }> = {};
        if (req.body.code !== undefined) data.code = req.body.code;
        if (req.body.rewardCoins !== undefined) data.rewardCoins = req.body.rewardCoins;
        if (req.body.rewardLootboxes !== undefined) data.rewardLootboxes = req.body.rewardLootboxes;
        if (req.body.rewardSparks !== undefined) data.rewardSparks = req.body.rewardSparks;
        if (req.body.rewardSpins !== undefined) data.rewardSpins = req.body.rewardSpins;
        if (req.body.maxUses !== undefined) data.maxUses = req.body.maxUses;
        if (req.body.expiresAt !== undefined) data.expiresAt = req.body.expiresAt;
        if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

        const success = await service.updateCode(Number(id), data);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Code updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Code not found" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

adminRouter.delete("/admin/redeem-codes/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new RedeemCodeService(unit);
    const id = req.params.id;
    let ok = false;
    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid code ID" });
            return;
        }
        const result = await service.deleteCode(Number(id));
        if (result.success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Code deleted" });
        } else if (result.error) {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
            return;
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Code not found" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});
