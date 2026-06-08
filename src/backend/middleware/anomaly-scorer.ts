import type { Request, Response, NextFunction } from "express";
import { getClientIp } from "../utils/bot-trap";
import { logSecurityEvent } from "../services/security-event-service";

/**
 * Silent anomaly scorer — runs on every request and computes a hidden score.
 * High scores indicate bot-like behavior. Unlike other guards, this does NOT
 * block the request directly. Instead, it logs the anomaly for later action
 * and optionally triggers background punishment.
 *
 * The scoring algorithm is entirely server-side and secret (private repo).
 * Attackers cannot see what signals we track or how they're weighted.
 */

interface AnomalySignals {
    /** Missing the custom client header (strong bot signal) */
    missingClientHeader: boolean;
    /** User-agent is missing or generic (curl, python-requests, etc.) */
    genericUserAgent: boolean;
    /** Request has no Referer on a non-API-initiated call */
    noReferer: boolean;
    /** Accept header is missing or wrong */
    badAcceptHeader: boolean;
    /** Request body contains unexpected top-level keys */
    unexpectedBodyKeys: boolean;
    /** Perfectly round timestamp (bots often use Date.now() exactly) */
    suspiciousTiming: boolean;
    /** IP is from a known datacenter ASN (Cloudflare passes this) */
    datacenterIp: boolean;
}

const GENERIC_UAS = [
    "curl",
    "wget",
    "python-requests",
    "axios",
    "node-fetch",
    "undici",
    "java",
    "httpclient",
    "scrapy",
    "bot",
    "crawler",
    "spider",
];

const EXPECTED_BODY_KEYS = new Set([
    // Auth
    "usernameOrEmail", "password", "username", "email",
    "turnstileToken", "formStartTime", "rememberMe",
    "powChallenge", "powNonce", "behaviorToken",
    // Honeypot/decoy
    "website", "company", "l52csb",
    // 2FA
    "challengeId", "token", "code",
    // Generic
    "sessionId", "playerId", "gameType", "roomId",
]);

function detectGenericUA(ua: string): boolean {
    const lower = ua.toLowerCase();
    return GENERIC_UAS.some((g: string) => lower.includes(g));
}

function scoreRequest(req: Request): { score: number; signals: AnomalySignals } {
    const signals: AnomalySignals = {
        missingClientHeader: false,
        genericUserAgent: false,
        noReferer: false,
        badAcceptHeader: false,
        unexpectedBodyKeys: false,
        suspiciousTiming: false,
        datacenterIp: false,
    };

    let score = 0;

    // 1. Client header check — the frontend sends this on all requests now
    const clientHeader = req.headers["x-dtotf-jxlbhu"];
    if (clientHeader !== "vqd7-pf16") {
        signals.missingClientHeader = true;
        score += 25;
    }

    // 2. User-agent analysis
    const ua = req.headers["user-agent"] as string | undefined;
    if (!ua || ua.length < 10 || detectGenericUA(ua)) {
        signals.genericUserAgent = true;
        score += 20;
    }

    // 3. Referer check — real browser navigation includes a referer
    // (skip for the initial page load and health checks)
    const referer = req.headers.referer;
    if (!referer && req.path.startsWith("/api/") && req.path !== "/api/health") {
        signals.noReferer = true;
        score += 10;
    }

    // 4. Accept header
    const accept = req.headers.accept;
    if (!accept || (!accept.includes("application/json") && !accept.includes("text/html"))) {
        signals.badAcceptHeader = true;
        score += 10;
    }

    // 5. Body key analysis — bots may send extra fields we don't expect
    if (req.body && typeof req.body === "object") {
        const keys = Object.keys(req.body);
        const unexpected = keys.filter(k => !EXPECTED_BODY_KEYS.has(k));
        if (unexpected.length > 0) {
            signals.unexpectedBodyKeys = true;
            score += 15;
        }
    }

    // 6. Timing analysis — perfectly round millisecond timestamps are suspicious
    const body = req.body as Record<string, unknown> | undefined;
    const formStartTime = body?.formStartTime;
    if (typeof formStartTime === "number") {
        // Bots often set exact round numbers (e.g., 1000, 5000, 3000)
        if (formStartTime % 1000 === 0 && formStartTime > 1000000000000) {
            // It's a Date.now() value that's exactly on a second boundary
            // (rare for humans, common for scripted requests)
            const now = Date.now();
            const elapsed = now - formStartTime;
            if (elapsed > 0 && elapsed % 1000 === 0) {
                signals.suspiciousTiming = true;
                score += 15;
            }
        }
    }

    // 7. Datacenter IP detection via Cloudflare headers
    const cfIpCountry = req.headers["cf-ipcountry"];
    const cfThreatScore = req.headers["cf-threat-score"];
    if (cfThreatScore && typeof cfThreatScore === "string") {
        const threatScore = parseInt(cfThreatScore, 10);
        if (!isNaN(threatScore) && threatScore > 30) {
            signals.datacenterIp = true;
            score += 20;
        }
    }

    return { score, signals };
}

/** Threshold at which we log a security event */
const LOG_THRESHOLD = 30;
/** Threshold at which we auto-ban the IP */
const BAN_THRESHOLD = 60;

export async function anomalyScorer(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Skip scoring for health checks and static assets
    if (req.path === "/api/health" || !req.path.startsWith("/api/")) {
        next();
        return;
    }

    const { score, signals } = scoreRequest(req);

    if (score >= BAN_THRESHOLD) {
        const ip = getClientIp(req);
        const ua = req.headers["user-agent"] as string | undefined;

        // Fire-and-forget security event
        logSecurityEvent({
            ipAddress: ip,
            userAgent: ua,
            eventType: "rate_limit_hit", // reusing existing type for anomaly
            path: req.path,
            method: req.method,
            details: `Anomaly score ${score}: ${JSON.stringify(signals)}`,
        }).catch(() => { /* ignore */ });

        // Add a tiny tar-pit delay to slow scanners without revealing detection
        await new Promise(resolve => setTimeout(resolve, 2000));
    } else if (score >= LOG_THRESHOLD) {
        const ip = getClientIp(req);
        const ua = req.headers["user-agent"] as string | undefined;

        logSecurityEvent({
            ipAddress: ip,
            userAgent: ua,
            eventType: "rate_limit_hit",
            path: req.path,
            method: req.method,
            details: `Anomaly score ${score}: ${JSON.stringify(signals)}`,
        }).catch(() => { /* ignore */ });
    }

    // Always continue — this is silent scoring, not blocking
    next();
}
