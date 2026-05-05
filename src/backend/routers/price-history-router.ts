import express from "express";
import { Unit } from "../utils/unit";
import { PriceHistoryService } from "../services/price-history-service";
import { StoveTypeService } from "../services/stove-type-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const priceHistoryRouter = express.Router();

/**
 * @openapi
 * /price-history:
 *   get:
 *     summary: Get all price history
 *     description: Retrieves all recorded sale prices
 *     tags:
 *       - PriceHistory
 *     responses:
 *       200:
 *         description: List of all price history records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PriceHistory'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
priceHistoryRouter.get("/price-history", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new PriceHistoryService(unit);

    try {
        const response = await service.getAllPriceHistory();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /price-history/{id}:
 *   get:
 *     summary: Get price history record by ID
 *     description: Retrieves a single price history record by its unique ID
 *     tags:
 *       - PriceHistory
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Price History Record ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price history record found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceHistory'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Price history record not found
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
priceHistoryRouter.get("/price-history/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PriceHistoryService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getPriceHistoryById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Price history record not found" });
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
 * /stove-types/{typeId}/price-history:
 *   get:
 *     summary: Get price history for stove type
 *     description: Retrieves all sale prices for a specific stove type
 *     tags:
 *       - PriceHistory
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of price history for the stove type
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PriceHistory'
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
priceHistoryRouter.get("/stove-types/:typeId/price-history", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PriceHistoryService(unit);
    const typeId = req.params.typeId;

    try {
        if (isNullOrWhiteSpace(typeId) || isNaN(Number(typeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Type ID must be a valid number" });
            return;
        }

        const response = await service.getPriceHistoryByTypeId(Number(typeId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /price-history:
 *   post:
 *     summary: Record a sale
 *     description: Records a new sale price for a stove type
 *     tags:
 *       - PriceHistory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - typeId
 *               - salePrice
 *             properties:
 *               typeId:
 *                 type: integer
 *                 description: Stove type ID
 *                 example: 1
 *               salePrice:
 *                 type: integer
 *                 description: Sale price in coins
 *                 example: 5000
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Sale recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Sale recorded successfully"
 *       400:
 *         description: Missing or invalid fields
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
priceHistoryRouter.post("/price-history", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PriceHistoryService(unit);
    let ok = false;

    try {
        const { typeId, salePrice } = req.body;

        if (typeof typeId !== "number" || typeof salePrice !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "typeId and salePrice are required" });
            return;
        }

        if (salePrice <= 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "salePrice must be positive" });
            return;
        }

        // Validate that typeId exists
        const stoveTypeService = new StoveTypeService(unit);
        const stoveType = await stoveTypeService.getStoveTypeById(typeId);
        if (!stoveType) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove type not found" });
            return;
        }

        const [success, id] = await service.recordSale(typeId, salePrice);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ historyId: id, message: "Sale recorded successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record sale" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{typeId}/price-stats:
 *   get:
 *     summary: Get price statistics
 *     description: Returns average, min, and max prices for a stove type
 *     tags:
 *       - PriceHistory
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceStats'
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
priceHistoryRouter.get("/stove-types/:typeId/price-stats", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PriceHistoryService(unit);
    const typeId = req.params.typeId;

    try {
        if (isNullOrWhiteSpace(typeId) || isNaN(Number(typeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Type ID must be a valid number" });
            return;
        }

        const typeIdNum = Number(typeId);
        const average = await service.getAveragePrice(typeIdNum);
        const min = await service.getMinPrice(typeIdNum);
        const max = await service.getMaxPrice(typeIdNum);
        const count = await service.countSales(typeIdNum);

        // Return 404 if no price history exists for this stove type
        if (count === 0) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Price history not found for this stove type" });
            return;
        }

        // Calculate median
        const prices = (await service.getPriceHistoryByTypeId(typeIdNum)).map(r => r.salePrice).sort((a, b) => a - b);
        let median = 0;
        if (prices.length > 0) {
            const mid = Math.floor(prices.length / 2);
            median = prices.length % 2 === 0
                ? (prices[mid - 1] + prices[mid]) / 2
                : prices[mid];
        }

        res.status(StatusCodes.OK).json({ typeId: typeIdNum, average, min, max, count, median });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stove-types/{typeId}/recent-prices:
 *   get:
 *     summary: Get recent prices
 *     description: Returns the most recent sale prices for a stove type
 *     tags:
 *       - PriceHistory
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of records (default 10)
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent price history records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PriceHistory'
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
priceHistoryRouter.get("/stove-types/:typeId/recent-prices", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PriceHistoryService(unit);
    const typeId = req.params.typeId;
    const limitParam = req.query.limit;
    const limit = limitParam !== undefined ? parseInt(limitParam as string) : 10;

    try {
        if (isNullOrWhiteSpace(typeId) || isNaN(Number(typeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Type ID must be a valid number" });
            return;
        }

        // Validate limit parameter if provided
        if (limitParam !== undefined && (isNaN(limit) || limit <= 0)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Limit must be a valid number" });
            return;
        }

        const response = await service.getRecentPrices(Number(typeId), limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /price-history/{id}:
 *   delete:
 *     summary: Delete price history record
 *     description: Permanently removes a price history record
 *     tags:
 *       - PriceHistory
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Price History Record ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Price history record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Price history record deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Price history record not found
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
priceHistoryRouter.delete("/price-history/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PriceHistoryService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deletePriceHistory(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Price history record deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Price history record not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
