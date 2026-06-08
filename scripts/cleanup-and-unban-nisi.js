/**
 * Cleanup script:
 * 1. Delete obvious non-bft bot accounts (bot pattern detected bans)
 * 2. Clear Nisi_der_pisi's inventory (listings, stoves, lootboxes)
 * 3. Unban Nisi_der_pisi
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // ── PART 1: Delete obvious bot accounts ──
        const botRes = await client.query(`
            SELECT playerId, username FROM Player
            WHERE banReason LIKE '%bot pattern detected%'
              AND username NOT LIKE 'bft%'
        `);
        const botIds = botRes.rows.map(r => r.playerid);
        console.log(`Found ${botIds.length} obvious non-bft bot accounts to delete`);

        if (botIds.length > 0) {
            // Delete related records
            await client.query(`DELETE FROM Trade WHERE buyerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Listing WHERE sellerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Ownership WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM GloryShowcase WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Session WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM CoinTransaction WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Notification WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerAchievement WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerStatistics WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerDailyReward WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerPrestige WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PrestigeLog WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerPity WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerQuest WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerSettings WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM LoginHistory WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM MiniGameSession WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM SupportTicket WHERE reporterId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM TwoFactorBackupCode WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM TwoFactorChallenge WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM ShopPurchase WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM RoomPlayer WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM ChatMessage WHERE senderId = ANY($1::int[]) OR receiverId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Friend WHERE requesterId = ANY($1::int[]) OR addresseeId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM GloryGuestBook WHERE playerId = ANY($1::int[]) OR authorId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM GloryVisit WHERE visitorPlayerId = ANY($1::int[]) OR visitedPlayerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM GloryFeaturedAchievement WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerGloryBanner WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerGloryTheme WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerGloryTitle WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM PlayerGloryTrophy WHERE playerId = ANY($1::int[])`, [botIds]);
            // Stoves and lootboxes owned by bots
            await client.query(`DELETE FROM LootboxDrop WHERE lootboxId IN (SELECT lootboxId FROM Lootbox WHERE playerId = ANY($1::int[]))`, [botIds]);
            await client.query(`DELETE FROM Lootbox WHERE playerId = ANY($1::int[])`, [botIds]);
            await client.query(`DELETE FROM Stove WHERE currentOwnerId = ANY($1::int[])`, [botIds]);
            // Finally delete the bots
            const delBots = await client.query(`DELETE FROM Player WHERE playerId = ANY($1::int[])`, [botIds]);
            console.log(`  Deleted ${delBots.rowCount} bot accounts`);
        }

        // ── PART 2: Clear Nisi's inventory ──
        const nisiId = 327;

        // Cancel/delete his listings
        const listingsRes = await client.query(`
            DELETE FROM Listing WHERE sellerId = $1
        `, [nisiId]);
        console.log(`  Deleted ${listingsRes.rowCount} listings from Nisi`);

        // Clear any ownership records first (before deleting stoves)
        const ownRes = await client.query(`DELETE FROM Ownership WHERE playerId = $1`, [nisiId]);
        console.log(`  Deleted ${ownRes.rowCount} ownership records from Nisi`);

        // Delete his stoves
        const stoveRes = await client.query(`
            DELETE FROM Stove WHERE currentOwnerId = $1
        `, [nisiId]);
        console.log(`  Deleted ${stoveRes.rowCount} stoves from Nisi`);

        // Delete his lootboxes (and drops)
        const lootboxDropRes = await client.query(`
            DELETE FROM LootboxDrop WHERE lootboxId IN (SELECT lootboxId FROM Lootbox WHERE playerId = $1)
        `, [nisiId]);
        const lootboxRes = await client.query(`
            DELETE FROM Lootbox WHERE playerId = $1
        `, [nisiId]);
        console.log(`  Deleted ${lootboxRes.rowCount} lootboxes (+ ${lootboxDropRes.rowCount} drops) from Nisi`);

        // Clear glory showcase
        const gloryRes = await client.query(`DELETE FROM GloryShowcase WHERE playerId = $1`, [nisiId]);
        console.log(`  Deleted ${gloryRes.rowCount} glory showcase entries from Nisi`);

        // Reset coins to starter amount and clear inventory counts
        await client.query(`
            UPDATE Player SET coins = 1000, lootboxCount = 10, sparks = 0 WHERE playerId = $1
        `, [nisiId]);
        console.log(`  Reset Nisi's coins to 1000 and lootboxCount to 10`);

        // ── PART 3: Unban Nisi ──
        const unbanRes = await client.query(`
            UPDATE Player SET bannedAt = NULL, banReason = NULL WHERE playerId = $1
        `, [nisiId]);
        console.log(`\n✅ Unbanned Nisi_der_pisi (${unbanRes.rowCount} row updated).`);

        await client.query("COMMIT");
        console.log("Transaction committed successfully.");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Failed — transaction rolled back:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
