import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";

export interface ViolationRecord {
    violationId: number;
    ip: string;
    playerId: number | null;
    type: string;
    details: string | null;
    createdAt: string;
}

export interface BannedIPRecord {
    ip: string;
    reason: string;
    bannedAt: string;
    expiresAt: string | null;
    violationType: string | null;
}

export class PunishmentService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Records a violation and checks if punishment thresholds are met.
     * Returns the action taken (if any).
     */
    async recordViolation(
        ip: string,
        playerId: number | null,
        type: string,
        details?: string
    ): Promise<{ action: "none" | "warn" | "ip_ban" | "account_ban"; reason?: string }> {
        const now = new Date().toISOString();

        // Log the violation
        await this.unit.prepare(
            `INSERT INTO ViolationLog (ip, playerId, type, details, createdAt)
             VALUES (@ip, @playerId, @type, @details, @createdAt)`,
            { ip, playerId, type, details: details ?? null, createdAt: now }
        ).run();

        // Increment player violation count if applicable
        if (playerId !== null) {
            await this.unit.prepare(
                `UPDATE Player SET violationCount = violationCount + 1, lastViolationAt = @now
                 WHERE playerId = @playerId`,
                { playerId, now }
            ).run();
        }

        // Count recent violations from this IP (last hour)
        const ipRecentStmt = this.unit.prepare<{ count: number }>(
            `SELECT COUNT(*) as count FROM ViolationLog
             WHERE ip = @ip AND createdAt::timestamptz > NOW() - INTERVAL '1 hour'`,
            { ip }
        );
        const ipRecent = (await ipRecentStmt.get())?.count ?? 0;

        // Count recent violations from this player (last hour)
        let playerRecent = 0;
        if (playerId !== null) {
            const playerRecentStmt = this.unit.prepare<{ count: number }>(
                `SELECT COUNT(*) as count FROM ViolationLog
                 WHERE playerId = @playerId AND createdAt::timestamptz > NOW() - INTERVAL '1 hour'`,
                { playerId }
            );
            playerRecent = (await playerRecentStmt.get())?.count ?? 0;
        }

        // Hard-punishment thresholds
        if (type === "coin_tampering" || type === "unauthorized_trade" || type === "chat_impersonation") {
            if (playerId !== null) {
                await this.banPlayer(playerId, `Auto-banned for ${type}`);
                await this.banIp(ip, `Associated with banned player ${playerId} (${type})`, 24 * 60 * 60 * 1000);
                return { action: "account_ban", reason: `Permanent ban for ${type}` };
            }
            await this.banIp(ip, `Exploit attempt: ${type}`, 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: `24h IP ban for ${type}` };
        }

        if (type === "honeypot_triggered") {
            if (playerId !== null) {
                await this.banPlayer(playerId, "Auto-banned for honeypot violation (bot detected)");
            }
            await this.banIp(ip, "Honeypot triggered — bot detected", 7 * 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: "7-day IP ban for honeypot violation" };
        }

        if (type === "turnstile_failed" && ipRecent >= 3) {
            await this.banIp(ip, "Repeated Turnstile failures", 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: "24h IP ban for repeated Turnstile failures" };
        }

        if (type === "header_guard_failed" && ipRecent >= 3) {
            await this.banIp(ip, "Repeated header guard failures", 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: "24h IP ban for repeated header guard failures" };
        }

        if (type === "timing_guard_failed" && ipRecent >= 5) {
            await this.banIp(ip, "Repeated timing guard failures", 60 * 60 * 1000);
            return { action: "ip_ban", reason: "1h IP ban for repeated timing guard failures" };
        }

        if (type === "brute_force_login" && ipRecent >= 10) {
            await this.banIp(ip, "Brute-force login attempts", 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: "24h IP ban for brute-force login attempts" };
        }

        if (type === "oauth_abuse" && ipRecent >= 5) {
            await this.banIp(ip, "OAuth registration abuse", 24 * 60 * 60 * 1000);
            return { action: "ip_ban", reason: "24h IP ban for OAuth abuse" };
        }

        if (type === "2fa_brute_force" && playerRecent >= 3) {
            if (playerId !== null) {
                return { action: "warn", reason: "Account flagged for 2FA brute-force" };
            }
        }

        return { action: "none" };
    }

    async isIpBanned(ip: string): Promise<{ banned: boolean; reason?: string; expiresAt?: string }> {
        const stmt = this.unit.prepare<BannedIPRecord>(
            `SELECT * FROM BannedIP WHERE ip = @ip
             AND (expiresAt IS NULL OR expiresAt::timestamptz > NOW())`,
            { ip }
        );
        const row = await stmt.get();
        if (!row) return { banned: false };
        return { banned: true, reason: row.reason, expiresAt: row.expiresAt ?? undefined };
    }

    async banIp(ip: string, reason: string, durationMs?: number): Promise<void> {
        const now = new Date().toISOString();
        const expiresAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
        await this.unit.prepare(
            `INSERT INTO BannedIP (ip, reason, bannedAt, expiresAt)
             VALUES (@ip, @reason, @bannedAt, @expiresAt)
             ON CONFLICT (ip) DO UPDATE SET
                 reason = EXCLUDED.reason,
                 bannedAt = EXCLUDED.bannedAt,
                 expiresAt = EXCLUDED.expiresAt`,
            { ip, reason, bannedAt: now, expiresAt }
        ).run();
    }

    async banPlayer(playerId: number, reason: string): Promise<void> {
        await this.unit.prepare(
            `UPDATE Player SET bannedAt = @bannedAt, banReason = @reason WHERE playerId = @playerId`,
            { playerId, bannedAt: new Date().toISOString(), reason }
        ).run();
    }

    async getViolationLog(limit = 100): Promise<ViolationRecord[]> {
        const stmt = this.unit.prepare<ViolationRecord>(
            `SELECT * FROM ViolationLog ORDER BY createdAt DESC LIMIT @limit`,
            { limit }
        );
        return await stmt.all();
    }

    async getBannedIPs(): Promise<BannedIPRecord[]> {
        const stmt = this.unit.prepare<BannedIPRecord>(
            `SELECT * FROM BannedIP WHERE expiresAt IS NULL OR expiresAt::timestamptz > NOW() ORDER BY bannedAt DESC`
        );
        return await stmt.all();
    }

    async unbanIp(ip: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            `DELETE FROM BannedIP WHERE ip = @ip`,
            { ip }
        );
        const result = await stmt.run();
        return (result.changes ?? 0) > 0;
    }

    async unbanPlayer(playerId: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            `UPDATE Player SET bannedAt = NULL, banReason = NULL, violationCount = 0 WHERE playerId = @playerId`,
            { playerId }
        );
        const result = await stmt.run();
        return (result.changes ?? 0) > 0;
    }
}
