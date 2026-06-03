require('dotenv').config();
const { DB } = require('../dist/backend/utils/unit');

const FARM_EMAIL_REGEX = /^[a-z0-9]{6,10}@[a-z0-9]{5,8}\.com$/i;
const WS_TEST_REGEX = /^ws_test_/i;

async function deleteFarmAccounts() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        // Identify targets
        const targetRes = await client.query(`
            SELECT playerId, username, email, coins 
            FROM Player 
            WHERE bannedAt IS NULL
            ORDER BY playerId
        `);
        const targets = targetRes.rows.filter(p => 
            FARM_EMAIL_REGEX.test(p.email) || WS_TEST_REGEX.test(p.email)
        );

        if (targets.length === 0) {
            console.log("No farm/test accounts found.");
            return;
        }

        console.log(`🎯 Found ${targets.length} farm/test accounts to delete\n`);
        for (const t of targets) {
            console.log(`  ID ${t.playerid}: ${t.username} (${t.email}) — ${t.coins} coins`);
        }

        await client.query("BEGIN");

        // Create temp table with target IDs
        const ids = targets.map(t => t.playerid).join(',');
        await client.query(`CREATE TEMP TABLE _farm_ids ON COMMIT DROP AS SELECT UNNEST(ARRAY[${ids}])::int AS playerId`);

        // Delete cascades (same order as bot deletion script)
        const deleteCascades = [
            ['Ownership', 'DELETE FROM Ownership WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['GloryFeaturedAchievement', 'DELETE FROM GloryFeaturedAchievement WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['GloryGuestbook', 'DELETE FROM GloryGuestbook WHERE playerId IN (SELECT playerId FROM _farm_ids) OR authorId IN (SELECT playerId FROM _farm_ids)'],
            ['GloryVisit', 'DELETE FROM GloryVisit WHERE visitorPlayerId IN (SELECT playerId FROM _farm_ids) OR visitedPlayerId IN (SELECT playerId FROM _farm_ids)'],
            ['Stove', 'DELETE FROM Stove WHERE currentOwnerId IN (SELECT playerId FROM _farm_ids)'],
            ['Lootbox', 'DELETE FROM Lootbox WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['ShopPurchase', 'DELETE FROM ShopPurchase WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['RoomPlayer', 'DELETE FROM RoomPlayer WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['ChatMessage', 'DELETE FROM ChatMessage WHERE senderId IN (SELECT playerId FROM _farm_ids) OR receiverId IN (SELECT playerId FROM _farm_ids)'],
            ['CoinTransaction', 'DELETE FROM CoinTransaction WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['LoginHistory', 'DELETE FROM LoginHistory WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['MiniGameSession', 'DELETE FROM MiniGameSession WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerDailyReward', 'DELETE FROM PlayerDailyReward WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerGloryBanner', 'DELETE FROM PlayerGloryBanner WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerGloryTheme', 'DELETE FROM PlayerGloryTheme WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerGloryTitle', 'DELETE FROM PlayerGloryTitle WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerGloryTrophy', 'DELETE FROM PlayerGloryTrophy WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerPrestige', 'DELETE FROM PlayerPrestige WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PrestigeLog', 'DELETE FROM PrestigeLog WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerStatistics', 'DELETE FROM PlayerStatistics WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['Session', 'DELETE FROM Session WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['SupportTicket', 'DELETE FROM SupportTicket WHERE reporterId IN (SELECT playerId FROM _farm_ids)'],
            ['TwoFactorBackupCode', 'DELETE FROM TwoFactorBackupCode WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['TwoFactorChallenge', 'DELETE FROM TwoFactorChallenge WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerPity', 'DELETE FROM PlayerPity WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerQuest', 'DELETE FROM PlayerQuest WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerSettings', 'DELETE FROM PlayerSettings WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['EventLog', 'DELETE FROM EventLog WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['Notification', 'DELETE FROM Notification WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['PlayerAchievement', 'DELETE FROM PlayerAchievement WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['Friend', 'DELETE FROM Friend WHERE requesterId IN (SELECT playerId FROM _farm_ids) OR addresseeId IN (SELECT playerId FROM _farm_ids)'],
            ['Trade', 'DELETE FROM Trade WHERE buyerId IN (SELECT playerId FROM _farm_ids) OR sellerId IN (SELECT playerId FROM _farm_ids)'],
            ['Listing', 'DELETE FROM Listing WHERE sellerId IN (SELECT playerId FROM _farm_ids)'],
            ['BannedIP', 'DELETE FROM BannedIP WHERE ip IN (SELECT DISTINCT ipAddress FROM ViolationLog WHERE playerId IN (SELECT playerId FROM _farm_ids))'],
            ['ViolationLog', 'DELETE FROM ViolationLog WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['SecurityEvent', 'DELETE FROM SecurityEvent WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
            ['RequestLog', 'DELETE FROM RequestLog WHERE playerId IN (SELECT playerId FROM _farm_ids)'],
        ];

        console.log("\n🗑️ Deleting related records...\n");
        for (const [label, sql] of deleteCascades) {
            const res = await client.query(sql);
            if (res.rowCount > 0) {
                console.log(`  Deleted ${res.rowCount} ${label} records`);
            }
        }

        const playerRes = await client.query(
            `DELETE FROM Player WHERE playerId IN (SELECT playerId FROM _farm_ids) RETURNING playerId, username`
        );
        console.log(`\n✅ Deleted ${playerRes.rowCount} accounts from Player table`);
        for (const row of playerRes.rows) {
            console.log(`   - ID ${row.playerid}: ${row.username}`);
        }

        await client.query("COMMIT");
        console.log("\n🎉 Cleanup committed successfully.");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("\n❌ Failed — transaction rolled back:", err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteFarmAccounts().catch(err => {
    console.error(err);
    process.exit(1);
});
