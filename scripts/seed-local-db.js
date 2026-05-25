const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://ember:ember@localhost:5432/emberexchange',
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('aws.neon.tech')
    ? { rejectUnauthorized: false }
    : false
});

async function run() {
  await client.connect();
  console.log('Connected to local Postgres');

  // Helper to run SQL and log
  async function sql(query, values = []) {
    try {
      await client.query(query, values);
    } catch (e) {
      console.error('SQL ERROR:', e.message);
      console.error('Query:', query.substring(0, 120));
      throw e;
    }
  }

  // ============ TABLES ============
  console.log('Creating tables...');

  await sql(`CREATE TABLE IF NOT EXISTS Player (
    playerId SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    email TEXT NOT NULL UNIQUE,
    motto TEXT NOT NULL DEFAULT '',
    coins INTEGER NOT NULL DEFAULT 0,
    lootboxCount INTEGER NOT NULL DEFAULT 0,
    isAdmin INTEGER NOT NULL DEFAULT 0,
    isPublic INTEGER NOT NULL DEFAULT 1,
    joinedAt TEXT NOT NULL,
    provider TEXT CHECK (provider IN ('google', 'github')),
    providerId TEXT UNIQUE
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS StoveType (
    typeId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret')),
    lootboxWeight INTEGER NOT NULL,
    collection TEXT NOT NULL DEFAULT 'Industrial',
    minHeat REAL NOT NULL DEFAULT 0.0,
    maxHeat REAL NOT NULL DEFAULT 1.0
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Stove (
    stoveId SERIAL PRIMARY KEY,
    typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
    currentOwnerId INTEGER NOT NULL REFERENCES Player(playerId),
    mintedAt TEXT NOT NULL,
    heatLevel REAL NOT NULL DEFAULT 0.0
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS LootboxType (
    lootboxTypeId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    costCoins INTEGER NOT NULL DEFAULT 0,
    costFree INTEGER NOT NULL DEFAULT 1,
    dailyLimit INTEGER,
    isAvailable INTEGER NOT NULL DEFAULT 1
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Lootbox (
    lootboxId SERIAL PRIMARY KEY,
    lootboxTypeId INTEGER NOT NULL REFERENCES LootboxType(lootboxTypeId),
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    openedAt TEXT,
    acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('free', 'purchase', 'reward', 'shop', 'daily_reward'))
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS LootboxDrop (
    dropId SERIAL PRIMARY KEY,
    lootboxId INTEGER NOT NULL UNIQUE REFERENCES Lootbox(lootboxId),
    stoveId INTEGER NOT NULL UNIQUE REFERENCES Stove(stoveId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Ownership (
    ownershipId SERIAL PRIMARY KEY,
    stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    acquiredAt TEXT NOT NULL,
    acquiredHow TEXT NOT NULL DEFAULT 'lootbox',
    pricePaid INTEGER
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS CoinTransaction (
    transactionId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    referenceId INTEGER
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS ShopListing (
    listingId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    itemType TEXT NOT NULL CHECK (itemType IN ('stove', 'lootbox')),
    itemId INTEGER NOT NULL,
    priceCoins INTEGER NOT NULL,
    stock INTEGER,
    isFeatured INTEGER NOT NULL DEFAULT 0,
    isAvailable INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS ShopPurchase (
    purchaseId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    listingId INTEGER NOT NULL REFERENCES ShopListing(listingId),
    quantity INTEGER NOT NULL DEFAULT 1,
    totalPrice INTEGER NOT NULL,
    purchasedAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Trade (
    tradeId SERIAL PRIMARY KEY,
    stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
    sellerId INTEGER NOT NULL REFERENCES Player(playerId),
    buyerId INTEGER REFERENCES Player(playerId),
    price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    completedAt TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS TradeOffer (
    offerId SERIAL PRIMARY KEY,
    messageId INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    resolvedAt TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Friend (
    friendId SERIAL PRIMARY KEY,
    requesterId INTEGER NOT NULL REFERENCES Player(playerId),
    addresseeId INTEGER NOT NULL REFERENCES Player(playerId),
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    UNIQUE(requesterId, addresseeId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS ChatMessage (
    messageId SERIAL PRIMARY KEY,
    senderId INTEGER NOT NULL REFERENCES Player(playerId),
    receiverId INTEGER NOT NULL REFERENCES Player(playerId),
    content TEXT NOT NULL,
    sentAt TEXT NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0,
    messageType TEXT NOT NULL DEFAULT 'text',
    data TEXT NOT NULL DEFAULT '{}'
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerSettings (
    playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
    friendRequests INTEGER NOT NULL DEFAULT 1,
    chatMessages INTEGER NOT NULL DEFAULT 1,
    tradeOffers INTEGER NOT NULL DEFAULT 1,
    dailyReminder INTEGER NOT NULL DEFAULT 1
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Session (
    sessionId TEXT PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    device TEXT,
    ipAddress TEXT,
    createdAt TEXT NOT NULL,
    lastActiveAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerStatistics (
    playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
    totalStovesCrafted INTEGER NOT NULL DEFAULT 0,
    totalTrades INTEGER NOT NULL DEFAULT 0,
    totalCoinsEarned INTEGER NOT NULL DEFAULT 0,
    totalCoinsSpent INTEGER NOT NULL DEFAULT 0,
    favoriteGame TEXT,
    luckiestWin INTEGER NOT NULL DEFAULT 0,
    daysActive INTEGER NOT NULL DEFAULT 0
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerAchievement (
    achievementId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    badgeKey TEXT NOT NULL,
    unlockedAt TEXT NOT NULL,
    UNIQUE(playerId, badgeKey)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerPrestige (
    playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
    totalXP INTEGER NOT NULL DEFAULT 0,
    currentLevel INTEGER NOT NULL DEFAULT 1,
    prestigeCount INTEGER NOT NULL DEFAULT 0,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryBanner (
    bannerId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cssClass TEXT NOT NULL,
    unlockCondition TEXT,
    unlockValue INTEGER
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryTheme (
    themeId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cssClass TEXT NOT NULL,
    unlockCondition TEXT,
    unlockValue INTEGER,
    minLevel INTEGER NOT NULL DEFAULT 1
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryTitle (
    titleId TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    animation TEXT NOT NULL DEFAULT 'none',
    unlockCondition TEXT,
    unlockValue INTEGER,
    minLevel INTEGER NOT NULL DEFAULT 1
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryTrophy (
    trophyId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    iconUrl TEXT,
    season TEXT,
    eventName TEXT,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret'))
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerGloryBanner (
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    bannerId INTEGER NOT NULL REFERENCES GloryBanner(bannerId),
    unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playerId, bannerId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerGloryTheme (
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    themeId INTEGER NOT NULL REFERENCES GloryTheme(themeId),
    unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playerId, themeId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerGloryTitle (
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    titleId TEXT NOT NULL REFERENCES GloryTitle(titleId),
    unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isActive INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (playerId, titleId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerGloryTrophy (
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    trophyId TEXT NOT NULL REFERENCES GloryTrophy(trophyId),
    acquiredAt TEXT NOT NULL,
    PRIMARY KEY (playerId, trophyId)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Game (
    gameId SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    gameType TEXT NOT NULL UNIQUE,
    minPlayers INTEGER NOT NULL,
    maxPlayers INTEGER NOT NULL,
    ruleset TEXT NOT NULL,
    description TEXT,
    genre TEXT NOT NULL DEFAULT '',
    tags JSONB NOT NULL DEFAULT '[]',
    isActive INTEGER NOT NULL DEFAULT 1
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Room (
    roomId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gameId INTEGER NOT NULL REFERENCES Game(gameId),
    hostId INTEGER NOT NULL REFERENCES Player(playerId),
    status TEXT NOT NULL DEFAULT 'waiting',
    maxPlayers INTEGER NOT NULL DEFAULT 8,
    createdAt TEXT NOT NULL,
    password TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS RoomPlayer (
    roomPlayerId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roomId UUID NOT NULL REFERENCES Room(roomId) ON DELETE CASCADE,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    connectionState TEXT NOT NULL DEFAULT 'connected',
    joinedAt TEXT NOT NULL,
    disconnectedAt TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GameState (
    gameStateId SERIAL PRIMARY KEY,
    gameId INTEGER NOT NULL REFERENCES Game(gameId),
    roomId UUID NOT NULL REFERENCES Room(roomId),
    state TEXT NOT NULL DEFAULT '{}',
    updatedAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS Notification (
    notificationId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS LoginHistory (
    loginId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    ipAddress TEXT,
    device TEXT,
    success INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS SupportTicket (
    ticketId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    createdAt TEXT NOT NULL,
    resolvedAt TEXT
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PriceHistory (
    priceHistoryId SERIAL PRIMARY KEY,
    itemType TEXT NOT NULL,
    itemId INTEGER NOT NULL,
    price INTEGER NOT NULL,
    recordedAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS DailyStatistics (
    statId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    date TEXT NOT NULL,
    coinsEarned INTEGER NOT NULL DEFAULT 0,
    coinsSpent INTEGER NOT NULL DEFAULT 0,
    stovesAcquired INTEGER NOT NULL DEFAULT 0,
    stovesTraded INTEGER NOT NULL DEFAULT 0,
    UNIQUE(playerId, date)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS EventLog (
    eventId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    eventType TEXT NOT NULL,
    description TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS TwoFactorChallenge (
    challengeId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    secret TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS TwoFactorBackupCode (
    codeId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    codeHash TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS StoveTypeStatistics (
    stoveTypeId INTEGER PRIMARY KEY REFERENCES StoveType(typeId),
    timesPulled INTEGER NOT NULL DEFAULT 0,
    timesTraded INTEGER NOT NULL DEFAULT 0
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS MiniGameSession (
    sessionId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    gameType TEXT NOT NULL,
    betAmount INTEGER NOT NULL DEFAULT 0,
    winnings INTEGER NOT NULL DEFAULT 0,
    result TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryVisit (
    visitId SERIAL PRIMARY KEY,
    visitorId INTEGER NOT NULL REFERENCES Player(playerId),
    visitedId INTEGER NOT NULL REFERENCES Player(playerId),
    visitedAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryGuestbook (
    guestbookId SERIAL PRIMARY KEY,
    writerId INTEGER NOT NULL REFERENCES Player(playerId),
    visitedId INTEGER NOT NULL REFERENCES Player(playerId),
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryShowcase (
    showcaseId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
    slotIndex INTEGER NOT NULL,
    UNIQUE(playerId, slotIndex)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS GloryFeaturedAchievement (
    featuredId SERIAL PRIMARY KEY,
    playerId INTEGER NOT NULL REFERENCES Player(playerId),
    achievementId INTEGER NOT NULL REFERENCES PlayerAchievement(achievementId),
    slotIndex INTEGER NOT NULL,
    UNIQUE(playerId, slotIndex)
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS PlayerDailyReward (
    playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
    lastClaimedAt TEXT,
    streak INTEGER NOT NULL DEFAULT 0
  )`);

  console.log('All tables created');

  // ============ SEED DATA ============
  console.log('Seeding data...');

  // Check if already seeded
  const { rows: [{ cnt }] } = await client.query("SELECT COUNT(*)::int as cnt FROM Player WHERE isAdmin = 1");
  if (cnt > 0) {
    console.log('Database already seeded, skipping');
    await client.end();
    return;
  }

  // Lootbox types
  const lootboxTypes = [
    { name: "Standard Lootbox", description: "A standard lootbox with common to legendary items", costCoins: 0, costFree: 1, dailyLimit: null, isAvailable: 1 },
    { name: "Golden Lootbox", description: "Increased odds for rare and epic items", costCoins: 500, costFree: 0, dailyLimit: 100, isAvailable: 1 },
    { name: "Legendary Crate", description: "Guaranteed legendary or limited item", costCoins: 5000, costFree: 0, dailyLimit: 20, isAvailable: 1 },
    { name: "Dragon Crate", description: "Exclusively contains dragon stoves", costCoins: 2500, costFree: 0, dailyLimit: 5, isAvailable: 1 },
    { name: "Winter Crate", description: "Guaranteed winter-themed stove", costCoins: 1500, costFree: 0, dailyLimit: 10, isAvailable: 1 }
  ];
  for (const t of lootboxTypes) {
    await sql('INSERT INTO LootboxType (name, description, costCoins, costFree, dailyLimit, isAvailable) VALUES ($1, $2, $3, $4, $5, $6)',
      [t.name, t.description, t.costCoins, t.costFree, t.dailyLimit, t.isAvailable]);
  }
  console.log('LootboxTypes seeded');

  // Stove types (using the corrected rarities from unit.ts)
  const stoves = [
    { name: "Rusty Stove", imageUrl: "/assets/stove_sprites/common/rusty.png", rarity: "common", lootboxWeight: 100, collection: "Industrial", minHeat: 0.0, maxHeat: 1.0 },
    { name: "Standard Stove", imageUrl: "/assets/stove_sprites/common/standard.png", rarity: "common", lootboxWeight: 80, collection: "Industrial", minHeat: 0.0, maxHeat: 0.9 },
    { name: "Bronze Stove", imageUrl: "/assets/stove_sprites/rare/bronze.png", rarity: "rare", lootboxWeight: 50, collection: "Industrial", minHeat: 0.0, maxHeat: 0.85 },
    { name: "Forest Stove", imageUrl: "/assets/stove_sprites/rare/forest.png", rarity: "rare", lootboxWeight: 40, collection: "Nature", minHeat: 0.0, maxHeat: 0.85 },
    { name: "Golden Stove", imageUrl: "/assets/stove_sprites/epic/golden.png", rarity: "epic", lootboxWeight: 20, collection: "Nature", minHeat: 0.0, maxHeat: 0.70 },
    { name: "Steampunk Stove", imageUrl: "/assets/stove_sprites/epic/steampunk.png", rarity: "epic", lootboxWeight: 15, collection: "Industrial", minHeat: 0.0, maxHeat: 0.75 },
    { name: "Dragon Stove", imageUrl: "/assets/stove_sprites/legendary/dragon.png", rarity: "legendary", lootboxWeight: 5, collection: "Dragon", minHeat: 0.0, maxHeat: 0.55 },
    { name: "Crystal Stove", imageUrl: "/assets/stove_sprites/legendary/crystal.png", rarity: "legendary", lootboxWeight: 3, collection: "Dragon", minHeat: 0.0, maxHeat: 0.45 },
    { name: "One of a Kind", imageUrl: "", rarity: "limited", lootboxWeight: 1, collection: "Special", minHeat: 0.0, maxHeat: 0.40 },
    { name: "Earthbound Stove", imageUrl: "/assets/stove_sprites/secret/earthbound-stove.png", rarity: "secret", lootboxWeight: 1, collection: "Nature", minHeat: 0.0, maxHeat: 0.25 },
    { name: "Galactic Dragon Stove", imageUrl: "/assets/stove_sprites/secret/galactic-dragon-stove.png", rarity: "legendary", lootboxWeight: 1, collection: "Dragon", minHeat: 0.0, maxHeat: 0.20 },
    { name: "Magic Stove", imageUrl: "/assets/stove_sprites/legendary/magic-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Special", minHeat: 0.0, maxHeat: 0.50 },
    { name: "Pinaple Stove", imageUrl: "/assets/stove_sprites/epic/pinaple-stove.png", rarity: "epic", lootboxWeight: 15, collection: "Special", minHeat: 0.0, maxHeat: 0.70 },
    { name: "Red Dragon Stove", imageUrl: "/assets/stove_sprites/legendary/red-dragon-stove.png", rarity: "epic", lootboxWeight: 5, collection: "Dragon", minHeat: 0.0, maxHeat: 0.50 },
    { name: "Upgraded Forest Stove", imageUrl: "/assets/stove_sprites/legendary/upgraded-forest-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Nature", minHeat: 0.0, maxHeat: 0.55 },
    { name: "Upgraded Steampunk Stove", imageUrl: "/assets/stove_sprites/legendary/upgraded-steampunk-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Industrial", minHeat: 0.0, maxHeat: 0.55 },
    { name: "White Blue Stove", imageUrl: "/assets/stove_sprites/rare/white-blue-stove.png", rarity: "rare", lootboxWeight: 40, collection: "Nature", minHeat: 0.0, maxHeat: 0.80 },
    { name: "White Dragon Stove", imageUrl: "/assets/stove_sprites/epic/white-dragon-stove.png", rarity: "rare", lootboxWeight: 15, collection: "Dragon", minHeat: 0.0, maxHeat: 0.70 },
    { name: "Standard Dragon", imageUrl: "/assets/stove_sprites/new_stoves/standard-dragon.png", rarity: "common", lootboxWeight: 60, collection: "Dragon", minHeat: 0.0, maxHeat: 0.95 },
    { name: "Dirt Dragon", imageUrl: "/assets/stove_sprites/new_stoves/dirt-dragon.png", rarity: "common", lootboxWeight: 35, collection: "Dragon", minHeat: 0.0, maxHeat: 0.80 },
    { name: "Green Dragon", imageUrl: "/assets/stove_sprites/new_stoves/green-dragon.png", rarity: "rare", lootboxWeight: 15, collection: "Dragon", minHeat: 0.0, maxHeat: 0.65 },
    { name: "Black Dragon", imageUrl: "/assets/stove_sprites/new_stoves/black-dragon.png", rarity: "epic", lootboxWeight: 4, collection: "Dragon", minHeat: 0.0, maxHeat: 0.50 },
    { name: "Celestial Stove", imageUrl: "/assets/stove_sprites/new_stoves/celestial-stove.png", rarity: "legendary", lootboxWeight: 3, collection: "Special", minHeat: 0.0, maxHeat: 0.40 },
    { name: "Shiny Celestial Dragon", imageUrl: "/assets/stove_sprites/new_stoves/shiny-celestial-dragon.png", rarity: "secret", lootboxWeight: 1, collection: "Dragon", minHeat: 0.0, maxHeat: 0.15 },
    { name: "Shiny Earthbound Stove", imageUrl: "/assets/stove_sprites/new_stoves/shiny-earthbound-stove.png", rarity: "secret", lootboxWeight: 1, collection: "Nature", minHeat: 0.0, maxHeat: 0.20 },
    { name: "Mistle Stove", imageUrl: "/assets/stove_sprites/winter_stove/mistle_stove.png", rarity: "rare", lootboxWeight: 70, collection: "Winter", minHeat: 0.0, maxHeat: 0.90 },
    { name: "Pine Stove", imageUrl: "/assets/stove_sprites/winter_stove/pine_stove.png", rarity: "common", lootboxWeight: 70, collection: "Winter", minHeat: 0.0, maxHeat: 0.90 },
    { name: "Snowman Stove", imageUrl: "/assets/stove_sprites/winter_stove/snowman_stove.png", rarity: "common", lootboxWeight: 65, collection: "Winter", minHeat: 0.0, maxHeat: 0.85 },
    { name: "Lantern Stove", imageUrl: "/assets/stove_sprites/winter_stove/lantern_stove.png", rarity: "rare", lootboxWeight: 40, collection: "Winter", minHeat: 0.0, maxHeat: 0.80 },
    { name: "Pinetree Stove", imageUrl: "/assets/stove_sprites/winter_stove/pinetree_stove.png", rarity: "epic", lootboxWeight: 35, collection: "Winter", minHeat: 0.0, maxHeat: 0.75 },
    { name: "Festival Stove", imageUrl: "/assets/stove_sprites/winter_stove/festival_stove.png", rarity: "secret", lootboxWeight: 15, collection: "Winter", minHeat: 0.0, maxHeat: 0.60 },
    { name: "Snowgod Stove", imageUrl: "/assets/stove_sprites/winter_stove/snowgod_stove.png", rarity: "epic", lootboxWeight: 4, collection: "Winter", minHeat: 0.0, maxHeat: 0.45 },
    { name: "Ultimate Snowman Stove", imageUrl: "/assets/stove_sprites/winter_stove/ultimate_snowman_stove.png", rarity: "legendary", lootboxWeight: 3, collection: "Winter", minHeat: 0.0, maxHeat: 0.40 }
  ];
  for (const s of stoves) {
    await sql('INSERT INTO StoveType (name, imageUrl, rarity, lootboxWeight, collection, minHeat, maxHeat) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [s.name, s.imageUrl, s.rarity, s.lootboxWeight, s.collection, s.minHeat, s.maxHeat]);
  }
  console.log('StoveTypes seeded');

  // Admin player
  const bcrypt = require('bcrypt');
  const now = new Date().toISOString();
  const adminHash = await bcrypt.hash('321admin', 10);
  await sql("INSERT INTO Player (username, password, email, motto, coins, lootboxCount, isAdmin, joinedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    ['admin', adminHash, 'admin@emberexchange.com', '', 999999, 100, 1, now]);
  console.log('Admin player seeded');

  // Shop NPC
  await sql("INSERT INTO Player (username, password, email, motto, coins, lootboxCount, isAdmin, joinedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    ['__shop__', '', 'shop@emberexchange.com', 'The shop', 0, 0, 0, now]);
  console.log('Shop NPC seeded');

  // Shop listings
  const listings = [
    { name: "Standard Lootbox", description: "A basic lootbox with common to epic items", itemType: "lootbox", itemId: 1, priceCoins: 0, stock: null, isFeatured: 0, isAvailable: 1, createdAt: now },
    { name: "Golden Lootbox", description: "Increased odds for rare and epic items", itemType: "lootbox", itemId: 2, priceCoins: 500, stock: 100, isFeatured: 1, isAvailable: 1, createdAt: now },
    { name: "Legendary Crate", description: "Guaranteed legendary or limited item", itemType: "lootbox", itemId: 3, priceCoins: 5000, stock: 20, isFeatured: 0, isAvailable: 1, createdAt: now },
    { name: "Dragon Crate", description: "Exclusively contains dragon stoves", itemType: "lootbox", itemId: 4, priceCoins: 2500, stock: 5, isFeatured: 0, isAvailable: 1, createdAt: now },
    { name: "Winter Crate", description: "Guaranteed winter-themed stove", itemType: "lootbox", itemId: 5, priceCoins: 1500, stock: 10, isFeatured: 1, isAvailable: 1, createdAt: now }
  ];
  for (const l of listings) {
    await sql('INSERT INTO ShopListing (name, description, itemType, itemId, priceCoins, stock, isFeatured, isAvailable, createdAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [l.name, l.description, l.itemType, l.itemId, l.priceCoins, l.stock, l.isFeatured, l.isAvailable, l.createdAt]);
  }
  console.log('Shop listings seeded');

  // Games
  await sql('INSERT INTO Game (name, slug, gameType, minPlayers, maxPlayers, ruleset, description, genre, tags, isActive) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    ['Poker', 'poker', 'poker', 2, 6, "No-Limit Texas Hold'em", 'Classic Texas Hold\'em poker with no betting limits.', 'card', JSON.stringify(['poker', 'cards', 'multiplayer']), 1]);
  await sql('INSERT INTO Game (name, slug, gameType, minPlayers, maxPlayers, ruleset, description, genre, tags, isActive) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    ['Blackjack', 'blackjack', 'blackjack', 1, 5, 'Standard American casino blackjack', 'Standard American casino blackjack.', 'card', JSON.stringify(['blackjack', 'cards', 'casino']), 1]);
  console.log('Games seeded');

  await client.end();
  console.log('Database seeded successfully!');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
