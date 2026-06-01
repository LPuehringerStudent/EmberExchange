import type { Request, Response, NextFunction } from "express";
import { Unit } from "../utils/unit";
import { PunishmentService } from "../services/punishment-service";
import { StatusCodes } from "http-status-codes";

function getClientIp(req: Request): string {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.length > 0) {
        return cfIp.trim();
    }
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        const hops = forwarded.split(",").map(s => s.trim()).filter(Boolean);
        if (hops.length > 0) return hops[hops.length - 1];
    }
    return req.socket.remoteAddress ?? "unknown";
}

/**
 * Express middleware that checks if the client's IP is banned.
 * Returns a generic 403 if banned so the attacker can't tell why.
 */
export async function ipBanCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ip = getClientIp(req);
    const unit = await Unit.create(true);
    try {
        const punishmentService = new PunishmentService(unit);
        const ban = await punishmentService.isIpBanned(ip);
        if (ban.banned) {
            res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
            return;
        }
        next();
    } catch {
        next();
    } finally {
        await unit.complete();
    }
}
