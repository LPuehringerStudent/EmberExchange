import express from "express";
import { Unit } from "../utils/unit";
import { PlayerService } from "../services/player-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const playerRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || 
           pgErr.code === "23505";
}

/**
 * @openapi
 * /players:
 *   get:
 *     summary: Get all players
 *     description: Retrieves a list of all players in the system
 *     tags:
 *       - Players
 *     responses:
 *       200:
 *         description: List of all players
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Player'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
playerRouter.get("/players", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerService(unit);

    try {
        const response = await service.getAllPlayers();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{id}:
 *   get:
 *     summary: Get player by ID
 *     description: Retrieves a single player by their unique ID
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Player'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
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
playerRouter.get("/players/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new PlayerService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({
                error: "ID must be a valid number"
            });
            return;
        }

        const response = await service.getInfoByID(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
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
 * /players:
 *   post:
 *     summary: Create a new player
 *     description: Creates a new player with the given username, password, email and optional initial values
 *     tags:
 *       - Players
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: Unique username for the player
 *                 example: "player123"
 *               password:
 *                 type: string
 *                 description: Player password (should be pre-hashed)
 *                 example: "hashedpassword123"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Unique email address for the player
 *                 example: "player@example.com"
 *               coins:
 *                 type: integer
 *                 description: Initial coin amount (default 1000)
 *                 example: 1500
 *               lootboxCount:
 *                 type: integer
 *                 description: Initial lootbox count (default 10)
 *                 example: 5
 *     responses:
 *       201:
 *         description: Player created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePlayerResponse'
 *       400:
 *         description: Username, password, or email is required or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Username or email already exists
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
playerRouter.post("/players", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    let ok = false;

    try {
        const { username, password, email, coins, lootboxCount } = req.body;

        // Validate required fields
        if (isNullOrWhiteSpace(username)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Username is required" });
            return;
        }

        if (isNullOrWhiteSpace(password)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Password is required" });
            return;
        }

        if (isNullOrWhiteSpace(email)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Email is required" });
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid email format" });
            return;
        }

        // Check if username already exists
        const existingUsername = await service.getPlayerByUsername(username);
        if (existingUsername !== null) {
            res.status(StatusCodes.CONFLICT).json({ error: "Username already exists" });
            return;
        }

        // Check if email already exists
        const existingEmail = await service.getPlayerByEmail(email);
        if (existingEmail !== null) {
            res.status(StatusCodes.CONFLICT).json({ error: "Email already exists" });
            return;
        }

        const [success, id] = await service.createPlayer(
            username,
            password,
            email,
            coins ?? 1000,
            lootboxCount ?? 10
        );

        if (success) {
            ok = true;
            res.status(StatusCodes.CREATED).json({ playerId: id, username });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create player" });
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
 * /players/{id}/coins:
 *   patch:
 *     summary: Update player coins
 *     description: Updates the coin balance of a specific player
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coins
 *             properties:
 *               coins:
 *                 type: integer
 *                 description: New coin amount (must be non-negative)
 *                 example: 2000
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Coins updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Coins updated"
 *       400:
 *         description: Invalid ID or coins value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation (e.g., foreign key constraint)
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
playerRouter.patch("/players/:id/coins", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { coins } = req.body;
        if (typeof coins !== "number" || coins < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Coins must be a non-negative number" });
            return;
        }

        const success = await service.updatePlayerCoins(Number(id), coins);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Coins updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
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
 * /players/{id}/lootboxes:
 *   patch:
 *     summary: Update player lootbox count
 *     description: Updates the number of lootboxes a player owns
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lootboxCount
 *             properties:
 *               lootboxCount:
 *                 type: integer
 *                 description: New lootbox count (must be non-negative)
 *                 example: 15
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Lootbox count updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Lootbox count updated"
 *       400:
 *         description: Invalid ID or lootbox count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Constraint violation (e.g., foreign key constraint)
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
playerRouter.patch("/players/:id/lootboxes", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const { lootboxCount } = req.body;
        if (typeof lootboxCount !== "number" || lootboxCount < 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "LootboxCount must be a non-negative number" });
            return;
        }

        const success = await service.updatePlayerLootboxCount(Number(id), lootboxCount);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Lootbox count updated" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
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
 * /players/{id}:
 *   delete:
 *     summary: Delete a player
 *     description: Permanently removes a player from the system
 *     tags:
 *       - Players
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Player ID to delete
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *             example:
 *               message: "Player deleted"
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Player not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete player with existing references (stoves, listings, etc.)
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
playerRouter.delete("/players/:id", async (req, res) => {
    const unit = await Unit.create(false);
    const service = new PlayerService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const success = await service.deletePlayer(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Player deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Player not found" });
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
