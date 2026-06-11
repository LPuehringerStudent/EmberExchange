import express from "express";
import crypto from "crypto";
import passport, { isOAuthConfigured } from "../utils/passport";

const OAUTH_COOKIE_SECRET = process.env.SESSION_SECRET || process.env.OAUTH_COOKIE_SECRET || "default-oauth-secret-change-me";
import { authRateLimiter, oauthCallbackRateLimiter } from "../middleware/rate-limiter";
import { turnstileMiddleware } from "../middleware/turnstile";
import { logSecurityEvent } from "../services/security-event-service";
import { getClientIp } from "../utils/bot-trap";

export const oauthRouter = express.Router();

/* ─── OAuth state store (in-memory, 10-min expiry) ─── */
interface OAuthState {
    provider: string;
    expiresAt: number;
    turnstileValid: boolean;
}
const oauthStateStore = new Map<string, OAuthState>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function createOAuthState(provider: string, turnstileValid: boolean): string {
    const state = crypto.randomBytes(32).toString("hex");
    oauthStateStore.set(state, { provider, expiresAt: Date.now() + OAUTH_STATE_TTL_MS, turnstileValid });
    return state;
}

function validateOAuthState(state: string, provider: string): boolean {
    const entry = oauthStateStore.get(state);
    if (!entry) return false;
    oauthStateStore.delete(state);
    return entry.provider === provider && entry.expiresAt > Date.now() && entry.turnstileValid;
}

// Periodic cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of oauthStateStore) {
        if (val.expiresAt < now) oauthStateStore.delete(key);
    }
}, 60_000);

/**
 * @openapi
 * /oauth/google:
 *   get:
 *     summary: Initiate Google OAuth
 *     description: Redirects to Google for authentication
 *     tags:
 *       - OAuth
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth
 *       501:
 *         description: Google OAuth not configured
 */
oauthRouter.get("/oauth/google", authRateLimiter.middleware(), turnstileMiddleware, (req, res, next) => {
    if (res.locals.turnstileFailed) {
        console.warn("[OAuth] Google initiation blocked — Turnstile failed");
        logSecurityEvent({
            ipAddress: getClientIp(req),
            userAgent: req.headers["user-agent"] as string | undefined,
            eventType: "oauth_fail",
            path: req.path,
            method: req.method,
            details: "Google OAuth blocked — Turnstile failed",
        });
        res.redirect("/login?error=Security+check+failed");
        return;
    }
    console.log("[OAuth] Google initiation requested");
    if (!isOAuthConfigured("google")) {
        console.warn("[OAuth] Google OAuth not configured — missing env vars");
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
    const state = createOAuthState("google", !res.locals.turnstileFailed);
    console.log("[OAuth] Google state created, setting cookie");
    res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: true, maxAge: OAUTH_STATE_TTL_MS });
    passport.authenticate("google", {
        scope: ["profile", "email"],
        state,
    })(req, res, next);
});

/**
 * @openapi
 * /oauth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google OAuth
 *     tags:
 *       - OAuth
 *     responses:
 *       302:
 *         description: Redirects to frontend with session
 *       401:
 *         description: Authentication failed
 */
oauthRouter.get("/oauth/google/callback", oauthCallbackRateLimiter.middleware(), (req, res, next) => {
    console.log("[OAuth] Google callback received");
    if (!isOAuthConfigured("google")) {
        console.warn("[OAuth] Google callback rejected — not configured");
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.oauth_state;
    console.log(`[OAuth] Google callback — state query: ${state ? "present" : "missing"}, cookie: ${cookieState ? "present" : "missing"}`);
    if (!state || !cookieState || !validateOAuthState(state, "google") || state !== cookieState) {
        console.warn(`[OAuth] Google state validation failed — query=${!!state}, cookie=${!!cookieState}, match=${state === cookieState}`);
        res.clearCookie("oauth_state");
        res.redirect("/login?error=Invalid+OAuth+state");
        return;
    }
    console.log("[OAuth] Google state validated, calling passport.authenticate");
    res.clearCookie("oauth_state");
    passport.authenticate("google", { session: false }, (err: Error | null, user: any) => {
        if (err) {
            console.error("[OAuth] Google passport auth error:", err.message);
            res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
            return;
        }
        if (!user) {
            console.warn("[OAuth] Google passport returned no user");
            res.redirect("/login?error=Authentication failed");
            return;
        }
        console.log(`[OAuth] Google auth success — playerId=${user.playerId}`);
        const payload = JSON.stringify({ sessionId: user.sessionId, playerId: user.playerId });
        const signature = crypto.createHmac("sha256", OAUTH_COOKIE_SECRET).update(payload).digest("hex");
        res.cookie("oauth_session", `${signature}.${payload}`, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 60_000,
        });
        res.redirect("/oauth/callback");
    })(req, res, next);
});

/**
 * @openapi
 * /oauth/github:
 *   get:
 *     summary: Initiate GitHub OAuth
 *     description: Redirects to GitHub for authentication
 *     tags:
 *       - OAuth
 *     responses:
 *       302:
 *         description: Redirects to GitHub OAuth
 *       501:
 *         description: GitHub OAuth not configured
 */
