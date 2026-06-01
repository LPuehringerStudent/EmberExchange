import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import express from "express";
import cookieParser from "cookie-parser";
import { StatusCodes } from "http-status-codes";
import path from "path";
import fs from "fs";
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
import { pityRouter } from "./routers/pity-router";
import { collectionRouter } from "./routers/collection-router";
import { questRouter } from "./routers/quest-router";
import { honeypotRouter } from "./routers/honeypot-router";
import { swaggerSpec } from "./swagger";
import { setupWebSocketServer, wssInstance } from "./websocket";
import { antiBotConfig } from "./utils/anti-bot-config";
import { ipBanCheck } from "./middleware/ip-ban-check";
import { requireAdmin } from "./middleware/admin";
import cron from "node-cron";
import { ShopRotationService } from "./services/shop-rotation-service";
import { SessionService } from "./services/session-service";
import { PlayerService } from "./services/player-service";


export const app = express();
const PORT = process.env.PORT || 3000;

// Security headers first (CSP disabled — external resources like Google Fonts,
// Font Awesome, and Turnstile make a strict CSP too fragile for this app)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Redirect old Render subdomain to custom domain
app.use((req, res, next) => {
    if (req.hostname === "emberexchange.onrender.com") {
        res.redirect(301, `https://emberexchange.xyz${req.originalUrl}`);
        return;
    }
    next();
});

// Compression — gzip responses for text/json assets
app.use(compression());

// CORS — whitelist frontend origin only
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";
const allowedOrigins = new Set([
    FRONTEND_URL,
    "http://localhost:4200",
    "http://localhost:3000",
]);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Prototype pollution protection: strip dangerous keys from req.body
const FORBIDDEN_BODY_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function sanitizeBody(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(sanitizeBody);
    }
    if (obj !== null && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (!FORBIDDEN_BODY_KEYS.has(key)) {
                result[key] = sanitizeBody(value);
            }
        }
        return result;
    }
    return obj;
}
app.use((req, _res, next) => {
    if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
        req.body = sanitizeBody(req.body);
    }
    next();
});

app.use(cookieParser());
app.use(ipBanCheck);
app.use(passport.initialize());

// Configure Passport
configurePassport();

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Honeypot routes MUST come before real routes so they catch scanners first
app.use("/api", honeypotRouter);

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
app.use("/api", sparksRouter);
app.use("/api", pityRouter);
app.use("/api", collectionRouter);
app.use("/api", questRouter);

// Health check endpoint (before admin router so it is not caught by requireAdmin)
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Turnstile site key endpoint (public — needed by frontend to render widget)
// NOTE: The siteverify check is also bypassed when the request includes the
// header `X-Bypass-Turnstile: monitoring`. This is used by the uptime checker.
app.get("/api/turnstile/sitekey", (_req, res) => {
    const siteKey = process.env.TURNSTILE_SITE_KEY;
    if (!siteKey) {
        res.status(500).json({ error: "Turnstile site key not configured" });
        return;
    }
    res.json({ siteKey });
});

// Admin router MUST come after all public routers — its requireAdmin middleware
// runs for every request that enters it, so if it is mounted early it blocks
// all later /api/* routes for non-admin users.
app.use("/api", adminRouter);

// Static files (frontend) - serve Angular build output
app.use(express.static(path.join(process.cwd(), "src/frontend/dist/ember-frontend/browser")));

// Serve index.html for all non-API routes (Angular client-side routing)
// We dynamically inject anti-bot configuration so the real trap mechanics
// are never visible in the public GitHub repo.
app.use((req, res, next) => {
    // Don't interfere with API routes
    if (req.path.startsWith("/api") || req.path.startsWith("/api-docs")) {
        next();
        return;
    }

    const indexPath = path.join(process.cwd(), "src/frontend/dist/ember-frontend/browser/index.html");
    let html: string;
    try {
        html = fs.readFileSync(indexPath, "utf8");
    } catch {
        res.status(500).send("Frontend build not found");
        return;
    }

    res.setHeader("Content-Type", "text/html");
    res.send(html);
});

// Test database connection endpoint — ALWAYS admin-only
app.get("/api/db-test", requireAdmin, async (_req, res) => {
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
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

// Global error handler — prevents leaking stack traces in production
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    const isDev = process.env.NODE_ENV !== "production";
    const message = isDev
        ? (err?.message || "Internal server error")
        : "Internal server error";
    const status = err?.status || err?.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    res.status(status).json({ error: message });
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
