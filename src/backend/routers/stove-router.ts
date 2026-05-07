import express from "express";
import { Unit } from "../utils/unit";
import { StoveService } from "../services/stove-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const stoveRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

/**
 * @openapi
 * /stoves:
 *   get:
 *     summary: Get all stoves
 *     description: Retrieves a list of all stove instances in the system
 *     tags:
 *       - Stoves
 *     responses:
 *       200:
 *         description: List of all stoves
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Stove'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveRouter.get("/stoves", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);

    try {
        const response = await service.getAllStoves();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stoves/{id}:
 *   get:
 *     summary: Get stove by ID
 *     description: Retrieves a single stove by its unique ID
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stove'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove not found
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
stoveRouter.get("/stoves/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getStoveById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove not found" });
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
 * /players/{playerId}/stoves:
 *   get:
 *     summary: Get player's stoves
 *     description: Retrieves all stoves owned by a specific player
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of player's stoves
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Stove'
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
stoveRouter.get("/players/:playerId/stoves", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getStovesByOwnerId(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stove-types/{typeId}/stoves:
 *   get:
 *     summary: Get stoves by type
 *     description: Retrieves all stove instances of a specific type
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of stoves of the specified type
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Stove'
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
stoveRouter.get("/stove-types/:typeId/stoves", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);
    const typeId = req.params.typeId;

    try {
        if (isNullOrWhiteSpace(typeId) || isNaN(Number(typeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Type ID must be a valid number" });
            return;
        }

        const response = await service.getStovesByTypeId(Number(typeId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stoves:
 *   post:
 *     summary: Create a new stove (mint)
 *     description: Creates a new stove instance and assigns it to an owner
 *     tags:
 *       - Stoves
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - typeId
 *               - currentOwnerId
 *             properties:
 *               typeId:
 *                 type: integer
 *                 description: Stove type ID
 *                 example: 1
 *               currentOwnerId:
 *                 type: integer
 *                 description: Initial owner's player ID
 *                 example: 5
 *     responses:
 *       201:
 *         description: Stove created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Stove minted successfully"
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
stoveRouter.post("/stoves", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveService(unit);
    let ok = false;

    try {
        const { typeId, currentOwnerId } = req.body;

        if (typeof typeId !== "number" || typeof currentOwnerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "typeId and currentOwnerId are required" });
            return;
        }

        const [success, id] = await service.createStove(typeId, currentOwnerId);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ stoveId: id, message: "Stove minted successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create stove" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stoves/{id}/owner:
 *   patch:
 *     summary: Transfer stove ownership
 *     description: Updates the owner of a stove (for trades/transfers)
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerId
 *             properties:
 *               newOwnerId:
 *                 type: integer
 *                 description: New owner's player ID
 *                 example: 10
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Ownership transferred"
 *       400:
 *         description: Invalid ID or missing newOwnerId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove not found
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
stoveRouter.patch("/stoves/:id/owner", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { newOwnerId } = req.body;
        if (typeof newOwnerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "newOwnerId is required" });
            return;
        }

        const success = await service.updateOwner(Number(id), newOwnerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Ownership transferred" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stoves/{id}:
 *   delete:
 *     summary: Delete a stove
 *     description: Permanently removes a stove instance from the system
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Stove deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete stove with existing references (listings, ownership history, etc.)
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
stoveRouter.delete("/stoves/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteStove(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Stove deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove not found" });
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

/**
 * @openapi
 * /players/{playerId}/stoves/count:
 *   get:
 *     summary: Count player's stoves
 *     description: Returns the number of stoves owned by a player
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResponse'
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
stoveRouter.get("/players/:playerId/stoves/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const count = await service.countStovesByOwner(Number(playerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stove-types/{typeId}/stoves/count:
 *   get:
 *     summary: Count stoves by type
 *     description: Returns the total number of stoves of a specific type
 *     tags:
 *       - Stoves
 *     parameters:
 *       - name: typeId
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResponse'
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
stoveRouter.get("/stove-types/:typeId/stoves/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveService(unit);
    const typeId = req.params.typeId;

    try {
        if (isNullOrWhiteSpace(typeId) || isNaN(Number(typeId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Type ID must be a valid number" });
            return;
        }

        const count = await service.countStovesByType(Number(typeId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
