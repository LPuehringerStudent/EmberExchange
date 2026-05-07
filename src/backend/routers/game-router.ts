import express from "express";
import { Unit } from "../utils/unit";
import { GameService } from "../services/game-service";
import { StatusCodes } from "http-status-codes";

export const gameRouter = express.Router();

gameRouter.get("/games", async (_req, res) => {
    const unit = await Unit.create(true);
    try {
        const gameService = new GameService(unit);
        const games = await gameService.getAllGames();
        res.status(StatusCodes.OK).json(games);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

gameRouter.get("/games/:gameType", async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const gameService = new GameService(unit);
        const game = await gameService.getGameByType(req.params.gameType);
        if (!game) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Game not found" });
            return;
        }
        res.status(StatusCodes.OK).json(game);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
