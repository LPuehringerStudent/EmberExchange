export enum Rarity {
    COMMON = "common",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary",
    LIMITED = "limited"
}

// Player
export interface Player {
    username: string;
    password: string;
    email: string;
    coins: number;
    lootboxCount: number;
    isAdmin: boolean;
    joinedAt: Date;
}

export interface PlayerRow extends Player {
    playerId: number;
}

// StoveType
export interface StoveType {
    name: string;
    imageUrl: string;
    rarity: Rarity;
    lootboxWeight: number;
}

export interface StoveTypeRow extends StoveType {
    typeId: number;
}

// Stove
export interface Stove {
    typeId: number;
    currentOwnerId: number;
    mintedAt: Date;
}


export interface StoveRow extends Stove {
    stoveId: number;
}

export interface ShowedStove extends StoveRow {
    stoveName: string;
    rarity: Rarity;
}

// LootboxType
export interface LootboxType {
    name: string;
    description: string | null;
    costCoins: number;
    costFree: boolean;
    dailyLimit: number | null;
    isAvailable: boolean;
}

export interface LootboxTypeRow extends LootboxType {
    lootboxTypeId: number;
}

// Lootbox
export interface Lootbox {
    lootboxTypeId: number;
    playerId: number;
    openedAt: Date;
    acquiredHow: "free" | "purchase" | "reward";
}

export interface LootboxRow extends Lootbox {
    lootboxId: number;
}

// LootboxDrop
export interface LootboxDrop {
    lootboxId: number;
    stoveId: number;
}

export interface LootboxDropRow extends LootboxDrop {
    dropId: number;
}

// Listing
export interface Listing {
    sellerId: number;
    stoveId: number;
    price: number;
    listedAt: Date;
    status: "active" | "cancelled" | "sold";
}

export interface ListingRow extends Listing {
    listingId: number;
}

// Trade
export interface Trade {
    listingId: number;
    buyerId: number;
    executedAt: Date;
}

export interface TradeRow extends Trade {
    tradeId: number;
}

// MiniGameSession
export interface MiniGameSession {
    playerId: number;
    gameType: string;
    result: string;
    coinPayout: number;
    finishedAt: Date;
}

export interface MiniGameSessionRow extends MiniGameSession {
    sessionId: number;
}

// PriceHistory
export interface PriceHistory {
    typeId: number;
    salePrice: number;
    saleDate: Date;
}

export interface PriceHistoryRow extends PriceHistory {
    historyId: number;
}

// Ownership
export interface Ownership {
    stoveId: number;
    playerId: number;
    acquiredAt: Date;
    acquiredHow: "lootbox" | "trade" | "mini-game";
}

export interface OwnershipRow extends Ownership {
    ownershipId: number;
}

// ChatMessage
export interface ChatMessage {
    senderId: number;
    receiverId: number | null;
    content: string;
    sentAt: Date;
    isRead: boolean;
}

export interface ChatMessageRow extends ChatMessage {
    messageId: number;
}

// PlayerStatistics
export interface PlayerStatistics {
    playerId: number;
    totalLogins: number;
    lastLoginAt: Date | null;
    totalSessionMinutes: number;
    longestSessionMinutes: number;
    totalLootboxesOpened: number;
    totalLootboxesPurchased: number;
    totalLootboxesFree: number;
    totalCoinsSpentOnLootboxes: number;
    bestDropRarity: Rarity | null;
    totalStovesFromLootboxes: number;
    totalListingsCreated: number;
    totalListingsSold: number;
    totalListingsCancelled: number;
    totalListingsExpired: number;
    totalPurchases: number;
    totalSalesRevenue: number;
    totalPurchaseSpending: number;
    averageListingPrice: number;
    averageSalePrice: number;
    fastestSaleMinutes: number | null;
    totalTradesCompleted: number;
    totalMiniGamesPlayed: number;
    totalMiniGameWins: number;
    totalMiniGameLosses: number;
    totalCoinsFromMiniGames: number;
    totalCoinsLostInMiniGames: number;
    favoriteGameType: string | null;
    luckiestWin: number;
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalGlobalMessages: number;
    totalPrivateMessages: number;
    currentStoveCount: number;
    totalStovesAcquired: number;
    totalStovesSold: number;
    totalStovesTraded: number;
    rarestStoveOwned: Rarity | null;
    highestCoinBalance: number;
    lowestCoinBalance: number;
    totalCoinsEarned: number;
    totalCoinsSpent: number;
    netWorthEstimate: number;
    marketActivityScore: number;
    updatedAt: Date;
}

export interface PlayerStatisticsRow extends PlayerStatistics {
    statId: number;
}

// DailyStatistics
export interface DailyStatistics {
    date: string;
    uniquePlayersLoggedIn: number;
    newPlayersJoined: number;
    totalSessions: number;
    averageSessionMinutes: number;
    lootboxesOpenedToday: number;
    lootboxesPurchasedToday: number;
    coinsSpentOnLootboxesToday: number;
    newListingsToday: number;
    listingsSoldToday: number;
    listingsCancelledToday: number;
    averageListingPriceToday: number;
    averageSalePriceToday: number;
    totalTradingVolume: number;
    priceChangePercent: number;
    miniGamesPlayedToday: number;
    totalCoinPayoutsToday: number;
    houseProfit: number;
    messagesSentToday: number;
    uniqueChattersToday: number;
    totalCoinsInCirculation: number;
    totalStovesInExistence: number;
    averagePlayerNetWorth: number;
    medianPlayerNetWorth: number;
    wealthGapRatio: number;
    averageTimeToSellHours: number;
    sellThroughRate: number;
    createdAt: Date;
}

export interface DailyStatisticsRow extends DailyStatistics {
    statId: number;
}

// StoveTypeStatistics
export interface StoveTypeStatistics {
    stoveTypeId: number;
    totalMinted: number;
    currentlyOwned: number;
    currentlyListed: number;
    listedPercent: number;
    currentLowestPrice: number | null;
    currentHighestPrice: number | null;
    averageListingPrice: number;
    lastSalePrice: number | null;
    averageSalePrice: number;
    priceHistory7d: string;
    priceHistory30d: string;
    allTimeHighPrice: number | null;
    allTimeLowPrice: number | null;
    totalSales: number;
    salesLast7Days: number;
    salesLast30Days: number;
    viewsCount: number;
    totalDroppedFromLootboxes: number;
    actualDropRate: number;
    percentOfTotalSupply: number;
    rarityRank: number;
    priceTrend7d: number;
    priceTrend30d: number;
    demandTrend: "increasing" | "stable" | "decreasing";
    updatedAt: Date;
}

export interface StoveTypeStatisticsRow extends StoveTypeStatistics {
    statId: number;
}
