/**
 * Ban all players whose email ends with @mailinator.com.
 * These are confirmed bot accounts from the Sprint 5 demo attack.
 *
 * Usage: node scripts/ban-mailinator-bots.js
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        const findRes = await client.query(
            `SELECT playerId, username, email, bannedAt
             FROM Player
             WHERE email LIKE '%@mailinator.com'
               AND bannedAt IS NULL
             ORDER BY playerId DESC`
        );

        const bots = findRes.rows;
        console.log(`Found ${bots.length} active bot accounts with @mailinator.com emails`);

        if (bots.length === 0) {
            console.log("No mailinator bots to ban.");
            return;
        }

        console.log("\nPreview (first 10):");
        for (const bot of bots.slice(0, 10)) {
            console.log(`  - ${bot.username} (${bot.email})`);
        }
        if (bots.length > 10) {
            console.log(`  ... and ${bots.length - 10} more`);
        }

        const banAt = new Date().toISOString();
        const banReason = "Bot";

        const updateRes = await client.query(
            `UPDATE Player
             SET bannedAt = $1,
                 banReason = $2
             WHERE email LIKE '%@mailinator.com'
               AND bannedAt IS NULL`,
            [banAt, banReason]
        );

        console.log(`\n✅ Banned ${updateRes.rowCount} mailinator bot accounts.`);
        console.log(`   Reason: ${banReason}`);
        console.log(`   Timestamp: ${banAt}`);

    } catch (err) {
        console.error("❌ Failed to ban bots:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
