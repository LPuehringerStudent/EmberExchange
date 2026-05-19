import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { Unit } from "../utils/unit";

export interface SetupResult {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
}

export interface VerifyResult {
    success: boolean;
    message: string;
}

export class TwoFactorService {
    constructor(private unit: Unit) {}

    async generateSecret(playerId: number, username: string, email: string): Promise<SetupResult> {
        const secret = speakeasy.generateSecret({
            name: `EmberExchange:${username}`,
            issuer: "EmberExchange"
        });

        // Store the secret temporarily (not enabled yet)
        await this.unit.prepare(
            `UPDATE Player SET totpSecret = @secret WHERE playerId = @playerId`,
            { playerId, secret: secret.base32 }
        ).run();

        const otpauthUrl = speakeasy.otpauthURL({
            secret: secret.ascii,
            label: username,
            issuer: "EmberExchange",
            encoding: "ascii"
        });

        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

        return { secret: secret.base32, otpauthUrl, qrCodeDataUrl };
    }

    async confirmSetup(playerId: number, token: string): Promise<VerifyResult> {
        const row = await this.unit.prepare<{ totpSecret: string }, { playerId: number }>(
            `SELECT totpSecret FROM Player WHERE playerId = @playerId`,
            { playerId }
        ).get();

        if (!row?.totpSecret) {
            return { success: false, message: "No 2FA setup in progress" };
        }

        const verified = speakeasy.totp.verify({
            secret: row.totpSecret,
            encoding: "base32",
            token,
            window: 2
        });

        if (!verified) {
            return { success: false, message: "Invalid verification code" };
        }

        // Enable 2FA
        await this.unit.prepare(
            `UPDATE Player SET totpEnabled = 1 WHERE playerId = @playerId`,
            { playerId }
        ).run();

        // Generate backup codes
        await this.generateBackupCodes(playerId);

        return { success: true, message: "2FA enabled successfully" };
    }

    async verifyToken(playerId: number, token: string): Promise<VerifyResult> {
        const row = await this.unit.prepare<{ totpSecret: string; totpEnabled: number }, { playerId: number }>(
            `SELECT totpSecret, totpEnabled FROM Player WHERE playerId = @playerId`,
            { playerId }
        ).get();

        if (!row?.totpEnabled) {
            return { success: false, message: "2FA is not enabled" };
        }

        // Try TOTP first
        const verified = speakeasy.totp.verify({
            secret: row.totpSecret,
            encoding: "base32",
            token,
            window: 2
        });

        if (verified) {
            return { success: true, message: "Verified" };
        }

        // Try backup code
        const backupResult = await this.verifyBackupCode(playerId, token);
        if (backupResult) {
            return { success: true, message: "Backup code accepted" };
        }

        return { success: false, message: "Invalid code" };
    }

    async disable(playerId: number): Promise<void> {
        await this.unit.prepare(
            `UPDATE Player SET totpSecret = NULL, totpEnabled = 0 WHERE playerId = @playerId`,
            { playerId }
        ).run();

        await this.unit.prepare(
            `DELETE FROM TwoFactorBackupCode WHERE playerId = @playerId`,
            { playerId }
        ).run();
    }

    async isEnabled(playerId: number): Promise<boolean> {
        const row = await this.unit.prepare<{ totpEnabled: number }, { playerId: number }>(
            `SELECT totpEnabled FROM Player WHERE playerId = @playerId`,
            { playerId }
        ).get();
        return row?.totpEnabled === 1;
    }

    async getBackupCodes(playerId: number): Promise<string[]> {
        const rows = await this.unit.prepare<{ codeHash: string; usedAt: string | null }, { playerId: number }>(
            `SELECT codeHash, usedAt FROM TwoFactorBackupCode WHERE playerId = @playerId ORDER BY codeId`,
            { playerId }
        ).all() ?? [];

        // Return only unused codes (hashes can't be reversed, so we just indicate unused count)
        const unusedCount = rows.filter(r => !r.usedAt).length;
        return [`${unusedCount} unused backup code(s) remaining`];
    }

    private async generateBackupCodes(playerId: number): Promise<string[]> {
        // Clear old backup codes
        await this.unit.prepare(
            `DELETE FROM TwoFactorBackupCode WHERE playerId = @playerId`,
            { playerId }
        ).run();

        const codes: string[] = [];
        for (let i = 0; i < 8; i++) {
            const code = crypto.randomBytes(4).toString("hex").toUpperCase();
            codes.push(code);
            const hash = crypto.createHash("sha256").update(code).digest("hex");
            await this.unit.prepare(
                `INSERT INTO TwoFactorBackupCode (playerId, codeHash, usedAt) VALUES (@playerId, @codeHash, NULL)`,
                { playerId, codeHash: hash }
            ).run();
        }
        return codes;
    }

    private async verifyBackupCode(playerId: number, token: string): Promise<boolean> {
        const hash = crypto.createHash("sha256").update(token.trim().toUpperCase()).digest("hex");

        const row = await this.unit.prepare<{ codeId: number }, { playerId: number; codeHash: string }>(
            `SELECT codeId FROM TwoFactorBackupCode WHERE playerId = @playerId AND codeHash = @codeHash AND usedAt IS NULL`,
            { playerId, codeHash: hash }
        ).get();

        if (!row) {
            return false;
        }

        await this.unit.prepare(
            `UPDATE TwoFactorBackupCode SET usedAt = @usedAt WHERE codeId = @codeId`,
            { codeId: row.codeId, usedAt: new Date().toISOString() }
        ).run();

        return true;
    }

    // Challenge (temp token) management for login flow
    async createChallenge(playerId: number): Promise<string> {
        const challengeId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes

        await this.unit.prepare(
            `INSERT INTO TwoFactorChallenge (challengeId, playerId, createdAt, expiresAt)
             VALUES (@challengeId, @playerId, @createdAt, @expiresAt)`,
            { challengeId, playerId, createdAt: now.toISOString(), expiresAt }
        ).run();

        return challengeId;
    }

    async validateChallenge(challengeId: string): Promise<number | null> {
        const row = await this.unit.prepare<{ playerId: number; expiresAt: string }, { challengeId: string }>(
            `SELECT playerId, expiresAt FROM TwoFactorChallenge WHERE challengeId = @challengeId`,
            { challengeId }
        ).get();

        if (!row) return null;

        if (new Date(row.expiresAt) < new Date()) {
            await this.unit.prepare(
                `DELETE FROM TwoFactorChallenge WHERE challengeId = @challengeId`,
                { challengeId }
            ).run();
            return null;
        }

        return row.playerId;
    }

    async consumeChallenge(challengeId: string): Promise<void> {
        await this.unit.prepare(
            `DELETE FROM TwoFactorChallenge WHERE challengeId = @challengeId`,
            { challengeId }
        ).run();
    }
}
