/**
 * Cancel all active marketplace listings from banned players.
 * Also cancels listings of stoves whose original owner is banned.
 *
 * Usage: node scripts/cancel-banned-listings.js
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        // 1. Cancel listings directly from banned sellers
        const sellerRes = await client.query(`
            UPDATE Listing
            SET status = 'cancelled'
            WHERE sellerId IN (SELECT playerId FROM Player WHERE bannedAt IS NOT NULL)
              AND status = 'active'
            RETURNING listingId, sellerId, stoveId, lootboxId
        `);
        console.log(`Cancelled ${sellerRes.rowCount} listings from banned sellers.`);

        // 2. Cancel listings of stoves whose origin is a banned player
        // Trace via Ownership → LootboxDrop → Stove fallback
        const taintedRes = await client.query(`
            UPDATE Listing l
            SET status = 'cancelled'
            WHERE l.status = 'active'
              AND l.stoveId IS NOT NULL
              AND (
                  -- Traced via Ownership history
                  EXISTS (
                      SELECT 1 FROM Ownership o
                      JOIN Player p ON p.playerId = o.playerId
                      WHERE o.stoveId = l.stoveId
                        AND p.bannedAt IS NOT NULL
                        AND o.acquiredAt = (
                            SELECT MIN(acquiredAt) FROM Ownership WHERE stoveId = l.stoveId
                        )
                  )
                  OR
                  -- Traced via LootboxDrop (lootbox-origin stoves with no ownership records)
                  EXISTS (
                      SELECT 1 FROM LootboxDrop ld
                      JOIN Lootbox lb ON lb.lootboxId = ld.lootboxId
                      JOIN Player p ON p.playerId = lb.playerId
                      WHERE ld.stoveId = l.stoveId
                        AND p.bannedAt IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM Ownership WHERE stoveId = l.stoveId)
                  )
                  OR
                  -- Fallback: Stove.currentOwnerId is banned and no ownership / lootbox records
                  EXISTS (
                      SELECT 1 FROM Stove s
                      JOIN Player p ON p.playerId = s.currentOwnerId
                      WHERE s.stoveId = l.stoveId
                        AND p.bannedAt IS NOT NULL
                        AND NOT EXISTS (SELECT 1 FROM Ownership WHERE stoveId = l.stoveId)
                        AND NOT EXISTS (SELECT 1 FROM LootboxDrop WHERE stoveId = l.stoveId)
                  )
              )
            RETURNING l.listingId, l.sellerId, l.stoveId
        `);
        console.log(`Cancelled ${taintedRes.rowCount} listings of stoves originating from banned accounts.`);

        const total = sellerRes.rowCount + taintedRes.rowCount;
        if (total > 0) {
            console.log(`\n✅ Total listings cleaned up: ${total}`);
        } else {
            console.log("\nNo tainted listings found.");
        }

    } catch (err) {
        console.error("❌ Failed to cancel listings:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
