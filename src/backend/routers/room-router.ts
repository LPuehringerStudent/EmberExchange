import express from "express";
import { Unit } from "../utils/unit";
import { RoomService } from "../services/room-service";
import { RoomPlayerService } from "../services/room-player-service";
import { GameStateService } from "../services/game-state-service";
import { StatusCodes } from "http-status-codes";

export const roomRouter = express.Router();

roomRouter.post("/rooms", async (req, res) => {
    const unit = await Unit.create(false);
    let ok = false;
    try {
        const { maxPlayers, gameType } = req.body;
        const mp = typeof maxPlayers === "number" ? maxPlayers : 4;
        if (mp < 2) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "maxPlayers must be at least 2" });
            return;
        }
        if (typeof gameType !== "string" || gameType.trim().length === 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "gameType is required" });
            return;
        }

        const roomService = new RoomService(unit);
        const gameStateService = new GameStateService(unit);

        const room = await roomService.createRoom(mp, gameType.trim());
        await gameStateService.createInitialState(room.roomId, { players: [], status: "waiting", log: [] });

        ok = true;
        res.status(StatusCodes.CREATED).json(room);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

roomRouter.get("/rooms", async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const roomService = new RoomService(unit);
        const gameType = req.query.gameType as string | undefined;
        const status = req.query.status as string | undefined;

        if (!gameType || typeof gameType !== "string") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "gameType query parameter is required" });
            return;
        }

        const validStatus = status === "waiting" || status === "active" || status === "finished" ? status : undefined;
        const rooms = await roomService.listRoomsByGameType(gameType, validStatus);
        res.status(StatusCodes.OK).json(rooms);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

roomRouter.get("/rooms/:roomId", async (req, res) => {
    const unit = await Unit.create(true);
    try {
        const roomService = new RoomService(unit);
        const roomPlayerService = new RoomPlayerService(unit);
        const gameStateService = new GameStateService(unit);

        const room = await roomService.getRoomById(req.params.roomId);
        if (!room) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Room not found" });
            return;
        }

        const players = await roomPlayerService.getPlayersInRoom(room.roomId);
        const state = await gameStateService.getState(room.roomId);

        res.status(StatusCodes.OK).json({
            ...room,
            players,
            gameState: state
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
