import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { ListingRow } from "../../shared/model";
import { QuestService } from "./quest-service";

export class ListingService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    /**
     * Retrieves all listings from the database.
     * @returns An array of all ListingRow objects.
     */
    async getAllListings(): Promise<ListingRow[]> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE p.bannedAt IS NULL
             ORDER BY l.listedAt DESC`
        );
        return await stmt.all();
    }

    /**
     * Retrieves a listing by its unique ID.
     * @param id - The unique listing ID.
     * @returns The ListingRow object if found, otherwise null.
     */
    async getListingById(id: number): Promise<ListingRow | null> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.listingId = @id
               AND p.bannedAt IS NULL`,
            { id }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves all active listings.
     * @returns An array of active ListingRow objects.
     */
    async getActiveListings(): Promise<ListingRow[]> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.status = 'active'
               AND p.bannedAt IS NULL
             ORDER BY l.listedAt DESC`
        );
        return await stmt.all();
    }

    /**
     * Retrieves active listings with optional filters.
     */
    async getFilteredListings(filters: {
        rarity?: string[];
        collection?: string;
        minPrice?: number;
        maxPrice?: number;
        itemType?: 'stove' | 'lootbox';
        sortBy?: 'price_asc' | 'price_desc' | 'newest';
        search?: string;
    }): Promise<ListingRow[]> {
        let where = "l.status = 'active' AND p.bannedAt IS NULL";
        const params: Record<string, unknown> = {};

        if (filters.itemType === 'stove') {
            where += " AND l.stoveId IS NOT NULL";
        } else if (filters.itemType === 'lootbox') {
            where += " AND l.lootboxId IS NOT NULL";
        }

        if (filters.minPrice !== undefined) {
            where += " AND l.price >= @minPrice";
            params.minPrice = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
            where += " AND l.price <= @maxPrice";
            params.maxPrice = filters.maxPrice;
        }

        let join = "";
        if (filters.rarity?.length || filters.collection || filters.search) {
            join += ` JOIN Stove s ON l.stoveId = s.stoveId JOIN StoveType st ON s.typeId = st.typeId `;
            if (filters.rarity?.length) {
                const placeholders = filters.rarity.map((_, i) => `@rarity${i}`).join(", ");
                where += ` AND st.rarity IN (${placeholders})`;
                filters.rarity.forEach((r, i) => { params[`rarity${i}`] = r; });
            }
            if (filters.collection) {
                where += " AND st.collection = @collection";
                params.collection = filters.collection;
            }
            if (filters.search) {
                where += " AND (LOWER(st.name) LIKE @search OR LOWER(p.username) LIKE @search)";
                const escaped = filters.search.toLowerCase().replace(/[%_\\]/g, "\\$&");
                params.search = `%${escaped}%`;
            }
        } else if (filters.search) {
            // Search without needing StoveType join (search by seller name only)
            where += " AND LOWER(p.username) LIKE @search";
            const escaped = filters.search.toLowerCase().replace(/[%_\\]/g, "\\$&");
            params.search = `%${escaped}%`;
        }

        let orderBy = "l.listedAt DESC";
        if (filters.sortBy === 'price_asc') orderBy = "l.price ASC";
        else if (filters.sortBy === 'price_desc') orderBy = "l.price DESC";

        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             ${join}
             WHERE ${where}
             ORDER BY ${orderBy}`,
            params
        );
        return await stmt.all();
    }

    /**
     * Retrieves listings by seller ID.
     * @param sellerId - The seller's unique player ID.
     * @returns An array of ListingRow objects for the seller.
     */
    async getListingsBySellerId(sellerId: number): Promise<ListingRow[]> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.sellerId = @sellerId ORDER BY l.listedAt DESC`,
            { sellerId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves active listings by seller ID.
     * @param sellerId - The seller's unique player ID.
     * @returns An array of active ListingRow objects for the seller.
     */
    async getActiveListingsBySellerId(sellerId: number): Promise<ListingRow[]> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.sellerId = @sellerId AND l.status = 'active' AND p.bannedAt IS NULL ORDER BY l.listedAt DESC`,
            { sellerId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves the active listing for a specific stove if active.
     * @param stoveId - The stove's unique ID.
     * @returns The active ListingRow object if found, otherwise null.
     */
    async getActiveListingByStoveId(stoveId: number): Promise<ListingRow | null> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.stoveId = @stoveId AND l.status = 'active' AND p.bannedAt IS NULL`,
            { stoveId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Retrieves the active listing for a specific lootbox if active.
     * @param lootboxId - The lootbox's unique ID.
     * @returns The active ListingRow object if found, otherwise null.
     */
    async getActiveListingByLootboxId(lootboxId: number): Promise<ListingRow | null> {
        const stmt = this.unit.prepare<ListingRow>(
            `SELECT l.*, p.username as sellerName 
             FROM Listing l
             JOIN Player p ON l.sellerId = p.playerId
             WHERE l.lootboxId = @lootboxId AND l.status = 'active' AND p.bannedAt IS NULL`,
            { lootboxId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Creates a new listing for a stove or lootbox.
     * @param sellerId - The seller's player ID.
     * @param price - The asking price in coins.
     * @param stoveId - The stove being listed (optional).
     * @param lootboxId - The lootbox being listed (optional).
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new listing's ID (if successful).
     */
    async createListing(sellerId: number, price: number, stoveId?: number | null, lootboxId?: number | null): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<ListingRow>(
            `INSERT INTO Listing (sellerId, stoveId, lootboxId, price, listedAt, status) 
             VALUES (@sellerId, @stoveId, @lootboxId, @price, NOW(), 'active')`,
            { sellerId, stoveId: stoveId ?? null, lootboxId: lootboxId ?? null, price }
        );
        const result = await this.executeStmt(stmt);

        if (result[0]) {
            try {
                const questService = new QuestService(this.unit);
                await questService.trackProgress(sellerId, 'list_item', 1);
            } catch {
                // Ignore quest tracking errors
            }
        }

        return result;
    }

    /**
     * Updates the price of an active listing.
     * @param id - The listing's unique ID.
     * @param price - The new price.
     * @returns True if exactly one listing was updated, false otherwise.
     */
    async updatePrice(id: number, price: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Listing SET price = @price WHERE listingId = @id AND status = 'active'",
            { id, price }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Marks a listing as sold.
     * @param id - The listing's unique ID.
     * @returns True if exactly one listing was updated, false otherwise.
     */
    async markAsSold(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Listing SET status = 'sold' WHERE listingId = @id AND status = 'active'",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Cancels an active listing.
     * @param id - The listing's unique ID.
     * @returns True if exactly one listing was updated, false otherwise.
     */
    async cancelListing(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "UPDATE Listing SET status = 'cancelled' WHERE listingId = @id AND status = 'active'",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Deletes a listing from the database.
     * @param id - The listing's unique ID.
     * @returns True if exactly one listing was deleted, false otherwise.
     */
    async deleteListing(id: number): Promise<boolean> {
        const stmt = this.unit.prepare(
            "DELETE FROM Listing WHERE listingId = @id",
            { id }
        );
        const result = await stmt.run();
        return result.changes === 1;
    }

    /**
     * Checks if a stove is currently listed as active.
     * @param stoveId - The stove's unique ID.
     * @returns True if the stove has an active listing.
     */
    async isStoveListed(stoveId: number): Promise<boolean> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Listing WHERE stoveId = @stoveId AND status = 'active'",
            { stoveId }
        );
        const result = await stmt.get();
        return (result?.count ?? 0) > 0;
    }

    /**
     * Checks if a lootbox is currently listed as active.
     * @param lootboxId - The lootbox's unique ID.
     * @returns True if the lootbox has an active listing.
     */
    async isLootboxListed(lootboxId: number): Promise<boolean> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Listing WHERE lootboxId = @lootboxId AND status = 'active'",
            { lootboxId }
        );
        const result = await stmt.get();
        return (result?.count ?? 0) > 0;
    }

    /**
     * Counts active listings for a seller.
     * @param sellerId - The seller's player ID.
     * @returns The count of active listings.
     */
    async countActiveListingsBySeller(sellerId: number): Promise<number> {
        const stmt = this.unit.prepare<{ count: number }>(
            "SELECT COUNT(*) as count FROM Listing WHERE sellerId = @sellerId AND status = 'active'",
            { sellerId }
        );
        const result = await stmt.get();
        return result?.count ?? 0;
    }
}
