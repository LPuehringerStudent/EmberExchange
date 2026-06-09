require("dotenv").config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://ember:ember@localhost:5432/emberexchange'
});

// ── Configuration ───────────────────────────────────────────────

const RARITY_CONFIG = {
  common:    { mintMin: 60,  mintMax: 150, basePrice: 500,   volatility: 0.08,  tradesPerDay: [1, 4] },
  rare:      { mintMin: 25,  mintMax: 60,  basePrice: 1800,  volatility: 0.12,  tradesPerDay: [0, 3] },
  epic:      { mintMin: 10,  mintMax: 25,  basePrice: 5000,  volatility: 0.16,  tradesPerDay: [0, 2] },
  legendary: { mintMin: 4,   mintMax: 10,  basePrice: 15000, volatility: 0.22,  tradesPerDay: [0, 2] },
  limited:   { mintMin: 3,   mintMax: 6,   basePrice: 30000, volatility: 0.28,  tradesPerDay: [0, 1] },
  secret:    { mintMin: 2,   mintMax: 4,   basePrice: 60000, volatility: 0.35,  tradesPerDay: [0, 1] },
};

const BOT_NAMES = [
  'MarketWhale', 'StoveHoarder', 'FlipMaster', 'IronTrader',
  'HeatSeeker', 'CoalCollector', 'EmberInvestor', 'FurnaceFund',
  'BurnRate', 'GlowHolder'
];

const DAYS_OF_HISTORY = 30;
const SNAPSHOTS_PER_DAY = 3;

// ── Helpers ─────────────────────────────────────────────────────

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function formatDate(d) {
  return d.toISOString();
}

function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// ── Bot Player Management ───────────────────────────────────────

async function getOrCreateBots() {
  const bots = [];
  for (let i = 0; i < BOT_NAMES.length; i++) {
    const name = BOT_NAMES[i];
    const email = `_bot_${name.toLowerCase()}@emberexchange.local`;
    let res = await client.query('SELECT playerId FROM Player WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      res = await client.query(
        `INSERT INTO Player (username, password, email, motto, coins, sparks, joinedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING playerId`,
        [name, '_bot_password_', email, 'Simulation bot', 999999999, 0, new Date().toISOString()]
      );
      console.log(`  Created bot: ${name} (id=${res.rows[0].playerid})`);
    } else {
      console.log(`  Found bot: ${name} (id=${res.rows[0].playerid})`);
    }
    bots.push(res.rows[0].playerid);
  }
  return bots;
}

async function clearBotData(botIds) {
  const placeholders = botIds.map((_, i) => `$${i + 1}`).join(',');
  console.log('Clearing previous simulation data...');

  await client.query(`DELETE FROM Trade WHERE buyerId IN (${placeholders})`, botIds);
  await client.query(`DELETE FROM Listing WHERE sellerId IN (${placeholders})`, botIds);
  await client.query(`DELETE FROM Stove WHERE currentOwnerId IN (${placeholders})`, botIds);
  await client.query(`DELETE FROM PriceHistory`);
  await client.query(`DELETE FROM StovePriceHistory`);

  console.log('  Cleared.');
}

// ── Price Walk Generator ────────────────────────────────────────

function generatePriceWalk(basePrice, volatility, days, rng) {
  const prices = [];
  let current = basePrice;

  for (let d = 0; d < days; d++) {
    const dayProgress = d / days;
    const cycle = Math.sin(dayProgress * Math.PI * 2 + rng() * 0.5) * 0.15;
    const walk = (rng() - 0.5) * 2 * volatility * current;

    let event = 0;
    if (rng() < 0.05) {
      const direction = rng() < 0.5 ? -1 : 1;
      const magnitude = 0.10 + rng() * 0.30;
      event = direction * magnitude * current;
    }

    const date = addDays(new Date(), -(days - d));
    const dow = date.getDay();
    const weekend = (dow === 0 || dow === 6) ? -0.02 * current : 0;

    current += walk + (cycle * basePrice * 0.01) + event + weekend;

    const floor = basePrice * 0.4;
    const ceiling = basePrice * 3.0;
    if (current < floor) current += (floor - current) * 0.3;
    if (current > ceiling) current -= (current - ceiling) * 0.3;

    prices.push(Math.max(10, Math.round(current)));
  }
  return prices;
}

