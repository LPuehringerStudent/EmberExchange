import express from "express";
import { Unit } from "../utils/unit";
import { LoginHistoryService } from "../services/login-history-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const loginHistoryRouter = express.Router();

/**
 * @openapi
 * /login-history:
 *   get:
 *     summary: Get all login history
 *     description: Retrieves all login history records ordered by most recent
 *     tags:
 *       - LoginHistory
 *     responses:
 *       200:
 *         description: List of login history records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LoginHistory'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
loginHistoryRouter.get("/login-history", (_req, res) => {
    const unit = new Unit(true);
    const service = new LoginHistoryService(unit);

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
 * /login-history/{id}:
 *   get:
 *     summary: Get login history by ID
 *     description: Retrieves a single login history record by its ID
 *     tags:
 *       - LoginHistory
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Login history ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Login history found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginHistory'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Login history not found
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
loginHistoryRouter.get("/login-history/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new LoginHistoryService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Login history not found" });
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
 * /players/{playerId}/login-history:
 *   get:
 *     summary: Get player's login history
 *     description: Retrieves all login history records for a specific player
 *     tags:
 *       - LoginHistory
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of player's login history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LoginHistory'
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
loginHistoryRouter.get("/players/:playerId/login-history", (req, res) => {
    const unit = new Unit(true);
    const service = new LoginHistoryService(unit);
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
 * /login-history:
 *   post:
 *     summary: Create login history record
 *     description: Records a new login event for a player
 *     tags:
 *       - LoginHistory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *             properties:
 *               playerId:
 *                 type: integer
 *                 description: Player ID
 *               sessionId:
 *                 type: string
 *                 nullable: true
 *                 description: Session identifier
 *     responses:
 *       201:
 *         description: Login history created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateLoginHistoryResponse'
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
loginHistoryRouter.post("/login-history", (req, res) => {
    const unit = new Unit(false);
    const service = new LoginHistoryService(unit);
    let ok = false;

    try {
        const { playerId, sessionId } = req.body;

        if (typeof playerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId is required" });
            return;
        }

        const [success, id] = service.create(playerId, sessionId ?? null);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ loginHistoryId: id, message: "Login history recorded" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record login history" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /login-history/{id}:
 *   delete:
 *     summary: Delete login history record
 *     description: Permanently removes a login history record
 *     tags:
 *       - LoginHistory
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Login history ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Login history deleted
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
 *         description: Login history not found
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
loginHistoryRouter.delete("/login-history/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new LoginHistoryService(unit);
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
            res.status(StatusCodes.OK).json({ message: "Login history deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Login history not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});
