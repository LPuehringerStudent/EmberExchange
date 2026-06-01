import express from "express";
import crypto from "crypto";
import passport, { isOAuthConfigured } from "../utils/passport";
import { authRateLimiter, oauthCallbackRateLimiter } from "../middleware/rate-limiter";

export const oauthRouter = express.Router();

/* ─── OAuth state store (in-memory, 10-min expiry) ─── */
interface OAuthState {
    provider: string;
    expiresAt: number;
}
const oauthStateStore = new Map<string, OAuthState>();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function createOAuthState(provider: string): string {
    const state = crypto.randomBytes(32).toString("hex");
    oauthStateStore.set(state, { provider, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
    return state;
}

function validateOAuthState(state: string, provider: string): boolean {
    const entry = oauthStateStore.get(state);
    if (!entry) return false;
    oauthStateStore.delete(state);
    return entry.provider === provider && entry.expiresAt > Date.now();
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
oauthRouter.get("/oauth/google", authRateLimiter.middleware(), (req, res, next) => {
    if (!isOAuthConfigured("google")) {
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
    const state = createOAuthState("google");
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
    if (!isOAuthConfigured("google")) {
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.oauth_state;
    if (!state || !cookieState || !validateOAuthState(state, "google") || state !== cookieState) {
        res.clearCookie("oauth_state");
        res.redirect("/login?error=Invalid+OAuth+state");
        return;
    }
    res.clearCookie("oauth_state");
    passport.authenticate("google", { session: false }, (err: Error | null, user: any) => {
        if (err) {
            console.error("Google OAuth error:", err);
            res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
            return;
        }
        if (!user) {
            res.redirect("/login?error=Authentication failed");
            return;
        }
        // Set session in a short-lived cookie instead of URL query param
        res.cookie("oauth_session", JSON.stringify({ sessionId: user.sessionId, playerId: user.playerId }), {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 60_000, // 1 minute — frontend reads it immediately
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
oauthRouter.get("/oauth/github", authRateLimiter.middleware(), (req, res, next) => {
    if (!isOAuthConfigured("github")) {
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
    const state = createOAuthState("github");
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
    if (!isOAuthConfigured("github")) {
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.oauth_state;
    if (!state || !cookieState || !validateOAuthState(state, "github") || state !== cookieState) {
        res.clearCookie("oauth_state");
        res.redirect("/login?error=Invalid+OAuth+state");
        return;
    }
    res.clearCookie("oauth_state");
    passport.authenticate("github", { session: false }, (err: Error | null, user: any) => {
        if (err) {
            console.error("GitHub OAuth error:", err);
            res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
            return;
        }
        if (!user) {
            res.redirect("/login?error=Authentication failed");
            return;
        }
        // Set session in a short-lived cookie instead of URL query param
        res.cookie("oauth_session", JSON.stringify({ sessionId: user.sessionId, playerId: user.playerId }), {
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            maxAge: 60_000, // 1 minute — frontend reads it immediately
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
oauthRouter.get("/oauth/status", (_req, res) => {
    res.json({
        google: isOAuthConfigured("google"),
        github: isOAuthConfigured("github"),
    });
});
