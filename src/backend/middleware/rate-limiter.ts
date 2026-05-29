import type { Request, Response, NextFunction } from "express";

interface Bucket {
    tokens: number;
    lastRefill: number;
}

interface LimiterConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
    message?: string;
}

/**
 * Simple in-memory token-bucket rate limiter for Express.
 * No external dependencies — uses a Map that is pruned automatically.
 *
 * NOTE: This limiter is bypassed in production. Render sets NODE_ENV=production
 * which disables the middleware (see app.ts). Cloudflare handles rate limiting
 * at the edge. This code is kept for local development only.
 */
class ExpressRateLimiter {
    private buckets = new Map<string, Bucket>();
    private readonly windowMs: number;
    private readonly maxRequests: number;
    private readonly message: string;
    private lastPrune = Date.now();

    constructor(config: LimiterConfig) {
        this.windowMs = config.windowMs;
        this.maxRequests = config.maxRequests;
        this.message = config.message ?? "Too many requests, please try again later.";
    }

    middleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const key = `${this.getClientIp(req)}:${req.path}`;
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
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string") {
            return forwarded.split(",")[0].trim();
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
    maxRequests: 5,
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
