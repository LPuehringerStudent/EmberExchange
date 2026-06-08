import express from "express";
import { Unit } from "../utils/unit";
import { NotificationService } from "../services/notification-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const notificationRouter = express.Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Get player notifications
 *     description: Retrieves all notifications for the current player, newest first
 *     tags:
 *       - Notifications
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
notificationRouter.get("/notifications", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const notificationService = new NotificationService(unit);

    try {
        const notifications = await notificationService.getByPlayerId(req.playerId!);
        res.status(StatusCodes.OK).json(notifications);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Returns the number of unread notifications for the current player
 *     tags:
 *       - Notifications
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unread count
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
notificationRouter.get("/notifications/unread-count", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const notificationService = new NotificationService(unit);

    try {
        const count = await notificationService.getUnreadCount(req.playerId!);
        res.status(StatusCodes.OK).json({ count });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Marks a specific notification as read
 *     tags:
 *       - Notifications
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
 *         description: Marked as read
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
notificationRouter.patch("/notifications/:id/read", requireAuth, async (req, res) => {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid notification ID" });
        return;
    }

    const unit = await Unit.create(false);
    const notificationService = new NotificationService(unit);
    let ok = false;

    try {
        const success = await notificationService.markAsRead(notificationId, req.playerId!);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Notification marked as read" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Notification not found or does not belong to you" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all notifications for the current player as read
 *     tags:
 *       - Notifications
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All marked as read
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
notificationRouter.patch("/notifications/read-all", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const notificationService = new NotificationService(unit);
    let ok = false;

    try {
        const count = await notificationService.markAllAsRead(req.playerId!);
        ok = true;
        res.status(StatusCodes.OK).json({ message: "All notifications marked as read", count });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Removes a notification from the player's inbox
 *     tags:
 *       - Notifications
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
 *         description: Deleted successfully
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
notificationRouter.delete("/notifications/:id", requireAuth, async (req, res) => {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid notification ID" });
        return;
    }

    const unit = await Unit.create(false);
    const notificationService = new NotificationService(unit);
    let ok = false;

    try {
        const success = await notificationService.delete(notificationId, req.playerId!);
        if (success) {
            ok = true;
            res.status(StatusCodes.OK).json({ message: "Notification deleted" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: "Notification not found or does not belong to you" });
        }
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});
