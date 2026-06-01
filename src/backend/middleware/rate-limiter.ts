import type { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "../services/security-event-service";

interface Bucket {
    tokens: number;
    lastRefill: number;
}

interface LimiterConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
    message?: string;
    keyGenerator?: (req: Request) => string;
}

/**
 * Simple in-memory token-bucket rate limiter for Express.
 * No external dependencies — uses a Map that is pruned automatically.
 *
 * NOTE: This limiter runs in all environments. In production, Cloudflare also
 * handles rate limiting at the edge, but this in-memory limiter is a second
 * line of defense against bots that bypass Cloudflare.
 */
class ExpressRateLimiter {
    private buckets = new Map<string, Bucket>();
    private readonly windowMs: number;
    private readonly maxRequests: number;
    private readonly message: string;
    private readonly keyGenerator?: (req: Request) => string;
    private lastPrune = Date.now();

    constructor(config: LimiterConfig) {
        this.windowMs = config.windowMs;
        this.maxRequests = config.maxRequests;
        this.message = config.message ?? "Too many requests, please try again later.";
        this.keyGenerator = config.keyGenerator;
    }

    middleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const key = this.keyGenerator
                ? this.keyGenerator(req)
                : `${this.getClientIp(req)}:${req.path}`;
            const now = Date.now();

            this.pruneIfNeeded(now);

            let bucket = this.buckets.get(key);
            if (!bucket) {
                bucket = { tokens: this.maxRequests - 1, lastRefill: now };
                this.buckets.set(key, bucket);
            } else {
                const elapsed = now - bucket.lastRefill;
                const refillRate = this.maxRequests / this.windowMs;
                const tokensToAdd = elapsed * refillRate;
                bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
                bucket.lastRefill = now;

                if (bucket.tokens < 1) {
                    logSecurityEvent({
                        ipAddress: this.getClientIp(req),
                        userAgent: req.headers["user-agent"] as string | undefined,
                        eventType: "rate_limit_hit",
                        path: req.path,
                        method: req.method,
                        details: this.message,
                    });
                    res.status(429).json({
                        error: this.message,
                        retryAfter: Math.ceil((1 - bucket.tokens) / refillRate / 1000)
                    });
                    return;
                }
                bucket.tokens -= 1;
            }

            next();
        };
    }

    private getClientIp(req: Request): string {
        // Trust Cloudflare's connecting IP first (hard to spoof)
        const cfIp = req.headers["cf-connecting-ip"];
        if (typeof cfIp === "string" && cfIp.length > 0) {
            return cfIp.trim();
        }

        // Use the LAST entry in X-Forwarded-For (closest to our server / hardest to spoof)
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string") {
            const hops = forwarded.split(",").map(s => s.trim()).filter(Boolean);
            if (hops.length > 0) {
                return hops[hops.length - 1];
            }
        }

        return req.socket.remoteAddress ?? "unknown";
    }

    private pruneIfNeeded(now: number): void {
        // Prune stale entries every 30 seconds
        if (now - this.lastPrune < 30000) return;
        this.lastPrune = now;
        const cutoff = now - this.windowMs * 2;
        for (const [key, bucket] of this.buckets) {
            if (bucket.lastRefill < cutoff) {
                this.buckets.delete(key);
            }
        }
    }
}

/** Strict limit for registration — bots love this endpoint */
export const registerRateLimiter = new ExpressRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    message: "Too many registration attempts from this IP. Please try again in 15 minutes."
});

/** Medium limit for login — stops brute force without locking out users */
export const loginRateLimiter = new ExpressRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: "Too many login attempts from this IP. Please try again in a minute."
});

/** General auth limit for password changes, 2FA, etc. */
export const authRateLimiter = new ExpressRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: "Too many requests from this IP. Please try again in a minute."
});

/** Limit for resending verification emails — prevents email spam/abuse */
export const resendVerificationRateLimiter = new ExpressRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: "Too many verification emails requested. Please try again in an hour.",
    keyGenerator: (req: Request) => {
        const email = (req.body?.email || "unknown").toLowerCase().trim();
        return `resend:${email}`;
    }
});

/** Strict limit for 2FA verification — prevents brute-force of TOTP codes */
export const twoFactorRateLimiter = new ExpressRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3,
    message: "Too many 2FA attempts. Please try again in 15 minutes."
});

/** Limit for OAuth callbacks — prevents callback flooding */
export const oauthCallbackRateLimiter = new ExpressRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: "Too many OAuth attempts. Please try again in a minute."
});

/** Limit for proof-of-work challenges — prevents challenge flooding */
export const challengeRateLimiter = new ExpressRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: "Too many challenge requests. Please try again in a minute."
});
