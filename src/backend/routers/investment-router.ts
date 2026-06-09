import express from "express";
import { Unit } from "../utils/unit";
import { InvestmentService } from "../services/investment-service";
import { StoveTypeStatisticsService } from "../services/stove-type-statistics-service";
import { requireAuth } from "../middleware/require-auth";
import { StatusCodes } from "http-status-codes";

export const investmentRouter = express.Router();

function generateTicker(name: string): string {
    const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
    return clean.slice(0, 4) || "STV";
}

const RARITY_BASE_PRICE: Record<string, number> = {
    common: 30,
    uncommon: 75,
    rare: 180,
    epic: 450,
    legendary: 1500,
    limited: 3000,
    secret: 8000,
};

/**
 * @openapi
 * /investments/assets:
 *   get:
 *     summary: List investable stove assets
 *     description: Returns all stove types with current pricing and stats
 *     tags:
 *       - Investments
 *     responses:
 *       200:
 *         description: Asset list
 *       500:
 *         description: Server error
 */
investmentRouter.get("/investments/assets", async (req, res) => {
    const unit = await Unit.create(true);
    const statsService = new StoveTypeStatisticsService(unit);
    const investmentService = new InvestmentService(unit);

    try {
        const stats = await statsService.getAll();

        // Fetch all stove type imageUrls in one query
        const typeIds = stats.map(s => s.stoveTypeId);
        const imageUrlMap = new Map<number, string>();
        if (typeIds.length > 0) {
            const placeholders = typeIds.map((_, i) => `@tid${i}`).join(", ");
            const params: Record<string, unknown> = {};
            typeIds.forEach((id, i) => { params[`tid${i}`] = id; });
            const imgStmt = unit.prepare<{ typeId: number; imageUrl: string }>(
                `SELECT typeId, imageUrl FROM StoveType WHERE typeId IN (${placeholders})`,
                params
            );
            const imgRows = await imgStmt.all();
            for (const row of imgRows) {
                imageUrlMap.set(row.typeId, row.imageUrl);
            }
        }

        const assets = [];
        for (const stat of stats) {
            const currentPrice = stat.averageSalePrice > 0
                ? stat.averageSalePrice
                : RARITY_BASE_PRICE[stat.rarity?.toLowerCase() ?? "common"] ?? 30;

            // Get 24h change from price history
            const history = await investmentService.getPriceHistory(stat.stoveTypeId, "1d");
            let previousPrice = currentPrice;
            if (history.length >= 2) {
                previousPrice = history[0].price;
            }
            const change24hAmount = currentPrice - previousPrice;
            const change24h = previousPrice > 0
                ? Math.round((change24hAmount / previousPrice) * 10000) / 100
                : 0;

            assets.push({
                assetId: stat.stoveTypeId,
                ticker: generateTicker(stat.name ?? ""),
                name: stat.name,
                description: stat.rarity ?? "",
                rarity: stat.rarity ?? "common",
                currentPrice,
                previousPrice,
                basePrice: RARITY_BASE_PRICE[stat.rarity?.toLowerCase() ?? "common"] ?? 30,
                imageUrl: imageUrlMap.get(stat.stoveTypeId) || "",
                volume30d: stat.salesLast30Days ?? 0,
                totalMinted: stat.totalMinted ?? 0,
                currentlyListed: stat.currentlyListed ?? 0,
            });
        }
        res.status(StatusCodes.OK).json({ assets });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /investments/buy:
 *   post:
 *     summary: Buy an investment position
 *     description: Purchases quantity of a stove type at current market price
 *     tags:
 *       - Investments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - quantity
 *             properties:
 *               assetId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Purchase result
 *       400:
 *         description: Invalid input or insufficient funds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
investmentRouter.post("/investments/buy", requireAuth, async (req, res) => {
    const { assetId, quantity } = req.body;

    if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "assetId must be a positive integer" });
        return;
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "quantity must be a positive integer" });
        return;
    }

    const unit = await Unit.create(false);
    const investmentService = new InvestmentService(unit);
    let ok = false;

    try {
        // Validate assetId is a real stove type
        const typeStmt = unit.prepare<{ typeId: number }>(
            "SELECT typeId FROM StoveType WHERE typeId = @typeId",
            { typeId: assetId }
        );
        const typeRow = await typeStmt.get();
        if (!typeRow) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid stove type" });
            await unit.complete(false);
            return;
        }

        const pricePerUnit = await investmentService.getAssetPrice(assetId);
        const [success, positionId] = await investmentService.buyPosition(
            req.playerId!,
            assetId,
            quantity,
            pricePerUnit
        );

        if (success) {
            ok = true;
            await investmentService.recordPortfolioSnapshot(req.playerId!);
            res.status(StatusCodes.OK).json({ success: true, positionId });
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: "Insufficient coins or purchase failed" });
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
 * /investments/sell:
 *   post:
 *     summary: Sell an investment position
 *     description: Sells quantity of a stove type at current market price
 *     tags:
 *       - Investments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - quantity
 *             properties:
 *               assetId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sale result
 *       400:
 *         description: Invalid input or insufficient position
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Cooldown active
 *       500:
 *         description: Server error
 */
