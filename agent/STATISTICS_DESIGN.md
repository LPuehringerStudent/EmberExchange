# Comprehensive Statistics System Design

## Overview

To track player behavior and market changes over time, we need 3 main tables:

1. **PlayerStatistics** - Aggregated stats per player (current totals)
2. **DailyStatistics** - Time-series data for trends (market-wide, per day)
3. **StoveTypeStatistics** - Per-stove-type market analytics

---

## Table 1: PlayerStatistics

**Purpose:** Current aggregated stats for each player (leaderboards, profiles)

```sql
PlayerStatistics {
    statId PK,
    playerId FK UNIQUE,  // One record per player
    
    // Activity Stats
    totalLogins,
    lastLoginAt,
    totalSessionMinutes,
    longestSessionMinutes,
    
    // Lootbox Stats
    totalLootboxesOpened,
    totalLootboxesPurchased,
    totalLootboxesFree,
    totalCoinsSpentOnLootboxes,
    bestDropRarity (common/rare/epic/legendary/limited),
    totalStovesFromLootboxes,
    
    // Market Stats
    totalListingsCreated,
    totalListingsSold,
    totalListingsCancelled,
    totalListingsExpired,
    totalPurchases,
    totalSalesRevenue,
    totalPurchaseSpending,
    averageListingPrice,
    averageSalePrice,
    fastestSaleMinutes,  // How quickly they sell stoves
    
    // Trading Stats (Direct trades if we add them later)
    totalTradesCompleted,
    totalTradesInitiated,
    totalTradesAccepted,
    totalTradesDeclined,
    
    // Mini-Game Stats
    totalMiniGamesPlayed,
    totalMiniGameWins,
    totalMiniGameLosses,
    totalCoinsFromMiniGames,
    totalCoinsLostInMiniGames,
    favoriteGameType,
    luckiestWin,  // Biggest coin payout
    
    // Social Stats
    totalMessagesSent,
    totalMessagesReceived,
    totalGlobalMessages,
    totalPrivateMessages,
    
    // Inventory Stats
    currentStoveCount,
    totalStovesAcquired,
    totalStovesSold,
    totalStovesTraded,
    rarestStoveOwned,  // Rarity enum
    
    // Economic Stats
    currentCoinBalance,  // Snapshot
    highestCoinBalance,
    lowestCoinBalance,
    totalCoinsEarned,
    totalCoinsSpent,
    netWorthEstimate,  // Coins + stove values
    
    // Calculated Fields
    avgSessionLengthMinutes,
    avgLoginsPerWeek,
    marketActivityScore,  // Algorithm: listings + purchases + trades
    
    updatedAt
}
```

---

## Table 2: DailyStatistics (Time Series)

**Purpose:** Track market trends and platform health over time

```sql
DailyStatistics {
    statId PK,
    date DATE UNIQUE,  // One record per day
    
    // Platform Activity
    uniquePlayersLoggedIn,
    newPlayersJoined,
    totalSessions,
    averageSessionMinutes,
    
    // Lootbox Economy
    lootboxesOpenedToday,
    lootboxesPurchasedToday,
    coinsSpentOnLootboxesToday,
    
    // Market Activity
    newListingsToday,
    listingsSoldToday,
    listingsCancelledToday,
    averageListingPriceToday,
    averageSalePriceToday,
    totalTradingVolume,  // Sum of all sale prices
    priceChangePercent,  // Avg price vs yesterday
    
    // Mini-Game Activity
    miniGamesPlayedToday,
    totalCoinPayoutsToday,
    houseProfit,  // Coins taken in minus paid out
    
    // Chat Activity
    messagesSentToday,
    uniqueChattersToday,
    
    // Economic Health
    totalCoinsInCirculation,  // Sum of all player coins
    totalStovesInExistence,   // Count of all stoves
    averagePlayerNetWorth,
    medianPlayerNetWorth,
    wealthGapRatio,  // Top 10% wealth / Bottom 10% wealth
    
    // Market Velocity
    averageTimeToSellHours,  // How long listings stay active
    sellThroughRate,  // Listings sold / Total listings created
    
    createdAt
}
```

---

## Table 3: StoveTypeStatistics (Per-Stove Analytics)

**Purpose:** Track supply/demand and pricing per stove type

