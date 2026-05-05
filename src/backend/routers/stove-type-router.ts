import express from "express";
import { Unit } from "../utils/unit";
import { StoveTypeService } from "../services/stove-type-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { Rarity } from "../../shared/model";

export const stoveTypeRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

/**
 * @openapi
 * /stove-types:
 *   get:
 *     summary: Get all stove types
 *     description: Retrieves a list of all stove types in the system
 *     tags:
 *       - StoveTypes
 *     responses:
 *       200:
 *         description: List of all stove types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveType'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeRouter.get("/stove-types", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveTypeService(unit);

    try {
        const response = await service.getAllStoveTypes();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stove-types/{id}:
 *   get:
 *     summary: Get stove type by ID
 *     description: Retrieves a single stove type by its unique ID
 *     tags:
 *       - StoveTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove type found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoveType'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove type not found
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
stoveTypeRouter.get("/stove-types/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveTypeService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getStoveTypeById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove type not found" });
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
 * /stove-types/rarity/{rarity}:
 *   get:
 *     summary: Get stove types by rarity
 *     description: Retrieves all stove types of a specific rarity
 *     tags:
 *       - StoveTypes
 *     parameters:
 *       - name: rarity
 *         in: path
 *         required: true
 *         description: Rarity level
 *         schema:
 *           type: string
 *           enum: [common, rare, epic, legendary, limited]
 *     responses:
 *       200:
 *         description: List of stove types with specified rarity
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoveType'
 *       400:
 *         description: Invalid rarity
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
stoveTypeRouter.get("/stove-types/rarity/:rarity", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveTypeService(unit);
    const rarity = req.params.rarity;

    try {
        const validRarities: Rarity[] = [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.LIMITED];
        if (!validRarities.includes(rarity as Rarity)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid rarity" });
            return;
        }

        const response = await service.getStoveTypesByRarity(rarity as Rarity);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /stove-types:
 *   post:
 *     summary: Create a new stove type
 *     description: Creates a new stove type definition
 *     tags:
 *       - StoveTypes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - imageUrl
 *               - rarity
 *               - lootboxWeight
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique name for the stove type
 *                 example: "Golden Dragon Stove"
 *               imageUrl:
 *                 type: string
 *                 description: URL to the stove's image
 *                 example: "/images/stoves/golden-dragon.png"
 *               rarity:
 *                 type: string
 *                 enum: [common, rare, epic, legendary, limited]
 *                 description: Rarity level
 *                 example: "legendary"
 *               lootboxWeight:
 *                 type: integer
 *                 description: Weight for lootbox drop probability (higher = more common)
 *                 example: 5
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Stove type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Stove type created successfully"
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Name already exists
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
stoveTypeRouter.post("/stove-types", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveTypeService(unit);
    let ok = false;

    try {
        const { name, imageUrl, rarity, lootboxWeight } = req.body;

        if (isNullOrWhiteSpace(name) || isNullOrWhiteSpace(imageUrl)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Name and imageUrl are required" });
            return;
        }

        const validRarities: Rarity[] = [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.LIMITED];
        if (!validRarities.includes(rarity as Rarity)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid rarity" });
            return;
        }

        if (typeof lootboxWeight !== "number" || lootboxWeight < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "lootboxWeight must be a positive number" });
            return;
        }

        // Check if name already exists
        const existing = await service.getStoveTypeByName(name);
        if (existing !== null) {
            res.status(StatusCodes.CONFLICT).json({ error: "Stove type name already exists" });
            return;
        }

        const [success, id] = await service.createStoveType(name, imageUrl, rarity as Rarity, lootboxWeight);

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ typeId: id, message: "Stove type created successfully" });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create stove type" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{id}/weight:
 *   patch:
 *     summary: Update stove type lootbox weight
 *     description: Updates the lootbox drop weight for a stove type
 *     tags:
 *       - StoveTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lootboxWeight
 *             properties:
 *               lootboxWeight:
 *                 type: integer
 *                 description: New lootbox weight (must be positive)
 *                 example: 10
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Weight updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Lootbox weight updated"
 *       400:
 *         description: Invalid ID or weight value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove type not found
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
stoveTypeRouter.patch("/stove-types/:id/weight", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveTypeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { lootboxWeight } = req.body;
        if (typeof lootboxWeight !== "number" || lootboxWeight < 1) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "lootboxWeight must be a positive number" });
            return;
        }

        const success = await service.updateLootboxWeight(Number(id), lootboxWeight);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Lootbox weight updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove type not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{id}/image:
 *   patch:
 *     summary: Update stove type image
 *     description: Updates the image URL for a stove type
 *     tags:
 *       - StoveTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove Type ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: New image URL
 *                 example: "/images/stoves/updated.png"
 *     responses:
 *       200:
 *         description: Image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Image URL updated"
 *       400:
 *         description: Invalid ID or URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove type not found
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
stoveTypeRouter.patch("/stove-types/:id/image", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveTypeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { imageUrl } = req.body;
        if (isNullOrWhiteSpace(imageUrl)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "imageUrl is required" });
            return;
        }

        const success = await service.updateImageUrl(Number(id), imageUrl);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Image URL updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove type not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /stove-types/{id}:
 *   delete:
 *     summary: Delete a stove type
 *     description: Permanently removes a stove type from the system
 *     tags:
 *       - StoveTypes
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Stove Type ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stove type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Stove type deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Stove type not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete stove type with existing stoves or references
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
stoveTypeRouter.delete("/stove-types/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new StoveTypeService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deleteStoveType(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Stove type deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Stove type not found" });
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
 * /stove-types/weight/total:
 *   get:
 *     summary: Get total lootbox weight
 *     description: Calculates the total lootbox weight of all stove types for probability calculations
 *     tags:
 *       - StoveTypes
 *     responses:
 *       200:
 *         description: Total weight calculated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TotalWeightResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
stoveTypeRouter.get("/stove-types/weight/total", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new StoveTypeService(unit);

    try {
        const totalWeight = await service.getTotalLootboxWeight();
        res.status(StatusCodes.OK).json({ totalWeight });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
