const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const DATABASE_URL = 'postgresql://neondb_owner:npg_IyCxg3cBG1Aa@ep-lively-meadow-al28ifgx-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const USERNAME = 'testuser';
const EMAIL = 'test@emberexchange.local';
const PASSWORD = 'TestPassword123!';
const COINS = 100000;

async function main() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        // Check if test user already exists
        const existing = await pool.query(
            'SELECT playerId FROM Player WHERE username = $1 OR email = $2',
            [USERNAME, EMAIL]
        );

        let playerId;
        if (existing.rows.length > 0) {
            playerId = existing.rows[0].playerid;
            console.log(`Test user already exists with playerId=${playerId}`);

            // Update coins
            await pool.query(
                'UPDATE Player SET coins = $1 WHERE playerId = $2',
                [COINS, playerId]
            );
            console.log(`Updated coins to ${COINS}`);
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash(PASSWORD, 12);

            // Insert player
            const result = await pool.query(
                `INSERT INTO Player (username, password, email, motto, coins, sparks, lootboxCount, isAdmin, isPublic, joinedAt)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING playerId`,
                [USERNAME, hashedPassword, EMAIL, 'Test account', COINS, 0, 0, 0, 1, new Date().toISOString()]
            );
            playerId = result.rows[0].playerid;
            console.log(`Created test user with playerId=${playerId}`);
        }

        // Create a session
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await pool.query(
            `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (sessionId) DO UPDATE SET
                 playerId = EXCLUDED.playerId,
                 createdAt = EXCLUDED.createdAt,
                 expiresAt = EXCLUDED.expiresAt,
                 isActive = EXCLUDED.isActive`,
            [sessionId, playerId, now.toISOString(), expiresAt.toISOString(), 1]
        );

        console.log(`\n=== Test Account ===`);
        console.log(`Username: ${USERNAME}`);
        console.log(`Password: ${PASSWORD}`);
        console.log(`Email:    ${EMAIL}`);
        console.log(`PlayerId: ${playerId}`);
        console.log(`Session:  ${sessionId}`);
        console.log(`Coins:    ${COINS}`);
        console.log(`\nTo auto-login in browser, set localStorage:`);
        console.log(`localStorage.setItem('sessionId', '${sessionId}');`);
        console.log(`localStorage.setItem('user', JSON.stringify({ playerId: ${playerId}, username: '${USERNAME}', coins: ${COINS}, sparks: 0, isAdmin: false }));`);

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