investmentRouter.post("/investments/sell", requireAuth, async (req, res) => {
    const { assetId, quantity } = req.body;

    if (typeof assetId !== "number" || !Number.isInteger(assetId) || assetId < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "assetId must be a positive integer" });
        return;
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "quantity must be a positive integer" });
        return;
    }

    const unit = await Unit.create(false);
    const investmentService = new InvestmentService(unit);
    let ok = false;

    try {
        const cooldownOk = await investmentService.canSell(req.playerId!, assetId);
        if (!cooldownOk) {
            res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: "Cooldown active" });
            await unit.complete(false);
            return;
        }

        const position = await investmentService.getPosition(req.playerId!, assetId);
        if (!position || position.quantity < quantity) {
            res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient position" });
            await unit.complete(false);
            return;
        }

        const pricePerUnit = await investmentService.getAssetPrice(assetId);
        const [success, coinsReceived] = await investmentService.sellPosition(
            req.playerId!,
            assetId,
            quantity,
            pricePerUnit
        );

        if (success) {
            ok = true;
            const totalRevenue = quantity * pricePerUnit;
            const fee = Math.round(totalRevenue * 0.05);
            await investmentService.recordPortfolioSnapshot(req.playerId!);
            res.status(StatusCodes.OK).json({ success: true, coinsReceived, fee });
        } else {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: "Sale failed" });
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
 * /investments/portfolio:
 *   get:
 *     summary: Get player portfolio
 *     description: Returns all positions with current values and P&L
 *     tags:
 *       - Investments
 *     responses:
 *       200:
 *         description: Portfolio data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
investmentRouter.get("/investments/portfolio", requireAuth, async (req, res) => {
    const unit = await Unit.create(true);
    const investmentService = new InvestmentService(unit);

    try {
        const portfolio = await investmentService.getPortfolio(req.playerId!);
        res.status(StatusCodes.OK).json(portfolio);
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /investments/leaderboard:
 *   get:
 *     summary: Investment leaderboard
 *     description: Returns top investors sorted by total P&L
 *     tags:
 *       - Investments
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Leaderboard entries
 *       500:
 *         description: Server error
 */
investmentRouter.get("/investments/leaderboard", async (req, res) => {
    const unit = await Unit.create(true);
    const investmentService = new InvestmentService(unit);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    try {
        const investors = await investmentService.getLeaderboard(limit);
        res.status(StatusCodes.OK).json({ investors });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /investments/price-history:
 *   get:
 *     summary: Stove price history
 *     description: Returns historical prices for a stove type
 *     tags:
 *       - Investments
 *     parameters:
 *       - name: typeId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: range
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [1d, 1w, 1m]
 *     responses:
 *       200:
 *         description: Price history
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
investmentRouter.get("/investments/price-history", async (req, res) => {
    const typeId = Number(req.query.typeId);
    const range = req.query.range as string;

    if (!Number.isInteger(typeId) || typeId < 1) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "typeId must be a positive integer" });
        return;
    }
    if (!range || !["1d", "1w", "1m"].includes(range)) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid range" });
        return;
    }

    const unit = await Unit.create(true);
    const investmentService = new InvestmentService(unit);

    try {
        const prices = await investmentService.getPriceHistory(typeId, range as "1d" | "1w" | "1m");
        res.status(StatusCodes.OK).json({ prices });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete();
    }
});

/**
 * @openapi
 * /investments/record-prices:
 *   post:
 *     summary: Record current stove prices (admin)
 *     description: Snapshots all stove type prices into history
 *     tags:
 *       - Investments
 *     responses:
 *       200:
 *         description: Prices recorded
 *       500:
 *         description: Server error
 */
investmentRouter.post("/investments/record-prices", async (req, res) => {
    const unit = await Unit.create(false);
    const investmentService = new InvestmentService(unit);
    let ok = false;

    try {
        await investmentService.recordPrices();
        ok = true;
        res.status(StatusCodes.OK).json({ success: true });
    } catch (err) {
        console.error("Route error:", err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    } finally {
        await unit.complete(ok);
    }
});
