export enum Rarity {
    COMMON = "common",
    RARE = "rare",
    EPIC = "epic",
    LEGENDARY = "legendary",
    LIMITED = "limited",
    SECRET = "secret"
}

// Player
export interface Player {
    username: string;
    password: string | null;
    email: string;
    motto: string;
    coins: number;
    sparks: number;
    lootboxCount: number;
    isAdmin: boolean;
    isPublic: boolean;
    joinedAt: Date;
    provider: 'google' | 'github' | null;
    providerId: string | null;
    totpEnabled: boolean;
    bannedAt: Date | null;
    banReason: string | null;
    emailVerified: boolean;
    verifiedAt: Date | null;
    violationCount: number;
    lastViolationAt: Date | null;
}

export interface PlayerRow extends Player {
    playerId: number;
    totpSecret: string | null;
}

// StoveType
export interface StoveType {
    name: string;
    imageUrl: string;
    rarity: Rarity;
    lootboxWeight: number;
    collection: string;
    minHeat: number;
    maxHeat: number;
}

export interface StoveTypeRow extends StoveType {
    typeId: number;
}

// Stove
export interface Stove {
    typeId: number;
    currentOwnerId: number;
    mintedAt: Date;
    heatLevel: number;
    reRollCount: number;
}

export interface StoveRow extends Stove {
    stoveId: number;
}

