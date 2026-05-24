const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const updates = [
        // Dragon fixes
        { name: 'Galactic Dragon Stove', rarity: 'legendary' },
        { name: 'Red Dragon Stove', rarity: 'epic' },
        { name: 'White Dragon Stove', rarity: 'rare' },
        { name: 'Dirt Dragon', rarity: 'common' },
        { name: 'Green Dragon', rarity: 'rare' },
        { name: 'Black Dragon', rarity: 'epic' },
        // Winter fixes
        { name: 'Mistle Stove', rarity: 'rare' },
        { name: 'Pinetree Stove', rarity: 'epic' },
        { name: 'Festival Stove', rarity: 'secret' },
        { name: 'Snowgod Stove', rarity: 'epic' },
    ];

    for (const u of updates) {
        const res = await client.query(
            'UPDATE stovetype SET rarity = $1 WHERE name = $2',
            [u.rarity, u.name]
        );
        console.log(`Updated ${u.name} → ${u.rarity} (${res.rowCount} row(s))`);
    }

    await client.end();
    console.log('Done!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
