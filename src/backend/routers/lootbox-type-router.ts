import express from "express";
import { Unit } from "../utils/unit";
import { LootboxTypeService } from "../services/lootbox-type-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const lootboxTypeRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const msg = String(err);
    return msg.includes("FOREIGN KEY constraint failed") ||
        msg.includes("UNIQUE constraint failed");
}

/**
 * @openapi
 * /lootbox-types:
 *   get:
 *     summary: Get all lootbox types
 *     description: Retrieves all lootbox types including unavailable ones
 *     tags:
 *       - LootboxTypes
 *     responses:
 *       200:
 *         description: List of all lootbox types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LootboxType'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
lootboxTypeRouter.get("/lootbox-types", (_req, res) => {
    const unit = new Unit(true);
    const service = new LootboxTypeService(unit);

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
 * /lootbox-types/available:
 *   get:
 *     summary: Get available lootbox types
 *     description: Retrieves only available lootbox types
 *     tags:
 *       - LootboxTypes
 *     responses:
 *       200:
 *         description: List of available lootbox types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LootboxType'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
lootboxTypeRouter.get("/lootbox-types/available", (_req, res) => {
    const unit = new Unit(true);
    const service = new LootboxTypeService(unit);

    try {
        const response = service.getAvailable();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});

/**
 * @openapi
 * /lootbox-types/{id}:
 *   get:
 *     summary: Get lootbox type by ID
 *     description: Retrieves a single lootbox type by its ID
 *     tags:
 *       - LootboxTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lootbox type found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LootboxType'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Lootbox type not found
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
lootboxTypeRouter.get("/lootbox-types/:id", (req, res) => {
    const unit = new Unit(true);
    const service = new LootboxTypeService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox type not found" });
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
 * /lootbox-types:
 *   post:
 *     summary: Create lootbox type
 *     description: Creates a new lootbox type
 *     tags:
 *       - LootboxTypes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - costCoins
 *               - costFree
 *               - isAvailable
 *             properties:
 *               name:
 *                 type: string
 *                 description: Type name
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Type description
 *               costCoins:
 *                 type: integer
 *                 description: Cost in coins
 *               costFree:
 *                 type: boolean
 *                 description: Whether it's free
 *               dailyLimit:
 *                 type: integer
 *                 nullable: true
 *                 description: Daily limit (null for unlimited)
 *               isAvailable:
 *                 type: boolean
 *                 description: Availability status
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateLootboxTypeResponse'
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
lootboxTypeRouter.post("/lootbox-types", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxTypeService(unit);
    let ok = false;

    try {
        const { name, description, costCoins, costFree, dailyLimit, isAvailable } = req.body;

        if (isNullOrWhiteSpace(name)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "name is required" });
            return;
        }

        if (typeof costCoins !== "number" || costCoins < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "costCoins must be a non-negative number" });
            return;
        }

        if (typeof costFree !== "boolean") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "costFree must be a boolean" });
            return;
        }

        if (typeof isAvailable !== "boolean") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "isAvailable must be a boolean" });
            return;
        }

        const [success, id] = service.create(
            name,
            description ?? null,
            costCoins,
            costFree,
            dailyLimit ?? null,
            isAvailable
        );

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ lootboxTypeId: id, name });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create lootbox type" });
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
 * /lootbox-types/{id}:
 *   patch:
 *     summary: Update lootbox type
 *     description: Updates an existing lootbox type
 *     tags:
 *       - LootboxTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox type ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               costCoins:
 *                 type: integer
 *               costFree:
 *                 type: boolean
 *               dailyLimit:
 *                 type: integer
 *                 nullable: true
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid input
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
lootboxTypeRouter.patch("/lootbox-types/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxTypeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const existing = service.getById(Number(id));
        if (existing === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox type not found" });
            return;
        }

        const name = req.body.name ?? existing.name;
        const description = req.body.description !== undefined ? req.body.description : existing.description;
        const costCoins = req.body.costCoins ?? existing.costCoins;
        const costFree = req.body.costFree !== undefined ? req.body.costFree : existing.costFree;
        const dailyLimit = req.body.dailyLimit !== undefined ? req.body.dailyLimit : existing.dailyLimit;
        const isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : existing.isAvailable;

        const success = service.update(
            Number(id),
            name,
            description,
            costCoins,
            costFree,
            dailyLimit,
            isAvailable
        );

        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Lootbox type updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox type not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /lootbox-types/{id}/availability:
 *   patch:
 *     summary: Update lootbox type availability
 *     description: Toggles availability of a lootbox type
 *     tags:
 *       - LootboxTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox type ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: New availability status
 *     responses:
 *       200:
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid input
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
lootboxTypeRouter.patch("/lootbox-types/:id/availability", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxTypeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { isAvailable } = req.body;
        if (typeof isAvailable !== "boolean") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "isAvailable must be a boolean" });
            return;
        }

        const success = service.updateAvailability(Number(id), isAvailable);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Availability updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox type not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete(ok);
    }
});

/**
 * @openapi
 * /lootbox-types/{id}:
 *   delete:
 *     summary: Delete lootbox type
 *     description: Permanently removes a lootbox type
 *     tags:
 *       - LootboxTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Lootbox type ID
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
 *       409:
 *         description: Cannot delete (has associated lootboxes)
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
lootboxTypeRouter.delete("/lootbox-types/:id", (req, res) => {
    const unit = new Unit(false);
    const service = new LootboxTypeService(unit);
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
            res.status(StatusCodes.OK).json({ message: "Lootbox type deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Lootbox type not found" });
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
 * /lootbox-types/count:
 *   get:
 *     summary: Count lootbox types
 *     description: Returns total count of lootbox types
 *     tags:
 *       - LootboxTypes
 *     responses:
 *       200:
 *         description: Count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CountResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
lootboxTypeRouter.get("/lootbox-types/count", (_req, res) => {
    const unit = new Unit(true);
    const service = new LootboxTypeService(unit);

    try {
        const count = service.count();
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        unit.complete();
    }
});
