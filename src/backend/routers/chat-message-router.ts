import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { ChatMessageService } from "../services/chat-message-service";
import { NotificationService } from "../services/notification-service";
import { connectionManager } from "../websocket/connection-manager";
import { StatusCodes } from "http-status-codes";
import { isNullOrWhiteSpace } from "../utils/util";
import { requireAuth } from "../middleware/require-auth";

export const chatMessageRouter = express.Router();

function isConstraintError(err: unknown): boolean {
    const pgErr = err as { code?: string };
    return pgErr.code === "23503" ||
        pgErr.code === "23505";
}

/**
 * @openapi
 * /chat-messages:
 *   get:
 *     summary: Get all chat messages
 *     description: Retrieves all chat messages ordered by most recent
 *     tags:
 *       - ChatMessages
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
chatMessageRouter.get("/chat-messages", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);

    try {
        const response = await service.getAll();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /chat-messages/global:
 *   get:
 *     summary: Get global messages
 *     description: Retrieves all global chat messages
 *     tags:
 *       - ChatMessages
 *     responses:
 *       200:
 *         description: List of global messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
chatMessageRouter.get("/chat-messages/global", async (_req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);

    try {
        const response = await service.getGlobalMessages();
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /chat-messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     description: Retrieves a single chat message by its ID
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Message found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Message not found
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
chatMessageRouter.get("/chat-messages/:id", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const id = req.params.id;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const response = await service.getById(Number(id));
        if (response === null) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Message not found" });
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
 * /players/{playerId}/sent-messages:
 *   get:
 *     summary: Get player's sent messages
 *     description: Retrieves all messages sent by a player
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
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
chatMessageRouter.get("/players/:playerId/sent-messages", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getBySender(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/received-messages:
 *   get:
 *     summary: Get player's received messages
 *     description: Retrieves all messages received by a player
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
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
chatMessageRouter.get("/players/:playerId/received-messages", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getByReceiver(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /players/{playerId}/unread-messages:
 *   get:
 *     summary: Get player's unread messages
 *     description: Retrieves all unread messages for a player
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of unread messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
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
chatMessageRouter.get("/players/:playerId/unread-messages", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const response = await service.getUnreadByReceiver(Number(playerId));
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /chat-messages/conversation/{player1Id}/{player2Id}:
 *   get:
 *     summary: Get conversation between players
 *     description: Retrieves all messages between two players
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: player1Id
 *         in: path
 *         required: true
 *         description: First player ID
 *         schema:
 *           type: integer
 *       - name: player2Id
 *         in: path
 *         required: true
 *         description: Second player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatMessage'
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
chatMessageRouter.get("/chat-messages/conversation/:player1Id/:player2Id", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const player1Id = req.params.player1Id;
    const player2Id = req.params.player2Id;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    try {
        if (isNullOrWhiteSpace(player1Id) || isNaN(Number(player1Id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player 1 ID must be a valid number" });
            return;
        }
        if (isNullOrWhiteSpace(player2Id) || isNaN(Number(player2Id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player 2 ID must be a valid number" });
            return;
        }

        const p1 = Number(player1Id);
        const p2 = Number(player2Id);
        if (req.playerId !== p1 && req.playerId !== p2) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only view conversations you are part of" });
            return;
        }

        const response = await service.getConversationPaginated(p1, p2, limit, offset);
        res.status(StatusCodes.OK).json(response);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /chat-messages:
 *   post:
 *     summary: Send chat message
 *     description: Sends a new chat message (global or private)
 *     tags:
 *       - ChatMessages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - content
 *             properties:
 *               senderId:
 *                 type: integer
 *                 description: Sender's player ID
 *               receiverId:
 *                 type: integer
 *                 nullable: true
 *                 description: Receiver's player ID (null for global)
 *               content:
 *                 type: string
 *                 description: Message content
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateChatMessageResponse'
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
chatMessageRouter.post("/chat-messages", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ChatMessageService(unit);
    let ok = false;

    try {
        const { senderId, receiverId, content, messageType, data } = req.body;

        if (typeof senderId !== "number") {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "senderId is required" });
            return;
        }
        if (req.playerId !== senderId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only send messages as yourself" });
            return;
        }

        if (isNullOrWhiteSpace(content)) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "content is required" });
            return;
        }

        // Check sender is not banned
        if (await checkPlayerBanned(unit, senderId, res)) {
            return;
        }

        const msgType: 'text' | 'trade_offer' = messageType === 'trade_offer' ? 'trade_offer' : 'text';
        const msgData: Record<string, unknown> = typeof data === 'object' && data !== null ? data : {};

        const [success, id] = await service.create(senderId, receiverId ?? null, content, msgType, msgData);

        if (success) {
            // Push to recipient if online
            let pushed = false;
            if (receiverId && typeof receiverId === "number") {
                pushed = connectionManager.sendToPlayerGlobal(receiverId, {
                    type: "chat_message",
                    payload: {
                        messageId: id,
                        senderId,
                        receiverId,
                        content,
                        sentAt: new Date().toISOString(),
                        isRead: false,
                        messageType: msgType,
                        data: msgData
                    }
                });

                // If offline, create notification
                if (!pushed) {
                    const notificationService = new NotificationService(unit);
                    await notificationService.create(
                        receiverId,
                        "chat_message",
                        "New message",
                        content.length > 60 ? content.slice(0, 60) + "..." : content,
                        { senderId, messageId: id }
                    );
                }
            }
            ok = true;
            res.status(StatusCodes.CREATED).json({ messageId: id, senderId, receiverId: receiverId ?? null, messageType: msgType });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send message" });
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
 * /chat-messages/{id}/read:
 *   patch:
 *     summary: Mark message as read
 *     description: Marks a specific message as read
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Marked as read
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
 *         description: Message not found
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
chatMessageRouter.patch("/chat-messages/:id/read", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ChatMessageService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const message = await service.getById(Number(id));
        if (!message) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Message not found" });
            await unit.complete(false);
            return;
        }
        if (message.receiverId !== req.playerId && message.senderId !== req.playerId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only mark your own messages as read" });
            await unit.complete(false);
            return;
        }
        const success = await service.markAsRead(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Message marked as read" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Message not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /chat-messages/{id}:
 *   delete:
 *     summary: Delete message
 *     description: Removes a chat message
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Message ID
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
 *         description: Message not found
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
chatMessageRouter.delete("/chat-messages/:id", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const service = new ChatMessageService(unit);
    const id = req.params.id;
    let ok = false;

    try {
        if (isNullOrWhiteSpace(id) || isNaN(Number(id))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "ID must be a valid number" });
            return;
        }

        const message = await service.getById(Number(id));
        if (!message) {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Message not found" });
            await unit.complete(false);
            return;
        }
        if (message.receiverId !== req.playerId && message.senderId !== req.playerId) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "You can only delete your own messages" });
            await unit.complete(false);
            return;
        }
        const success = await service.delete(Number(id));
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Message deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Message not found" });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /players/{playerId}/unread-count:
 *   get:
 *     summary: Get unread message count
 *     description: Returns the number of unread messages for a player
 *     tags:
 *       - ChatMessages
 *     parameters:
 *       - name: playerId
 *         in: path
 *         required: true
 *         description: Player ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Count retrieved
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
chatMessageRouter.get("/players/:playerId/unread-count", async (req, res) => {
    const unit = await Unit.create(true);
    const service = new ChatMessageService(unit);
    const playerId = req.params.playerId;

    try {
        if (isNullOrWhiteSpace(playerId) || isNaN(Number(playerId))) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Player ID must be a valid number" });
            return;
        }

        const count = await service.countUnread(Number(playerId));
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});
