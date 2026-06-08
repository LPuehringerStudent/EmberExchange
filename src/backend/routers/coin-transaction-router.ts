import express from "express";
import { Unit } from "../utils/unit";
import { CoinTransactionService } from "../services/coin-transaction-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/admin";

export const coinTransactionRouter = express.Router();

/**
 * @openapi
 * /coin-transactions:
 *   get:
 *     summary: Get all coin transactions
 *     description: Retrieves all coin transactions ordered by most recent
 *     tags:
 *       - CoinTransactions
 *     responses:
 *       200:
 *         description: List of coin transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CoinTransaction'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
coinTransactionRouter.get("/coin-transactions", requireAdmin, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new CoinTransactionService(unit);
    const limit = Math.min(Number(req.query.limit) || 500, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    try {
        const response = await service.getAll(limit, offset);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /coin-transactions/{id}:
 *   get:
 *     summary: Get coin transaction by ID
 *     description: Retrieves a single coin transaction by its ID
 *     tags:
 *       - CoinTransactions
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Transaction ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoinTransaction'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
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
coinTransactionRouter.get("/coin-transactions/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new CoinTransactionService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Coin transaction not found" });
        } else {
            res.status(StatusCodes.OK).json(response);
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/coin-transactions:
 *   get:
 *     summary: Get player's coin transactions
 *     description: Retrieves all coin transactions for a specific player
 *     tags:
 *       - CoinTransactions
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of player's coin transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CoinTransaction'
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
coinTransactionRouter.get("/players/:playerId/coin-transactions", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new CoinTransactionService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        if (req.playerId !== Number(playerId)) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only view your own transactions" });
            return;
        }

        const response = await service.getByPlayerId(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});
