import express from "express";
import { Unit } from "../utils/unit";
import { StoveTypeStatisticsService } from "../services/stove-type-statistics-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const stoveTypeStatisticsRouter = express.Router();

/**
 * @openapi
 * /stove-type-statistics:
 *   get:
 *     summary: Get all stove type statistics
 *     description: Retrieves market statistics for all stove types
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: List of stove type statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveTypeStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeStatisticsRouter.get("/stove-type-statistics", (_req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);

    try {
        const response = service.getAll();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /stove-type-statistics/market-summary:
 *   get:
 *     summary: Get market summary
 *     description: Retrieves aggregated market statistics across all stove types
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: Market summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStoves:
 *                   type: integer
 *                 totalListed:
 *                   type: integer
 *                 totalSales:
 *                   type: integer
 *                 avgListedPercent:
 *                   type: number
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeStatisticsRouter.get("/stove-type-statistics/market-summary", (_req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);

    try {
        const response = service.getMarketSummary();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /stove-type-statistics/leaderboard/sales:
 *   get:
 *     summary: Get top stove types by sales
 *     description: Retrieves stove types with highest sales volume
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of stove types to return
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of top stove types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveTypeStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeStatisticsRouter.get("/stove-type-statistics/leaderboard/sales", (req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const response = service.getTopBySales(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /stove-type-statistics/most-viewed:
 *   get:
 *     summary: Get most viewed stove types
 *     description: Retrieves stove types with highest view counts
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of stove types to return
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of most viewed stove types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveTypeStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeStatisticsRouter.get("/stove-type-statistics/most-viewed", (req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const response = service.getMostViewed(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /stove-type-statistics/trend/{trend}:
 *   get:
 *     summary: Get stove types by demand trend
 *     description: Retrieves stove types filtered by demand trend direction
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: trend
 *         in: path
 *         required: true
 *         description: Trend direction
 *         schema:
 *           type: string
 *           enum: [increasing, stable, decreasing]
 *     responses:
 *       200:
 *         description: List of stove types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveTypeStatistics'
 *       400:
 *         description: Invalid trend value
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
stoveTypeStatisticsRouter.get("/stove-type-statistics/trend/:trend", (req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);
    const trend = req.params.trend;

    try {
        if (!['increasing', 'stable', 'decreasing'].includes(trend)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Trend must be increasing, stable, or decreasing" });
            return;
        }

        const response = service.getByDemandTrend(trend as "increasing" | "stable" | "decreasing");
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /stove-types/{stoveTypeId}/statistics:
 *   get:
 *     summary: Get stove type statistics
 *     description: Retrieves market statistics for a specific stove type
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: stoveTypeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove type statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoveTypeStatistics'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Statistics not found
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
stoveTypeStatisticsRouter.get("/stove-types/:stoveTypeId/statistics", (req, res) => {
    const unit = new Unit(true);
    const service = new StoveTypeStatisticsService(unit);
    const stoveTypeId = req.params.stoveTypeId;

    try {
        if (isNullOrWhiteSpace(stoveTypeId) || isNaN(Number(stoveTypeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove Type ID must be a valid number" });
            return;
        }

        const response = service.getByStoveTypeId(Number(stoveTypeId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found" });
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
 * /stove-types/{stoveTypeId}/statistics:
 *   post:
 *     summary: Create stove type statistics
 *     description: Creates initial statistics record for a stove type
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: stoveTypeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expectedDropRate
 *               - rarityRank
 *             properties:
 *               expectedDropRate:
 *                 type: number
 *                 description: Expected drop rate (0-1)
 *               rarityRank:
 *                 type: integer
 *                 description: Rarity ranking (1-9)
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateStoveTypeStatisticsResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Statistics already exist
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
stoveTypeStatisticsRouter.post("/stove-types/:stoveTypeId/statistics", (req, res) => {
    const unit = new Unit(false);
    const service = new StoveTypeStatisticsService(unit);
    const stoveTypeId = req.params.stoveTypeId;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(stoveTypeId) || isNaN(Number(stoveTypeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove Type ID must be a valid number" });
            return;
        }

        const { expectedDropRate, rarityRank } = req.body;

        if (typeof expectedDropRate !== "number" || typeof rarityRank !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "expectedDropRate and rarityRank are required" });
            return;
        }

        const [success, id] = service.create(Number(stoveTypeId), expectedDropRate, rarityRank);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ statId: id, stoveTypeId: Number(stoveTypeId) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create statistics" });
        }
    } catch (err) {
        res.status(StatusCodes.CONFLICT).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{stoveTypeId}/statistics/increment-views:
 *   post:
 *     summary: Increment view count
 *     description: Records a view of a stove type
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: stoveTypeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: View recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Statistics not found
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
stoveTypeStatisticsRouter.post("/stove-types/:stoveTypeId/statistics/increment-views", (req, res) => {
    const unit = new Unit(false);
    const service = new StoveTypeStatisticsService(unit);
    const stoveTypeId = req.params.stoveTypeId;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(stoveTypeId) || isNaN(Number(stoveTypeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove Type ID must be a valid number" });
            return;
        }

        const success = service.incrementViews(Number(stoveTypeId));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "View recorded" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{stoveTypeId}/statistics:
 *   delete:
 *     summary: Delete stove type statistics
 *     description: Removes statistics record for a stove type
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: stoveTypeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Statistics not found
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
stoveTypeStatisticsRouter.delete("/stove-types/:stoveTypeId/statistics", (req, res) => {
    const unit = new Unit(false);
    const service = new StoveTypeStatisticsService(unit);
    const stoveTypeId = req.params.stoveTypeId;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(stoveTypeId) || isNaN(Number(stoveTypeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove Type ID must be a valid number" });
            return;
        }

        const success = service.delete(Number(stoveTypeId));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Statistics deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});