// ── Batch Insert Helpers ────────────────────────────────────────

async function batchInsert(sql, values, batchSize = 200) {
  for (let i = 0; i < values.length; i += batchSize) {
    const chunk = values.slice(i, i + batchSize);
    const placeholders = chunk.map((_, idx) => {
      const base = idx * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    }).join(', ');
    const flat = chunk.flat();
    await client.query(`${sql} VALUES ${placeholders}`, flat);
  }
}

async function batchInsertReturning(sql, values, cols = 3, batchSize = 100) {
  const allIds = [];
  for (let i = 0; i < values.length; i += batchSize) {
    const chunk = values.slice(i, i + batchSize);
    const placeholders = chunk.map((_, idx) => {
      const base = idx * cols;
      const parts = [];
      for (let c = 0; c < cols; c++) parts.push(`$${base + c + 1}`);
      return `(${parts.join(', ')})`;
    }).join(', ');
    const flat = chunk.flat();
    const res = await client.query(`${sql} VALUES ${placeholders} RETURNING stoveId`, flat);
    allIds.push(...res.rows.map(r => r.stoveid));
  }
  return allIds;
}

// ── Main Simulation ─────────────────────────────────────────────

async function run() {
  await client.connect();
  console.log('Connected to database');

  const { rows: stoveTypes } = await client.query(
    'SELECT typeId, name, rarity FROM StoveType ORDER BY typeId'
  );
  console.log(`Found ${stoveTypes.length} stove types`);

  const bots = await getOrCreateBots();
  await clearBotData(bots);

  let totalStoves = 0;
  let totalListings = 0;
  let totalTrades = 0;
  let totalSnapshots = 0;
  let totalPriceHistory = 0;

  const now = new Date();
  const startDate = addDays(now, -DAYS_OF_HISTORY);

  for (const stove of stoveTypes) {
    const config = RARITY_CONFIG[stove.rarity] || RARITY_CONFIG.common;
    const rng = seededRng(stove.typeid * 1337 + 42);

    // 1. Decide how many stoves to mint
    const mintCount = randInt(config.mintMin, config.mintMax);

    // 2. Generate price walk over 30 days
    const dailyPrices = generatePriceWalk(config.basePrice, config.volatility, DAYS_OF_HISTORY, rng);

    // 3. Mint stoves (batched)
    const stoveValues = [];
    for (let i = 0; i < mintCount; i++) {
      const ownerId = bots[randInt(0, bots.length - 1)];
      const mintedAt = formatDate(addDays(startDate, randBetween(0, DAYS_OF_HISTORY)));
      stoveValues.push([stove.typeid, ownerId, mintedAt, randBetween(0, 1), randInt(0, 3)]);
    }
    const stoveIds = await batchInsertReturning(
      `INSERT INTO Stove (typeId, currentOwnerId, mintedAt, heatLevel, reRollCount)`,
      stoveValues, 5, 100
    );

    // 4. Create StovePriceHistory snapshots (batched)
    const snapshotValues = [];
    for (let d = 0; d < DAYS_OF_HISTORY; d++) {
      const base = dailyPrices[d];
      for (let s = 0; s < SNAPSHOTS_PER_DAY; s++) {
        const hour = 2 + s * 7 + randInt(-1, 1);
        const ts = addDays(startDate, d);
        ts.setHours(hour, randInt(0, 59), randInt(0, 59));
        const price = Math.max(10, Math.round(base * (1 + (rng() - 0.5) * 0.06)));
        snapshotValues.push([stove.typeid, price, formatDate(ts)]);
      }
    }
    if (snapshotValues.length > 0) {
      await batchInsert(`INSERT INTO StovePriceHistory (typeId, price, timestamp)`, snapshotValues, 200);
      totalSnapshots += snapshotValues.length;
    }

    // 5. Create trades (Listings + Trades + PriceHistory)
    let stoveIdx = 0;
    let stoveTrades = 0;

    const soldListingValues = [];
    const tradeValues = [];
    const priceHistoryValues = [];

    for (let d = 0; d < DAYS_OF_HISTORY; d++) {
      const tradeCount = randInt(config.tradesPerDay[0], config.tradesPerDay[1]);
      if (tradeCount === 0) continue;

      const dayBasePrice = dailyPrices[d];

      for (let t = 0; t < tradeCount; t++) {
        if (stoveIdx >= stoveIds.length) break;

        const stoveId = stoveIds[stoveIdx++];
        const sellerId = bots[randInt(0, bots.length - 1)];
        const buyerId = bots[randInt(0, bots.length - 1)];
        const price = Math.max(1, Math.round(dayBasePrice * (1 + (rng() - 0.5) * 0.15)));

        const listedAt = addDays(startDate, d);
        listedAt.setHours(randInt(0, 23), randInt(0, 59));

        const executedAt = new Date(listedAt);
        executedAt.setHours(executedAt.getHours() + randInt(1, 12));

        soldListingValues.push([sellerId, stoveId, price, formatDate(listedAt)]);
        tradeValues.push([buyerId, formatDate(executedAt)]);
        priceHistoryValues.push([stove.typeid, price, formatDate(executedAt)]);

        stoveTrades++;
      }
    }

    // Insert sold listings in batches, capture IDs, then insert trades
    const soldListingIds = [];
    for (let i = 0; i < soldListingValues.length; i += 100) {
      const chunk = soldListingValues.slice(i, i + 100);
      const placeholders = chunk.map((_, idx) => {
        const base = idx * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'sold')`;
      }).join(', ');
      const flat = chunk.flat();
      const res = await client.query(
        `INSERT INTO Listing (sellerId, stoveId, price, listedAt, status) VALUES ${placeholders} RETURNING listingId`,
        flat
      );
      soldListingIds.push(...res.rows.map(r => r.listingid));
    }

    // Insert trades
    if (soldListingIds.length > 0) {
      const tradeRows = soldListingIds.map((listingId, idx) => [listingId, tradeValues[idx][0], tradeValues[idx][1]]);
      await batchInsert(`INSERT INTO Trade (listingId, buyerId, executedAt)`, tradeRows, 200);
    }

    // Insert PriceHistory
    if (priceHistoryValues.length > 0) {
      await batchInsert(`INSERT INTO PriceHistory (typeId, salePrice, saleDate)`, priceHistoryValues, 200);
    }

    totalListings += soldListingValues.length;
    totalTrades += soldListingValues.length;
    totalPriceHistory += priceHistoryValues.length;

    // 6. Create active listings (unsold stoves still listed)
    const activeCount = Math.floor((stoveIds.length - stoveIdx) * 0.5);
    const activeValues = [];
    for (let i = 0; i < activeCount && stoveIdx < stoveIds.length; i++) {
      const stoveId = stoveIds[stoveIdx++];
      const sellerId = bots[randInt(0, bots.length - 1)];
      const price = Math.max(1, Math.round(dailyPrices[DAYS_OF_HISTORY - 1] * (1 + (rng() - 0.5) * 0.20)));
      const listedAt = addDays(now, -randInt(0, 3));
      listedAt.setHours(randInt(0, 23), randInt(0, 59));
      activeValues.push([sellerId, stoveId, price, formatDate(listedAt)]);
    }
    if (activeValues.length > 0) {
      const placeholders = activeValues.map((_, idx) => {
        const base = idx * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'active')`;
      }).join(', ');
      await client.query(
        `INSERT INTO Listing (sellerId, stoveId, price, listedAt, status) VALUES ${placeholders}`,
        activeValues.flat()
      );
      totalListings += activeValues.length;
    }

    totalStoves += mintCount;

    const minPrice = Math.min(...dailyPrices);
    const maxPrice = Math.max(...dailyPrices);
    console.log(
      `  ${stove.name} (${stove.rarity}): ${mintCount} minted, ` +
      `${stoveTrades} trades, ` +
      `price ${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()}`
    );
  }

  console.log('\n────────────────────────────────────────');
  console.log('Simulation complete!');
  console.log(`  Stoves minted:      ${totalStoves.toLocaleString()}`);
  console.log(`  Listings total:     ${totalListings.toLocaleString()}`);
  console.log(`  Trades executed:    ${totalTrades.toLocaleString()}`);
  console.log(`  PriceHistory rows:  ${totalPriceHistory.toLocaleString()}`);
  console.log(`  StovePriceHistory:  ${totalSnapshots.toLocaleString()}`);
  console.log('────────────────────────────────────────');

  await client.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
