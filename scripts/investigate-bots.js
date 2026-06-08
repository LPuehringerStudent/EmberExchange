/**
 * Investigates recent bot registrations by analyzing the database.
 * Run with: node scripts/investigate-bots.js
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://ember:ember@localhost:5432/emberexchange'
});

async function main() {
    const client = await pool.connect();
    console.log('🔍 Investigating recent bot registrations...\n');

    try {
        // 1. Count total players
        const totalRes = await client.query('SELECT COUNT(*) as cnt FROM Player WHERE username != \'__shop__\'');
        console.log(`Total non-shop players: ${totalRes.rows[0].cnt}`);

        // 2. Find recent "tester_" pattern accounts
        const testerRes = await client.query(`
            SELECT playerId, username, email, coins, lootboxCount, joinedAt
            FROM Player
            WHERE username LIKE 'tester_%'
            ORDER BY playerId DESC
            LIMIT 20
        `);
        console.log(`\n🤖 "tester_" pattern accounts: ${testerRes.rows.length} shown`);
        console.table(testerRes.rows);

        // 3. Find ALL unverified email accounts (if emailVerified column exists)
        try {
            const unverifiedRes = await client.query(`
                SELECT COUNT(*) as cnt FROM Player WHERE emailVerified = 0 AND provider IS NULL
            `);
            console.log(`\n📧 Unverified email accounts: ${unverifiedRes.rows[0].cnt}`);
        } catch {
            console.log('\n📧 emailVerified column not found (old schema)');
        }

        // 4. Check login history for tester accounts (what IPs did they use?)
        const loginRes = await client.query(`
            SELECT lh.playerId, p.username, lh.ipAddress, lh.createdAt, lh.sessionId
            FROM LoginHistory lh
            JOIN Player p ON lh.playerId = p.playerId
            WHERE p.username LIKE 'tester_%'
            ORDER BY lh.createdAt DESC
            LIMIT 20
        `);
        console.log(`\n📡 Login history for tester accounts: ${loginRes.rows.length} entries`);
        console.table(loginRes.rows.map(r => ({
            playerId: r.playerid,
            username: r.username,
            ip: r.ipaddress,
            createdAt: r.createdat
        })));

        // 5. Check sessions for tester accounts
        const sessionRes = await client.query(`
            SELECT s.playerId, p.username, s.sessionId, s.createdAt, s.expiresAt
            FROM Session s
            JOIN Player p ON s.playerId = p.playerId
            WHERE p.username LIKE 'tester_%' AND s.isActive = 1
            ORDER BY s.createdAt DESC
            LIMIT 10
        `);
        console.log(`\n🔑 Active sessions for tester accounts: ${sessionRes.rows.length}`);
        console.table(sessionRes.rows.map(r => ({
            playerId: r.playerid,
            username: r.username,
            sessionId: r.sessionid?.substring(0, 16) + '...',
            createdAt: r.createdat
        })));

        // 6. What endpoints hit these IPs? (if we can correlate)
        // Check if there are any patterns in the usernames
        const allTesters = await client.query(`
            SELECT COUNT(*) as cnt,
                   COUNT(DISTINCT SUBSTRING(username FROM 'tester_([0-9]+)')) as unique_timestamps
            FROM Player WHERE username LIKE 'tester_%'
        `);
        console.log(`\n📊 Total tester accounts: ${allTesters.rows[0].cnt}`);
        console.log(`   Unique timestamp prefixes: ${allTesters.rows[0].unique_timestamps}`);

        // 7. Check if any of these accounts have done game actions
        const actionsRes = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM Listing l JOIN Player p ON l.sellerId = p.playerId WHERE p.username LIKE 'tester_%') as listings,
                (SELECT COUNT(*) FROM Lootbox lb JOIN Player p ON lb.playerId = p.playerId WHERE p.username LIKE 'tester_%' AND lb.openedAt IS NOT NULL) as opened_lootboxes,
                (SELECT COUNT(*) FROM CoinTransaction ct JOIN Player p ON ct.playerId = p.playerId WHERE p.username LIKE 'tester_%') as coin_transactions
        `);
        console.log(`\n🎮 Game actions by tester accounts:`);
        console.table(actionsRes.rows[0]);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
