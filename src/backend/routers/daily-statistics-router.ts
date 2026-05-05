import express from "express";
import { Unit } from "../utils/unit";
import { DailyStatisticsService } from "../services/daily-statistics-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const dailyStatisticsRouter = express.Router();

/**
 * @openapi
 * /daily-statistics:
 *   get:
 *     summary: Get all daily statistics
 *     description: Retrieves platform statistics for all recorded days
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: List of daily statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
dailyStatisticsRouter.get("/daily-statistics", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new DailyStatisticsService(unit);

    try {
        const response = await service.getAll();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /daily-statistics/today:
 *   get:
 *     summary: Get today's statistics
 *     description: Retrieves statistics for the current day
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: Today's statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStatistics'
 *       404:
 *         description: No statistics for today
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
dailyStatisticsRouter.get("/daily-statistics/today", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new DailyStatisticsService(unit);

    try {
        const response = await service.getToday();
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No statistics for today" });
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
 * /daily-statistics/summary:
 *   get:
 *     summary: Get summary for last N days
 *     description: Retrieves aggregated statistics for recent days
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: days
 *         in: query
 *         description: Number of days to summarize
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLootboxes:
 *                   type: integer
 *                 totalSales:
 *                   type: integer
 *                 totalVolume:
 *                   type: integer
 *                 avgPlayers:
 *                   type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
dailyStatisticsRouter.get("/daily-statistics/summary", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new DailyStatisticsService(unit);
    const days = parseInt(req.query.days as string) || 7;

    try {
        const response = await service.getSummary(days);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /daily-statistics/{date}:
 *   get:
 *     summary: Get statistics for specific date
 *     description: Retrieves platform statistics for a specific date (YYYY-MM-DD)
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: date
 *         in: path
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyStatistics'
 *       400:
 *         description: Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Statistics not found for date
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
dailyStatisticsRouter.get("/daily-statistics/range", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new DailyStatisticsService(unit);
    const from = req.query.from as string;
    const to = req.query.to as string;

    try {
        if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Both from and to dates must be in YYYY-MM-DD format" });
            return;
        }

        const response = await service.getByDateRange(from, to);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /daily-statistics/range:
 *   get:
 *     summary: Get statistics for date range
 *     description: Retrieves platform statistics between two dates
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: from
 *         in: query
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of daily statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DailyStatistics'
 *       400:
 *         description: Invalid date format
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
dailyStatisticsRouter.get("/daily-statistics/:date", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new DailyStatisticsService(unit);
    const date = req.params.date;

    try {
        if (isNullOrWhiteSpace(date) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Date must be in YYYY-MM-DD format" });
            return;
        }

        const response = await service.getByDate(date);
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found for date" });
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
 * /daily-statistics:
 *   post:
 *     summary: Create daily statistics
 *     description: Creates a new daily statistics record
 *     tags:
 *       - Statistics
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date in YYYY-MM-DD format
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateDailyStatisticsResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Statistics already exist for date
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
dailyStatisticsRouter.post("/daily-statistics", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new DailyStatisticsService(unit);
    let ok = false;

    try {
        const { date } = req.body;

        if (isNullOrWhiteSpace(date) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "date must be in YYYY-MM-DD format" });
            return;
        }

        const [success, id] = await service.create(date);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ statId: id, date });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create statistics" });
        }
    } catch (err) {
        res.status(StatusCodes.CONFLICT).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /daily-statistics/{date}:
 *   delete:
 *     summary: Delete daily statistics
 *     description: Removes statistics record for a specific date
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: date
 *         in: path
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid date format
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
dailyStatisticsRouter.delete("/daily-statistics/:date", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new DailyStatisticsService(unit);
    const date = req.params.date;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(date) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Date must be in YYYY-MM-DD format" });
            return;
        }

        const success = await service.delete(date);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Statistics deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
