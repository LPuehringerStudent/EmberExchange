import express from "express";
import { Unit } from "../utils/unit";
import { RoomService } from "../services/room-service";
import { RoomPlayerService } from "../services/room-player-service";
import { GameStateService } from "../services/game-state-service";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../middleware/require-auth";
import { engineRegistry } from "../game-engines";

export const roomRouter = express.Router();

/**
 * @openapi
 * /rooms:
 *   post:
 *     summary: Create a new game room
 *     tags: [Rooms]
 *     security:
 *       - SessionId: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gameType]
 *             properties:
 *               maxPlayers:
 *                 type: integer
 *                 description: Maximum number of players (default 4)
 *               gameType:
 *                 type: string
 *                 description: Game type identifier (e.g. poker, blackjack, roulette)
 *               settings:
 *                 type: object
 *                 description: Optional game-specific settings
 *     responses:
 *       201:
 *         description: Room created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid input
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
roomRouter.post("/rooms", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    let ok = false;
    try {
        const { maxPlayers, gameType, settings } = req.body;
        const mp = typeof maxPlayers === "number" ? maxPlayers : 4;
        if (typeof gameType !== "string" || gameType.trim().length === 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "gameType is required" });
            return;
        }

        const trimmedGameType = gameType.trim();
        if (!engineRegistry.has(trimmedGameType)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: `Unknown game type: ${trimmedGameType}` });
            return;
        }

        const engine = engineRegistry.get(trimmedGameType);
        if (mp < engine.minPlayers) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: `maxPlayers must be at least ${engine.minPlayers}` });
            return;
        }

        const roomService = new RoomService(unit);
        const gameStateService = new GameStateService(unit);

        const roomSettings = (settings && typeof settings === "object") ? settings as Record<string, unknown> : {};
        const room = await roomService.createRoom(mp, trimmedGameType, roomSettings);
        await gameStateService.createInitialState(room.roomId, { players: [], status: "waiting", log: [] });

        ok = true;
        res.status(StatusCodes.CREATED).json(room);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /rooms:
 *   get:
 *     summary: List rooms by game type
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: gameType
 *         required: true
 *         schema:
 *           type: string
 *         description: Game type filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, finished]
 *         description: Room status filter
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       400:
 *         description: Missing gameType
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
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /rooms/{roomId}:
 *   get:
 *     summary: Get room details
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details including players and game state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roomId: { type: string }
 *                 status: { type: string }
 *                 maxPlayers: { type: integer }
 *                 gameType: { type: string }
 *                 settings: { type: object }
 *                 createdAt: { type: string, format: date-time }
 *                 updatedAt: { type: string, format: date-time }
 *                 players:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoomPlayer'
 *                 gameState:
 *                   $ref: '#/components/schemas/GameState'
 *       404:
 *         description: Room not found
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
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});
