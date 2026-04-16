import express from "express";
import { Unit } from "../utils/unit";
import { CoinTransactionService } from "../services/coin-transaction-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const coinTransactionRouter = express.Router();

const VALID_TYPES = ['trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust'];

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
coinTransactionRouter.get("/coin-transactions", (_req, res) => {
    const unit = new Unit(true);
    const service = new CoinTransactionService(unit);

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
coinTransactionRouter.get("/coin-transactions/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new CoinTransactionService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Coin transaction not found" });
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
coinTransactionRouter.get("/players/:playerId/coin-transactions", (req, res) => {
    const unit = new Unit(true);
    const service = new CoinTransactionService(unit);
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
 * /coin-transactions:
 *   post:
 *     summary: Create coin transaction
 *     description: Records a new coin transaction for a player
 *     tags:
 *       - CoinTransactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *               - amount
 *               - type
 *             properties:
 *               playerId:
 *                 type: integer
 *                 description: Player ID
 *               amount:
 *                 type: integer
 *                 description: Transaction amount (positive for earned, negative for spent)
 *               type:
 *                 type: string
 *                 enum: [trade_in, trade_out, mini_game, listing_sale, listing_purchase, admin_adjust]
 *                 description: Transaction type
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Coin transaction created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCoinTransactionResponse'
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
coinTransactionRouter.post("/coin-transactions", (req, res) => {
    const unit = new Unit(false);
    const service = new CoinTransactionService(unit);
    let ok = false;

    try {
        const { playerId, amount, type, description } = req.body;

        if (typeof playerId !== "number" || typeof amount !== "number" || typeof type !== "string") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId, amount, and type are required" });
            return;
        }

        if (!VALID_TYPES.includes(type)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
            return;
        }

        const [success, id] = service.create(playerId, amount, type, description ?? null);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ transactionId: id, message: "Coin transaction recorded" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record coin transaction" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /coin-transactions/{id}:
 *   delete:
 *     summary: Delete coin transaction
 *     description: Permanently removes a coin transaction
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
 *         description: Coin transaction deleted
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
 *         description: Coin transaction not found
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
coinTransactionRouter.delete("/coin-transactions/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new CoinTransactionService(unit);
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
            res.status(StatusCodes.OK).json({ message: "Coin transaction deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Coin transaction not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});
