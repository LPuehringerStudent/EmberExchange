import express from "express";
import { Unit } from "../utils/unit";
import { FriendService } from "../services/friend-service";
import { SessionService } from "../services/session-service";
import { NotificationService } from "../services/notification-service";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";

export const friendRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" || pgErr.code === "23505";
}

/**
 * @openapi
 * /friends/list:
 *   get:
 *     summary: Get friend list
 *     description: Retrieves all accepted friends of the current player
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of friends
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
friendRouter.get("/friends/list", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const friends = await friendService.getFriends(session.playerId);
        res.status(StatusCodes.OK).json(friends);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /friends/pending:
 *   get:
 *     summary: Get pending friend requests
 *     description: Retrieves incoming pending friend requests for the current player
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pending requests
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
friendRouter.get("/friends/pending", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const pending = await friendService.getPendingRequests(session.playerId);
        res.status(StatusCodes.OK).json(pending);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /friends/sent:
 *   get:
 *     summary: Get sent friend requests
 *     description: Retrieves outgoing pending friend requests from the current player
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of sent requests
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
friendRouter.get("/friends/sent", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const unit = await Unit.create(true);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            return;
        }

        const sent = await friendService.getSentRequests(session.playerId);
        res.status(StatusCodes.OK).json(sent);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /friends/request:
 *   post:
 *     summary: Send friend request
 *     description: Sends a friend request to another player by username
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addresseeId
 *             properties:
 *               addresseeId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Request sent
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       409:
 *         description: Duplicate or blocked
 *       500:
 *         description: Server error
 */
friendRouter.post("/friends/request", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { addresseeId } = req.body;
    if (typeof addresseeId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "addresseeId is required" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);
    const notificationService = new NotificationService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const [success, friendId] = await friendService.sendRequest(session.playerId, addresseeId);
        if (success) {
            await notificationService.create(
                addresseeId,
                "friend_request",
                "New friend request",
                `${session.playerId} sent you a friend request`,
                { requesterId: session.playerId, friendId }
            );
            ok = true;
            res.status(StatusCodes.CREATED).json({ friendId, message: "Friend request sent" });
        } else {
            res.status(StatusCodes.CONFLICT).json({ error: "Friend request already exists or user is blocked" });
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
 * /friends/respond:
 *   post:
 *     summary: Respond to friend request
 *     description: Accepts or declines a pending friend request
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - friendId
 *               - accept
 *             properties:
 *               friendId:
 *                 type: integer
 *               accept:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Response processed
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       404:
 *         description: Request not found
 *       500:
 *         description: Server error
 */
friendRouter.post("/friends/respond", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { friendId, accept } = req.body;
    if (typeof friendId !== "number" || typeof accept !== "boolean") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "friendId and accept are required" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const success = await friendService.respondToRequest(friendId, session.playerId, accept);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: accept ? "Friend request accepted" : "Friend request declined" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Friend request not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /friends/{id}:
 *   delete:
 *     summary: Remove friend or cancel request
 *     description: Removes an accepted friendship or cancels a pending request
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Removed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       404:
 *         description: Not found
 *       500:
 *         description: Server error
 */
friendRouter.delete("/friends/:id", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const id = req.params.id;
    if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const success = await friendService.removeFriend(Number(id), session.playerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Friend removed" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Friend relationship not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /friends/block:
 *   post:
 *     summary: Block a player
 *     description: Blocks a player from sending friend requests or chat messages
 *     tags:
 *       - Friends
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Player blocked
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       409:
 *         description: Cannot block yourself
 *       500:
 *         description: Server error
 */
friendRouter.post("/friends/block", async (req, res) => {
    const sessionId = req.headers["session-id"] as string;
    if (!sessionId) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing session-id header" });
        return;
    }

    const { playerId } = req.body;
    if (typeof playerId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "playerId is required" });
        return;
    }

    const unit = await Unit.create(false);
    const sessionService = new SessionService(unit);
    const friendService = new FriendService(unit);
    let ok = false;

    try {
        const session = await sessionService.getSession(sessionId);
        if (!session) {
            res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired session" });
            await unit.complete(false);
            return;
        }

        const [success, friendId] = await friendService.blockPlayer(session.playerId, playerId);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ friendId, message: "Player blocked" });
        } else {
            res.status(StatusCodes.CONFLICT).json({ error: "Cannot block yourself" });
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
