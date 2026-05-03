import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { ListingRow } from "../../shared/model";

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
            "SELECT * FROM Listing"
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
            "SELECT * FROM Listing WHERE listingId = @id",
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
            "SELECT * FROM Listing WHERE status = 'active' ORDER BY listedAt DESC"
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
            "SELECT * FROM Listing WHERE sellerId = @sellerId ORDER BY listedAt DESC",
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
            "SELECT * FROM Listing WHERE sellerId = @sellerId AND status = 'active' ORDER BY listedAt DESC",
            { sellerId }
        );
        return await stmt.all();
    }

    /**
     * Retrieves the listing for a specific stove if active.
     * @param stoveId - The stove's unique ID.
     * @returns The active ListingRow object if found, otherwise null.
     */
    async getActiveListingByStoveId(stoveId: number): Promise<ListingRow | null> {
        const stmt = this.unit.prepare<ListingRow>(
            "SELECT * FROM Listing WHERE stoveId = @stoveId AND status = 'active'",
            { stoveId }
        );
        return (await stmt.get()) ?? null;
    }

    /**
     * Creates a new listing for a stove.
     * @param sellerId - The seller's player ID.
     * @param stoveId - The stove being listed.
     * @param price - The asking price in coins.
     * @returns A tuple where the first element indicates success,
     *          and the second element is the new listing's ID (if successful).
     */
    async createListing(sellerId: number, stoveId: number, price: number): Promise<[boolean, number]> {
        const stmt = this.unit.prepare<ListingRow>(
            `INSERT INTO Listing (sellerId, stoveId, price, listedAt, status) 
             VALUES (@sellerId, @stoveId, @price, NOW(), 'active')`,
            { sellerId, stoveId, price }
        );
        return await this.executeStmt(stmt);
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
            "UPDATE Listing SET status = 'sold' WHERE listingId = @id",
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
