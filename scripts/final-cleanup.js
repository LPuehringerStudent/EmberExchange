/**
 * Final cleanup script:
 * 1. Unban real users falsely banned during the attack
 * 2. Delete all remaining banned bot accounts and their data
 *
 * Usage: node scripts/final-cleanup.js
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

// Real users/test accounts that were falsely banned
const REAL_USER_IDS = [13, 74, 283, 321, 1245, 1246];

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // ── PART 1: Unban real users ──
        console.log("🔓 Unbanning real users...");
        const unbanRes = await client.query(
            `UPDATE Player SET bannedAt = NULL, banReason = NULL
             WHERE playerId = ANY($1::int[])
             RETURNING playerId, username`,
            [REAL_USER_IDS]
        );
        console.log(`  Unbanned ${unbanRes.rowCount} real users:`);
        unbanRes.rows.forEach(r => console.log(`    - ${r.username} (ID: ${r.playerid})`));

        // ── PART 2: Count what we're about to delete ──
        const countRes = await client.query(
            `SELECT COUNT(*) AS cnt FROM Player WHERE bannedAt IS NOT NULL`
        );
        const total = parseInt(countRes.rows[0].cnt, 10);
        console.log(`\n🗑️  Deleting ${total} remaining banned bot accounts...`);

        if (total === 0) {
            console.log("No banned bots to delete.");
            await client.query("COMMIT");
            return;
        }

        // Preview
        const previewRes = await client.query(
            `SELECT playerId, username, email, banReason FROM Player WHERE bannedAt IS NOT NULL ORDER BY playerId LIMIT 10`
        );
        console.log("\nPreview (first 10):");
        previewRes.rows.forEach(r => console.log(`  - ${r.username} (${r.email}) — ${r.banreason}`));
        if (total > 10) console.log(`  ... and ${total - 10} more`);

        // Create temp table with bot IDs
        await client.query(`
            CREATE TEMP TABLE _bot_ids ON COMMIT DROP AS
            SELECT playerId FROM Player WHERE bannedAt IS NOT NULL
        `);
        await client.query(`CREATE INDEX ON _bot_ids (playerId)`);

        // ── PART 3: Delete all dependent records in dependency order ──

        // Trade (as buyer)
        const tradeBuyerRes = await client.query(`
            DELETE FROM Trade WHERE buyerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`\n  Deleted ${tradeBuyerRes.rowCount} Trade records (bots as buyer)`);

        // Trade (for listings sold by bots)
        const tradeSellerRes = await client.query(`
            DELETE FROM Trade WHERE listingId IN (
                SELECT listingId FROM Listing WHERE sellerId IN (SELECT playerId FROM _bot_ids)
            )
        `);
        console.log(`  Deleted ${tradeSellerRes.rowCount} Trade records (bots as seller)`);

        // Listing
        const listingRes = await client.query(`
            DELETE FROM Listing WHERE sellerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${listingRes.rowCount} Listing records`);

        // LootboxDrop → Lootbox
        const lootboxDropRes = await client.query(`
            DELETE FROM LootboxDrop WHERE lootboxId IN (
                SELECT lootboxId FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bot_ids)
            )
        `);
        console.log(`  Deleted ${lootboxDropRes.rowCount} LootboxDrop records`);

        // Ownership
        const ownershipRes = await client.query(`
            DELETE FROM Ownership WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${ownershipRes.rowCount} Ownership records`);

        // GloryShowcase
        const gloryShowcaseRes = await client.query(`
            DELETE FROM GloryShowcase WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryShowcaseRes.rowCount} GloryShowcase records`);

        // GloryFeaturedAchievement
        const gloryFeatRes = await client.query(`
            DELETE FROM GloryFeaturedAchievement WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryFeatRes.rowCount} GloryFeaturedAchievement records`);

        // GloryGuestBook
        const gloryGbRes = await client.query(`
            DELETE FROM GloryGuestBook
            WHERE playerId IN (SELECT playerId FROM _bot_ids)
               OR authorId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryGbRes.rowCount} GloryGuestBook records`);

        // GloryVisit
        const gloryVisitRes = await client.query(`
            DELETE FROM GloryVisit
            WHERE visitorPlayerId IN (SELECT playerId FROM _bot_ids)
               OR visitedPlayerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryVisitRes.rowCount} GloryVisit records`);

        // Stove
        const stoveRes = await client.query(`
            DELETE FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${stoveRes.rowCount} Stove records`);

        // Lootbox
        const lootboxRes = await client.query(`
            DELETE FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${lootboxRes.rowCount} Lootbox records`);

        // ShopPurchase
        const shopPurchaseRes = await client.query(`
            DELETE FROM ShopPurchase WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${shopPurchaseRes.rowCount} ShopPurchase records`);

        // RoomPlayer
        const roomPlayerRes = await client.query(`
            DELETE FROM RoomPlayer WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${roomPlayerRes.rowCount} RoomPlayer records`);

        // ChatMessage
        const chatRes = await client.query(`
            DELETE FROM ChatMessage
            WHERE senderId IN (SELECT playerId FROM _bot_ids)
               OR receiverId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${chatRes.rowCount} ChatMessage records`);

        // CoinTransaction
        const coinRes = await client.query(`
            DELETE FROM CoinTransaction WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${coinRes.rowCount} CoinTransaction records`);

        // LoginHistory
        const loginRes = await client.query(`
            DELETE FROM LoginHistory WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${loginRes.rowCount} LoginHistory records`);

        // MiniGameSession
        const miniGameRes = await client.query(`
            DELETE FROM MiniGameSession WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${miniGameRes.rowCount} MiniGameSession records`);

        // PlayerDailyReward
        const dailyRewardRes = await client.query(`
            DELETE FROM PlayerDailyReward WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${dailyRewardRes.rowCount} PlayerDailyReward records`);

        // PlayerGloryBanner/Theme/Title/Trophy
        const gloryBannerRes = await client.query(`
            DELETE FROM PlayerGloryBanner WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryBannerRes.rowCount} PlayerGloryBanner records`);

        const gloryThemeRes = await client.query(`
            DELETE FROM PlayerGloryTheme WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryThemeRes.rowCount} PlayerGloryTheme records`);

        const gloryTitleRes = await client.query(`
            DELETE FROM PlayerGloryTitle WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryTitleRes.rowCount} PlayerGloryTitle records`);

        const gloryTrophyRes = await client.query(`
            DELETE FROM PlayerGloryTrophy WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${gloryTrophyRes.rowCount} PlayerGloryTrophy records`);

        // PlayerPrestige
        const prestigeRes = await client.query(`
            DELETE FROM PlayerPrestige WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${prestigeRes.rowCount} PlayerPrestige records`);

        // PrestigeLog
        const prestigeLogRes = await client.query(`
            DELETE FROM PrestigeLog WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${prestigeLogRes.rowCount} PrestigeLog records`);

        // PlayerStatistics
        const statsRes = await client.query(`
            DELETE FROM PlayerStatistics WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${statsRes.rowCount} PlayerStatistics records`);

        // Session
        const sessionRes = await client.query(`
            DELETE FROM Session WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${sessionRes.rowCount} Session records`);

        // SupportTicket
        const ticketRes = await client.query(`
            DELETE FROM SupportTicket WHERE reporterId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${ticketRes.rowCount} SupportTicket records`);

        // TwoFactorBackupCode / TwoFactorChallenge
        const tfBackupRes = await client.query(`
            DELETE FROM TwoFactorBackupCode WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${tfBackupRes.rowCount} TwoFactorBackupCode records`);

        const tfChallengeRes = await client.query(`
            DELETE FROM TwoFactorChallenge WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${tfChallengeRes.rowCount} TwoFactorChallenge records`);

        // PlayerPity
        const pityRes = await client.query(`
            DELETE FROM PlayerPity WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${pityRes.rowCount} PlayerPity records`);

        // PlayerQuest
        const questRes = await client.query(`
            DELETE FROM PlayerQuest WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${questRes.rowCount} PlayerQuest records`);

        // PlayerSettings
        const settingsRes = await client.query(`
            DELETE FROM PlayerSettings WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${settingsRes.rowCount} PlayerSettings records`);

        // EventLog
        const eventRes = await client.query(`
            DELETE FROM EventLog WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${eventRes.rowCount} EventLog records`);

        // Notification
        const notifRes = await client.query(`
            DELETE FROM Notification WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${notifRes.rowCount} Notification records`);

        // PlayerAchievement
        const achieveRes = await client.query(`
            DELETE FROM PlayerAchievement WHERE playerId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${achieveRes.rowCount} PlayerAchievement records`);

        // Friend
        const friendRes = await client.query(`
            DELETE FROM Friend
            WHERE requesterId IN (SELECT playerId FROM _bot_ids)
               OR addresseeId IN (SELECT playerId FROM _bot_ids)
        `);
        console.log(`  Deleted ${friendRes.rowCount} Friend records`);

        // ── PART 4: Finally delete the bots themselves ──
        const playerRes = await client.query(`
            DELETE FROM Player WHERE bannedAt IS NOT NULL
        `);
        console.log(`\n✅ Deleted ${playerRes.rowCount} bot accounts from Player.`);

        await client.query("COMMIT");
        console.log("\n🎉 Transaction committed successfully.");
        console.log(`\nCleanup complete:`);
        console.log(`  - ${unbanRes.rowCount} real users unbanned`);
        console.log(`  - ${playerRes.rowCount} bot accounts permanently deleted`);

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
