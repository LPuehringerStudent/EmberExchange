import express from "express";
import { Unit } from "../utils/unit";
import { AdminService } from "../services/admin-service";
import { requireAdmin } from "../middleware/admin";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        const result = await service.getPlayers(page, limit, search);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
