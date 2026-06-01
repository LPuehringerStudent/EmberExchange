import { Router } from "express";
import { logBot, tarPit, setBotHeaders, getClientIp } from "../utils/bot-trap";
import { antiBotConfig } from "../utils/anti-bot-config";
import { Unit } from "../utils/unit";
import { PunishmentService } from "../services/punishment-service";

export const honeypotRouter = Router();

/**
 * Fake responses for honeypot endpoints. These look realistic enough to
 * waste an attacker's time but contain zero real data.
 */
const fakeResponses: Record<string, () => unknown> = {
    "/admin/bulk-delete": () => ({
        message: "Bulk delete initiated successfully",
        affectedRows: 9999,
        tables: ["players", "sessions", "transactions"],
        duration: "0.004s",
    }),
    "/free-coins": () => ({
        message: "5000 coins credited to your account",
        newBalance: 999999,
        bonusApplied: true,
        promoCode: "ADMIN_BACKDOOR_2025",
    }),
    "/debug/config": () => ({
        environment: "production",
        database: {
            host: "honeypot.internal.cloud",
            port: 5432,
            username: "admin",
            password: "hunter2-definitely-real",
            name: "ember_exchange_prod",
        },
        jwtSecret: "totally-real-secret-do-not-steal-please",
        adminKey: "sk-live-51Hz...",
        redisUrl: "redis://internal-cache:6379",
    }),
    "/internal/sessions": () => [
        { sessionId: "fake-session-admin-1", playerId: 1, username: "admin", role: "superadmin", expiresAt: "2099-12-31T23:59:59Z" },
        { sessionId: "fake-session-mod-2", playerId: 2, username: "moderator", role: "moderator", expiresAt: "2099-12-31T23:59:59Z" },
        { sessionId: "fake-session-dev-3", playerId: 3, username: "dev", role: "developer", expiresAt: "2099-12-31T23:59:59Z" },
    ],
    "/auth/legacy-login": () => ({
        token: "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhZG1pbiI6dHJ1ZSwicm9sZSI6InN1cGVyYWRtaW4ifQ.",
        admin: true,
        role: "superadmin",
        message: "Legacy authentication successful. Welcome back, master.",
    }),
    "/admin/export-users": () => ({
        format: "csv",
        totalUsers: 999999,
        downloadUrl: "https://honeypot.internal/exports/users.csv?token=admin-secret",
        expiresIn: "24h",
    }),
};

/**
 * Register all honeypot endpoints from runtime configuration.
 * These routes are NOT hardcoded — they come from env vars so that
 * a public repo doesn't reveal the exact paths.
 */
for (const endpoint of antiBotConfig.honeypotEndpoints) {
    const responseFn = fakeResponses[endpoint] ?? (() => ({ message: "Operation completed", status: "ok" }));

    honeypotRouter.all(endpoint, async (req, res) => {
        logBot(req, `honeypot:${req.path}`);
        setBotHeaders(res);
        await tarPit(req);

        // Record violation so PunishmentService can auto-ban repeat offenders
        try {
            const unit = await Unit.create(false);
            const punishmentService = new PunishmentService(unit);
            await punishmentService.recordViolation(getClientIp(req), null, "honeypot_triggered", `Hit honeypot endpoint ${req.path}`);
            await unit.complete(true);
        } catch {
            // Ignore punishment errors — log and tar-pit still happened
        }

        res.json(responseFn());
    });
}
