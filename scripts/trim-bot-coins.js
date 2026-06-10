require("dotenv").config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://ember:ember@localhost:5432/emberexchange'
});

async function run() {
  await client.connect();

  const { rows: bots } = await client.query(
    `SELECT playerId, username, coins FROM Player WHERE email LIKE '_bot_%@emberexchange.local'`
  );

  console.log(`Found ${bots.length} bot accounts`);

  let updated = 0;
  for (const bot of bots) {
    const newCoins = Math.floor(Math.random() * 90000) + 5000; // 5,000 – 94,999
    await client.query(
      `UPDATE Player SET coins = $1 WHERE playerId = $2`,
      [newCoins, bot.playerid]
    );
    console.log(`  ${bot.username}: ${bot.coins.toLocaleString()} → ${newCoins.toLocaleString()}`);
    updated++;
  }

  console.log(`\nUpdated ${updated} bot accounts`);
  await client.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
