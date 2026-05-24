const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // Fix collection for existing dragon stoves
    const fixCollection = await client.query(
        "UPDATE stovetype SET collection = 'Dragon' WHERE LOWER(name) LIKE '%dragon%'"
    );
    console.log(`Fixed collection for ${fixCollection.rowCount} dragon stove(s)`);

    // Insert missing dragon stoves
    const missing = [
        { name: 'Standard Dragon', imageUrl: '/assets/stove_sprites/new_stoves/standard-dragon.png', rarity: 'common', lootboxWeight: 60, collection: 'Dragon', minHeat: 0.0, maxHeat: 0.95 },
        { name: 'Dirt Dragon', imageUrl: '/assets/stove_sprites/new_stoves/dirt-dragon.png', rarity: 'common', lootboxWeight: 35, collection: 'Dragon', minHeat: 0.0, maxHeat: 0.80 },
        { name: 'Green Dragon', imageUrl: '/assets/stove_sprites/new_stoves/green-dragon.png', rarity: 'rare', lootboxWeight: 15, collection: 'Dragon', minHeat: 0.0, maxHeat: 0.65 },
        { name: 'Black Dragon', imageUrl: '/assets/stove_sprites/new_stoves/black-dragon.png', rarity: 'epic', lootboxWeight: 4, collection: 'Dragon', minHeat: 0.0, maxHeat: 0.50 },
        { name: 'Shiny Celestial Dragon', imageUrl: '/assets/stove_sprites/new_stoves/shiny-celestial-dragon.png', rarity: 'secret', lootboxWeight: 1, collection: 'Dragon', minHeat: 0.0, maxHeat: 0.15 },
    ];

    for (const stove of missing) {
        const exists = await client.query(
            'SELECT 1 FROM stovetype WHERE name = $1',
            [stove.name]
        );
        if (exists.rowCount === 0) {
            const res = await client.query(
                `INSERT INTO stovetype (name, imageurl, rarity, lootboxweight, collection, minheat, maxheat)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [stove.name, stove.imageUrl, stove.rarity, stove.lootboxWeight, stove.collection, stove.minHeat, stove.maxHeat]
            );
            console.log(`Inserted ${stove.name} (${stove.rarity})`);
        } else {
            console.log(`Skipped ${stove.name} (already exists)`);
        }
    }

    await client.end();
    console.log('Done!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
