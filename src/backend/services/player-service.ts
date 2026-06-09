import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import {PlayerRow} from "../../shared/model";

export class PlayerService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all players from the database (excluding sensitive fields).
     * @returns An array of PlayerRow objects without password/totpSecret.
     */
    async getAllPlayers(): Promise<Omit<PlayerRow, "password" | "totpSecret">[]> {
        const stmt = this.unit.prepare<Omit<PlayerRow, "password" | "totpSecret">>(
            `SELECT playerId, username, email, motto, coins, sparks, lootboxCount,
                    isAdmin, isPublic, joinedAt, provider, providerId, totpEnabled,
                    bannedAt, banReason, emailVerified, verifiedAt, violationCount, lastViolationAt
             FROM Player`
        );
        return await stmt.all();
    }

    /**
     * Retrieves all players EXCLUDING sensitive fields (password, totpSecret, email).
     * Safe for public API responses.
     */
    async getAllPublicPlayers(): Promise<Omit<PlayerRow, "password" | "totpSecret" | "email" | "isAdmin" | "provider" | "providerId" | "bannedAt" | "banReason" | "emailVerified" | "verifiedAt">[]> {
        const stmt = this.unit.prepare<
            Omit<PlayerRow, "password" | "totpSecret" | "email" | "isAdmin" | "provider" | "providerId" | "bannedAt" | "banReason" | "emailVerified" | "verifiedAt">
        >(
            `SELECT playerId, username, motto, coins, sparks, lootboxCount,
                    isPublic, joinedAt, totpEnabled
             FROM Player
             WHERE isPublic = 1`
        );
        return await stmt.all();
    }

    /**
     * Retrieves a player by their unique ID (excluding sensitive fields).
     * @param id - The unique player ID.
     * @returns The PlayerRow object without password/totpSecret if found, otherwise null.
     */
    async getInfoByID(id: number): Promise<Omit<PlayerRow, "password" | "totpSecret"> | null> {
        const stmt = this.unit.prepare<Omit<PlayerRow, "password" | "totpSecret">>(
            `SELECT playerId, username, email, motto, coins, sparks, lootboxCount,
                    isAdmin, isPublic, joinedAt, provider, providerId, totpEnabled,
                    bannedAt, banReason, emailVerified, verifiedAt, violationCount, lastViolationAt
             FROM Player WHERE playerId = @id`,
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves a player by ID INCLUDING password and totpSecret.
     * Only use this for authentication flows.
     * @param id - The unique player ID.
     * @returns The full PlayerRow object if found, otherwise null.
     */
    async getPlayerWithCredentialsById(id: number): Promise<PlayerRow | null> {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE playerId = @id",
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves a player by ID EXCLUDING sensitive fields (password, totpSecret, email).
     * Safe for public API responses.
     */
    async getPublicPlayerById(id: number): Promise<Omit<PlayerRow, "password" | "totpSecret" | "email" | "isAdmin" | "provider" | "providerId" | "bannedAt" | "banReason" | "emailVerified" | "verifiedAt"> | null> {
        const stmt = this.unit.prepare<
            Omit<PlayerRow, "password" | "totpSecret" | "email" | "isAdmin" | "provider" | "providerId" | "bannedAt" | "banReason" | "emailVerified" | "verifiedAt">
        >(
            `SELECT playerId, username, motto, coins, sparks, lootboxCount,
                    isPublic, joinedAt, totpEnabled
             FROM Player WHERE playerId = @id`,
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Checks if a player is banned.
     * @param id - The player's unique ID.
     * @returns An object with `banned` boolean and optional `reason` string.
     */
    async checkBanned(id: number): Promise<{ banned: boolean; reason?: string }> {
        const stmt = this.unit.prepare<{ bannedAt: string | null; banReason: string | null }>(
            "SELECT bannedAt, banReason FROM Player WHERE playerId = @id",
            { id }
        );
        const row = await stmt.get();
        if (!row || !row.bannedAt) {
            return { banned: false };
        }
        return { banned: true, reason: row.banReason ?? undefined };
    }

    /**
     * Creates a new player with the specified username, password, email and optional initial values.
     * New players are created as non-admins with the current timestamp as join date.
     * @param username - The unique username for the player.
     * @param password - The password for the player (should be pre-hashed by the caller).
     * @param email - The unique email address for the player.
     * @param coins - Initial coin amount (default: 1000).
     * @param lootboxCount - Initial lootbox count (default: 10).
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new player's ID (if successful).
     */
    async createPlayer(username: string, password: string, email: string, coins: number = 1000, lootboxCount: number = 10): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<PlayerRow>(
            `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt) 
             VALUES (@username, @password, @email, @coins, @lootboxCount, 0, NOW())`,
            { username, password, email, coins, lootboxCount }
        );
        const [success, playerId] = await this.executeStmt(stmt);
        if (success && playerId) {
            // Seed 10 Standard Lootboxes for new player (best-effort)
            try {
                for (let i = 0; i < 10; i++) {
                    await this.unit.prepare(
                        `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
                         VALUES (1, @playerId, null, 'free')`,
                        { playerId }
                    ).run();
                }
            } catch {
                // If Lootbox table doesn't exist (minimal test setups), ignore
            }
        }
        return [success, playerId];
    }

    /**
     * Updates the coin balance of a player.
     * @param id - The player's unique ID.
     * @param coins - The new coin amount to set.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerCoins(id: number, coins: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET coins = @coins WHERE playerId = @id",
            { id, coins }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Atomically deduct coins if the player has enough.
     * Prevents race-condition double-spending.
     */
    async deductCoinsAtomic(id: number, amount: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET coins = coins - @amount WHERE playerId = @id AND coins >= @amount",
            { id, amount }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Atomically add coins to a player.
     */
    async addCoinsAtomic(id: number, amount: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET coins = coins + @amount WHERE playerId = @id",
            { id, amount }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Batch updates coin balances for multiple players in a single query.
     * @param updates - Array of {playerId, coins} to update.
     * @returns Number of rows updated.
     */
    async updatePlayerCoinsBatch(updates: { playerId: number; coins: number }[]): Promise<number> {
        if (updates.length === 0) return 0;
        // Build a VALUES table and UPDATE from it
        const values = updates.map((u, i) => `(@pid${i}::int, @coins${i}::int)`).join(", ");
        const params: Record<string, unknown> = {};
        updates.forEach((u, i) => {
            params[`pid${i}`] = u.playerId;
            params[`coins${i}`] = u.coins;
        });
        const stmt = this.unit.prepare(
            `UPDATE Player SET coins = v.coins
             FROM (VALUES ${values}) AS v(playerId, coins)
             WHERE Player.playerId = v.playerId`,
            params
        );
        const result = await stmt.run();
        return result.changes ?? 0;
    }

    /**
     * Updates the lootbox count of a player.
     * @param id - The player's unique ID.
     * @param lootboxCount - The new lootbox count to set.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerLootboxCount(id: number, lootboxCount: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET lootboxCount = @lootboxCount WHERE playerId = @id",
            { id, lootboxCount }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates the sparks balance of a player.
     * @param id - The player's unique ID.
     * @param sparks - The new sparks amount to set.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerSparks(id: number, sparks: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET sparks = @sparks WHERE playerId = @id",
            { id, sparks }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a player from the database.
     * Deletes all related records first to avoid foreign key constraint errors.
     * @param id - The player's unique ID.
     * @returns True if exactly one player was deleted, false otherwise.
     */
    async deletePlayer(id: number): Promise<boolean> {
        // Delete related records in correct order to respect foreign keys

        // 1. Delete email verification tokens
        await this.unit.prepare("DELETE FROM EmailVerificationToken WHERE playerId = @id", { id }).run();

        // 2. Delete sessions
        await this.unit.prepare("DELETE FROM Session WHERE playerId = @id", { id }).run();

        // 3. Delete player statistics
        await this.unit.prepare("DELETE FROM PlayerStatistics WHERE playerId = @id", { id }).run();

        // 4. Delete player settings
        await this.unit.prepare("DELETE FROM PlayerSettings WHERE playerId = @id", { id }).run();

        // 5. Delete login history
        await this.unit.prepare("DELETE FROM LoginHistory WHERE playerId = @id", { id }).run();

        // 6. Delete mini game sessions
        await this.unit.prepare("DELETE FROM MiniGameSession WHERE playerId = @id", { id }).run();

        // 7. Delete coin transactions
        await this.unit.prepare("DELETE FROM CoinTransaction WHERE playerId = @id", { id }).run();

        // 8. Delete support tickets
        await this.unit.prepare("DELETE FROM SupportTicket WHERE reporterId = @id", { id }).run();

        // 9. Delete room players
        await this.unit.prepare("DELETE FROM RoomPlayer WHERE playerId = @id", { id }).run();

        // 10. Delete chat messages (sent or received)
        await this.unit.prepare("DELETE FROM ChatMessage WHERE senderId = @id OR receiverId = @id", { id }).run();

        // 11. Delete ownership records
        await this.unit.prepare("DELETE FROM Ownership WHERE playerId = @id", { id }).run();

        // 12. Delete trades where player is buyer or seller
        await this.unit.prepare("DELETE FROM Trade WHERE buyerId = @id", { id }).run();

        // 13. Delete listings (this will cascade delete related trades via foreign key)
        // First get all listings by this player
        const listingsStmt = this.unit.prepare<{ listingId: number }>(
            "SELECT listingId FROM Listing WHERE sellerId = @id",
            { id }
        );
        const listings = await listingsStmt.all() ?? [];

        // Delete trades for these listings first
        for (const listing of listings) {
            await this.unit.prepare("DELETE FROM Trade WHERE listingId = @listingId", { listingId: listing.listingId }).run();
        }

        // Now delete the listings
        await this.unit.prepare("DELETE FROM Listing WHERE sellerId = @id", { id }).run();

        // 14. Delete stoves owned by this player
        await this.unit.prepare("DELETE FROM Stove WHERE currentOwnerId = @id", { id }).run();

        // 15. Delete lootbox drops for this player's lootboxes first (to respect FK constraints)
        const lootboxesStmt = this.unit.prepare<{ lootboxId: number }>(
            "SELECT lootboxId FROM Lootbox WHERE playerId = @id",
            { id }
        );
        const lootboxes = await lootboxesStmt.all() ?? [];
        for (const lb of lootboxes) {
            await this.unit.prepare("DELETE FROM LootboxDrop WHERE lootboxId = @lootboxId", { lootboxId: lb.lootboxId }).run();
        }

        // 16. Delete lootboxes owned by this player
        await this.unit.prepare("DELETE FROM Lootbox WHERE playerId = @id", { id }).run();

        // 17. Delete player achievements
        await this.unit.prepare("DELETE FROM PlayerAchievement WHERE playerId = @id", { id }).run();

        // 18. Delete notifications
        await this.unit.prepare("DELETE FROM Notification WHERE playerId = @id", { id }).run();

        // 19. Delete pity counter
        await this.unit.prepare("DELETE FROM PlayerPity WHERE playerId = @id", { id }).run();

        // 20. Delete quest progress
        await this.unit.prepare("DELETE FROM PlayerQuest WHERE playerId = @id", { id }).run();

        // 21. Delete event logs
        await this.unit.prepare("DELETE FROM EventLog WHERE playerId = @id", { id }).run();

        // 22. Delete 2FA data
        await this.unit.prepare("DELETE FROM TwoFactorBackupCode WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM TwoFactorChallenge WHERE playerId = @id", { id }).run();

        // 23. Delete shop purchases
        await this.unit.prepare("DELETE FROM ShopPurchase WHERE playerId = @id", { id }).run();

        // 24. Delete daily reward tracking
        await this.unit.prepare("DELETE FROM PlayerDailyReward WHERE playerId = @id", { id }).run();

        // 25. Delete prestige data
        await this.unit.prepare("DELETE FROM PrestigeLog WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM PlayerPrestige WHERE playerId = @id", { id }).run();

        // 26. Delete glory/showcase data
        await this.unit.prepare("DELETE FROM GloryFeaturedAchievement WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM GloryShowcase WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM PlayerGloryTheme WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM PlayerGloryTitle WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM PlayerGloryBanner WHERE playerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM PlayerGloryTrophy WHERE playerId = @id", { id }).run();

        // 27. Delete visits and guestbook (both directions)
        await this.unit.prepare("DELETE FROM GloryVisit WHERE visitorPlayerId = @id OR visitedPlayerId = @id", { id }).run();
        await this.unit.prepare("DELETE FROM GloryGuestbook WHERE playerId = @id OR authorId = @id", { id }).run();

        // 28. Finally delete the player
        const stmt = this.unit.prepare(
            "DELETE FROM Player WHERE playerId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Retrieves a player by their username (excluding sensitive fields).
     * @param username - The username to search for.
     * @returns The PlayerRow object without password/totpSecret if found, otherwise null.
     */
    async getPlayerByUsername(username: string): Promise<Omit<PlayerRow, "password" | "totpSecret"> | null> {
        const stmt = this.unit.prepare<Omit<PlayerRow, "password" | "totpSecret">>(
            `SELECT playerId, username, email, motto, coins, sparks, lootboxCount,
                    isAdmin, isPublic, joinedAt, provider, providerId, totpEnabled,
                    bannedAt, banReason, emailVerified, verifiedAt, violationCount, lastViolationAt
             FROM Player WHERE username = @username`,
            { username }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves a player by username INCLUDING password and totpSecret.
     * Only use this for authentication flows.
     * @param username - The username to search for.
     * @returns The full PlayerRow object if found, otherwise null.
     */
    async getPlayerWithCredentialsByUsername(username: string): Promise<PlayerRow | null> {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE username = @username",
            { username }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves a player by their email address (excluding sensitive fields).
     * @param email - The email to search for.
     * @returns The PlayerRow object without password/totpSecret if found, otherwise null.
     */
    async getPlayerByEmail(email: string): Promise<Omit<PlayerRow, "password" | "totpSecret"> | null> {
        const stmt = this.unit.prepare<Omit<PlayerRow, "password" | "totpSecret">>(
            `SELECT playerId, username, email, motto, coins, sparks, lootboxCount,
                    isAdmin, isPublic, joinedAt, provider, providerId, totpEnabled,
                    bannedAt, banReason, emailVerified, verifiedAt, violationCount, lastViolationAt
             FROM Player WHERE email = @email`,
            { email }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves a player by email INCLUDING password and totpSecret.
     * Only use this for authentication flows.
     * @param email - The email to search for.
     * @returns The full PlayerRow object if found, otherwise null.
     */
    async getPlayerWithCredentialsByEmail(email: string): Promise<PlayerRow | null> {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE email = @email",
            { email }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Updates a player's email address.
     * @param id - The player's unique ID.
     * @param email - The new email address.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerEmail(id: number, email: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET email = @email WHERE playerId = @id",
            { id, email }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates a player's email address and resets email verification status.
     * Used when a local account changes their email — they must re-verify.
     * @param id - The player's unique ID.
     * @param email - The new email address.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerEmailAndResetVerification(id: number, email: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET email = @email, emailVerified = 0, verifiedAt = NULL WHERE playerId = @id AND provider IS NULL",
            { id, email }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates a player's password.
     * @param id - The player's unique ID.
     * @param password - The new password (should be pre-hashed by the caller).
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerPassword(id: number, password: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET password = @password WHERE playerId = @id",
            { id, password }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates a player's username.
     * Checks uniqueness before updating.
     * @param id - The player's unique ID.
     * @param username - The new username.
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerUsername(id: number, username: string): Promise<boolean> {
        const existing = await this.getPlayerByUsername(username);
        if (existing && existing.playerId !== id) {
            return false;
        }
        const stmt = this.unit.prepare(
            "UPDATE Player SET username = @username WHERE playerId = @id",
            { id, username }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates a player's motto.
     * @param id - The player's unique ID.
     * @param motto - The new motto (max 100 chars).
     * @returns True if exactly one player was updated, false otherwise.
     */
    async updatePlayerMotto(id: number, motto: string): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET motto = @motto WHERE playerId = @id",
            { id, motto: motto.slice(0, 100) }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    async updatePlayerIsPublic(id: number, isPublic: boolean): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Player SET isPublic = @isPublic WHERE playerId = @id",
            { id, isPublic: isPublic ? 1 : 0 }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Finds a player by OAuth provider and provider ID (excluding sensitive fields).
     * @param provider - The OAuth provider ('google' or 'github').
     * @param providerId - The provider's unique user ID.
     * @returns The PlayerRow object without password/totpSecret if found, otherwise null.
     */
    async getPlayerByOAuth(provider: string, providerId: string): Promise<Omit<PlayerRow, "password" | "totpSecret"> | null> {
        const stmt = this.unit.prepare<Omit<PlayerRow, "password" | "totpSecret">>(
            `SELECT playerId, username, email, motto, coins, sparks, lootboxCount,
                    isAdmin, isPublic, joinedAt, provider, providerId, totpEnabled,
                    bannedAt, banReason, emailVerified, verifiedAt, violationCount, lastViolationAt
             FROM Player WHERE provider = @provider AND providerId = @providerId`,
            { provider, providerId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Creates a new OAuth player.
     * @param username - The unique username for the player.
     * @param email - The unique email address for the player.
     * @param provider - The OAuth provider ('google' or 'github').
     * @param providerId - The provider's unique user ID.
     * @param coins - Initial coin amount (default: 1000).
     * @param lootboxCount - Initial lootbox count (default: 10).
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new player's ID (if successful).
     */
    async createOAuthPlayer(
        username: string, 
        email: string, 
        provider: string, 
        providerId: string,
        coins: number = 1000, 
        lootboxCount: number = 10
    ): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<PlayerRow>(
            `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt, provider, providerId) 
             VALUES (@username, NULL, @email, @coins, @lootboxCount, 0, NOW(), @provider, @providerId)`,
            { username, email, coins, lootboxCount, provider, providerId }
        );
        const [success, playerId] = await this.executeStmt(stmt);
        if (success && playerId) {
            try {
                for (let i = 0; i < 10; i++) {
                    await this.unit.prepare(
                        `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
                         VALUES (1, @playerId, null, 'free')`,
                        { playerId }
                    ).run();
                }
            } catch {
                // Ignore if Lootbox table doesn't exist (minimal test setups)
            }
        }
        return [success, playerId];
    }
}
