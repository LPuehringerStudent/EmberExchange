import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Unit } from "./unit";
import { PlayerService } from "../services/player-service";
import { PlayerStatisticsService } from "../services/player-statistics-service";
import { SessionService } from "../services/session-service";
import crypto from "crypto";

// Environment variables (must be set in production)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Configure Passport strategies for OAuth authentication.
 * This function should be called after the database is initialized.
 */
export function configurePassport(): void {
    // Serialize/deserialize user for session support
    passport.serializeUser((user: any, done) => {
        done(null, user.playerId);
    });

    passport.deserializeUser((playerId: number, done) => {
        done(null, { playerId });
    });

    // Configure Google OAuth strategy
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    callbackURL: `${BASE_URL}/api/oauth/google/callback`,
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const result = await handleOAuthLogin("google", profile);
                        done(null, result);
                    } catch (err) {
                        done(err as Error, false);
                    }
                }
            )
        );
    }

    // Configure GitHub OAuth strategy
    if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
        passport.use(
            new GitHubStrategy(
                {
                    clientID: GITHUB_CLIENT_ID,
                    clientSecret: GITHUB_CLIENT_SECRET,
                    callbackURL: `${BASE_URL}/api/oauth/github/callback`,
                },
                async (accessToken: string, refreshToken: string, profile: any, done: (err: Error | null, user?: any) => void) => {
                    try {
                        const result = await handleOAuthLogin("github", profile);
                        done(null, result);
                    } catch (err) {
                        done(err as Error, false);
                    }
                }
            )
        );
    }
}

/**
 * Handle OAuth login/signup.
 * Finds existing user by OAuth provider ID or creates a new user.
 * Returns user data with session.
 */
async function handleOAuthLogin(
    provider: "google" | "github",
    profile: any
): Promise<{ playerId: number; sessionId: string }> {
    const unit = await Unit.create(false);
    const playerService = new PlayerService(unit);
    const playerStatisticsService = new PlayerStatisticsService(unit);
    const sessionService = new SessionService(unit);

    try {
        const providerId = profile.id;
        const email = profile.emails?.[0]?.value || `${providerId}@${provider}.oauth`;
        const displayName = profile.displayName || profile.username || `User${providerId}`;

        // Check if user already exists with this OAuth provider
        let player = await playerService.getPlayerByOAuth(provider, providerId);

        if (!player) {
            // Check if email is already used by another account
            const existingByEmail = await playerService.getPlayerByEmail(email);
            if (existingByEmail) {
                throw new Error("An account with this email already exists");
            }

            // Generate unique username
            let username = displayName.replace(/\s+/g, "").toLowerCase();
            let counter = 1;
            while (await playerService.getPlayerByUsername(username)) {
                username = `${displayName.replace(/\s+/g, "").toLowerCase()}${counter}`;
                counter++;
            }

            // Create new OAuth player
            const [success, playerId] = await playerService.createOAuthPlayer(
                username,
                email,
                provider,
                providerId,
                1000, // Initial coins
                10 // Initial lootboxes
            );

            if (!success) {
                throw new Error("Failed to create player");
            }

            // Create player statistics
            const [statsSuccess] = await playerStatisticsService.createDefaultPlayerStatistics(playerId);
            if (!statsSuccess) {
                throw new Error("Failed to create player statistics");
            }

            player = await playerService.getInfoByID(playerId);
        }

        if (!player) {
            throw new Error("Failed to find or create player");
        }

        // Create session
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const sessionCreated = await sessionService.createSession(sessionId, player.playerId, expiresAt);
        if (!sessionCreated) {
            throw new Error("Failed to create session");
        }

        await unit.complete(true);
        return { playerId: player.playerId, sessionId };
    } catch (err) {
        await unit.complete(false);
        throw err;
    }
}

/**
 * Check if OAuth is configured for a provider.
 */
export function isOAuthConfigured(provider: "google" | "github"): boolean {
    if (provider === "google") {
        return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
    }
    if (provider === "github") {
        return !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);
    }
    return false;
}

export default passport;
