import express from "express";
import { Unit } from "../utils/unit";
import { GameService } from "../services/game-service";
import { StatusCodes } from "http-status-codes";
import { readRateLimiter } from "../middleware/rate-limiter";

export const gameRouter = express.Router();

/**
 * @openapi
 * /games:
 *   get:
 *     summary: Get all games
 *     tags: [Games]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of games
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Game'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
gameRouter.get("/games", readRateLimiter.middleware(), async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const gameService = new GameService(unit);
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const games = await gameService.getAllGames(limit, offset);
        res.status(StatusCodes.OK).json(games);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /games/{gameType}:
 *   get:
 *     summary: Get game by type
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: gameType
 *         required: true
 *         schema:
 *           type: string
 *         description: Game type identifier
 *     responses:
 *       200:
 *         description: Game details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Game'
 *       404:
 *         description: Game not found
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
gameRouter.get("/games/:gameType", readRateLimiter.middleware(), async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const gameService = new GameService(unit);
        const game = await gameService.getGameByType(req.params.gameType as string);
        if (!game) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Game not found" });
            return;
        }
        res.status(StatusCodes.OK).json(game);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});
