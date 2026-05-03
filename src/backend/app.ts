import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import passport, { configurePassport } from "./utils/passport";
import {Unit, ensureSampleDataInserted, resetDatabase, DB} from "./utils/unit";
import { playerRouter } from "./routers/player-router";
import { lootboxRouter } from "./routers/lootbox-router";
import { stoveTypeRouter } from "./routers/stove-type-router";
import { stoveRouter } from "./routers/stove-router";
import { ownershipRouter } from "./routers/ownership-router";
import { priceHistoryRouter } from "./routers/price-history-router";
import { listingRouter } from "./routers/listing-router";
import { tradeRouter } from "./routers/trade-router";
import { lootboxTypeRouter } from "./routers/lootbox-type-router";
import { lootboxDropRouter } from "./routers/lootbox-drop-router";
import { miniGameSessionRouter } from "./routers/mini-game-session-router";
import { chatMessageRouter } from "./routers/chat-message-router";
import { playerStatisticsRouter } from "./routers/player-statistics-router";
import { dailyStatisticsRouter } from "./routers/daily-statistics-router";
import { stoveTypeStatisticsRouter } from "./routers/stove-type-statistics-router";
import { loginHistoryRouter } from "./routers/login-history-router";
import { coinTransactionRouter } from "./routers/coin-transaction-router";
import { authRouter } from "./routers/auth-router";
import { oauthRouter } from "./routers/oauth-router";
import { swaggerSpec } from "./swagger";


export const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Configure Passport
configurePassport();

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes - MUST come before static files and catch-all
app.use("/api", playerRouter);
app.use("/api", lootboxRouter);
app.use("/api", stoveTypeRouter);
app.use("/api", stoveRouter);
app.use("/api", ownershipRouter);
app.use("/api", priceHistoryRouter);
app.use("/api", listingRouter);
app.use("/api", tradeRouter);
app.use("/api", lootboxTypeRouter);
app.use("/api", lootboxDropRouter);
app.use("/api", miniGameSessionRouter);
app.use("/api", chatMessageRouter);
app.use("/api", playerStatisticsRouter);
app.use("/api", dailyStatisticsRouter);
app.use("/api", stoveTypeStatisticsRouter);
app.use("/api", loginHistoryRouter);
app.use("/api", coinTransactionRouter);
app.use("/api", authRouter);
app.use("/api", oauthRouter);

// Static files (frontend) - serve Angular build output
app.use(express.static(path.join(process.cwd(), "src/frontend/dist/ember-frontend/browser")));

// Serve index.html for all non-API routes (Angular client-side routing)
app.use((req, res, next) => {
    // Don't interfere with API routes
    if (req.path.startsWith("/api") || req.path.startsWith("/api-docs")) {
        next();
        return;
    }
    res.sendFile(path.join(process.cwd(), "src/frontend/dist/ember-frontend/browser/index.html"));
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test database connection endpoint
app.get("/api/db-test", async (_req, res) => {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(true);
        const stmt = unit.prepare<{ count: number }>("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
        const result = await stmt.get();
        await unit.complete();
        res.json({ status: "connected", tables: result?.count ?? 0 });
    } catch (error) {
        if (unit) {
            try { await unit.complete(); } catch { /* ignore */ }
        }
        res.status(500).json({ status: "error", message: String(error) });
    }
});

// Start server first, then initialize DB
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 EmberExchange server running on http://localhost:${PORT}`);
        initDb().catch(err => console.error("Database initialization failed:", err));
    });
}

async function initDb(): Promise<void> {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(false);
        
        // Reset database only when explicitly requested
        if (process.env.RESET_DB === "true") {
            const connection = unit.getConnection();
            await resetDatabase(connection);
        } else {
            await DB.ensureTablesCreated(unit.getConnection());
        }
        
        // Insert sample data if tables are empty
        await ensureSampleDataInserted(unit);
        console.log("✅ Database initialized and sample data ready");
        
        await unit.complete(true);
    } catch (error) {
        console.error("Database initialization failed:", error);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
    }
}
