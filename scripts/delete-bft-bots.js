/**
 * Delete all player accounts whose username starts with "bft".
 * These are confirmed bot accounts.
 *
 * Usage: node scripts/delete-bft-bots.js
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Count how many we're about to delete
        const countRes = await client.query(
            `SELECT COUNT(*) AS cnt FROM Player WHERE username LIKE 'bft%'`
        );
        const total = parseInt(countRes.rows[0].cnt, 10);
        console.log(`Found ${total} bot accounts starting with "bft"`);

        if (total === 0) {
            console.log("No bots to delete.");
            await client.query("ROLLBACK");
            return;
        }

        // 2. Create a temp table with the bot IDs for fast joining
        await client.query(`
            CREATE TEMP TABLE _bft_bot_ids ON COMMIT DROP AS
            SELECT playerId FROM Player WHERE username LIKE 'bft%'
        `);
        await client.query(`CREATE INDEX ON _bft_bot_ids (playerId)`);

        // 3. Delete dependent records in dependency order

        // Trade references Listing and Player
        // First delete trades where bft bots were the buyers
        const tradeBuyerRes = await client.query(`
            DELETE FROM Trade WHERE buyerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${tradeBuyerRes.rowCount} Trade records (bft as buyer)`);

        // Also delete trades for listings sold by bft bots (bft as seller, anyone as buyer)
        const tradeSellerRes = await client.query(`
            DELETE FROM Trade WHERE listingId IN (
                SELECT listingId FROM Listing WHERE sellerId IN (SELECT playerId FROM _bft_bot_ids)
            )
        `);
        console.log(`  Deleted ${tradeSellerRes.rowCount} Trade records (bft as seller)`);

        // Listing references Player, Stove, Lootbox
        const listingRes = await client.query(`
            DELETE FROM Listing WHERE sellerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${listingRes.rowCount} Listing records`);

        // LootboxDrop references Lootbox and Stove
        const lootboxDropRes = await client.query(`
            DELETE FROM LootboxDrop
            WHERE lootboxId IN (
                SELECT lootboxId FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
            )
        `);
        console.log(`  Deleted ${lootboxDropRes.rowCount} LootboxDrop records`);

        // Ownership references Player and Stove
        const ownershipRes = await client.query(`
            DELETE FROM Ownership WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${ownershipRes.rowCount} Ownership records`);

        // GloryShowcase references Player and Stove
        const gloryShowcaseRes = await client.query(`
            DELETE FROM GloryShowcase WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryShowcaseRes.rowCount} GloryShowcase records`);

        // GloryFeaturedAchievement references Player
        const gloryFeatRes = await client.query(`
            DELETE FROM GloryFeaturedAchievement WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryFeatRes.rowCount} GloryFeaturedAchievement records`);

        // GloryGuestBook references Player and authorId (also a player)
        const gloryGbRes = await client.query(`
            DELETE FROM GloryGuestBook
            WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
               OR authorId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryGbRes.rowCount} GloryGuestBook records`);

        // GloryVisit references Player
        const gloryVisitRes = await client.query(`
            DELETE FROM GloryVisit
            WHERE visitorPlayerId IN (SELECT playerId FROM _bft_bot_ids)
               OR visitedPlayerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryVisitRes.rowCount} GloryVisit records`);

        // Stove references Player (currentOwnerId)
        const stoveRes = await client.query(`
            DELETE FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${stoveRes.rowCount} Stove records`);

        // Lootbox references Player
        const lootboxRes = await client.query(`
            DELETE FROM Lootbox WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${lootboxRes.rowCount} Lootbox records`);

        // ShopPurchase references Player
        const shopPurchaseRes = await client.query(`
            DELETE FROM ShopPurchase WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${shopPurchaseRes.rowCount} ShopPurchase records`);

        // RoomPlayer references Player
        const roomPlayerRes = await client.query(`
            DELETE FROM RoomPlayer WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${roomPlayerRes.rowCount} RoomPlayer records`);

        // ChatMessage references Player (sender/receiver)
        const chatRes = await client.query(`
            DELETE FROM ChatMessage
            WHERE senderId IN (SELECT playerId FROM _bft_bot_ids)
               OR receiverId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${chatRes.rowCount} ChatMessage records`);

        // CoinTransaction references Player
        const coinRes = await client.query(`
            DELETE FROM CoinTransaction WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${coinRes.rowCount} CoinTransaction records`);

        // LoginHistory references Player
        const loginRes = await client.query(`
            DELETE FROM LoginHistory WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${loginRes.rowCount} LoginHistory records`);

        // MiniGameSession references Player
        const miniGameRes = await client.query(`
            DELETE FROM MiniGameSession WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${miniGameRes.rowCount} MiniGameSession records`);

        // PlayerDailyReward references Player
        const dailyRewardRes = await client.query(`
            DELETE FROM PlayerDailyReward WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${dailyRewardRes.rowCount} PlayerDailyReward records`);

        // PlayerGloryBanner/Theme/Title/Trophy reference Player
        const gloryBannerRes = await client.query(`
            DELETE FROM PlayerGloryBanner WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryBannerRes.rowCount} PlayerGloryBanner records`);

        const gloryThemeRes = await client.query(`
            DELETE FROM PlayerGloryTheme WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryThemeRes.rowCount} PlayerGloryTheme records`);

        const gloryTitleRes = await client.query(`
            DELETE FROM PlayerGloryTitle WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryTitleRes.rowCount} PlayerGloryTitle records`);

        const gloryTrophyRes = await client.query(`
            DELETE FROM PlayerGloryTrophy WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${gloryTrophyRes.rowCount} PlayerGloryTrophy records`);

        // PlayerPrestige references Player
        const prestigeRes = await client.query(`
            DELETE FROM PlayerPrestige WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${prestigeRes.rowCount} PlayerPrestige records`);

        // PrestigeLog references Player
        const prestigeLogRes = await client.query(`
            DELETE FROM PrestigeLog WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${prestigeLogRes.rowCount} PrestigeLog records`);

        // PlayerStatistics references Player
        const statsRes = await client.query(`
            DELETE FROM PlayerStatistics WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${statsRes.rowCount} PlayerStatistics records`);

        // Session references Player
        const sessionRes = await client.query(`
            DELETE FROM Session WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${sessionRes.rowCount} Session records`);

        // SupportTicket references Player
        const ticketRes = await client.query(`
            DELETE FROM SupportTicket WHERE reporterId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${ticketRes.rowCount} SupportTicket records`);

        // TwoFactorBackupCode / TwoFactorChallenge reference Player
        const tfBackupRes = await client.query(`
            DELETE FROM TwoFactorBackupCode WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${tfBackupRes.rowCount} TwoFactorBackupCode records`);

        const tfChallengeRes = await client.query(`
            DELETE FROM TwoFactorChallenge WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${tfChallengeRes.rowCount} TwoFactorChallenge records`);

        // PlayerPity references Player
        const pityRes = await client.query(`
            DELETE FROM PlayerPity WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${pityRes.rowCount} PlayerPity records`);

        // PlayerQuest references Player
        const questRes = await client.query(`
            DELETE FROM PlayerQuest WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${questRes.rowCount} PlayerQuest records`);

        // PlayerSettings references Player (no FK constraint, but clean it up)
        const settingsRes = await client.query(`
            DELETE FROM PlayerSettings WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${settingsRes.rowCount} PlayerSettings records`);

        // EventLog references Player (no FK constraint, but clean it up)
        const eventRes = await client.query(`
            DELETE FROM EventLog WHERE playerId IN (SELECT playerId FROM _bft_bot_ids)
        `);
        console.log(`  Deleted ${eventRes.rowCount} EventLog records`);

        // 4. Finally delete the players themselves.
        // CASCADE will handle Friend, Notification, PlayerAchievement
        const playerRes = await client.query(`
            DELETE FROM Player WHERE username LIKE 'bft%'
        `);
        console.log(`\n✅ Deleted ${playerRes.rowCount} bot accounts from Player.`);

        await client.query("COMMIT");
        console.log("Transaction committed successfully.");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Failed to delete bots — transaction rolled back:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
