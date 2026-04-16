import express from "express";
import { Unit } from "../utils/unit";
import { TradeService } from "../services/trade-service";
import { ListingService } from "../services/listing-service";
import { OwnershipService } from "../services/ownership-service";
import { StoveService } from "../services/stove-service";
import { PriceHistoryService } from "../services/price-history-service";
import { PlayerService } from "../services/player-service";
import { CoinTransactionService } from "../services/coin-transaction-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const tradeRouter = express.Router();

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
tradeRouter.get("/trades", (_req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);

    try {
        const response = service.getAllTrades();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.get("/trades/recent", (req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const response = service.getRecentTrades(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.get("/trades/count", (_req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);

    try {
        const count = service.countTrades();
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.get("/trades/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getTradeById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Trade not found" });
        } else {
            res.status(StatusCodes.OK).json(response);
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.get("/listings/:listingId/trade", (req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);
    const listingId = req.params.listingId;

    try {
        if (isNullOrWhiteSpace(listingId) || isNaN(Number(listingId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Listing ID must be a valid number" });
            return;
        }

        const response = service.getTradeByListingId(Number(listingId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No trade found for this listing" });
        } else {
            res.status(StatusCodes.OK).json(response);
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.get("/players/:buyerId/trades", (req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);
    const buyerId = req.params.buyerId;

    try {
        if (isNullOrWhiteSpace(buyerId) || isNaN(Number(buyerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer ID must be a valid number" });
            return;
        }

        const response = service.getTradesByBuyerId(Number(buyerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
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
tradeRouter.post("/trades", (req, res) => {
    const unit = new Unit(false);
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

        // Verify listing exists and is active
        const listing = listingService.getListingById(listingId);
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

        // Check buyer has enough coins
        const buyer = playerService.getInfoByID(buyerId);
        if (buyer === null) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer not found" });
            return;
        }

        if (buyer.coins < listing.price) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient coins" });
            return;
        }

        // Fetch seller
        const seller = playerService.getInfoByID(listing.sellerId);
        if (seller === null) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller not found" });
            return;
        }

        // Transfer coins
        const buyerCoinsUpdated = playerService.updatePlayerCoins(buyerId, buyer.coins - listing.price);
        const sellerCoinsUpdated = playerService.updatePlayerCoins(listing.sellerId, seller.coins + listing.price);
        if (!buyerCoinsUpdated || !sellerCoinsUpdated) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to transfer coins" });
            return;
        }

        // Mark listing as sold
        const markSuccess = listingService.markAsSold(listingId);
        if (!markSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update listing status" });
            return;
        }

        // Transfer ownership of the stove
        const transferSuccess = stoveService.updateOwner(listing.stoveId, buyerId);
        if (!transferSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to transfer stove ownership" });
            return;
        }

        // Record ownership history
        const [ownershipSuccess] = ownershipService.createOwnership(listing.stoveId, buyerId, "trade");
        if (!ownershipSuccess) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record ownership" });
            return;
        }

        // Record price history
        const stove = stoveService.getStoveById(listing.stoveId);
        if (stove !== null) {
            priceHistoryService.recordSale(stove.typeId, listing.price);
        }

        // Record coin transactions
        coinTransactionService.create(buyerId, -listing.price, 'listing_purchase', `Purchased stove #${listing.stoveId}`);
        coinTransactionService.create(listing.sellerId, listing.price, 'listing_sale', `Sold stove #${listing.stoveId}`);

        // Create trade record
        const [success, id] = tradeService.createTrade(listingId, buyerId);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ tradeId: id, message: "Trade executed successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record trade" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
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
tradeRouter.delete("/trades/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new TradeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = service.deleteTrade(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Trade deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Trade not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
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
tradeRouter.get("/players/:buyerId/trades/count", (req, res) => {
    const unit = new Unit(true);
    const service = new TradeService(unit);
    const buyerId = req.params.buyerId;

    try {
        if (isNullOrWhiteSpace(buyerId) || isNaN(Number(buyerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Buyer ID must be a valid number" });
            return;
        }

        const count = service.countTradesByBuyer(Number(buyerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});
