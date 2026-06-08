import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { antiBotConfig } from "../utils/anti-bot-config";

/**
 * Header fingerprint middleware — checks for a custom header that only the
 * real Angular frontend sends. A curl script or basic HTTP client won't
 * include it unless the attacker sniffs real traffic.
 *
 * Returns a generic error so the attacker thinks it's an auth/credential
 * issue, not a bot trap.
 */
export function headerGuard(req: Request, res: Response, next: NextFunction): void {
    const headerValue = req.headers[antiBotConfig.requiredHeader.toLowerCase()];

    if (headerValue !== antiBotConfig.requiredHeaderValue) {
        console.log(`[Debug] headerGuard blocked ${req.method} ${req.path} — expected ${antiBotConfig.requiredHeader}=${antiBotConfig.requiredHeaderValue}, got ${headerValue}`);
        res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid request" });
        return;
    }

    next();
}