oauthRouter.get("/oauth/github", authRateLimiter.middleware(), turnstileMiddleware, (req, res, next) => {
    if (res.locals.turnstileFailed) {
        console.warn("[OAuth] GitHub initiation blocked — Turnstile failed");
        logSecurityEvent({
            ipAddress: getClientIp(req),
            userAgent: req.headers["user-agent"] as string | undefined,
            eventType: "oauth_fail",
            path: req.path,
            method: req.method,
            details: "GitHub OAuth blocked — Turnstile failed",
        });
        res.redirect("/login?error=Security+check+failed");
        return;
    }
    console.log("[OAuth] GitHub initiation requested");
    if (!isOAuthConfigured("github")) {
        console.warn("[OAuth] GitHub OAuth not configured — missing env vars");
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
    const state = createOAuthState("github", !res.locals.turnstileFailed);
    console.log("[OAuth] GitHub state created, setting cookie");
    res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", secure: true, maxAge: OAUTH_STATE_TTL_MS });
    passport.authenticate("github", {
        scope: ["user:email"],
        state,
    })(req, res, next);
});

/**
 * @openapi
 * /oauth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: Handles the callback from GitHub OAuth
 *     tags:
 *       - OAuth
 *     responses:
 *       302:
 *         description: Redirects to frontend with session
 *       401:
 *         description: Authentication failed
 */
oauthRouter.get("/oauth/github/callback", oauthCallbackRateLimiter.middleware(), (req, res, next) => {
    console.log("[OAuth] GitHub callback received");
    if (!isOAuthConfigured("github")) {
        console.warn("[OAuth] GitHub callback rejected — not configured");
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.oauth_state;
    console.log(`[OAuth] GitHub callback — state query: ${state ? "present" : "missing"}, cookie: ${cookieState ? "present" : "missing"}`);
    if (!state || !cookieState || !validateOAuthState(state, "github") || state !== cookieState) {
        console.warn(`[OAuth] GitHub state validation failed — query=${!!state}, cookie=${!!cookieState}, match=${state === cookieState}`);
        res.clearCookie("oauth_state");
        res.redirect("/login?error=Invalid+OAuth+state");
        return;
    }
    console.log("[OAuth] GitHub state validated, calling passport.authenticate");
    res.clearCookie("oauth_state");
    passport.authenticate("github", { session: false }, (err: Error | null, user: any) => {
        if (err) {
            console.error("[OAuth] GitHub passport auth error:", err.message);
            res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
            return;
        }
        if (!user) {
            console.warn("[OAuth] GitHub passport returned no user");
            res.redirect("/login?error=Authentication failed");
            return;
        }
        console.log(`[OAuth] GitHub auth success — playerId=${user.playerId}`);
        const payload = JSON.stringify({ sessionId: user.sessionId, playerId: user.playerId });
        const signature = crypto.createHmac("sha256", OAUTH_COOKIE_SECRET).update(payload).digest("hex");
        res.cookie("oauth_session", `${signature}.${payload}`, {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 60_000,
        });
        res.redirect("/oauth/callback");
    })(req, res, next);
});

/**
 * @openapi
 * /oauth/status:
 *   get:
 *     summary: Check OAuth configuration status
 *     description: Returns which OAuth providers are configured
 *     tags:
 *       - OAuth
 *     responses:
 *       200:
 *         description: OAuth status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 google:
 *                   type: boolean
 *                 github:
 *                   type: boolean
 */
/**
 * @openapi
 * /oauth/session:
 *   get:
 *     summary: Exchange OAuth session cookie
 *     description: Exchanges the short-lived oauth_session cookie for session data. Called by the frontend callback page.
 *     tags: [OAuth]
 *     responses:
 *       200:
 *         description: Session data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No OAuth session cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limited
 */
oauthRouter.get("/oauth/session", authRateLimiter.middleware(), (req, res) => {
    const raw = req.cookies?.oauth_session;
    if (!raw) {
        res.status(401).json({ error: "No OAuth session cookie" });
        return;
    }
    try {
        const dotIndex = raw.indexOf(".");
        if (dotIndex === -1) {
            res.status(400).json({ error: "Invalid OAuth session cookie" });
            return;
        }
        const receivedSig = raw.slice(0, dotIndex);
        const payload = raw.slice(dotIndex + 1);
        const expectedSig = crypto.createHmac("sha256", OAUTH_COOKIE_SECRET).update(payload).digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))) {
            res.status(400).json({ error: "Invalid OAuth session cookie" });
            return;
        }
        const data = JSON.parse(payload);
        if (typeof data.sessionId !== "string" || typeof data.playerId !== "number") {
            res.status(400).json({ error: "Invalid OAuth session cookie" });
            return;
        }
        // Clear the one-time cookie
        res.clearCookie("oauth_session");
        res.json({ sessionId: data.sessionId, playerId: data.playerId });
    } catch {
        res.status(400).json({ error: "Invalid OAuth session cookie" });
    }
});

oauthRouter.get("/oauth/status", (_req, res) => {
    res.json({
        google: isOAuthConfigured("google"),
        github: isOAuthConfigured("github"),
    });
});
