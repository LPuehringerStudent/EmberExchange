/**
 * One-off script: re-randomize heatLevel for ALL existing stoves.
 * Uses PostgreSQL's random() function for efficiency.
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Connected to database.');

    // Update all stoves with a randomized heatLevel within their type's range
    const result = await client.query(`
        UPDATE Stove
        SET heatLevel = st.minHeat + random() * (st.maxHeat - st.minHeat)
        FROM StoveType st
        WHERE Stove.typeId = st.typeId
    `);

    console.log(`Reheated ${result.rowCount} stoves.`);

    // Show distribution after reheat
    const distribution = await client.query(`
        SELECT
            CASE
                WHEN heatLevel <= 0.07 THEN 'inferno'
                WHEN heatLevel <= 0.15 THEN 'blazing'
                WHEN heatLevel <= 0.38 THEN 'glowing'
                WHEN heatLevel <= 0.55 THEN 'smoldering'
                ELSE 'extinguished'
            END as tier,
            COUNT(*) as count
        FROM Stove
        GROUP BY tier
        ORDER BY count DESC
    `);

    console.log('\nNew distribution:');
    for (const row of distribution.rows) {
        console.log(`  ${row.tier}: ${row.count}`);
    }

    await client.end();
    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
