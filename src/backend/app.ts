import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import passport, { configurePassport } from "./utils/passport";
import {Unit, ensureSampleDataInserted, resetDatabase} from "./utils/unit";
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
app.get("/api/db-test", (_req, res) => {
    let unit: Unit | null = null;
    try {
        unit = new Unit(true);
        const stmt = unit.prepare<{ count: number }>("select count(*) as count from sqlite_master");
        const result = stmt.get();
        unit.complete();
        res.json({ status: "connected", tables: result?.count ?? 0 });
    } catch (error) {
        if (unit) {
            try { unit.complete(); } catch { /* ignore */ }
        }
        res.status(500).json({ status: "error", message: String(error) });
    }
});

// Start server first, then initialize DB
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 EmberExchange server running on http://localhost:${PORT}`);
        initDb();
    });
}

function initDb(): void {
    let unit: Unit | null = null;
    try {
        unit = new Unit(false);
        
        // Reset database to default state (drop and recreate tables)
        const connection = unit.getConnection();
        resetDatabase(connection);
        
        // Insert sample data fresh
        ensureSampleDataInserted(unit);
        console.log("✅ Database reset and sample data inserted");
        
        unit.complete(true);
    } catch (error) {
        console.error("Database initialization failed:", error);
        if (unit) {
            try { unit.complete(false); } catch { /* ignore */ }
        }
    }
}
