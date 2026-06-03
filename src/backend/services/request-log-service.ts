import { Unit } from "../utils/unit";

export interface RequestLogData {
    ipAddress: string;
    userAgent?: string;
    playerId?: number;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
}

/**
 * Fire-and-forget API request logger.
 * Logs every non-static API call for short-term forensics.
 * Retention: 24 hours (purged by cron).
 */
export async function logRequest(data: RequestLogData): Promise<void> {
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(true);
        const stmt = unit.prepare(
            `INSERT INTO RequestLog (ipAddress, userAgent, playerId, method, path, statusCode, durationMs, createdAt)
             VALUES (@ipAddress, @userAgent, @playerId, @method, @path, @statusCode, @durationMs, NOW())`,
            {
                ipAddress: data.ipAddress,
                userAgent: data.userAgent ?? null,
                playerId: data.playerId ?? null,
                method: data.method,
                path: data.path,
                statusCode: data.statusCode,
                durationMs: data.durationMs,
            }
        );
        await stmt.run();
        await unit.complete(true);
    } catch (err) {
        console.error("[RequestLog] Failed to log request:", err);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
    }
}

export interface RequestLogRow {
    logId: number;
    ipAddress: string;
    userAgent: string | null;
    playerId: number | null;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    createdAt: string;
}

export async function queryRequestLogs(
    unit: Unit,
    filters: {
        playerId?: number;
        ipAddress?: string;
        path?: string;
        since?: string;
        until?: string;
        limit?: number;
    }
): Promise<RequestLogRow[]> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (filters.playerId !== undefined) {
        conditions.push("playerId = @playerId");
        params.playerId = filters.playerId;
    }
    if (filters.ipAddress) {
        conditions.push("ipAddress = @ipAddress");
        params.ipAddress = filters.ipAddress;
    }
    if (filters.path) {
        conditions.push("path LIKE @path");
        params.path = `%${filters.path}%`;
    }
    if (filters.since) {
        conditions.push("createdAt >= @since");
        params.since = filters.since;
    }
    if (filters.until) {
        conditions.push("createdAt <= @until");
        params.until = filters.until;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitClause = filters.limit && filters.limit > 0 ? `LIMIT ${Math.min(filters.limit, 1000)}` : "LIMIT 500";

    const stmt = unit.prepare<RequestLogRow>(
        `SELECT * FROM RequestLog ${whereClause} ORDER BY createdAt DESC ${limitClause}`,
        params
    );
    return await stmt.all();
}

/**
 * Purge request logs older than the retention period.
 * Default: 24 hours.
 */
export async function purgeOldRequestLogs(retentionHours = 24): Promise<number> {
    const hours = Number.isFinite(retentionHours) && retentionHours > 0 ? Math.floor(retentionHours) : 24;
    let unit: Unit | null = null;
    try {
        unit = await Unit.create(false);
        const stmt = unit.prepare(
            `DELETE FROM RequestLog WHERE createdAt < NOW() - INTERVAL '${hours} hours'`
        );
        const result = await stmt.run();
        await unit.complete(true);
        return result.changes ?? 0;
    } catch (err) {
        console.error("[RequestLog] Failed to purge old logs:", err);
        if (unit) {
            try { await unit.complete(false); } catch { /* ignore */ }
        }
        return 0;
    }
}