```sql
StoveTypeStatistics {
    statId PK,
    stoveTypeId FK UNIQUE,  // One record per stove type
    
    // Supply Metrics
    totalMinted,
    currentlyOwned,  // In player inventories
    currentlyListed,  // On marketplace
    listedPercent,   // % of existing stoves currently listed
    
    // Price Metrics
    currentLowestPrice,  // Lowest active listing
    currentHighestPrice, // Highest active listing
    averageListingPrice,
    lastSalePrice,
    averageSalePrice,
    priceHistory7d,  // JSON array of daily avg prices
    priceHistory30d,
    allTimeHighPrice,
    allTimeLowPrice,
    
    // Demand Metrics
    totalSales,
    salesLast7Days,
    salesLast30Days,
    viewsCount,  // How many times viewed in marketplace
    wishlistCount,  // If we add wishlist feature
    
    // Drop Rate Analytics (Actual vs Expected)
    totalDroppedFromLootboxes,
    actualDropRate,  // Calculated: dropped / total lootboxes opened
    expectedDropRate,  // From stove's lootboxWeight
    
    // Rarity Scarcity
    percentOfTotalSupply,  // This type / All stoves
    rarityRank,  // 1 = most common, 9 = rarest
    
    // Market Trends
    priceTrend7d,  // percent change
    priceTrend30d,
    demandTrend,  // increasing/stable/decreasing
    
    updatedAt
}
```

---

## Table 4: PlayerDailyActivity (Optional - Granular Tracking)

**Purpose:** Track daily activity per player for detailed analytics

```sql
PlayerDailyActivity {
    activityId PK,
    playerId FK,
    date DATE,
    
    // Daily Activity
    loggedIn,
    sessionMinutes,
    
    // Daily Actions
    lootboxesOpened,
    coinsSpent,
    coinsEarned,
    listingsCreated,
    listingsSold,
    purchasesMade,
    miniGamesPlayed,
    messagesSent,
    
    // End of day snapshot
    coinBalanceEod,
    stoveCountEod,
    
    UNIQUE(playerId, date)  // One record per player per day
}
```

---

## Table 5: PriceHistoryHourly (Optional - High Granularity)

**Purpose:** Track price movements hour-by-hour for charts

```sql
PriceHistoryHourly {
    historyId PK,
    stoveTypeId FK,
    hourTimestamp DATETIME,  // Truncated to hour
    
    lowestPrice,
    highestPrice,
    averagePrice,
    volume,  // Number sold
    
    UNIQUE(stoveTypeId, hourTimestamp)
}
```

---

## Implementation Strategy

### Option A: Real-time Updates (Recommended)
Update stats immediately when actions happen:

```typescript
// When player opens lootbox:
playerStatsService.incrementLootboxesOpened(playerId);
playerStatsService.addCoinsSpent(playerId, lootboxCost);

// When listing sells:
playerStatsService.incrementSales(playerId, salePrice);
stoveTypeStatsService.recordSale(stoveTypeId, salePrice);
dailyStatsService.incrementDailySales(salePrice);
```

**Pros:** Always accurate, instant leaderboards
**Cons:** More DB writes

### Option B: Batch Aggregation (Nightly Job)
Run a job at midnight to calculate stats from previous day's data:

```typescript
// Nightly cron job
aggregateDailyStats();
updatePlayerLeaderboards();
updateMarketTrends();
```

**Pros:** Less runtime overhead
**Cons:** Stats are delayed, more complex queries

### Option C: Hybrid (Best of Both)
- **PlayerStatistics:** Real-time (needed for profiles)
- **DailyStatistics:** Batch (aggregated once per day)
- **StoveTypeStatistics:** Real-time (needed for marketplace)

---

## Key Metrics to Track

### Player Behavior
- [ ] Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- [ ] Retention (Day 1, Day 7, Day 30)
- [ ] Feature adoption (who uses mini-games vs just trading?)
- [ ] Player lifecycle (new → active → whale → churned)

### Market Health
- [ ] Trading volume trends
- [ ] Price volatility per stove type
- [ ] Supply/demand ratios
- [ ] Market liquidity (how fast things sell)

### Economy Balance
- [ ] Coin inflation rate
- [ ] Wealth distribution (Gini coefficient)
- [ ] Faucet vs Drain (coins created vs destroyed)
- [ ] Lootbox ROI (average value returned vs cost)

---

## API Endpoints Needed

```
GET /api/statistics/daily                    // Today's platform stats
GET /api/statistics/daily?date=2024-01-15    // Specific day
GET /api/statistics/daily/range?from=&to=    // Date range

GET /api/statistics/market                   // Current market overview
GET /api/statistics/market/trends            // 7d/30d trends

GET /api/statistics/players/leaderboard      // Top players by various metrics
GET /api/statistics/players/:id              // Single player stats

GET /api/statistics/stove-types/:id          // Stats for specific stove
GET /api/statistics/stove-types/compare      // Compare multiple types

GET /api/statistics/economy                  // Economic health dashboard
```

---

## Minimal Implementation (Start Here)

If you want to start simple, just implement:

1. **PlayerStatistics** - One table, update on key actions
2. **DailyStatistics** - One row per day, batch update at midnight

This gives you 90% of the value with minimal complexity.
