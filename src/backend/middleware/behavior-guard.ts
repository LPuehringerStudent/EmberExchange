import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

interface BehaviorSnapshot {
    mm: number;
    md: number;
    ks: Record<string, number>;
    fc: number;
    bl: number;
    it: number;
    fs: string[];
    ts: number;
}

/**
 * Behavioral guard middleware — validates a client-generated interaction
 * token to ensure the request came from a human using a real browser.
 *
 * The scoring thresholds are NOT configurable via env vars — they are
 * hardcoded here so that attackers cannot discover or tune against them.
 * Since the repo is private, the exact algorithm is secret.
 */

/** Minimum mouse movements recorded on the form */
const MIN_MOUSE_MOVES = 5;
/** Minimum approximate mouse travel distance (squared pixels) */
const MIN_MOUSE_DISTANCE_SQ = 100;
/** Minimum total keystrokes across all fields */
const MIN_KEYSTROKES = 3;
/** Minimum distinct fields that received focus */
const MIN_FIELDS_TOUCHED = 2;
/** Minimum interaction time in ms (first focus to submit) */
const MIN_INTERACTION_TIME_MS = 5000;
/** Maximum interaction time in ms (prevents stale/replayed tokens) */
const MAX_INTERACTION_TIME_MS = 5 * 60 * 1000;
/** Focus and blur counts should be within this delta (humans tab around) */
const MAX_FOCUS_BLUR_DELTA = 2;

function decodeToken(token: string): BehaviorSnapshot | null {
    try {
        const json = Buffer.from(token, "base64").toString("utf-8");
        const parsed = JSON.parse(json) as BehaviorSnapshot;
        // Basic shape validation
        if (
            typeof parsed.mm !== "number" ||
            typeof parsed.md !== "number" ||
            typeof parsed.ks !== "object" ||
            typeof parsed.fc !== "number" ||
            typeof parsed.bl !== "number" ||
            typeof parsed.it !== "number" ||
            !Array.isArray(parsed.fs) ||
            typeof parsed.ts !== "number"
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function totalKeystrokes(ks: Record<string, number>): number {
    return Object.values(ks).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
}

export function behaviorGuard(req: Request, res: Response, next: NextFunction): void {
    const body = req.body as Record<string, unknown>;
    const rawToken = body?.behaviorToken;

    if (typeof rawToken !== "string" || rawToken.length === 0) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — missing or empty behaviorToken`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    const snap = decodeToken(rawToken);
    if (!snap) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — malformed behaviorToken`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // --- Secret scoring algorithm ---
    // Each check is independent; failing any one means bot-like behavior.
    // The generic error message prevents attackers from learning which check failed.

    // 1. Mouse activity — bots often have zero or very low mouse movement
    if (snap.mm < MIN_MOUSE_MOVES) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — mouse moves too low: ${snap.mm} < ${MIN_MOUSE_MOVES}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 2. Mouse distance — ensure movement was real, not just a single pixel twitch
    if (snap.md < MIN_MOUSE_DISTANCE_SQ) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — mouse distance too low: ${snap.md} < ${MIN_MOUSE_DISTANCE_SQ}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 3. Keystrokes — humans type; bots may paste or pre-fill
    if (totalKeystrokes(snap.ks) < MIN_KEYSTROKES) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — keystrokes too low: ${totalKeystrokes(snap.ks)} < ${MIN_KEYSTROKES}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 4. Field interaction breadth — humans touch multiple fields
    if (snap.fs.length < MIN_FIELDS_TOUCHED || snap.fc < MIN_FIELDS_TOUCHED) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — fields too low: fs.length=${snap.fs.length}, fc=${snap.fc}, min=${MIN_FIELDS_TOUCHED}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 5. Interaction duration — humans need time to read and type
    if (snap.it < MIN_INTERACTION_TIME_MS || snap.it > MAX_INTERACTION_TIME_MS) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — interaction time bad: ${snap.it}ms (valid: ${MIN_INTERACTION_TIME_MS}-${MAX_INTERACTION_TIME_MS})`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 6. Focus/blur balance — humans tab/shift-tab; bots often focus once and submit
    if (Math.abs(snap.fc - snap.bl) > MAX_FOCUS_BLUR_DELTA) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — focus/blur imbalance: fc=${snap.fc}, bl=${snap.bl}, delta=${Math.abs(snap.fc - snap.bl)}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // 7. Token freshness — prevent replay of old tokens
    const now = Date.now();
    if (snap.ts > now || snap.ts < now - MAX_INTERACTION_TIME_MS) {
        console.log(`[Debug] behaviorGuard blocked ${req.method} ${req.path} — stale token: ts=${snap.ts}, now=${now}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // All checks passed — likely human
    next();
}
