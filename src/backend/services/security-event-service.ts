import { Unit } from "../utils/unit";

export type SecurityEventType =
    | "failed_login"
    | "turnstile_fail"
    | "rate_limit_hit"
    | "oauth_fail"
    | "ip_banned_hit"
    | "honeypot_triggered"
    | "invalid_session"
    | "csrf_fail"
    | "suspicious_request"
    | "registration_blocked"
    | "admin_access_denied"
    | "ticket_abuse";

export interface SecurityEventData {
    ipAddress: string;
    userAgent?: string;
    playerId?: number;
    eventType: SecurityEventType;
    path?: string;
    method?: string;
    details?: string;
}

/**
 * Fire-and-forget security event logger.
 * Creates its own DB unit so callers are never blocked.
 * If logging fails, the error is silently swallowed —
 * we never let telemetry break the user request.
 */
export async function logSecurityEvent(data: SecurityEventData): Promise<void> {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(true);
        const stmt = unit.prepare(
            `INSERT INTO SecurityEvent (ipAddress, userAgent, playerId, eventType, path, method, details, createdAt)
             VALUES (@ipAddress, @userAgent, @playerId, @eventType, @path, @method, @details, NOW())`,
            {
                ipAddress: data.ipAddress,
                userAgent: data.userAgent ?? null,
                playerId: data.playerId ?? null,
                eventType: data.eventType,
                path: data.path ?? null,
                method: data.method ?? null,
                details: data.details ?? null,
            }
        );
        await stmt.run();
        await unit.complete(true);
    } catch (err) {
        // Silently ignore — telemetry must never break user-facing requests
        console.error("[SecurityEvent] Failed to log event:", err);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
    }
}

/**
 * Purge security events older than the retention period.
 * Default: 90 days.
 */
export async function purgeOldSecurityEvents(retentionDays = 90): Promise<number> {
    const days = Number.isFinite(retentionDays) && retentionDays > 0 ? Math.floor(retentionDays) : 90;
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(false);
        const stmt = unit.prepare(
            `DELETE FROM SecurityEvent WHERE createdAt < NOW() - INTERVAL '${days} days'`
        );
        const result = await stmt.run();
        await unit.complete(true);
        return result.changes ?? 0;
    } catch (err) {
        console.error("[SecurityEvent] Failed to purge old events:", err);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
        return 0;
    }
}
