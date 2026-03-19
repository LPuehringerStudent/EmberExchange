import express from "express";
import passport, { isOAuthConfigured } from "../utils/passport";

export const oauthRouter = express.Router();

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
oauthRouter.get("/oauth/google", (req, res, next) => {
    if (!isOAuthConfigured("google")) {
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
    passport.authenticate("google", {
        scope: ["profile", "email"],
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
oauthRouter.get("/oauth/google/callback", (req, res, next) => {
    if (!isOAuthConfigured("google")) {
        res.status(501).json({ error: "Google OAuth not configured" });
        return;
    }
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
        // Redirect to frontend with session ID
        res.redirect(`/oauth/callback?sessionId=${user.sessionId}&playerId=${user.playerId}`);
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
oauthRouter.get("/oauth/github", (req, res, next) => {
    if (!isOAuthConfigured("github")) {
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
    passport.authenticate("github", {
        scope: ["user:email"],
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
oauthRouter.get("/oauth/github/callback", (req, res, next) => {
    if (!isOAuthConfigured("github")) {
        res.status(501).json({ error: "GitHub OAuth not configured" });
        return;
    }
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
        // Redirect to frontend with session ID
        res.redirect(`/oauth/callback?sessionId=${user.sessionId}&playerId=${user.playerId}`);
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
