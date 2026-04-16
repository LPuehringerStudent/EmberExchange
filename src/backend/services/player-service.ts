import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import {PlayerRow} from "../../shared/model";

export class PlayerService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all players from the database.
     * @returns An array of all PlayerRow objects in the database.
     */
    getAllPlayers(): PlayerRow[] {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player"
        );
        return stmt.all();
    }

    /**
     * Retrieves a player by their unique ID.
     * @param id - The unique player ID.
     * @returns The PlayerRow object if found, otherwise null.
     */
    getInfoByID(id: number): PlayerRow | null {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE playerId = @id",
            { id }
        );
        return stmt.get() ?? null;
    }

    /**
     * Creates a new player with the specified username, password, email and optional initial values.
     * New players are created as non-admins with the current timestamp as join date.
     * @param username - The unique username for the player.
     * @param password - The password for the player (should be pre-hashed).
     * @param email - The unique email address for the player.
     * @param coins - Initial coin amount (default: 1000).
     * @param lootboxCount - Initial lootbox count (default: 10).
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new player's ID (if successful).
     */
    createPlayer(username: string, password: string, email: string, coins: number = 1000, lootboxCount: number = 10): [boolean, number] {
        const stmt = this.unit.prepare<PlayerRow>(
            `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt) 
             VALUES (@username, @password, @email, @coins, @lootboxCount, 0, datetime('now'))`,
            { username, password, email, coins, lootboxCount }
        );
        const [success, playerId] = this.executeStmt(stmt);
        if (success && playerId) {
            // Seed 10 Standard Lootboxes for new player (best-effort)
            try {
                for (let i = 0; i < 10; i++) {
                    this.unit.prepare(
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
    updatePlayerCoins(id: number, coins: number): boolean {
        const stmt = this.unit.prepare(
            "UPDATE Player SET coins = @coins WHERE playerId = @id",
            { id, coins }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates the lootbox count of a player.
     * @param id - The player's unique ID.
     * @param lootboxCount - The new lootbox count to set.
     * @returns True if exactly one player was updated, false otherwise.
     */
    updatePlayerLootboxCount(id: number, lootboxCount: number): boolean {
        const stmt = this.unit.prepare(
            "UPDATE Player SET lootboxCount = @lootboxCount WHERE playerId = @id",
            { id, lootboxCount }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a player from the database.
     * Deletes all related records first to avoid foreign key constraint errors.
     * @param id - The player's unique ID.
     * @returns True if exactly one player was deleted, false otherwise.
     */
    deletePlayer(id: number): boolean {
        // Delete related records in correct order to respect foreign keys
        
        // 1. Delete sessions
        this.unit.prepare("DELETE FROM Session WHERE playerId = @id", { id }).run();
        
        // 2. Delete player statistics
        this.unit.prepare("DELETE FROM PlayerStatistics WHERE playerId = @id", { id }).run();
        
        // 3. Delete mini game sessions
        this.unit.prepare("DELETE FROM MiniGameSession WHERE playerId = @id", { id }).run();
        
        // 4. Delete chat messages (sent or received)
        this.unit.prepare("DELETE FROM ChatMessage WHERE senderId = @id OR receiverId = @id", { id }).run();
        
        // 5. Delete ownership records
        this.unit.prepare("DELETE FROM Ownership WHERE playerId = @id", { id }).run();
        
        // 6. Delete trades where player is buyer
        this.unit.prepare("DELETE FROM Trade WHERE buyerId = @id", { id }).run();
        
        // 7. Delete listings (this will cascade delete related trades via foreign key)
        // First get all listings by this player
        const listingsStmt = this.unit.prepare<{ listingId: number }>(
            "SELECT listingId FROM Listing WHERE sellerId = @id",
            { id }
        );
        const listings = listingsStmt.all() ?? [];
        
        // Delete trades for these listings first
        for (const listing of listings) {
            this.unit.prepare("DELETE FROM Trade WHERE listingId = @listingId", { listingId: listing.listingId }).run();
        }
        
        // Now delete the listings
        this.unit.prepare("DELETE FROM Listing WHERE sellerId = @id", { id }).run();
        
        // 8. Delete stoves owned by this player
        this.unit.prepare("DELETE FROM Stove WHERE currentOwnerId = @id", { id }).run();
        
        // 9. Delete lootbox drops for this player's lootboxes first (to respect FK constraints)
        const lootboxesStmt = this.unit.prepare<{ lootboxId: number }>(
            "SELECT lootboxId FROM Lootbox WHERE playerId = @id",
            { id }
        );
        const lootboxes = lootboxesStmt.all() ?? [];
        for (const lb of lootboxes) {
            this.unit.prepare("DELETE FROM LootboxDrop WHERE lootboxId = @lootboxId", { lootboxId: lb.lootboxId }).run();
        }
        
        // 10. Delete lootboxes owned by this player
        this.unit.prepare("DELETE FROM Lootbox WHERE playerId = @id", { id }).run();
        
        // 10. Finally delete the player
        const stmt = this.unit.prepare(
            "DELETE FROM Player WHERE playerId = @id",
            { id }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Retrieves a player by their username.
     * @param username - The username to search for.
     * @returns The PlayerRow object if found, otherwise null.
     */
    getPlayerByUsername(username: string): PlayerRow | null {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE username = @username",
            { username }
        );
        return stmt.get() ?? null;
    }

    /**
     * Retrieves a player by their email address.
     * @param email - The email to search for.
     * @returns The PlayerRow object if found, otherwise null.
     */
    getPlayerByEmail(email: string): PlayerRow | null {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE email = @email",
            { email }
        );
        return stmt.get() ?? null;
    }

    /**
     * Updates a player's email address.
     * @param id - The player's unique ID.
     * @param email - The new email address.
     * @returns True if exactly one player was updated, false otherwise.
     */
    updatePlayerEmail(id: number, email: string): boolean {
        const stmt = this.unit.prepare(
            "UPDATE Player SET email = @email WHERE playerId = @id",
            { id, email }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Updates a player's password.
     * @param id - The player's unique ID.
     * @param password - The new password.
     * @returns True if exactly one player was updated, false otherwise.
     */
    updatePlayerPassword(id: number, password: string): boolean {
        const stmt = this.unit.prepare(
            "UPDATE Player SET password = @password WHERE playerId = @id",
            { id, password }
        );
        const result = stmt.run();
        return result.changes === 1;
    }

    /**
     * Finds a player by OAuth provider and provider ID.
     * @param provider - The OAuth provider ('google' or 'github').
     * @param providerId - The provider's unique user ID.
     * @returns The PlayerRow object if found, otherwise null.
     */
    getPlayerByOAuth(provider: string, providerId: string): PlayerRow | null {
        const stmt = this.unit.prepare<PlayerRow>(
            "SELECT * FROM Player WHERE provider = @provider AND providerId = @providerId",
            { provider, providerId }
        );
        return stmt.get() ?? null;
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
    createOAuthPlayer(
        username: string, 
        email: string, 
        provider: string, 
        providerId: string,
        coins: number = 1000, 
        lootboxCount: number = 10
    ): [boolean, number] {
        const stmt = this.unit.prepare<PlayerRow>(
            `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt, provider, providerId) 
             VALUES (@username, NULL, @email, @coins, @lootboxCount, 0, datetime('now'), @provider, @providerId)`,
            { username, email, coins, lootboxCount, provider, providerId }
        );
        const [success, playerId] = this.executeStmt(stmt);
        if (success && playerId) {
            try {
                for (let i = 0; i < 10; i++) {
                    this.unit.prepare(
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
