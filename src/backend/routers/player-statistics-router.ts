import express from "express";
import { Unit } from "../utils/unit";
import { PlayerStatisticsService } from "../services/player-statistics-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const playerStatisticsRouter = express.Router();

/**
 * @openapi
 * /player-statistics:
 *   get:
 *     summary: Get all player statistics
 *     description: Retrieves statistics for all players ordered by activity
 *     tags:
 *       - Statistics
 *     responses:
 *       200:
 *         description: List of player statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlayerStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
playerStatisticsRouter.get("/player-statistics", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerStatisticsService(unit);

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
 * /player-statistics/leaderboard/activity:
 *   get:
 *     summary: Get top players by activity
 *     description: Retrieves players with highest market activity scores
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of players to return
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of top players
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlayerStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
playerStatisticsRouter.get("/player-statistics/leaderboard/activity", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerStatisticsService(unit);
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const response = await service.getTopByActivity(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /player-statistics/leaderboard/wealth:
 *   get:
 *     summary: Get top players by net worth
 *     description: Retrieves richest players by net worth
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of players to return
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of richest players
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlayerStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
playerStatisticsRouter.get("/player-statistics/leaderboard/wealth", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerStatisticsService(unit);
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const response = await service.getTopByNetWorth(limit);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/statistics:
 *   get:
 *     summary: Get player statistics
 *     description: Retrieves statistics for a specific player
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlayerStatistics'
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
playerStatisticsRouter.get("/players/:playerId/statistics", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerStatisticsService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getByPlayerId(Number(playerId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Statistics not found" });
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
 * /players/{playerId}/statistics:
 *   post:
 *     summary: Create player statistics
 *     description: Creates initial statistics record for a player
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePlayerStatisticsResponse'
 *       400:
 *         description: Invalid ID format
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
playerStatisticsRouter.post("/players/:playerId/statistics", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerStatisticsService(unit);
    const playerId = req.params.playerId;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const [success, id] = await service.create(Number(playerId));

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ statId: id, playerId: Number(playerId) });
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
 * /players/{playerId}/statistics:
 *   delete:
 *     summary: Delete player statistics
 *     description: Removes statistics record for a player
 *     tags:
 *       - Statistics
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
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
playerStatisticsRouter.delete("/players/:playerId/statistics", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerStatisticsService(unit);
    const playerId = req.params.playerId;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const success = await service.delete(Number(playerId));
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
