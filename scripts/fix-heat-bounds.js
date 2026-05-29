/**
 * One-off script: fix minHeat/maxHeat for all StoveType rows to match canonical seed data.
 * Also detects and reports any stoves whose current heatLevel is now out of bounds.
 * Optionally re-randomizes out-of-bounds stoves.
 */
require('dotenv').config();
const { Client } = require('pg');

// Canonical seed data: name -> { minHeat, maxHeat }
const CANONICAL = {
    'Rusty Stove': { minHeat: 0.0, maxHeat: 1.0 },
    'Standard Stove': { minHeat: 0.0, maxHeat: 0.9 },
    'Bronze Stove': { minHeat: 0.0, maxHeat: 0.85 },
    'Forest Stove': { minHeat: 0.0, maxHeat: 0.85 },
    'Golden Stove': { minHeat: 0.0, maxHeat: 0.70 },
    'Steampunk Stove': { minHeat: 0.0, maxHeat: 0.75 },
    'Dragon Stove': { minHeat: 0.0, maxHeat: 0.55 },
    'Crystal Stove': { minHeat: 0.0, maxHeat: 0.45 },
    'One of a Kind': { minHeat: 0.0, maxHeat: 0.40 },
    'Earthbound Stove': { minHeat: 0.0, maxHeat: 0.25 },
    'Galactic Dragon Stove': { minHeat: 0.0, maxHeat: 0.20 },
    'Magic Stove': { minHeat: 0.0, maxHeat: 0.50 },
    'Pinaple Stove': { minHeat: 0.0, maxHeat: 0.70 },
    'Red Dragon Stove': { minHeat: 0.0, maxHeat: 0.50 },
    'Upgraded Forest Stove': { minHeat: 0.0, maxHeat: 0.55 },
    'Upgraded Steampunk Stove': { minHeat: 0.0, maxHeat: 0.55 },
    'White Blue Stove': { minHeat: 0.0, maxHeat: 0.80 },
    'White Dragon Stove': { minHeat: 0.0, maxHeat: 0.70 },
    'Standard Dragon': { minHeat: 0.0, maxHeat: 0.95 },
    'Dirt Dragon': { minHeat: 0.0, maxHeat: 0.80 },
    'Green Dragon': { minHeat: 0.0, maxHeat: 0.65 },
    'Black Dragon': { minHeat: 0.0, maxHeat: 0.50 },
    'Celestial Stove': { minHeat: 0.0, maxHeat: 0.40 },
    'Shiny Celestial Dragon': { minHeat: 0.0, maxHeat: 0.15 },
    'Shiny Earthbound Stove': { minHeat: 0.0, maxHeat: 0.20 },
    'Mistle Stove': { minHeat: 0.0, maxHeat: 0.90 },
    'Pine Stove': { minHeat: 0.0, maxHeat: 0.90 },
    'Snowman Stove': { minHeat: 0.0, maxHeat: 0.85 },
    'Lantern Stove': { minHeat: 0.0, maxHeat: 0.80 },
    'Pinetree Stove': { minHeat: 0.0, maxHeat: 0.75 },
    'Festival Stove': { minHeat: 0.0, maxHeat: 0.25 },
    'Snowgod Stove': { minHeat: 0.0, maxHeat: 0.45 },
    'Ultimate Snowman Stove': { minHeat: 0.0, maxHeat: 0.40 },
};

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    console.log('Connected to database.\n');

    // 1. Update all StoveType rows to canonical minHeat/maxHeat
    let updatedTypes = 0;
    for (const [name, bounds] of Object.entries(CANONICAL)) {
        const res = await client.query(
            'UPDATE stovetype SET minHeat = $1, maxHeat = $2 WHERE name = $3',
            [bounds.minHeat, bounds.maxHeat, name]
        );
        if (res.rowCount > 0) {
            console.log(`  ✓ ${name}: minHeat=${bounds.minHeat}, maxHeat=${bounds.maxHeat} (${res.rowCount} row(s) updated)`);
            updatedTypes += res.rowCount;
        }
    }
    console.log(`\n→ Updated ${updatedTypes} StoveType row(s) total.\n`);

    // 2. Find stoves with out-of-bounds heatLevel
    const badStoves = await client.query(`
        SELECT s.stoveId, st.name, st.minHeat, st.maxHeat, s.heatLevel
        FROM Stove s
        JOIN StoveType st ON s.typeId = st.typeId
        WHERE s.heatLevel < st.minHeat OR s.heatLevel > st.maxHeat
        ORDER BY st.name, s.stoveId
    `);

    if (badStoves.rows.length === 0) {
        console.log('✅ All stoves are within their type\'s heat bounds.');
    } else {
        console.log(`⚠️  Found ${badStoves.rows.length} stove(s) with out-of-bounds heatLevel:\n`);
        for (const row of badStoves.rows) {
            const heatLevel = row.heatLevel ?? row.heatlevel ?? 0;
            const minHeat = row.minHeat ?? row.minheat ?? 0;
            const maxHeat = row.maxHeat ?? row.maxheat ?? 1;
            const status = heatLevel > maxHeat ? 'ABOVE MAX' : 'BELOW MIN';
            console.log(`   Stove #${row.stoveId} (${row.name}): heatLevel=${heatLevel.toFixed(3)}, bounds=[${minHeat}, ${maxHeat}] → ${status}`);
        }

        // 3. Re-randomize out-of-bounds stoves
        console.log('\nRe-randomizing out-of-bounds stoves...');
        const reheatRes = await client.query(`
            UPDATE Stove
            SET heatLevel = st.minHeat + random() * (st.maxHeat - st.minHeat)
            FROM StoveType st
            WHERE Stove.typeId = st.typeId
              AND (Stove.heatLevel < st.minHeat OR Stove.heatLevel > st.maxHeat)
            RETURNING Stove.stoveId, st.name, Stove.heatLevel
        `);
        console.log(`→ Re-randomized ${reheatRes.rowCount} stove(s).`);
    }

    await client.end();
    console.log('\nDone!');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
