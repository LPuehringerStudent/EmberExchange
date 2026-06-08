import express from "express";
import { Unit } from "../utils/unit";
import { GameService } from "../services/game-service";
import { StatusCodes } from "http-status-codes";
import { readRateLimiter } from "../middleware/rate-limiter";

export const gameRouter = express.Router();

gameRouter.get("/games", readRateLimiter.middleware(), async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const gameService = new GameService(unit);
        const limit = Math.min(Number(req.query.limit) || 100, 100);
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
