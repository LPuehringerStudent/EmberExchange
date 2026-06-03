import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { isDatacenterIp, lookupAsn } from "../utils/asn-lookup";
import { getClientIp } from "../utils/bot-trap";
import { logSecurityEvent } from "../services/security-event-service";

/**
 * Datacenter ASN guard — blocks registration (and other sensitive actions)
 * from known cloud/VPS providers.
 *
 * Real users connect via residential ISPs and mobile networks.
 * Bot farms run on cheap VPS (DigitalOcean, Hetzner, AWS, etc.).
 *
 * This middleware is SILENT on failures — it returns a generic error
 * so attackers don't learn they're being filtered by ASN.
 */

export async function datacenterGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ip = getClientIp(req);

    // Skip localhost for development
    if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
        next();
        return;
    }

    const isDc = await isDatacenterIp(ip);

    if (isDc) {
        const asnInfo = await lookupAsn(ip);
        const ua = req.headers["user-agent"] as string | undefined;

        logSecurityEvent({
            ipAddress: ip,
            userAgent: ua,
            eventType: "rate_limit_hit",
            path: req.path,
            method: req.method,
            details: `Datacenter ASN block: AS${asnInfo?.asn ?? "unknown"} ${asnInfo?.org ?? ""}`,
        }).catch(() => { /* ignore */ });

        res.status(StatusCodes.BAD_REQUEST).json({ error: "Registration is not available from this network. Please try from a residential or mobile connection." });
        return;
    }

    next();
}
