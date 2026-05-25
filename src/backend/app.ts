import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import passport, { configurePassport } from "./utils/passport";
import {Unit, ensureSampleDataInserted, resetDatabase, DB} from "./utils/unit";
import { RoomPlayerService } from "./services/room-player-service";
import { GameStateService } from "./services/game-state-service";
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
import { shopRouter } from "./routers/shop-router";
import { roomRouter } from "./routers/room-router";
import { gameRouter } from "./routers/game-router";
import { supportRouter } from "./routers/support-router";
import { githubRouter } from "./routers/github-router";
import { gloryRouter } from "./routers/glory-router";
import { notificationRouter } from "./routers/notification-router";
import { forgeryRouter } from "./routers/forgery-router";
import { friendRouter } from "./routers/friend-router";
import { tradeOfferRouter } from "./routers/trade-offer-router";
import { adminRouter } from "./routers/admin-router";
import { sparksRouter } from "./routers/sparks-router";
import { swaggerSpec } from "./swagger";
import { setupWebSocketServer, wssInstance } from "./websocket";
import cron from "node-cron";
import { ShopRotationService } from "./services/shop-rotation-service";


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
app.use("/api", shopRouter);
app.use("/api", roomRouter);
app.use("/api", gameRouter);
app.use("/api", supportRouter);
app.use("/api", githubRouter);
app.use("/api", gloryRouter);
app.use("/api", notificationRouter);
app.use("/api", forgeryRouter);
app.use("/api", friendRouter);
app.use("/api", tradeOfferRouter);
app.use("/api", adminRouter);
app.use("/api", sparksRouter);

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
    const server = app.listen(PORT, () => {
        console.log(`🚀 EmberExchange server running on http://localhost:${PORT}`);
        initDb()
            .then(() => cleanupStaleRoomPlayers())
            .then(() => performInitialShopRotation())
            .catch(err => console.error("Database initialization failed:", err));

        // Daily shop rotation at 00:00 UTC
        cron.schedule("0 0 * * *", async () => {
            console.log("🛒 Running daily shop rotation...");
            let unit: Unit | null = null;
            try {
                unit = await Unit.create(false);
                const rotationService = new ShopRotationService(unit);
                const result = await rotationService.rotate();
                await unit.complete(true);
                console.log(`✅ Shop rotated: featured [${result.newFeatured.join(", ")}]`);
            } catch (error) {
                console.error("❌ Daily shop rotation failed:", error);
                if (unit) {
                    try { await unit.complete(false); } catch { /* ignore */ }
                }
            }
        });
    });
    setupWebSocketServer(server);

    // Graceful shutdown for SIGTERM/SIGINT; immediate exit for SIGUSR2 (nodemon restart)
    const gracefulShutdown = (signal: string) => {
        console.log(`\n🛑 Received ${signal}, shutting down server...`);
        if (wssInstance) {
            wssInstance.clients.forEach((ws) => ws.terminate());
            wssInstance.close();
        }
        (server as any).closeAllConnections?.();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 1000);
    };
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    // Nodemon restart: exit immediately so the port releases before the new process starts
    process.on("SIGUSR2", () => {
        console.log("\n🛑 Received SIGUSR2, exiting for restart...");
        process.exit(0);
    });
}

async function initDb(): Promise<void> {
    let unit: Unit | null = null;
    try {
        // Phase 1: Create tables in a separate transaction so DDL persists
        // even if seeding fails later
        unit = await Unit.create(false);
        if (process.env.RESET_DB === "true") {
            const connection = unit.getConnection();
            await resetDatabase(connection);
        } else {
            await DB.ensureTablesCreated(unit.getConnection());
        }
        await unit.complete(true);

        // Phase 2: Seed data in a fresh transaction
        unit = await Unit.create(false);
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

async function performInitialShopRotation(): Promise<void> {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(false);
        const rotationService = new ShopRotationService(unit);
        const result = await rotationService.rotate();
        await unit.complete(true);
        console.log(`🛒 Initial shop rotation complete: featured [${result.newFeatured.join(", ")}]`);
    } catch (error) {
        console.error("Initial shop rotation failed:", error);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
    }
}

async function cleanupStaleRoomPlayers(): Promise<void> {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(false);
        const roomPlayerService = new RoomPlayerService(unit);
        const gameStateService = new GameStateService(unit);

        // Reset all 'connected' players to 'disconnected' on server restart
        // since all WebSocket connections were lost
        const resetStmt = unit.prepare<{ roomPlayerId: string; roomId: string }, Record<string, never>>(
            `SELECT roomPlayerId, roomId FROM RoomPlayer WHERE connectionState = 'connected'`
        );
        const connectedPlayers = await resetStmt.all();
        for (const player of connectedPlayers) {
            await roomPlayerService.updateConnectionState(player.roomPlayerId, 'disconnected');
        }
        if (connectedPlayers.length > 0) {
            console.log(`🔄 Reset ${connectedPlayers.length} player(s) from connected to disconnected (server restart)`);
        }

        const stmt = unit.prepare<{ roomPlayerId: string; roomId: string }, Record<string, never>>(
            `SELECT roomPlayerId, roomId FROM RoomPlayer
             WHERE connectionState = 'disconnected'
               AND disconnectedAt IS NOT NULL
               AND disconnectedAt < NOW() - INTERVAL '5 minutes'`
        );
        const stalePlayers = await stmt.all();

        for (const player of stalePlayers) {
            await roomPlayerService.removePlayer(player.roomPlayerId);

            const state = await gameStateService.getState(player.roomId);
            if (state) {
                const playersInRoom = await roomPlayerService.getPlayersInRoom(player.roomId);
                const baseBlob = (typeof state.stateBlob === "object" && state.stateBlob !== null)
                    ? state.stateBlob as Record<string, unknown>
                    : { players: [], status: "waiting", log: [] };

                const newBlob = {
                    ...baseBlob,
                    players: playersInRoom.map(p => ({
                        playerId: p.playerId,
                        username: p.username,
                        activeTitle: p.activeTitle,
                        activeBanner: p.activeBanner,
                        connectionState: p.connectionState,
                        seatIndex: p.seatIndex
                    }))
                };
                await gameStateService.updateState(player.roomId, newBlob, state.version);
            }
        }

        if (stalePlayers.length > 0) {
            console.log(`🧹 Cleaned up ${stalePlayers.length} stale disconnected player(s)`);
        }

        await unit.complete(true);
    } catch (error) {
        console.error("Cleanup of stale room players failed:", error);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
    }
}
