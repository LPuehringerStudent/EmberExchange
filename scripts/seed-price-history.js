const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://ember:ember@localhost:5432/emberexchange'
});

// ── Realistic base price ranges per rarity ──────────────────────
const RARITY_BASE = {
  common:    { min: 400,   max: 1800,  volatility: 0.12 },
  rare:      { min: 1200,  max: 4500,  volatility: 0.15 },
  epic:      { min: 3500,  max: 9000,  volatility: 0.18 },
  legendary: { min: 7000,  max: 22000, volatility: 0.22 },
  limited:   { min: 14000, max: 35000, volatility: 0.25 },
  secret:    { min: 22000, max: 55000, volatility: 0.30 }
};

// ── Helpers ─────────────────────────────────────────────────────

function randBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Generate a realistic price history for one stove type */
function generateHistory(typeId, rarity, name) {
  const config = RARITY_BASE[rarity] || RARITY_BASE.common;
  
  // Each stove type gets a unique "personality" — deterministic seed from typeId
  const seed = typeId * 7.31;
  const trend = Math.sin(seed) * 0.4;        // -0.4 to +0.4 general trend
  const stability = Math.cos(seed * 1.7);     // -1 to 1, affects how clustered prices are
  
  // Base price for this specific stove type (within rarity band)
  const rng = (() => {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  })();
  
  const basePrice = config.min + rng() * (config.max - config.min);
  
  // Number of trades over 30 days (more popular = more trades)
  const popularity = 0.5 + rng() * 0.5; // 0.5 to 1.0
  const tradeCount = randInt(12, Math.floor(24 * popularity));
  
  // Generate trade dates over the last 30 days (not evenly spaced)
  const now = new Date();
  const dates = [];
  for (let i = 0; i < tradeCount; i++) {
    const daysAgo = randBetween(0, 30);
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));
    dates.push(d);
  }
  dates.sort((a, b) => a - b);
  
  // Generate prices as a random walk
  const prices = [];
  let currentPrice = basePrice;
  
  for (let i = 0; i < tradeCount; i++) {
    const dayProgress = i / tradeCount; // 0 to 1
    const trendForce = trend * config.volatility * basePrice * dayProgress;
    
    // Random walk component
    const walk = (rng() - 0.5) * 2 * config.volatility * currentPrice;
    
    // Occasional events: 8% chance of a spike or dip
    let event = 0;
    if (rng() < 0.08) {
      const direction = rng() < 0.5 ? -1 : 1;
      const magnitude = 0.15 + rng() * 0.25; // 15-40% spike/dip
      event = direction * magnitude * currentPrice;
    }
    
    // Weekend softness (slightly lower prices on weekends)
    const dayOfWeek = dates[i].getDay();
    const weekendEffect = (dayOfWeek === 0 || dayOfWeek === 6) ? -0.03 * currentPrice : 0;
    
    currentPrice += walk + trendForce + event + weekendEffect;
    
    // Clamp within rarity bounds (but allow slight overshoot for realism)
    const softMin = config.min * 0.7;
    const softMax = config.max * 1.3;
    currentPrice = clamp(currentPrice, softMin, softMax);
    
    prices.push(Math.round(currentPrice));
  }
  
  return dates.map((date, i) => ({
    typeId,
    salePrice: prices[i],
    saleDate: date.toISOString()
  }));
}

// ── Main ────────────────────────────────────────────────────────

async function run() {
  await client.connect();
  console.log('Connected to database');
  
  // Get all stove types
  const { rows: stoveTypes } = await client.query(
    'SELECT typeId, name, rarity FROM StoveType ORDER BY typeId'
  );
  
  console.log(`Found ${stoveTypes.length} stove types`);
  
  // Recreate PriceHistory table with correct schema (matches backend service)
  await client.query('DROP TABLE IF EXISTS PriceHistory');
  await client.query(`
    CREATE TABLE PriceHistory (
      historyId SERIAL PRIMARY KEY,
      typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
      salePrice INTEGER NOT NULL,
      saleDate TEXT NOT NULL
    )
  `);
  console.log('Recreated PriceHistory table with correct schema');
  
  let totalInserted = 0;
  
  for (const stove of stoveTypes) {
    const history = generateHistory(stove.typeid, stove.rarity, stove.name);
    
    for (const record of history) {
      await client.query(
        'INSERT INTO PriceHistory (typeId, salePrice, saleDate) VALUES ($1, $2, $3)',
        [record.typeId, record.salePrice, record.saleDate]
      );
    }
    
    totalInserted += history.length;
    const priceRange = history.length > 0
      ? `${Math.min(...history.map(h => h.salePrice)).toLocaleString()} - ${Math.max(...history.map(h => h.salePrice)).toLocaleString()}`
      : 'none';
    console.log(`  ${stove.name} (${stove.rarity}): ${history.length} trades, range: ${priceRange}`);
  }
  
  console.log(`\nDone! Inserted ${totalInserted} price history records across ${stoveTypes.length} stove types.`);
  
  await client.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
