import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { TradeService } from "../services/trade-service";
import { PlayerPrestigeService } from "../services/player-prestige-service";
import { ListingService } from "../services/listing-service";
import { OwnershipService } from "../services/ownership-service";
import { StoveService } from "../services/stove-service";
import { LootboxService } from "../services/lootbox-service";
import { PriceHistoryService } from "../services/price-history-service";
import { PlayerService } from "../services/player-service";
import { CoinTransactionService } from "../services/coin-transaction-service";
import { NotificationService } from "../services/notification-service";
import { QuestService } from "../services/quest-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/admin";
import { PunishmentService } from "../services/punishment-service";

export const tradeRouter = express.Router();

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
 * /trades:
 *   get:
 *     summary: Get all trades
 *     description: Retrieves a list of all completed trades
 *     tags:
 *       - Trades
 *     responses:
 *       200:
 *         description: List of all trades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trade'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tradeRouter.get("/trades", requireAuth, async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);

    try {
        const response = await service.getAllTrades();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /trades/recent:
 *   get:
 *     summary: Get recent trades
 *     description: Returns the most recent trades
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of records (default 10)
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent trades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trade'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tradeRouter.get("/trades/recent", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

    try {
        const response = await service.getRecentTrades(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /trades/count:
 *   get:
 *     summary: Count total trades
 *     description: Returns the total number of trades in the system
 *     tags:
 *       - Trades
 *     responses:
 *       200:
 *         description: Total trade count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
tradeRouter.get("/trades/count", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);

    try {
        const count = await service.countTrades();
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /trades/{id}:
 *   get:
 *     summary: Get trade by ID
 *     description: Retrieves a single trade by its unique ID
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Trade ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trade found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Trade not found
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
tradeRouter.get("/trades/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getTradeById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Trade not found" });
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
 * /listings/{listingId}/trade:
 *   get:
 *     summary: Get trade by listing ID
 *     description: Retrieves the trade associated with a specific listing
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: listingId
 *         in: path
 *         required: true
 *         description: Listing ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trade found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No trade found for this listing
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
tradeRouter.get("/listings/:listingId/trade", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);
    const listingId = req.params.listingId;

    try {
        if (isNullOrWhiteSpace(listingId) || isNaN(Number(listingId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Listing ID must be a valid number" });
            return;
        }

        const response = await service.getTradeByListingId(Number(listingId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No trade found for this listing" });
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
 * /players/{buyerId}/trades:
 *   get:
 *     summary: Get buyer's trades
 *     description: Retrieves all trades where the player was the buyer
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: buyerId
 *         in: path
 *         required: true
 *         description: Buyer's Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of buyer's trades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trade'
 *       400:
 *         description: Invalid ID format
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
tradeRouter.get("/players/:buyerId/trades", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);
    const buyerId = req.params.buyerId;

    try {
        if (isNullOrWhiteSpace(buyerId) || isNaN(Number(buyerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer ID must be a valid number" });
            return;
        }

        const response = await service.getTradesByBuyerId(Number(buyerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /trades:
 *   post:
 *     summary: Execute a trade
 *     description: Completes a trade by purchasing a listed stove
 *     tags:
 *       - Trades
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - buyerId
 *             properties:
 *               listingId:
 *                 type: integer
 *                 description: Listing being purchased
 *                 example: 10
 *               buyerId:
 *                 type: integer
 *                 description: Buyer's player ID
 *                 example: 5
 *     responses:
 *       201:
 *         description: Trade executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateTradeResponse'
 *       400:
 *         description: Missing fields or listing not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Listing not found
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
tradeRouter.post("/trades", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const tradeService = new TradeService(unit);
    const listingService = new ListingService(unit);
    const stoveService = new StoveService(unit);
    const ownershipService = new OwnershipService(unit);
    const priceHistoryService = new PriceHistoryService(unit);
    const playerService = new PlayerService(unit);
    const coinTransactionService = new CoinTransactionService(unit);
    let ok = false;

    try {
        const { listingId, buyerId } = req.body;

        if (typeof listingId !== "number" || typeof buyerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "listingId and buyerId are required" });
            return;
        }

        if (req.playerId !== buyerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "unauthorized_trade", `Attempted to execute trade as buyer ${buyerId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only execute trades as yourself" });
            await unit.complete(false);
            return;
        }

        // Verify listing exists and is active
        const listing = await listingService.getListingById(listingId);
        if (listing === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
            return;
        }

        if (listing.status !== "active") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Listing is not active" });
            return;
        }

        // Prevent buying your own listing
        if (listing.sellerId === buyerId) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Cannot buy your own listing" });
            return;
        }

        // Check buyer is not banned
        const buyer = await playerService.getInfoByID(buyerId);
        if (buyer?.bannedAt) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Account banned", reason: buyer.banReason || "No reason provided" });
            return;
        }

        // Check seller is not banned
        const sellerInfo = await playerService.getInfoByID(listing.sellerId);
        if (sellerInfo?.bannedAt) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Seller account banned" });
            return;
        }

        // Check buyer has enough coins (pre-check before atomic attempt)
        if (buyer === null) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer not found" });
            return;
        }

        if (buyer.coins < listing.price) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient coins" });
            return;
        }

        // Fetch seller
        const seller = await playerService.getInfoByID(listing.sellerId);
        if (seller === null) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller not found" });
            return;
        }

        // Atomically transfer coins — prevents race-condition double-spending
        const buyerDeducted = await playerService.deductCoinsAtomic(buyerId, listing.price);
        if (!buyerDeducted) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient coins (concurrent transaction)" });
            await unit.complete(false);
            return;
        }
        const sellerCredited = await playerService.addCoinsAtomic(listing.sellerId, listing.price);
        if (!sellerCredited) {
            // This should never happen if seller exists, but roll back buyer if it does
            await playerService.addCoinsAtomic(buyerId, listing.price);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to credit seller" });
            await unit.complete(false);
            return;
        }

        // Mark listing as sold
        const markSuccess = await listingService.markAsSold(listingId);
        if (!markSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update listing status" });
            return;
        }

        // Transfer ownership of the item (stove or lootbox)
        let itemDescription: string;
        if (listing.stoveId !== undefined && listing.stoveId !== null) {
            const transferSuccess = await stoveService.updateOwner(listing.stoveId, buyerId);
            if (!transferSuccess) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to transfer stove ownership" });
                return;
            }

            // Record ownership history
            const [ownershipSuccess] = await ownershipService.createOwnership(listing.stoveId, buyerId, "trade");
            if (!ownershipSuccess) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record ownership" });
                return;
            }

            // Record price history
            const stove = await stoveService.getStoveById(listing.stoveId);
            if (stove !== null) {
                await priceHistoryService.recordSale(stove.typeId, listing.price);
            }

            itemDescription = `stove #${listing.stoveId}`;
        } else if (listing.lootboxId !== undefined && listing.lootboxId !== null) {
            const lootboxService = new LootboxService(unit);
            const transferSuccess = await lootboxService.updateLootboxOwner(listing.lootboxId, buyerId);
            if (!transferSuccess) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to transfer lootbox ownership" });
                return;
            }

            itemDescription = `lootbox #${listing.lootboxId}`;
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Listing has no associated item" });
            return;
        }

        // Record coin transactions
        await coinTransactionService.create(buyerId, -listing.price, 'listing_purchase', `Purchased ${itemDescription}`);
        await coinTransactionService.create(listing.sellerId, listing.price, 'listing_sale', `Sold ${itemDescription}`);

        // Create trade record
        const [success, id] = await tradeService.createTrade(listingId, buyerId);

        if (success) {
            // Award XP to both buyer and seller
            try {
                const prestigeService = new PlayerPrestigeService(unit);
                await prestigeService.addXP(buyerId, 250, 'trade', 'Completed a trade (buyer)');
                await prestigeService.addXP(listing.sellerId, 200, 'trade', 'Completed a trade (seller)');
            } catch {
                // Ignore XP errors
            }

            // Check achievements for both parties
            try {
                await unit.savepoint('trade_achievements');
                const { AchievementEngine } = await import("../services/achievement-engine");
                const engine = new AchievementEngine(unit);
                await engine.checkTradeAchievements(buyerId);
                await engine.checkTradeAchievements(listing.sellerId);
                await engine.checkWealthAchievements(buyerId);
                await engine.checkWealthAchievements(listing.sellerId);
            } catch {
                try { await unit.rollbackToSavepoint('trade_achievements'); } catch { /* ignore */ }
            }

            // Notify buyer and seller
            try {
                const notificationService = new NotificationService(unit);
                await notificationService.create(
                    buyerId,
                    "trade_offer",
                    "Trade completed",
                    `You purchased ${itemDescription} for ${listing.price} coal`,
                    { tradeId: id, listingId, price: listing.price }
                );
                await notificationService.create(
                    listing.sellerId,
                    "trade_offer",
                    "Item sold",
                    `Your ${itemDescription} sold for ${listing.price} coal`,
                    { tradeId: id, listingId, price: listing.price }
                );
            } catch {
                // Ignore notification errors
            }

            // Track quest progress for both buyer and seller
            try {
                const questService = new QuestService(unit);
                await questService.trackProgress(buyerId, 'complete_10_trades', 1);
                await questService.trackProgress(listing.sellerId, 'complete_10_trades', 1);
            } catch {
                // Ignore quest tracking errors
            }

            ok = true;
            res.status(StatusCodes.CREATED).json({ tradeId: id, message: "Trade executed successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record trade" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /trades/{id}:
 *   delete:
 *     summary: Delete a trade
 *     description: Permanently removes a trade record from the system
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Trade ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trade deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Trade deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Trade not found
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
tradeRouter.delete("/trades/:id", requireAdmin, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new TradeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteTrade(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Trade deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Trade not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{buyerId}/trades/count:
 *   get:
 *     summary: Count buyer's trades
 *     description: Returns the number of trades for a specific buyer
 *     tags:
 *       - Trades
 *     parameters:
 *       - name: buyerId
 *         in: path
 *         required: true
 *         description: Buyer's Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Count of buyer's trades
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResponse'
 *       400:
 *         description: Invalid ID format
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
tradeRouter.get("/players/:buyerId/trades/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new TradeService(unit);
    const buyerId = req.params.buyerId;

    try {
        if (isNullOrWhiteSpace(buyerId) || isNaN(Number(buyerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer ID must be a valid number" });
            return;
        }

        const count = await service.countTradesByBuyer(Number(buyerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
