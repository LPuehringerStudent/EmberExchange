import express from "express";
import { Unit } from "../utils/unit";
import { MiniGameSessionService } from "../services/mini-game-session-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const miniGameSessionRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const msg = String(err);
    return msg.includes("FOREIGN KEY constraint failed") ||
        msg.includes("UNIQUE constraint failed");
}

/**
 * @openapi
 * /mini-game-sessions:
 *   get:
 *     summary: Get all mini-game sessions
 *     description: Retrieves all mini-game sessions ordered by most recent
 *     tags:
 *       - MiniGameSessions
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MiniGameSession'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
miniGameSessionRouter.get("/mini-game-sessions", (_req, res) => {
    const unit = new Unit(true);
    const service = new MiniGameSessionService(unit);

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
 * /mini-game-sessions/{id}:
 *   get:
 *     summary: Get session by ID
 *     description: Retrieves a single mini-game session by its ID
 *     tags:
 *       - MiniGameSessions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Session ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MiniGameSession'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Session not found
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
miniGameSessionRouter.get("/mini-game-sessions/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new MiniGameSessionService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Session not found" });
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
 * /players/{playerId}/mini-game-sessions:
 *   get:
 *     summary: Get player's sessions
 *     description: Retrieves all mini-game sessions for a specific player
 *     tags:
 *       - MiniGameSessions
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MiniGameSession'
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
miniGameSessionRouter.get("/players/:playerId/mini-game-sessions", (req, res) => {
    const unit = new Unit(true);
    const service = new MiniGameSessionService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = service.getByPlayerId(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /mini-game-sessions/type/{gameType}:
 *   get:
 *     summary: Get sessions by game type
 *     description: Retrieves all sessions for a specific game type
 *     tags:
 *       - MiniGameSessions
 *     parameters:
 *       - name: gameType
 *         in: path
 *         required: true
 *         description: Game type (e.g., 'Coin Flip', 'Dice Roll')
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MiniGameSession'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
miniGameSessionRouter.get("/mini-game-sessions/type/:gameType", (req, res) => {
    const unit = new Unit(true);
    const service = new MiniGameSessionService(unit);
    const gameType = req.params.gameType;

    try {
        if (isNullOrWhiteSpace(gameType)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Game type is required" });
            return;
        }

        const response = service.getByGameType(gameType);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /mini-game-sessions:
 *   post:
 *     summary: Create mini-game session
 *     description: Records a completed mini-game session
 *     tags:
 *       - MiniGameSessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *               - gameType
 *               - result
 *               - coinPayout
 *             properties:
 *               playerId:
 *                 type: integer
 *                 description: Player who played
 *               gameType:
 *                 type: string
 *                 description: Type of mini-game
 *               result:
 *                 type: string
 *                 description: Result (win, loss, etc.)
 *               coinPayout:
 *                 type: integer
 *                 description: Coins earned
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateMiniGameSessionResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation
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
miniGameSessionRouter.post("/mini-game-sessions", (req, res) => {
    const unit = new Unit(false);
    const service = new MiniGameSessionService(unit);
    let ok = false;

    try {
        const { playerId, gameType, result, coinPayout } = req.body;

        if (typeof playerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId is required" });
            return;
        }

        if (isNullOrWhiteSpace(gameType)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "gameType is required" });
            return;
        }

        if (isNullOrWhiteSpace(result)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "result is required" });
            return;
        }

        if (typeof coinPayout !== "number" || coinPayout < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "coinPayout must be a non-negative number" });
            return;
        }

        const [success, id] = service.create(playerId, gameType, result, coinPayout);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ sessionId: id, playerId, gameType });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create session" });
        }
    } catch (err) {
        if (isConstraintError(err)) {
            res.status(StatusCodes.CONFLICT).json({ error: String(err) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /mini-game-sessions/{id}:
 *   delete:
 *     summary: Delete session
 *     description: Removes a mini-game session record
 *     tags:
 *       - MiniGameSessions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Session ID
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
 *         description: Not found
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
miniGameSessionRouter.delete("/mini-game-sessions/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new MiniGameSessionService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = service.delete(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Session deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Session not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{playerId}/mini-game-stats:
 *   get:
 *     summary: Get player's mini-game stats
 *     description: Returns statistics for a player's mini-game sessions
 *     tags:
 *       - MiniGameSessions
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stats retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSessions:
 *                   type: integer
 *                 totalPayout:
 *                   type: integer
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
miniGameSessionRouter.get("/players/:playerId/mini-game-stats", (req, res) => {
    const unit = new Unit(true);
    const service = new MiniGameSessionService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const totalSessions = service.countByPlayer(Number(playerId));
        const totalPayout = service.getTotalPayoutByPlayer(Number(playerId));
        res.status(StatusCodes.OK).json({ totalSessions, totalPayout });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});
