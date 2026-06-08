import express from "express";
import { Unit } from "../utils/unit";
import { checkPlayerBanned } from "../middleware/ban-check";
import { ShopService } from "../services/shop-service";
import { ShopRotationService } from "../services/shop-rotation-service";
import { QuestService } from "../services/quest-service";
import { RedeemCodeService } from "../services/redeem-code-service";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/admin";
import { StatusCodes } from "http-status-codes";

export const shopRouter = express.Router();

/**
 * @openapi
 * /shop/items:
 *   get:
 *     summary: List shop items
 *     description: Returns all active shop listings with stock and pricing
 *     tags:
 *       - Shop
 *     responses:
 *       200:
 *         description: List of shop items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
shopRouter.get("/shop/items", async (req, res) => {
    const unit = await Unit.create(true);
    const shopService = new ShopService(unit);

    try {
        const items = await shopService.getShopItems();
        res.status(StatusCodes.OK).json(items);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /shop/buy:
 *   post:
 *     summary: Buy a shop item
 *     description: Purchases an item from the shop with atomic coin deduction
 *     tags:
 *       - Shop
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
 *               - listingId
 *             properties:
 *               listingId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Purchase successful
 *       400:
 *         description: Invalid input or insufficient funds
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
shopRouter.post("/shop/buy", requireAuth, async (req, res) => {
    const { listingId } = req.body;
    if (!listingId || typeof listingId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "listingId is required" });
        return;
    }

    const unit = await Unit.create(false);
    const shopService = new ShopService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await shopService.purchaseItem(req.playerId!, listingId);
        if (result.success) {
            await unit.complete(true);
            res.status(StatusCodes.OK).json({ message: "Purchase successful", itemId: result.itemId });
        } else {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /shop/daily-status:
 *   get:
 *     summary: Get daily reward status
 *     description: Returns streak count, claim eligibility, and next reward
 *     tags:
 *       - Shop
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daily reward status
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
shopRouter.get("/shop/daily-status", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const shopService = new ShopService(unit);

    try {
        const status = await shopService.getDailyRewardStatus(req.playerId!);
        res.status(StatusCodes.OK).json(status);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /shop/claim-daily:
 *   post:
 *     summary: Claim daily reward
 *     description: Claims the daily login reward if eligible
 *     tags:
 *       - Shop
 *     parameters:
 *       - name: session-id
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reward claimed
 *       400:
 *         description: Already claimed or not eligible
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
/**
 * @openapi
 * /shop/sell:
 *   post:
 *     summary: Sell a stove to the shop
 *     description: Sells one of your stoves to the shop for a bad price
 *     tags:
 *       - Shop
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
 *               - stoveId
 *             properties:
 *               stoveId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sale successful
 *       400:
 *         description: Invalid input or item not sellable
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
shopRouter.post("/shop/sell", requireAuth, async (req, res) => {
    const { stoveId } = req.body;
    if (!stoveId || typeof stoveId !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "stoveId is required" });
        return;
    }

    const unit = await Unit.create(false);
    const shopService = new ShopService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await shopService.sellStove(req.playerId!, stoveId);
        if (result.success) {
            await unit.complete(true);
            res.status(StatusCodes.OK).json({ message: "Sold to shop", coinsReceived: result.coinsReceived });
        } else {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /shop/rotate:
 *   post:
 *     summary: Manually rotate shop featured items
 *     description: Admin endpoint to trigger a shop rotation immediately
 *     tags:
 *       - Shop
 *     parameters:
 *       - in: header
 *         name: session-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rotation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
shopRouter.post("/shop/rotate", requireAdmin, async (req, res) => {
    const unit = await Unit.create(false);

    try {
        const rotationService = new ShopRotationService(unit);
        const result = await rotationService.rotate();
        await unit.complete(true);
        res.status(StatusCodes.OK).json(result);
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

/**
 * @openapi
 * /shop/redeem:
 *   post:
 *     summary: Redeem a code
 *     description: Redeems a promotional code for coins and/or lootboxes
 *     tags:
 *       - Shop
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
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Code redeemed successfully
 *       400:
 *         description: Invalid code or already redeemed
 *       401:
 *         description: Invalid session
 *       500:
 *         description: Server error
 */
shopRouter.post("/shop/redeem", requireAuth, async (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "code is required" });
        return;
    }

    const unit = await Unit.create(false);
    const redeemService = new RedeemCodeService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await redeemService.redeemCode(req.playerId!, code);
        if (result.success) {
            await unit.complete(true);
            res.status(StatusCodes.OK).json({
                message: "Code redeemed successfully",
                rewardCoins: result.rewardCoins,
                rewardLootboxes: result.rewardLootboxes,
                rewardSparks: result.rewardSparks,
                rewardSpins: result.rewardSpins,
            });
        } else {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});

shopRouter.post("/shop/claim-daily", requireAuth, async (req, res) => {
    const unit = await Unit.create(false);
    const shopService = new ShopService(unit);

    try {
        if (await checkPlayerBanned(unit, req.playerId!, res)) {
            await unit.complete(false);
            return;
        }

        const result = await shopService.claimDailyReward(req.playerId!);
        if (result.success) {
            // Track quest progress
            try {
                const questService = new QuestService(unit);
                await questService.trackProgress(req.playerId!, 'claim_daily', 1);
            } catch {
                // Ignore quest tracking errors
            }

            await unit.complete(true);
            res.status(StatusCodes.OK).json({
                message: `Claimed day ${result.newStreak} reward`,
                reward: result.reward,
                newStreak: result.newStreak
            });
        } else {
            await unit.complete(false);
            res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
        }
    } catch (err) {
        await unit.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: String(err) });
    }
});
