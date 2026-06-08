import express from "express";
import { Unit } from "../utils/unit";
import { ListingService } from "../services/listing-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { PlayerPrestigeService } from "../services/player-prestige-service";
import { ListingRow } from "../../shared/model";
import { checkPlayerBanned } from "../middleware/ban-check";
import { requireAuth } from "../middleware/require-auth";
import { PunishmentService } from "../services/punishment-service";

export const listingRouter = express.Router();

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
 * /listings:
 *   get:
 *     summary: Get all listings
 *     description: Retrieves a list of all marketplace listings
 *     tags:
 *       - Listings
 *     responses:
 *       200:
 *         description: List of all listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
listingRouter.get("/listings", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    try {
        const response = await service.getAllListings(limit, offset);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /listings/active:
 *   get:
 *     summary: Get active listings
 *     description: Retrieves all active marketplace listings
 *     tags:
 *       - Listings
 *     responses:
 *       200:
 *         description: List of active listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
listingRouter.get("/listings/active", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    try {
        const { rarity, collection, minPrice, maxPrice, itemType, sortBy, search } = req.query;
        const hasFilters = rarity || collection || minPrice || maxPrice || itemType || sortBy || search;

        let response: ListingRow[];
        if (hasFilters) {
            const rarityArr = rarity ? (Array.isArray(rarity) ? rarity : [rarity]).map(String) : undefined;
            response = await service.getFilteredListings({
                rarity: rarityArr,
                collection: collection ? String(collection) : undefined,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                itemType: itemType === 'stove' || itemType === 'lootbox' ? itemType : undefined,
                sortBy: sortBy === 'price_asc' || sortBy === 'price_desc' || sortBy === 'newest' ? sortBy : undefined,
                search: search ? String(search) : undefined,
            }, limit, offset);
        } else {
            response = await service.getActiveListings(limit, offset);
        }
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /listings/{id}:
 *   get:
 *     summary: Get listing by ID
 *     description: Retrieves a single listing by its unique ID
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Listing ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Invalid ID format
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
listingRouter.get("/listings/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getListingById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
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
 * /players/{sellerId}/listings:
 *   get:
 *     summary: Get seller's listings
 *     description: Retrieves all listings by a specific seller
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: sellerId
 *         in: path
 *         required: true
 *         description: Seller's Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of seller's listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
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
listingRouter.get("/players/:sellerId/listings", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
            return;
        }

        const parsedSellerId = Number(sellerId);
        if (req.playerId !== parsedSellerId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only view your own data" });
            return;
        }

        const response = await service.getListingsBySellerId(parsedSellerId);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{sellerId}/listings/active:
 *   get:
 *     summary: Get seller's active listings
 *     description: Retrieves all active listings by a specific seller
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: sellerId
 *         in: path
 *         required: true
 *         description: Seller's Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of seller's active listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
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
listingRouter.get("/players/:sellerId/listings/active", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
            return;
        }

        const parsedSellerId = Number(sellerId);
        if (req.playerId !== parsedSellerId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only view your own data" });
            return;
        }

        const response = await service.getActiveListingsBySellerId(parsedSellerId);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stoves/{stoveId}/listing:
 *   get:
 *     summary: Get active listing for stove
 *     description: Retrieves the active listing for a specific stove if one exists
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: stoveId
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Active listing found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No active listing found
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
listingRouter.get("/stoves/:stoveId/listing", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const stoveId = req.params.stoveId;

    try {
        if (isNullOrWhiteSpace(stoveId) || isNaN(Number(stoveId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove ID must be a valid number" });
            return;
        }

        const response = await service.getActiveListingByStoveId(Number(stoveId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No active listing found for this stove" });
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
 * /listings/sold:
 *   get:
 *     summary: Get recently sold listings
 *     description: Retrieves the most recently sold marketplace listings
 *     tags:
 *       - Listings
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
 *         description: List of sold listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
listingRouter.get("/listings/sold", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);

    try {
        const response = await service.getSoldListings(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

listingRouter.get("/lootboxes/:lootboxId/listing", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const lootboxId = req.params.lootboxId;

    try {
        if (isNullOrWhiteSpace(lootboxId) || isNaN(Number(lootboxId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Lootbox ID must be a valid number" });
            return;
        }

        const response = await service.getActiveListingByLootboxId(Number(lootboxId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No active listing found for this lootbox" });
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
 * /listings:
 *   post:
 *     summary: Create a listing
 *     description: Creates a new marketplace listing for a stove or lootbox
 *     tags:
 *       - Listings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sellerId
 *               - price
 *             properties:
 *               sellerId:
 *                 type: integer
 *                 description: Seller's player ID
 *                 example: 5
 *               stoveId:
 *                 type: integer
 *                 description: Stove being listed (provide stoveId or lootboxId)
 *                 example: 42
 *               lootboxId:
 *                 type: integer
 *                 description: Lootbox being listed (provide stoveId or lootboxId)
 *                 example: 7
 *               price:
 *                 type: integer
 *                 description: Asking price in coins
 *                 example: 5000
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateListingResponse'
 *       400:
 *         description: Missing or invalid fields, or stove already listed
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
 * Trace a stove back to the player who originally acquired it.
 * 1. Ownership table (for traded stoves)
 * 2. LootboxDrop → Lootbox (for lootbox-origin stoves)
 * 3. Stove.currentOwnerId (fallback — never traded)
 */
async function getStoveOriginPlayerId(unit: Unit, stoveId: number): Promise<number | null> {
    // Method 1: Ownership history (traded stoves)
    const ownershipStmt = unit.prepare<{ playerId: number }>(
        `SELECT playerId FROM Ownership WHERE stoveId = @stoveId ORDER BY acquiredAt ASC LIMIT 1`,
        { stoveId }
    );
    const firstOwnership = await ownershipStmt.get();
    if (firstOwnership) {
        return firstOwnership.playerId;
    }

    // Method 2: Lootbox drop chain (lootbox-origin stoves)
    const lootboxStmt = unit.prepare<{ playerId: number }>(
        `SELECT l.playerId
         FROM LootboxDrop ld
         JOIN Lootbox l ON l.lootboxId = ld.lootboxId
         WHERE ld.stoveId = @stoveId`,
        { stoveId }
    );
    const lootboxOrigin = await lootboxStmt.get();
    if (lootboxOrigin) {
        return lootboxOrigin.playerId;
    }

    // Method 3: Fallback — current owner is also original owner
    const stoveStmt = unit.prepare<{ currentOwnerId: number }>(
        `SELECT currentOwnerId FROM Stove WHERE stoveId = @stoveId`,
        { stoveId }
    );
    const stove = await stoveStmt.get();
    return stove?.currentOwnerId ?? null;
}

listingRouter.post("/listings", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    let ok = false;

    try {
        const { sellerId, stoveId, lootboxId, price } = req.body;

        if (typeof sellerId !== "number" || typeof price !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "sellerId and price are required" });
            return;
        }

        if (req.playerId !== sellerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "unauthorized_listing", `Attempted to create listing as seller ${sellerId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only create listings for your own items" });
            await unit.complete(false);
            return;
        }

        if (await checkPlayerBanned(unit, sellerId, res)) {
            await unit.complete(false);
            return;
        }

        if ((stoveId === undefined || stoveId === null) && (lootboxId === undefined || lootboxId === null)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Either stoveId or lootboxId is required" });
            return;
        }

        if (stoveId !== undefined && stoveId !== null && lootboxId !== undefined && lootboxId !== null) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Provide either stoveId or lootboxId, not both" });
            return;
        }

        if (price < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive number" });
            return;
        }

        // Verify seller actually owns the item
        if (stoveId !== undefined && stoveId !== null) {
            const stoveStmt = unit.prepare<{ currentOwnerId: number }>(
                `SELECT currentOwnerId FROM Stove WHERE stoveId = @stoveId`,
                { stoveId }
            );
            const stove = await stoveStmt.get();
            if (!stove || stove.currentOwnerId !== sellerId) {
                res.status(StatusCodes.FORBIDDEN).json({ error: "You do not own this stove" });
                await unit.complete(false);
                return;
            }

            // Check if stove originated from a banned account
            const originPlayerId = await getStoveOriginPlayerId(unit, stoveId);
            if (originPlayerId !== null) {
                const playerStmt = unit.prepare<{ bannedAt: string | null }>(
                    `SELECT bannedAt FROM Player WHERE playerId = @playerId`,
                    { playerId: originPlayerId }
                );
                const originPlayer = await playerStmt.get();
                if (originPlayer?.bannedAt) {
                    res.status(StatusCodes.FORBIDDEN).json({ error: "This item cannot be listed because it originated from a banned account" });
                    await unit.complete(false);
                    return;
                }
            }
        }

        if (lootboxId !== undefined && lootboxId !== null) {
            const lootboxStmt = unit.prepare<{ playerId: number }>(
                `SELECT playerId FROM Lootbox WHERE lootboxId = @lootboxId`,
                { lootboxId }
            );
            const lootbox = await lootboxStmt.get();
            if (!lootbox || lootbox.playerId !== sellerId) {
                res.status(StatusCodes.FORBIDDEN).json({ error: "You do not own this lootbox" });
                await unit.complete(false);
                return;
            }
        }

        // Check if item is already listed
        if (stoveId !== undefined && stoveId !== null) {
            if (await service.isStoveListed(stoveId)) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove is already listed" });
                return;
            }
        }
        if (lootboxId !== undefined && lootboxId !== null) {
            if (await service.isLootboxListed(lootboxId)) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Lootbox is already listed" });
                return;
            }
        }

        const [success, id] = await service.createListing(sellerId, price, stoveId, lootboxId);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ listingId: id, message: "Listing created successfully" });

            // Award XP for creating a listing
            try {
                const prestigeService = new PlayerPrestigeService(unit);
                await prestigeService.addXP(sellerId, 75, 'listing_created', 'Created a marketplace listing');
            } catch {
                // Ignore XP errors
            }
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create listing" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /listings/{id}/price:
 *   patch:
 *     summary: Update listing price
 *     description: Updates the price of an active listing
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Listing ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: integer
 *                 description: New price in coins
 *                 example: 4500
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Price updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Price updated"
 *       400:
 *         description: Invalid ID or price, or listing not active
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
listingRouter.patch("/listings/:id/price", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const listingId = Number(id);
        const listing = await service.getListingById(listingId);
        if (!listing) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
            await unit.complete(false);
            return;
        }
        if (req.playerId !== listing.sellerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "unauthorized_listing", `Attempted to update listing ${listingId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only update your own listings" });
            await unit.complete(false);
            return;
        }

        const { price } = req.body;
        if (typeof price !== "number" || price < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive number" });
            return;
        }

        const success = await service.updatePrice(listingId, price);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Price updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Active listing not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /listings/{id}/cancel:
 *   patch:
 *     summary: Cancel a listing
 *     description: Cancels an active marketplace listing
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Listing ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Listing cancelled"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Active listing not found
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
listingRouter.patch("/listings/:id/cancel", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const listingId = Number(id);
        const listing = await service.getListingById(listingId);
        if (!listing) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
            await unit.complete(false);
            return;
        }
        if (req.playerId !== listing.sellerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "unauthorized_listing", `Attempted to cancel listing ${listingId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only cancel your own listings" });
            await unit.complete(false);
            return;
        }

        const success = await service.cancelListing(listingId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Listing cancelled" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Active listing not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /listings/{id}:
 *   delete:
 *     summary: Delete a listing
 *     description: Permanently removes a listing from the system
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Listing ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Listing deleted"
 *       400:
 *         description: Invalid ID format
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
listingRouter.delete("/listings/:id", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const listingId = Number(id);
        const listing = await service.getListingById(listingId);
        if (!listing) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
            await unit.complete(false);
            return;
        }
        if (req.playerId !== listing.sellerId) {
            try {
                const punishmentService = new PunishmentService(unit);
                await punishmentService.recordViolation(getClientIp(req), req.playerId ?? null, "unauthorized_listing", `Attempted to delete listing ${listingId}`);
            } catch { /* ignore */ }
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only delete your own listings" });
            await unit.complete(false);
            return;
        }

        const success = await service.deleteListing(listingId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Listing deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Listing not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{sellerId}/active-listings/count:
 *   get:
 *     summary: Count seller's active listings
 *     description: Returns the number of active listings for a seller
 *     tags:
 *       - Listings
 *     parameters:
 *       - name: sellerId
 *         in: path
 *         required: true
 *         description: Seller's Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Count of active listings
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
listingRouter.get("/players/:sellerId/active-listings/count", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
            return;
        }

        if (req.playerId !== Number(sellerId)) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only view your own data" });
            return;
        }

        const count = await service.countActiveListingsBySeller(Number(sellerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
