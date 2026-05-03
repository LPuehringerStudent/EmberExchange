import express from "express";
import { Unit } from "../utils/unit";
import { OwnershipService } from "../services/ownership-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const ownershipRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

/**
 * @openapi
 * /ownerships:
 *   get:
 *     summary: Get all ownership records
 *     description: Retrieves a list of all ownership history records
 *     tags:
 *       - Ownerships
 *     responses:
 *       200:
 *         description: List of all ownership records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ownership'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ownershipRouter.get("/ownerships", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);

    try {
        const response = await service.getAllOwnerships();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /ownerships/{id}:
 *   get:
 *     summary: Get ownership record by ID
 *     description: Retrieves a single ownership record by its unique ID
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ownership Record ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ownership record found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ownership'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ownership record not found
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
ownershipRouter.get("/ownerships/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getOwnershipById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Ownership record not found" });
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
 * /stoves/{stoveId}/ownership-history:
 *   get:
 *     summary: Get ownership history for a stove
 *     description: Retrieves the complete ownership chain for a specific stove
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: stoveId
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of ownership records for the stove
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ownership'
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
ownershipRouter.get("/stoves/:stoveId/ownership-history", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const stoveId = req.params.stoveId;

    try {
        if (isNullOrWhiteSpace(stoveId) || isNaN(Number(stoveId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove ID must be a valid number" });
            return;
        }

        const response = await service.getOwnershipHistoryByStoveId(Number(stoveId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/ownerships:
 *   get:
 *     summary: Get player's ownership records
 *     description: Retrieves all stoves acquired by a specific player
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of ownership records for the player
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ownership'
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
ownershipRouter.get("/players/:playerId/ownerships", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getOwnershipsByPlayerId(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /ownerships:
 *   post:
 *     summary: Create ownership record
 *     description: Records a new stove acquisition
 *     tags:
 *       - Ownerships
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stoveId
 *               - playerId
 *               - acquiredHow
 *             properties:
 *               stoveId:
 *                 type: integer
 *                 description: Stove ID
 *                 example: 42
 *               playerId:
 *                 type: integer
 *                 description: Player who acquired the stove
 *                 example: 5
 *               acquiredHow:
 *                 type: string
 *                 enum: [lootbox, trade, mini-game]
 *                 description: How the stove was acquired
 *                 example: "lootbox"
 *     responses:
 *       201:
 *         description: Ownership record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Ownership recorded successfully"
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation (e.g., invalid stoveId or playerId)
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
ownershipRouter.post("/ownerships", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new OwnershipService(unit);
    let ok = false;

    try {
        const { stoveId, playerId, acquiredHow } = req.body;

        if (typeof stoveId !== "number" || typeof playerId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "stoveId and playerId are required" });
            return;
        }

        if (!["lootbox", "trade", "mini-game"].includes(acquiredHow)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "acquiredHow must be 'lootbox', 'trade', or 'mini-game'" });
            return;
        }

        const [success, id] = await service.createOwnership(stoveId, playerId, acquiredHow);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ ownershipId: id, message: "Ownership recorded successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to record ownership" });
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
 * /stoves/{stoveId}/current-owner:
 *   get:
 *     summary: Get current owner of a stove
 *     description: Retrieves the current ownership record for a stove
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: stoveId
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Current ownership record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ownership'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No ownership record found
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
ownershipRouter.get("/stoves/:stoveId/current-owner", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const stoveId = req.params.stoveId;

    try {
        if (isNullOrWhiteSpace(stoveId) || isNaN(Number(stoveId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove ID must be a valid number" });
            return;
        }

        const response = await service.getCurrentOwnership(Number(stoveId));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "No ownership record found" });
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
 * /ownerships/{id}:
 *   delete:
 *     summary: Delete ownership record
 *     description: Permanently removes an ownership record from the system
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ownership Record ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ownership record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Ownership record deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ownership record not found
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
ownershipRouter.delete("/ownerships/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new OwnershipService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteOwnership(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Ownership record deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Ownership record not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stoves/{stoveId}/ownership-changes/count:
 *   get:
 *     summary: Count ownership changes
 *     description: Returns the number of times a stove has changed owners
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: stoveId
 *         in: path
 *         required: true
 *         description: Stove ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Count of ownership changes
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
ownershipRouter.get("/stoves/:stoveId/ownership-changes/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const stoveId = req.params.stoveId;

    try {
        if (isNullOrWhiteSpace(stoveId) || isNaN(Number(stoveId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Stove ID must be a valid number" });
            return;
        }

        const count = await service.countOwnershipChanges(Number(stoveId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/acquired-stoves/count:
 *   get:
 *     summary: Count stoves acquired by player
 *     description: Returns the number of stoves a player has acquired
 *     tags:
 *       - Ownerships
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Count of acquired stoves
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
ownershipRouter.get("/players/:playerId/acquired-stoves/count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new OwnershipService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const count = await service.countStovesAcquiredByPlayer(Number(playerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