export interface ShowedStove extends StoveRow {
    stoveName: string;
    rarity: Rarity;
    imageUrl: string;
    collection: string;
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
    openedAt: Date | null;
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

// RecentPull — feed item for the dashboard
export interface RecentPull {
    username: string;
    itemName: string;
    rarity: string;
    imageUrl?: string;
    timeAgo: string;
}

// LoginHistory
export interface LoginHistory {
    playerId: number;
    loggedInAt: Date;
    sessionId: string | null;
}

export interface LoginHistoryRow extends LoginHistory {
    loginHistoryId: number;
}

// CoinTransaction
export interface CoinTransaction {
    playerId: number;
    amount: number;
    type: 'trade_in' | 'trade_out' | 'mini_game' | 'listing_sale' | 'listing_purchase' | 'admin_adjust' | 'daily_reward' | 'shop_purchase' | 'shop_sale' | 'forgery';
    description: string | null;
    createdAt: Date;
}

export interface CoinTransactionRow extends CoinTransaction {
    transactionId: number;
}

// Listing
export interface Listing {
    sellerId: number;
    sellerName?: string;
    stoveId?: number | null;
    lootboxId?: number | null;
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
    acquiredHow: "lootbox" | "trade" | "mini-game" | "shop" | "craft";
}

export interface OwnershipRow extends Ownership {
    ownershipId: number;
}

// Session
export interface Session {
    sessionId: string;
    playerId: number;
    createdAt: Date;
    expiresAt: Date;
    isActive: boolean;
}

export interface SessionRow extends Session {
}

// ChatMessage
export interface ChatMessage {
    senderId: number;
    receiverId: number | null;
    content: string;
    sentAt: Date;
    isRead: boolean;
    messageType: 'text' | 'trade_offer';
    data: Record<string, unknown>;
}

export interface ChatMessageRow extends ChatMessage {
    messageId: number;
}

// Friend
export interface Friend {
    requesterId: number;
    addresseeId: number;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
}

export interface FriendRow extends Friend {
    friendId: number;
}

export interface FriendWithUser extends FriendRow {
    username: string;
}

// PlayerStatistics
export interface PlayerStatistics {
    playerId: number;
    username?: string;
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
    totalStovesCrafted: number;
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
    name?: string;
    rarity?: string;
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
    totalVolumeTraded: number;
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

// --- Multiplayer Infrastructure ---

export interface Game {
    name: string;
    slug: string;
    gameType: string;
    minPlayers: number;
    maxPlayers: number;
    ruleset: string;
    description: string | null;
    genre: string;
    tags: string[];
    isActive: number;
}

export interface GameRow extends Game {
    gameId: number;
}

export type RoomStatus = 'waiting' | 'active' | 'finished';
export type ConnectionState = 'connected' | 'disconnected' | 'away';

export interface Room {
    status: RoomStatus;
    maxPlayers: number;
    gameType: string;
    settings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface RoomRow extends Room {
    roomId: string;
}

export interface RoomPlayer {
    roomId: string;
    playerId: number;
    connectionState: ConnectionState;
    seatIndex: number;
}

export interface RoomPlayerRow extends RoomPlayer {
    roomPlayerId: string;
    username?: string;
    disconnectedAt?: Date;
    coins?: number;
    activeTitle?: { titleId?: string; label: string; animation?: string } | null;
    activeBanner?: { bannerId?: number; name: string; cssClass?: string } | null;
}

export interface GameState {
    roomId: string;
    stateBlob: unknown;
    version: number;
    updatedAt: Date;
}

export interface GameStateRow extends GameState {
}

// WebSocket Protocol Envelopes

export interface ClientMessage {
    type: ClientMessageType;
    payload: Record<string, unknown>;
    clientTimestamp: number;
    sequenceNumber: number;
}

export type ClientMessageType =
    | 'join_room'
    | 'leave_room'
    | 'player_action'
    | 'request_sync'
    | 'start_game'
    | 'chat_message';

export interface ServerMessage {
    type: ServerMessageType;
    payload: Record<string, unknown>;
}

export type ServerMessageType =
    | 'state_update'
    | 'player_joined'
    | 'player_left'
    | 'error'
    | 'event_replay'
    | 'chat_message'
    | 'trade_offer_update'
    | 'notification';

export enum ErrorCode {
    INVALID_STATE = 'INVALID_STATE',
    OUT_OF_TURN = 'OUT_OF_TURN',
    VERSION_MISMATCH = 'VERSION_MISMATCH',
    ROOM_FULL = 'ROOM_FULL',
    RATE_LIMITED = 'RATE_LIMITED',
    AUTH_EXPIRED = 'AUTH_EXPIRED',
}

export interface EventLog {
    eventId: string;
    roomId: string;
    playerId: number | null;
    type: string;
    payload: unknown;
    sequenceNumber: number | null;
    clientTimestamp: number | null;
    serverTimestamp: Date;
}

// SupportTicket
export type SupportTicketType = 'bug' | 'feature' | 'support';
export type SupportTicketPriority = 'high' | 'medium' | 'low';

export interface SupportTicket {
    reporterId: number;
    title: string;
    description: string;
    type: SupportTicketType;
    priority: SupportTicketPriority;
    createdAt: Date;
    notifiedAt: Date | null;
}

export interface SupportTicketRow extends SupportTicket {
    ticketId: number;
}

export interface PlayerSettings {
    playerId: number;
    notifyFriendRequests: boolean;
    notifyChatMessages: boolean;
    notifyTradeOffers: boolean;
    notifyDailyReward: boolean;
    notifyShopPurchases: boolean;
    hasCompletedOnboarding?: boolean;
}

export interface PlayerSettingsRow extends PlayerSettings {
}

export interface PlayerAchievement {
    playerId: number;
    achievementId: string;
    progress: number;
    target: number;
    unlockedAt: Date | null;
}

export interface PlayerAchievementRow extends PlayerAchievement {
    playerAchievementId: number;
}

export interface AchievementDefinition {
    achievementId: string;
    label: string;
    description: string;
    category: 'lootbox' | 'trade' | 'mini-game' | 'prestige' | 'wealth' | 'collection' | 'social' | 'general' | 'forging' | 'shop' | 'spin';
    rewardCoins?: number;
    rewardXP?: number;
    tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'secret';
}

export type NotificationType = 'friend_request' | 'chat_message' | 'trade_offer' | 'daily_reward' | 'system' | 'quest_complete';
export type NotificationPriority = 'low' | 'normal' | 'high';

// Notification
export interface Notification {
    playerId: number;
    type: NotificationType;
    title: string;
    message: string;
    data: Record<string, unknown>;
    isRead: boolean;
    priority: NotificationPriority;
    groupKey: string | null;
    count: number;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationRow extends Notification {
    notificationId: number;
}

// Shop
export interface ShopListing {
    itemType: 'stove' | 'lootbox';
    itemId: number;
    price: number;
    stock: number;
    rotationDate: Date | null;
    isFeatured: boolean;
    createdAt: Date;
}

export interface ShopListingRow extends ShopListing {
    listingId: number;
}

export interface PlayerDailyReward {
    playerId: number;
    lastClaimAt: Date | null;
    streakCount: number;
}

export interface PlayerDailySpin {
    playerId: number;
    lastSpinAt: Date | null;
    totalSpins: number;
}

export interface PlayerDailySpinRow extends PlayerDailySpin {}

export interface SpinPrize {
    id: string;
    label: string;
    icon: string;
    minAmount: number;
    maxAmount: number;
    color: string;
    weight: number;
}

export interface SpinResult {
    prize: SpinPrize;
    amount: number;
    totalSpins: number;
    nextSpinAt: string | null;
    bonusSpins: number;
}

export interface SpinStatus {
    canSpin: boolean;
    nextSpinAt: string | null;
    totalSpins: number;
    bonusSpins: number;
}


// --- GitHub Integration ---

export interface GitHubCommit {
    sha: string;
    shortSha: string;
    message: string;
    messageTitle: string;
    messageBody: string[];
    authorName: string;
    authorLogin: string;
    authorAvatar: string;
    date: string;
    url: string;
}

export interface GitHubContributor {
    login: string;
    avatarUrl: string;
    htmlUrl: string;
    contributions: number;
}

export interface GitHubRelease {
    tagName: string;
    name: string;
    body: string;
    publishedAt: string;
    htmlUrl: string;
    prerelease: boolean;
}

export interface GitHubRepoInfo {
    name: string;
    fullName: string;
    description: string;
    stars: number;
    forks: number;
    openIssues: number;
    language: string;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
}

export interface GitHubCommitActivityWeek {
    week: number;
    total: number;
}

export type GitHubLanguages = Record<string, number>;

export interface GitHubCodeFrequencyWeek {
    week: number;
    additions: number;
    deletions: number;
}

// Forgery (Tradeup)
export interface ForgeryRequest {
    stoveIds: number[];
}

export interface ForgedStove extends StoveRow {
    name: string;
    rarity: Rarity;
    imageUrl: string;
    collection: string;
}

export interface ForgeryResult {
    success: boolean;
    newStove?: ForgedStove;
    error?: string;
}

export interface InvestmentPosition {
    positionId: number;
    playerId: number;
    assetId: number;
    category: 'stove' | 'lootbox';
    quantity: number;
    avgBuyPrice: number;
    totalInvested: number;
    createdAt: string;
    updatedAt: string;
}
export interface InvestmentPositionRow extends InvestmentPosition {}

export interface InvestmentTransaction {
    transactionId: number;
    playerId: number;
    assetId: number;
    category: 'stove' | 'lootbox';
    type: 'buy' | 'sell';
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
    createdAt: string;
}
export interface InvestmentTransactionRow extends InvestmentTransaction {}

export interface PortfolioPosition {
    positionId: number;
    assetId: number;
    category: 'stove' | 'lootbox';
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    currentValue: number;
    unrealizedPL: number;
}

export interface LeaderboardEntry {
    playerId: number;
    name: string;
    totalInvested: number;
    totalValue: number;
    totalPL: number;
    plPercent: number;
}

export interface StovePriceHistory {
    historyId: number;
    typeId: number;
    price: number;
    timestamp: string;
}
export interface StovePriceHistoryRow extends StovePriceHistory {}

export interface PortfolioSnapshot {
    snapshotId: number;
    playerId: number;
    totalValue: number;
    totalCost: number;
    totalPL: number;
    timestamp: string;
}
export interface PortfolioSnapshotRow extends PortfolioSnapshot {}

export interface InvestableAsset {
    assetId: number;
    ticker: string;
    name: string;
    description: string;
    rarity: string;
    currentPrice: number;
    previousPrice: number;
    basePrice: number;
    imageUrl: string;
    volume30d: number;
    totalMinted: number;
    currentlyListed: number;
}
