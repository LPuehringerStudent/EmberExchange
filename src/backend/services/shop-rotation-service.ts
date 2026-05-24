import { Unit } from "../utils/unit";

export interface RotationResult {
    previousFeatured: number[];
    newFeatured: number[];
    rotatedAt: Date;
}

export class ShopRotationService {
    constructor(private unit: Unit) {}

    /**
     * Performs a daily shop rotation:
     * - Un-features all currently featured items
     * - Randomly selects up to `featuredCount` items to feature
     * - Returns the previous and new featured listing IDs
     */
    async rotate(featuredCount = 2): Promise<RotationResult> {
        // Get all active listings
        const allStmt = this.unit.prepare<{ listingId: number; isFeatured: number }>(
            `SELECT listingId, isFeatured FROM ShopListing`
        );
        const allListings = (await allStmt.all()) ?? [];

        const previousFeatured = allListings
            .filter(l => l.isFeatured === 1)
            .map(l => l.listingId);

        // Un-feature everything
        const unfeatureStmt = this.unit.prepare(
            `UPDATE ShopListing SET isFeatured = 0`
        );
        await unfeatureStmt.run();

        // Shuffle and pick new featured items
        const shuffled = allListings
            .map(l => l.listingId)
            .sort(() => Math.random() - 0.5);
        const newFeatured = shuffled.slice(0, Math.min(featuredCount, shuffled.length));

        if (newFeatured.length > 0) {
            const placeholders = newFeatured.map((_, i) => `@id${i}`).join(", ");
            const params: Record<string, unknown> = {};
            newFeatured.forEach((id, i) => { params[`id${i}`] = id; });

            const featureStmt = this.unit.prepare(
                `UPDATE ShopListing SET isFeatured = 1 WHERE listingId IN (${placeholders})`,
                params
            );
            await featureStmt.run();
        }

        return {
            previousFeatured,
            newFeatured,
            rotatedAt: new Date()
        };
    }

    /**
     * Sets rotationDate for listings that should expire after a given number of days.
     * Listings with rotationDate in the past are no longer shown in the shop.
     */
    async setRotationDays(listingId: number, days: number): Promise<void> {
        const expiry = new Date();
        expiry.setUTCDate(expiry.getUTCDate() + days);
        const expiryStr = expiry.toISOString().split("T")[0];

        const stmt = this.unit.prepare(
            `UPDATE ShopListing SET rotationDate = @expiryStr WHERE listingId = @listingId`,
            { expiryStr, listingId }
        );
        await stmt.run();
    }
}
