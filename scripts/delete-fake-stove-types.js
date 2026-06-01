/**
 * Delete fake attacker-created stove types:
 * - Ayan Stove (typeId 33)
 * - Taekwondo Stove (typeId 35)
 *
 * Also deletes any stoves of these types and their related records.
 */

require("dotenv").config();
require("ts-node/register");
const { DB } = require("../src/backend/utils/unit");

const FAKE_TYPE_IDS = [33, 35];

async function main() {
    const pool = DB.getPool();
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        console.log("🎯 Deleting fake stove types:", FAKE_TYPE_IDS.join(", "));

        // Find stoves of these fake types
        const stovesRes = await client.query(
            `SELECT stoveId, typeId, currentOwnerId FROM Stove WHERE typeId = ANY($1::int[])`,
            [FAKE_TYPE_IDS]
        );
        const stoveIds = stovesRes.rows.map(r => r.stoveid);
        console.log(`Found ${stoveIds.length} stoves of fake types:`, stoveIds);

        if (stoveIds.length > 0) {
            // Create temp table with stove IDs
            await client.query(`CREATE TEMP TABLE _fake_stove_ids ON COMMIT DROP AS SELECT UNNEST($1::int[]) AS stoveId`, [stoveIds]);
            await client.query(`CREATE INDEX ON _fake_stove_ids (stoveId)`);

            // Delete trades referencing these stoves via listings
            const tradeRes = await client.query(`
                DELETE FROM Trade WHERE listingId IN (SELECT listingId FROM Listing WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids))
            `);
            console.log(`  Deleted ${tradeRes.rowCount} Trade records`);

            // Delete listings of these stoves
            const listingRes = await client.query(`
                DELETE FROM Listing WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids)
            `);
            console.log(`  Deleted ${listingRes.rowCount} Listing records`);

            // Delete ownership records
            const ownRes = await client.query(`
                DELETE FROM Ownership WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids)
            `);
            console.log(`  Deleted ${ownRes.rowCount} Ownership records`);

            // Delete glory showcase entries
            const gloryRes = await client.query(`
                DELETE FROM GloryShowcase WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids)
            `);
            console.log(`  Deleted ${gloryRes.rowCount} GloryShowcase records`);

            // Delete lootbox drops
            const dropRes = await client.query(`
                DELETE FROM LootboxDrop WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids)
            `);
            console.log(`  Deleted ${dropRes.rowCount} LootboxDrop records`);

            // Finally delete the fake stoves
            const stoveDelRes = await client.query(`
                DELETE FROM Stove WHERE stoveId IN (SELECT stoveId FROM _fake_stove_ids)
            `);
            console.log(`  Deleted ${stoveDelRes.rowCount} Stove records`);
        }

        // Delete PriceHistory for fake types
        const priceRes = await client.query(
            `DELETE FROM PriceHistory WHERE typeId = ANY($1::int[])`,
            [FAKE_TYPE_IDS]
        );
        console.log(`  Deleted ${priceRes.rowCount} PriceHistory records`);

        // Delete StoveTypeStatistics for fake types
        const statsRes = await client.query(
            `DELETE FROM StoveTypeStatistics WHERE stoveTypeId = ANY($1::int[])`,
            [FAKE_TYPE_IDS]
        );
        console.log(`  Deleted ${statsRes.rowCount} StoveTypeStatistics records`);

        // Finally delete the fake stove types
        const typeRes = await client.query(
            `DELETE FROM StoveType WHERE typeId = ANY($1::int[]) RETURNING name`,
            [FAKE_TYPE_IDS]
        );
        console.log(`\n✅ Deleted ${typeRes.rowCount} fake stove types:`);
        typeRes.rows.forEach(r => console.log(`   - ${r.name}`));

        await client.query("COMMIT");
        console.log("\n🎉 Fake stove types purged.");

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
