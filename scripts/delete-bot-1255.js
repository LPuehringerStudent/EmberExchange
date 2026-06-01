/**
 * Deletes bot account 1255 (daratmp+c9ili@gmail.com) and audits for similar exploiters.
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

const BOT_ID = 1255;

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // ── 1. Identify target ──
        const targetRes = await client.query(
            `SELECT playerId, username, email, coins, joinedAt FROM Player WHERE playerId = $1`,
            [BOT_ID]
        );
        if (targetRes.rows.length === 0) {
            console.log("Bot account not found.");
            await client.query("ROLLBACK");
            return;
        }
        const bot = targetRes.rows[0];
        console.log(`🎯 Targeting bot: ${bot.username} (ID: ${bot.playerid}, Email: ${bot.email}, Coins: ${bot.coins}, Joined: ${bot.joinedat})`);

        // ── 2. Audit: find other potential abusers ──
        console.log("\n🔍 Auditing for other exploiters...\n");

        // Players with mini-game payouts > 50,000 (indicates fake session injection)
        const highPayoutRes = await client.query(`
            SELECT DISTINCT p.playerId, p.username, p.email, p.coins, p.joinedAt
            FROM Player p
            JOIN MiniGameSession mg ON p.playerId = mg.playerId
            WHERE mg.coinPayout > 50000
            AND p.playerId != $1
            ORDER BY p.joinedAt DESC
        `, [BOT_ID]);
        console.log(`--- Players with mini-game payouts > 50,000: ${highPayoutRes.rows.length} ---`);
        if (highPayoutRes.rows.length > 0) {
            console.table(highPayoutRes.rows);
        }

        // Players with high coin balances but zero coin transactions (direct balance manipulation)
        const noAuditRes = await client.query(`
            SELECT p.playerId, p.username, p.email, p.coins, p.joinedAt
            FROM Player p
            LEFT JOIN CoinTransaction ct ON p.playerId = ct.playerId
            WHERE p.coins > 50000
            AND ct.transactionId IS NULL
            AND p.playerId != $1
            ORDER BY p.coins DESC
        `, [BOT_ID]);
        console.log(`--- Players with >50k coins and ZERO transactions: ${noAuditRes.rows.length} ---`);
        if (noAuditRes.rows.length > 0) {
            console.table(noAuditRes.rows);
        }

        // Players with gmail plus-alias patterns created recently
        const aliasRes = await client.query(`
            SELECT p.playerId, p.username, p.email, p.coins, p.joinedAt
            FROM Player p
            WHERE p.email ~ '^[^+]+\\+[^@]+@gmail\\.com$'
            AND p.joinedAt::timestamp > (NOW() - INTERVAL '7 days')
            AND p.playerId != $1
            ORDER BY p.joinedAt DESC
        `, [BOT_ID]);
        console.log(`--- Recent Gmail plus-alias accounts (last 7 days): ${aliasRes.rows.length} ---`);
        if (aliasRes.rows.length > 0) {
            console.table(aliasRes.rows);
        }

        // ── 3. Delete bot and all related data ──
        console.log("\n🗑️ Deleting bot account and all related data...\n");

        await client.query(`CREATE TEMP TABLE _bot_ids ON COMMIT DROP AS SELECT ${BOT_ID}::int AS playerId`);
        await client.query(`CREATE INDEX ON _bot_ids (playerId)`);

        const deleteCascades = [
            [`Trade (as buyer)`, `DELETE FROM Trade WHERE buyerId IN (SELECT playerId FROM _bot_ids)`],
            [`Trade (seller listings)`, `DELETE FROM Trade WHERE listingId IN (SELECT listingId FROM Listing WHERE sellerId IN (SELECT playerId FROM _bot_ids))`],
            [`Listing (by seller)`, `DELETE FROM Listing WHERE sellerId IN (SELECT playerId FROM _bot_ids)`],
            [`Listing (of their stoves)`, `DELETE FROM Listing WHERE stoveId IN (SELECT stoveId FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids))`],
            [`Listing (of their lootboxes)`, `DELETE FROM Listing WHERE lootboxId IN (SELECT lootboxId FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bot_ids))`],
            [`LootboxDrop (their lootboxes)`, `DELETE FROM LootboxDrop WHERE lootboxId IN (SELECT lootboxId FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bot_ids))`],
            [`LootboxDrop (their stoves)`, `DELETE FROM LootboxDrop WHERE stoveId IN (SELECT stoveId FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids))`],
            [`GloryShowcase (their stoves)`, `DELETE FROM GloryShowcase WHERE stoveId IN (SELECT stoveId FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids))`],
            [`GloryShowcase (their records)`, `DELETE FROM GloryShowcase WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`Ownership (their stoves)`, `DELETE FROM Ownership WHERE stoveId IN (SELECT stoveId FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids))`],
            [`Ownership (their records)`, `DELETE FROM Ownership WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`GloryFeaturedAchievement`, `DELETE FROM GloryFeaturedAchievement WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`GloryGuestBook`, `DELETE FROM GloryGuestBook WHERE playerId IN (SELECT playerId FROM _bot_ids) OR authorId IN (SELECT playerId FROM _bot_ids)`],
            [`GloryVisit`, `DELETE FROM GloryVisit WHERE visitorPlayerId IN (SELECT playerId FROM _bot_ids) OR visitedPlayerId IN (SELECT playerId FROM _bot_ids)`],
            [`Stove`, `DELETE FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids)`],
            [`Lootbox`, `DELETE FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`ShopPurchase`, `DELETE FROM ShopPurchase WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`RoomPlayer`, `DELETE FROM RoomPlayer WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`ChatMessage`, `DELETE FROM ChatMessage WHERE senderId IN (SELECT playerId FROM _bot_ids) OR receiverId IN (SELECT playerId FROM _bot_ids)`],
            [`CoinTransaction`, `DELETE FROM CoinTransaction WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`LoginHistory`, `DELETE FROM LoginHistory WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`MiniGameSession`, `DELETE FROM MiniGameSession WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerDailyReward`, `DELETE FROM PlayerDailyReward WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerGloryBanner`, `DELETE FROM PlayerGloryBanner WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerGloryTheme`, `DELETE FROM PlayerGloryTheme WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerGloryTitle`, `DELETE FROM PlayerGloryTitle WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerGloryTrophy`, `DELETE FROM PlayerGloryTrophy WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerPrestige`, `DELETE FROM PlayerPrestige WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PrestigeLog`, `DELETE FROM PrestigeLog WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerStatistics`, `DELETE FROM PlayerStatistics WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`Session`, `DELETE FROM Session WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`SupportTicket`, `DELETE FROM SupportTicket WHERE reporterId IN (SELECT playerId FROM _bot_ids)`],
            [`TwoFactorBackupCode`, `DELETE FROM TwoFactorBackupCode WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`TwoFactorChallenge`, `DELETE FROM TwoFactorChallenge WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerPity`, `DELETE FROM PlayerPity WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerQuest`, `DELETE FROM PlayerQuest WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerSettings`, `DELETE FROM PlayerSettings WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`EventLog`, `DELETE FROM EventLog WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`Notification`, `DELETE FROM Notification WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`PlayerAchievement`, `DELETE FROM PlayerAchievement WHERE playerId IN (SELECT playerId FROM _bot_ids)`],
            [`Friend`, `DELETE FROM Friend WHERE requesterId IN (SELECT playerId FROM _bot_ids) OR addresseeId IN (SELECT playerId FROM _bot_ids)`],
        ];

        for (const [label, sql] of deleteCascades) {
            const res = await client.query(sql);
            if (res.rowCount > 0) {
                console.log(`  Deleted ${res.rowCount} ${label} records`);
            }
        }

        const playerRes = await client.query(
            `DELETE FROM Player WHERE playerId = $1 RETURNING username`,
            [BOT_ID]
        );
        console.log(`\n✅ Deleted ${playerRes.rowCount} bot account from Player: ${playerRes.rows[0]?.username || 'unknown'}`);

        await client.query("COMMIT");
        console.log("\n🎉 Bot cleanup committed successfully.");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("\n❌ Failed — transaction rolled back:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
