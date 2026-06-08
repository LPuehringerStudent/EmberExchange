import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { antiBotConfig } from "../utils/anti-bot-config";

/**
 * Timing guard middleware — rejects requests that were sent too quickly after
 * the form was initialized. Humans need time to type; bots fire instantly.
 *
 * Looks like innocent timestamp validation. DeepSeek will probably see:
 *   "They validate a formStartTime field"
 * and not recognize it as a bot trap.
 */
const MAX_FORM_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function timingGuard(req: Request, res: Response, next: NextFunction): void {
    const body = req.body as Record<string, unknown>;
    const formStartTime = body?.formStartTime;

    // Missing or invalid timestamp — treat as bot
    if (typeof formStartTime !== "number") {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    const now = Date.now();
    const elapsed = now - formStartTime;

    // Too fast — bot behavior
    if (elapsed < antiBotConfig.minFormTimeMs) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    // Timestamp too old (e.g. epoch 0) or in the future — bot replay / manipulation
    if (elapsed > MAX_FORM_AGE_MS || formStartTime > now) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    next();
}
