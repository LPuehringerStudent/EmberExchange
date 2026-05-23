const { Client } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in environment");
    process.exit(1);
}

const winterStoves = [
    { name: "Mistle Stove", imageUrl: "/assets/stove_sprites/winter_stove/mistle_stove.png", rarity: "common", lootboxWeight: 70, collection: "Winter", minHeat: 0.0, maxHeat: 0.90 },
    { name: "Pine Stove", imageUrl: "/assets/stove_sprites/winter_stove/pine_stove.png", rarity: "common", lootboxWeight: 70, collection: "Winter", minHeat: 0.0, maxHeat: 0.90 },
    { name: "Snowman Stove", imageUrl: "/assets/stove_sprites/winter_stove/snowman_stove.png", rarity: "common", lootboxWeight: 65, collection: "Winter", minHeat: 0.0, maxHeat: 0.85 },
    { name: "Lantern Stove", imageUrl: "/assets/stove_sprites/winter_stove/lantern_stove.png", rarity: "rare", lootboxWeight: 40, collection: "Winter", minHeat: 0.0, maxHeat: 0.80 },
    { name: "Pinetree Stove", imageUrl: "/assets/stove_sprites/winter_stove/pinetree_stove.png", rarity: "rare", lootboxWeight: 35, collection: "Winter", minHeat: 0.0, maxHeat: 0.75 },
    { name: "Festival Stove", imageUrl: "/assets/stove_sprites/winter_stove/festival_stove.png", rarity: "epic", lootboxWeight: 15, collection: "Winter", minHeat: 0.0, maxHeat: 0.60 },
    { name: "Snowgod Stove", imageUrl: "/assets/stove_sprites/winter_stove/snowgod_stove.png", rarity: "legendary", lootboxWeight: 4, collection: "Winter", minHeat: 0.0, maxHeat: 0.45 },
    { name: "Ultimate Snowman Stove", imageUrl: "/assets/stove_sprites/winter_stove/ultimate_snowman_stove.png", rarity: "legendary", lootboxWeight: 3, collection: "Winter", minHeat: 0.0, maxHeat: 0.40 }
];

async function main() {
    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    try {
        // 1. Insert Winter stoves if they don't exist
        let stovesInserted = 0;
        for (const stove of winterStoves) {
            const exists = await client.query("SELECT 1 FROM StoveType WHERE name = $1", [stove.name]);
            if (exists.rowCount === 0) {
                await client.query(
                    `INSERT INTO StoveType (name, imageUrl, rarity, lootboxWeight, collection, minHeat, maxHeat)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [stove.name, stove.imageUrl, stove.rarity, stove.lootboxWeight, stove.collection, stove.minHeat, stove.maxHeat]
                );
                stovesInserted++;
            }
        }
        console.log(`✅ Inserted ${stovesInserted} Winter stoves`);

        // 2. Insert Winter Crate lootbox type if it doesn't exist
        const winterCrateRes = await client.query("SELECT lootboxTypeId FROM LootboxType WHERE name = 'Winter Crate'");
        let winterCrateId;
        if (winterCrateRes.rowCount === 0) {
            const insertRes = await client.query(
                `INSERT INTO LootboxType (name, description, costCoins, costFree, dailyLimit, isAvailable)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING lootboxTypeId`,
                ["Winter Crate", "Guaranteed winter-themed stove", 1500, 0, 10, 1]
            );
            winterCrateId = insertRes.rows[0].lootboxtypeid;
            console.log(`✅ Created Winter Crate (ID: ${winterCrateId})`);
        } else {
            winterCrateId = winterCrateRes.rows[0].lootboxtypeid;
            console.log(`ℹ️ Winter Crate already exists (ID: ${winterCrateId})`);
        }

        // 3. Insert shop listing for Winter Crate if it doesn't exist
        const listingRes = await client.query(
            "SELECT 1 FROM ShopListing WHERE itemType = 'lootbox' AND itemId = $1",
            [winterCrateId]
        );
        if (listingRes.rowCount === 0) {
            await client.query(
                `INSERT INTO ShopListing (itemType, itemId, price, stock, rotationDate, isFeatured, createdAt)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ["lootbox", winterCrateId, 1500, 15, null, 0, new Date().toISOString()]
            );
            console.log(`✅ Added Winter Crate to shop`);
        } else {
            console.log(`ℹ️ Winter Crate shop listing already exists`);
        }

        console.log("\n🎉 Done! Refresh the shop to see the new lootbox.");
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.end();
    }
}

main();
