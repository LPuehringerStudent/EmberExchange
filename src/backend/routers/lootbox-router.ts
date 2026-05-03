import express from "express";
import { Unit } from "../utils/unit";
import { LootboxService } from "../services/lootbox-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const lootboxRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

/**
 * @openapi
 * /lootboxes:
 *   get:
 *     summary: Get all lootboxes
 *     description: Retrieves a list of all opened lootboxes in the system
 *     tags:
 *       - Lootboxes
 *     responses:
 *       200:
 *         description: List of all lootboxes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lootbox'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
lootboxRouter.get("/lootboxes", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new LootboxService(unit);

    try {
        const response = await service.getAllLootboxes();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /lootboxes/{id}:
 *   get:
 *     summary: Get lootbox by ID
 *     description: Retrieves a single lootbox by its unique ID
 *     tags:
 *       - Lootboxes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lootbox found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lootbox'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lootbox not found
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
lootboxRouter.get("/lootboxes/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new LootboxService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getLootboxById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox not found" });
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
 * /players/{playerId}/lootboxes:
 *   get:
 *     summary: Get player's lootboxes
 *     description: Retrieves all lootboxes opened by a specific player
 *     tags:
 *       - Lootboxes
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of player's lootboxes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lootbox'
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
lootboxRouter.get("/players/:playerId/lootboxes", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new LootboxService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getLootboxesByPlayerId(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /lootboxes:
 *   post:
 *     summary: Create a new lootbox
 *     description: Records a new lootbox opening
 *     tags:
 *       - Lootboxes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lootboxTypeId
 *               - playerId
 *               - acquiredHow
 *             properties:
 *               lootboxTypeId:
 *                 type: integer
 *                 description: Type of lootbox opened
 *                 example: 1
 *               playerId:
 *                 type: integer
 *                 description: Player who opened the lootbox
 *                 example: 5
 *               acquiredHow:
 *                 type: string
 *                 enum: [free, purchase, reward]
 *                 description: How the lootbox was acquired
 *                 example: "purchase"
 *     responses:
 *       201:
 *         description: Lootbox created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Lootbox opened successfully"
 *       400:
 *         description: Missing required fields
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
lootboxRouter.post("/lootboxes", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new LootboxService(unit);
    let ok = false;

    try {
        const { lootboxTypeId, playerId, acquiredHow } = req.body;

        if (typeof lootboxTypeId !== "number" || typeof playerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "lootboxTypeId and playerId are required" });
            return;
        }

        if (!["free", "purchase", "reward"].includes(acquiredHow)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "acquiredHow must be 'free', 'purchase', or 'reward'" });
            return;
        }

        const [success, id] = await service.createLootbox(lootboxTypeId, playerId, acquiredHow);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ lootboxId: id, message: "Lootbox opened successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create lootbox" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /lootboxes/{id}/open:
 *   post:
 *     summary: Open a lootbox from inventory
 *     description: Consumes an unopened lootbox, determines the drop server-side, creates the stove, and records the drop.
 *     tags:
 *       - Lootboxes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Unopened lootbox ID
 *         schema:
 *           type: integer
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
 *                 description: Player who owns the lootbox
 *                 example: 2
 *     responses:
 *       201:
 *         description: Lootbox opened successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OpenLootboxResponse'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Lootbox does not belong to player or is already opened
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
lootboxRouter.post("/lootboxes/:id/open", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new LootboxService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Lootbox ID must be a valid number" });
            return;
        }

        const { playerId } = req.body;
        if (typeof playerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId is required" });
            return;
        }

        const [success, result] = await service.openLootbox(Number(id), playerId);

        if (success && result) {
            ok = true;
            res.status(StatusCodes.CREATED).json({
                stoveId: result.stoveId,
                stoveName: result.stoveName,
                rarity: result.rarity,
                imageUrl: result.imageUrl,
                lootboxId: result.lootboxId,
                message: "Lootbox opened successfully"
            });
        } else {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Lootbox not found, already opened, or does not belong to player" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /lootboxes/{id}:
 *   delete:
 *     summary: Delete a lootbox
 *     description: Permanently removes a lootbox record from the system
 *     tags:
 *       - Lootboxes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lootbox deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Lootbox deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lootbox not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete lootbox with existing drops
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
lootboxRouter.delete("/lootboxes/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new LootboxService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteLootbox(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Lootbox deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox not found" });
        }
    } catch (err) {
        if (isConstraintError(err)) {
            res.status(StatusCodes.CONFLICT).json({ error: String(err) });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
        }
    } finally {
        await unit.complete(ok);
    }
});


// LootboxDrop Routes

/**
 * @openapi
 * /lootboxes/{lootboxId}/drops:
 *   get:
 *     summary: Get drops for a lootbox
 *     description: Retrieves all stove drops from a specific lootbox
 *     tags:
 *       - LootboxDrops
 *     parameters:
 *       - name: lootboxId
 *         in: path
 *         required: true
 *         description: Lootbox ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of drops from the lootbox
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LootboxDrop'
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
lootboxRouter.get("/lootboxes/:lootboxId/drops", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new LootboxService(unit);
    const lootboxId = req.params.lootboxId;

    try {
        if (isNullOrWhiteSpace(lootboxId) || isNaN(Number(lootboxId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Lootbox ID must be a valid number" });
            return;
        }

        const response = await service.getDropsByLootboxId(Number(lootboxId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

