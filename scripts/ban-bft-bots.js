/**
 * Ban all players whose username starts with "bft".
 * These are confirmed bot accounts from the Sprint 5 demo attack.
 *
 * Usage: node scripts/ban-bft-bots.js
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        // Find all bft bots
        const findRes = await client.query(
            `SELECT playerId, username, email, bannedAt
             FROM Player
             WHERE username LIKE 'bft%'
             ORDER BY playerId DESC`
        );

        const bots = findRes.rows;
        console.log(`Found ${bots.length} bot accounts starting with "bft"`);

        if (bots.length === 0) {
            console.log("No bots to ban.");
            return;
        }

        // Show preview (raw pg rows use lowercase column names)
        console.log("\nPreview:");
        for (const bot of bots.slice(0, 5)) {
            const isBanned = bot.bannedat || bot.bannedAt;
            console.log(`  - ${bot.username} (${bot.email}) — currently ${isBanned ? 'BANNED' : 'active'}`);
        }
        if (bots.length > 5) {
            console.log(`  ... and ${bots.length - 5} more`);
        }

        // Ban them all
        const banAt = new Date().toISOString();
        const banReason = "Bot";

        const updateRes = await client.query(
            `UPDATE Player
             SET bannedAt = $1,
                 banReason = $2
             WHERE username LIKE 'bft%'
               AND bannedAt IS NULL`,
            [banAt, banReason]
        );

        console.log(`\n✅ Banned ${updateRes.rowCount} bot accounts.`);
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
