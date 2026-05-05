import express from "express";
import { Unit } from "../utils/unit";
import { ListingService } from "../services/listing-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const listingRouter = express.Router();

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
listingRouter.get("/listings", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);

    try {
        const response = await service.getAllListings();
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
listingRouter.get("/listings/active", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);

    try {
        const response = await service.getActiveListings();
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
listingRouter.get("/players/:sellerId/listings", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
            return;
        }

        const response = await service.getListingsBySellerId(Number(sellerId));
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
listingRouter.get("/players/:sellerId/listings/active", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
            return;
        }

        const response = await service.getActiveListingsBySellerId(Number(sellerId));
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
 * /listings:
 *   post:
 *     summary: Create a listing
 *     description: Creates a new marketplace listing for a stove
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
 *               - stoveId
 *               - price
 *             properties:
 *               sellerId:
 *                 type: integer
 *                 description: Seller's player ID
 *                 example: 5
 *               stoveId:
 *                 type: integer
 *                 description: Stove being listed
 *                 example: 42
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
listingRouter.post("/listings", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    let ok = false;

    try {
        const { sellerId, stoveId, price } = req.body;

        if (typeof sellerId !== "number" || typeof stoveId !== "number" || typeof price !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "sellerId, stoveId, and price are required" });
            return;
        }

        if (price < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive number" });
            return;
        }

        // Check if stove is already listed
        if (await service.isStoveListed(stoveId)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove is already listed" });
            return;
        }

        const [success, id] = await service.createListing(sellerId, stoveId, price);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ listingId: id, message: "Listing created successfully" });
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
listingRouter.patch("/listings/:id/price", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { price } = req.body;
        if (typeof price !== "number" || price < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "price must be a positive number" });
            return;
        }

        const success = await service.updatePrice(Number(id), price);
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
listingRouter.patch("/listings/:id/cancel", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.cancelListing(Number(id));
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
listingRouter.delete("/listings/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ListingService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteListing(Number(id));
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
listingRouter.get("/players/:sellerId/active-listings/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ListingService(unit);
    const sellerId = req.params.sellerId;

    try {
        if (isNullOrWhiteSpace(sellerId) || isNaN(Number(sellerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Seller ID must be a valid number" });
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
