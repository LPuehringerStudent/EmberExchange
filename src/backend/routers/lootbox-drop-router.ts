import express from "express";
import { Unit } from "../utils/unit";
import { LootboxDropService } from "../services/lootbox-drop-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const lootboxDropRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const msg = String(err);
    return msg.includes("FOREIGN KEY constraint failed") ||
        msg.includes("UNIQUE constraint failed");
}

/**
 * @openapi
 * /lootbox-drops:
 *   get:
 *     summary: Get all lootbox drops
 *     description: Retrieves all lootbox drop records
 *     tags:
 *       - LootboxDrops
 *     responses:
 *       200:
 *         description: List of all lootbox drops
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LootboxDrop'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
lootboxDropRouter.get("/lootbox-drops", (_req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);

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
 * /lootbox-drops/{id}:
 *   get:
 *     summary: Get lootbox drop by ID
 *     description: Retrieves a single lootbox drop by its ID
 *     tags:
 *       - LootboxDrops
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Drop ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Drop found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LootboxDrop'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Drop not found
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
lootboxDropRouter.get("/lootbox-drops/count", (_req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);

    try {
        const count = service.count();
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

lootboxDropRouter.get("/lootbox-drops/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox drop not found" });
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
 * /lootbox-drops/lootbox/{lootboxId}:
 *   get:
 *     summary: Get drop by lootbox ID
 *     description: Retrieves the drop associated with a specific lootbox
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
 *         description: Drop found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LootboxDrop'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No drop found for this lootbox
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
lootboxDropRouter.get("/lootbox-drops/lootbox/:lootboxId", (req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);
    const lootboxId = req.params.lootboxId;

    try {
        if (isNullOrWhiteSpace(lootboxId) || isNaN(Number(lootboxId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Lootbox ID must be a valid number" });
            return;
        }

        const response = service.getByLootboxId(Number(lootboxId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No drop found for this lootbox" });
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
 * /lootbox-drops/stove/{stoveId}:
 *   get:
 *     summary: Get drop by stove ID
 *     description: Retrieves the drop that produced a specific stove
 *     tags:
 *       - LootboxDrops
 *     parameters:
 *       - name: stoveId
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Drop found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LootboxDrop'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No drop found for this stove
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
lootboxDropRouter.get("/lootbox-drops/stove/:stoveId", (req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);
    const stoveId = req.params.stoveId;

    try {
        if (isNullOrWhiteSpace(stoveId) || isNaN(Number(stoveId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove ID must be a valid number" });
            return;
        }

        const response = service.getByStoveId(Number(stoveId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No drop found for this stove" });
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
 * /players/{playerId}/lootbox-drops:
 *   get:
 *     summary: Get player's lootbox drops
 *     description: Retrieves all drops from a player's lootboxes
 *     tags:
 *       - LootboxDrops
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of drops
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
lootboxDropRouter.get("/players/:playerId/lootbox-drops", (req, res) => {
    const unit = new Unit(true);
    const service = new LootboxDropService(unit);
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
 * /lootbox-drops:
 *   post:
 *     summary: Create lootbox drop
 *     description: Records a new drop from a lootbox (admin use)
 *     tags:
 *       - LootboxDrops
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lootboxId
 *               - stoveId
 *             properties:
 *               lootboxId:
 *                 type: integer
 *                 description: The lootbox that produced this drop
 *               stoveId:
 *                 type: integer
 *                 description: The stove that was dropped
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dropId:
 *                   type: integer
 *                 lootboxId:
 *                   type: integer
 *                 stoveId:
 *                   type: integer
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
lootboxDropRouter.post("/lootbox-drops", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxDropService(unit);
    let ok = false;

    try {
        const { lootboxId, stoveId } = req.body;

        if (typeof lootboxId !== "number" || typeof stoveId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "lootboxId and stoveId are required" });
            return;
        }

        const [success, id] = service.create(lootboxId, stoveId);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ dropId: id, lootboxId, stoveId });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create lootbox drop" });
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
 * /lootbox-drops/{id}:
 *   delete:
 *     summary: Delete lootbox drop
 *     description: Removes a lootbox drop record (admin use)
 *     tags:
 *       - LootboxDrops
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Drop ID
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
lootboxDropRouter.delete("/lootbox-drops/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxDropService(unit);
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
            res.status(StatusCodes.OK).json({ message: "Lootbox drop deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox drop not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

