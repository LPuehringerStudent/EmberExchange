interface Bucket {
    tokens: number;
    lastRefill: number;
}

const MAX_TOKENS = 20;
const REFILL_RATE = 10; // tokens per second

export class RateLimiter {
    private buckets = new Map<string, Bucket>();

    checkLimit(key: string): boolean {
        const now = Date.now();
        let bucket = this.buckets.get(key);

        if (!bucket) {
            bucket = { tokens: MAX_TOKENS - 1, lastRefill: now };
            this.buckets.set(key, bucket);
            return true;
        }

        const elapsedMs = now - bucket.lastRefill;
        const tokensToAdd = (elapsedMs / 1000) * REFILL_RATE;
        bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        if (bucket.tokens < 1) {
            return false;
        }

        bucket.tokens -= 1;
        return true;
    }

    remove(key: string): void {
        this.buckets.delete(key);
    }
}

export const rateLimiter = new RateLimiter();
