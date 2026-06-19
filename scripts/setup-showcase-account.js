const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
}

const USERNAME = 'emberdemo';
const EMAIL = 'demo@emberexchange.local';
const PASSWORD = 'DemoPass123!';
const COINS = 1_000_000;
const SPARKS = 500;
const LOOTBOX_COUNT = 25;

async function main() {
    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        // 1. Find or create showcase player
        let playerRes = await client.query('SELECT playerId FROM Player WHERE username = $1 OR email = $2', [USERNAME, EMAIL]);
        let playerId;

        if (playerRes.rowCount > 0) {
            playerId = playerRes.rows[0].playerid;
            console.log(`Player already exists (playerId=${playerId}); updating resources...`);
        } else {
            const hashed = await bcrypt.hash(PASSWORD, 12);
            const insert = await client.query(
                `INSERT INTO Player (username, password, email, motto, coins, sparks, lootboxCount, isAdmin, isPublic, joinedAt)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING playerId`,
                [USERNAME, hashed, EMAIL, 'Official showcase account', COINS, SPARKS, LOOTBOX_COUNT, 1, 1, new Date().toISOString()]
            );
            playerId = insert.rows[0].playerid;
            console.log(`Created showcase player (playerId=${playerId})`);
        }

        // 2. Reset resources and admin flag
        await client.query(
            `UPDATE Player SET coins = $1, sparks = $2, lootboxCount = $3, isAdmin = 1, bannedAt = NULL, banReason = NULL WHERE playerId = $4`,
            [COINS, SPARKS, LOOTBOX_COUNT, playerId]
        );
        console.log(`Set coins=${COINS}, sparks=${SPARKS}, lootboxes=${LOOTBOX_COUNT}, admin=true`);

        // 3. Create a long-lived session
        const sessionId = crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        await client.query(
            `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
             VALUES ($1, $2, $3, $4, 1)
             ON CONFLICT (sessionId) DO UPDATE SET
                 playerId = EXCLUDED.playerId,
                 createdAt = EXCLUDED.createdAt,
                 expiresAt = EXCLUDED.expiresAt,
                 isActive = EXCLUDED.isActive`,
            [sessionId, playerId, now.toISOString(), expiresAt.toISOString()]
        );
        console.log(`Session: ${sessionId}`);

        // 4. Grant unopened lootboxes
        const existingLootboxes = await client.query(
            `SELECT COUNT(*) as cnt FROM Lootbox WHERE playerId = $1 AND openedAt IS NULL`,
            [playerId]
        );
        const needed = LOOTBOX_COUNT - parseInt(existingLootboxes.rows[0].cnt, 10);
        for (let i = 0; i < needed; i++) {
            await client.query(
                `INSERT INTO Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) VALUES (1, $1, NULL, 'reward')`,
                [playerId]
            );
        }
        console.log(`Granted ${Math.max(0, needed)} new Standard lootboxes`);

        // 5. Grant a variety of stoves
        const stoveTypes = await client.query('SELECT typeId FROM StoveType ORDER BY typeId');
        const typeIds = stoveTypes.rows.map(r => r.typeid);
        if (typeIds.length === 0) {
            console.warn('No StoveTypes found; cannot grant stoves.');
        } else {
            const existingStoves = await client.query('SELECT COUNT(*) as cnt FROM Stove WHERE currentOwnerId = $1', [playerId]);
            if (parseInt(existingStoves.rows[0].cnt, 10) < 12) {
                for (let i = 0; i < 15; i++) {
                    const typeId = typeIds[i % typeIds.length];
                    const mintedAt = new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)).toISOString();
                    const heatLevel = Math.random();
                    const insertStove = await client.query(
                        `INSERT INTO Stove (typeId, currentOwnerId, mintedAt, heatLevel, reRollCount)
                         VALUES ($1, $2, $3, $4, 0) RETURNING stoveId`,
                        [typeId, playerId, mintedAt, heatLevel]
                    );
                    const stoveId = insertStove.rows[0].stoveid;
                    await client.query(
                        `INSERT INTO Ownership (stoveId, playerId, acquiredAt, acquiredHow)
                         VALUES ($1, $2, $3, 'lootbox')`,
                        [stoveId, playerId, mintedAt]
                    );
                }
                console.log('Granted 15 showcase stoves');
            } else {
                console.log('Player already has enough stoves');
            }
        }

        // 6. Backfill collection entries
        await client.query(`
            INSERT INTO PlayerCollectionEntry (playerId, typeId, discoveredAt, source)
            SELECT s.currentOwnerId, s.typeId, COALESCE(MIN(s.mintedAt), CURRENT_TIMESTAMP::TEXT), 'current_owner'
            FROM Stove s
            JOIN StoveType st ON st.typeId = s.typeId
            WHERE s.currentOwnerId = $1
              AND st.rarity <> 'limited'
              AND st.name <> 'One of a Kind'
            GROUP BY s.currentOwnerId, s.typeId
            ON CONFLICT (playerId, typeId) DO NOTHING
        `, [playerId]);

        console.log('\n=== Showcase Account ===');
        console.log(`URL:       https://emberexchange.xyz`);
        console.log(`Username:  ${USERNAME}`);
        console.log(`Password:  ${PASSWORD}`);
        console.log(`Email:     ${EMAIL}`);
        console.log(`PlayerId:  ${playerId}`);
        console.log(`Session:   ${sessionId}`);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
