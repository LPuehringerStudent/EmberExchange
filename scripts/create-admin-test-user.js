const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL env var is required');
    process.exit(1);
}

const USERNAME = 'aitest';
const EMAIL = 'ai@test.emberexchange.local';
const PASSWORD = 'TestPassword123!';
const COINS = 100000;

async function main() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        const existing = await pool.query(
            'SELECT playerId FROM Player WHERE username = $1 OR email = $2',
            [USERNAME, EMAIL]
        );

        let playerId;
        if (existing.rows.length > 0) {
            playerId = existing.rows[0].playerid;
            console.log(`Test user already exists with playerId=${playerId}`);
        } else {
            const hashedPassword = await bcrypt.hash(PASSWORD, 12);
            const result = await pool.query(
                `INSERT INTO Player (username, password, email, motto, coins, sparks, lootboxCount, isAdmin, isPublic, joinedAt, emailVerified, verifiedAt)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING playerId`,
                [USERNAME, hashedPassword, EMAIL, 'AI test account', COINS, 0, 0, 1, 1, new Date().toISOString(), 1, new Date().toISOString()]
            );
            playerId = result.rows[0].playerid;
            console.log(`Created admin test user with playerId=${playerId}`);
        }

        await pool.query(
            'UPDATE Player SET isAdmin = 1, emailVerified = 1, verifiedAt = $1, coins = $2 WHERE playerId = $3',
            [new Date().toISOString(), COINS, playerId]
        );
        console.log(`Ensured isAdmin=1, emailVerified=1, coins=${COINS}`);

        const sessions = await pool.query(
            "SELECT sessionId FROM Session WHERE playerId = $1 AND expiresAt > $2 ORDER BY createdAt DESC LIMIT 1",
            [playerId, new Date().toISOString()]
        );

        let sessionId;
        if (sessions.rows.length > 0) {
            sessionId = sessions.rows[0].sessionid;
            console.log(`Reusing existing session ${sessionId}`);
        } else {
            sessionId = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await pool.query(
                'INSERT INTO Session (sessionId, playerId, createdAt, expiresAt) VALUES ($1, $2, NOW(), $3)',
                [sessionId, playerId, expiresAt.toISOString()]
            );
            console.log(`Created new session ${sessionId}`);
        }

        console.log('\n=== Login credentials ===');
        console.log(`Username: ${USERNAME}`);
        console.log(`Password: ${PASSWORD}`);
        console.log(`Session ID: ${sessionId}`);
    } catch (err) {
        console.error('Failed to create admin test user:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
