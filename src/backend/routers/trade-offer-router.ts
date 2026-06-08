import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { TradeOfferService } from "../services/trade-offer-service";
import { requireAuth } from "../middleware/require-auth";
import { connectionManager } from "../websocket/connection-manager";
import { StatusCodes } from "http-status-codes";

export const tradeOfferRouter = express.Router();

/**
 * @openapi
 * /trade-offers/{messageId}/accept:
 *   post:
 *     summary: Accept a trade offer
 *     description: Accepts a direct trade offer sent in chat
 *     tags:
 *       - TradeOffers
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trade completed
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       409:
 *         description: Trade cannot be completed
 *       500:
 *         description: Server error
 */
tradeOfferRouter.post("/trade-offers/:messageId/accept", requireAuth, async (req, res) => {
    const messageId = Number(req.params.messageId);
    if (isNaN(messageId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid message ID" });
        return;
    }

    const unit = await Unit.create(false);
    const tradeOfferService = new TradeOfferService(unit);
    let ok = false;

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await tradeOfferService.acceptTradeOffer(messageId, req.playerId!);
        if (result.success) {
            ok = true;
            // Notify sender in real-time if online
            if (result.senderId) {
                connectionManager.sendToPlayerGlobal(result.senderId, {
                    type: "trade_offer_update",
                    payload: { messageId, status: "accepted" }
                });
            }
            res.status(StatusCodes.OK).json({ message: "Trade offer accepted" });
        } else {
            res.status(StatusCodes.CONFLICT).json({ error: result.error });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});

/**
 * @openapi
 * /trade-offers/{messageId}/decline:
 *   post:
 *     summary: Decline a trade offer
 *     description: Declines a direct trade offer sent in chat
 *     tags:
 *       - TradeOffers
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trade declined
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid session
 *       404:
 *         description: Offer not found
 *       500:
 *         description: Server error
 */
tradeOfferRouter.post("/trade-offers/:messageId/decline", requireAuth, async (req, res) => {
    const messageId = Number(req.params.messageId);
    if (isNaN(messageId)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid message ID" });
        return;
    }

    const unit = await Unit.create(false);
    const tradeOfferService = new TradeOfferService(unit);
    let ok = false;

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await tradeOfferService.declineTradeOffer(messageId, req.playerId!);
        if (result.success) {
            ok = true;
            // Notify sender in real-time if online
            if (result.senderId) {
                connectionManager.sendToPlayerGlobal(result.senderId, {
                    type: "trade_offer_update",
                    payload: { messageId, status: "declined" }
                });
            }
            res.status(StatusCodes.OK).json({ message: "Trade offer declined" });
        } else {
            res.status(StatusCodes.NOT_FOUND).json({ error: result.error });
        }
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete(ok);
    }
});
