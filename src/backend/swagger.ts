import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "EmberExchange API",
            version: "1.0.0",
            description: "REST API for EmberExchange - Virtual Stove Market Game",
        },
        servers: [
            {
                url: "http://localhost:3000/api",
                description: "Development server",
            },
        ],
        components: {
            schemas: {
                Player: {
                    type: "object",
                    properties: {
                        playerId: { type: "integer", description: "Unique player ID" },
                        username: { type: "string", description: "Player username" },
                        password: { type: "string", nullable: true, description: "Player password hash (null for OAuth users)" },
                        email: { type: "string", format: "email", description: "Player email address" },
                        coins: { type: "integer", description: "Player coin balance" },
                        lootboxCount: { type: "integer", description: "Number of lootboxes owned" },
                        isAdmin: { type: "integer", description: "Admin flag (0 = false, 1 = true)" },
                        joinedAt: { type: "string", format: "date-time", description: "Join timestamp" },
                        provider: { type: "string", enum: ["google", "github"], nullable: true, description: "OAuth provider" },
                        providerId: { type: "string", nullable: true, description: "OAuth provider user ID" },
                    },
                    required: ["playerId", "username", "email", "coins", "lootboxCount", "isAdmin", "joinedAt"],
                },
                PlayerCreate: {
                    type: "object",
                    properties: {
                        username: { type: "string", description: "Unique username for the player" },
                        password: { type: "string", description: "Player password (should be pre-hashed)" },
                        email: { type: "string", format: "email", description: "Unique email address for the player" },
                        coins: { type: "integer", description: "Initial coin amount (default 1000)" },
                        lootboxCount: { type: "integer", description: "Initial lootbox count (default 10)" },
                    },
                    required: ["username", "password", "email"],
                },
                LootboxType: {
                    type: "object",
                    properties: {
                        lootboxTypeId: { type: "integer", description: "Unique lootbox type ID" },
                        name: { type: "string", description: "Lootbox type name" },
                        description: { type: "string", nullable: true, description: "Description of the lootbox" },
                        costCoins: { type: "integer", description: "Cost in coins" },
                        costFree: { type: "integer", description: "Whether the lootbox is free (0 = false, 1 = true)" },
                        dailyLimit: { type: "integer", nullable: true, description: "Daily limit (null = unlimited)" },
                        isAvailable: { type: "integer", description: "Availability flag (0 = false, 1 = true)" },
                    },
                    required: ["lootboxTypeId", "name", "costCoins", "costFree", "isAvailable"],
                },
                Lootbox: {
                    type: "object",
                    properties: {
                        lootboxId: { type: "integer", description: "Unique lootbox ID (auto-increment)" },
                        lootboxTypeId: { type: "integer", description: "Type of lootbox" },
                        playerId: { type: "integer", description: "Player who opened it" },
                        openedAt: { type: "string", format: "date-time", description: "When the lootbox was opened" },
                        acquiredHow: { type: "string", enum: ["free", "purchase", "reward"], description: "How it was acquired" },
                    },
                    required: ["lootboxId", "lootboxTypeId", "playerId", "openedAt", "acquiredHow"],
                },
                LootboxCreate: {
                    type: "object",
                    properties: {
                        lootboxTypeId: { type: "integer", description: "Type of lootbox" },
                        playerId: { type: "integer", description: "Player who opened it" },
                        acquiredHow: { type: "string", enum: ["free", "purchase", "reward"], description: "How it was acquired" },
                    },
                    required: ["lootboxTypeId", "playerId", "acquiredHow"],
                },
                LootboxDrop: {
                    type: "object",
                    properties: {
                        dropId: { type: "integer", description: "Unique drop ID" },
                        lootboxId: { type: "integer", description: "Lootbox that produced this drop" },
                        stoveId: { type: "integer", description: "Stove that was dropped" },
                    },
                    required: ["dropId", "lootboxId", "stoveId"],
                },
                StoveType: {
                    type: "object",
                    properties: {
                        typeId: { type: "integer", description: "Unique stove type ID" },
                        name: { type: "string", description: "Stove type name" },
                        imageUrl: { type: "string", description: "URL to stove image" },
                        rarity: { type: "string", enum: ["common", "rare", "epic", "legendary", "limited"], description: "Rarity level" },
                        lootboxWeight: { type: "integer", description: "Drop probability weight (higher = more common)" },
                    },
                    required: ["typeId", "name", "imageUrl", "rarity", "lootboxWeight"],
                },
                Stove: {
                    type: "object",
                    properties: {
                        stoveId: { type: "integer", description: "Unique stove ID" },
                        typeId: { type: "integer", description: "Stove type ID" },
                        currentOwnerId: { type: "integer", description: "Current owner's player ID" },
                        mintedAt: { type: "string", format: "date-time", description: "When the stove was created" },
                    },
                    required: ["stoveId", "typeId", "currentOwnerId", "mintedAt"],
                },
                Listing: {
                    type: "object",
                    properties: {
                        listingId: { type: "integer", description: "Unique listing ID" },
                        sellerId: { type: "integer", description: "Seller's player ID" },
                        stoveId: { type: "integer", description: "Stove being sold" },
                        price: { type: "integer", description: "Asking price in coins" },
                        listedAt: { type: "string", format: "date-time", description: "When the listing was created" },
                        status: { type: "string", enum: ["active", "cancelled", "sold"], description: "Listing status" },
                    },
                    required: ["listingId", "sellerId", "stoveId", "price", "listedAt", "status"],
                },
                Trade: {
                    type: "object",
                    properties: {
                        tradeId: { type: "integer", description: "Unique trade ID" },
                        listingId: { type: "integer", description: "Listing that was purchased" },
                        buyerId: { type: "integer", description: "Buyer's player ID" },
                        executedAt: { type: "string", format: "date-time", description: "When the trade occurred" },
                    },
                    required: ["tradeId", "listingId", "buyerId", "executedAt"],
                },
                Ownership: {
                    type: "object",
                    properties: {
                        ownershipId: { type: "integer", description: "Unique ownership record ID" },
                        stoveId: { type: "integer", description: "Stove ID" },
                        playerId: { type: "integer", description: "Player who acquired it" },
                        acquiredAt: { type: "string", format: "date-time", description: "When it was acquired" },
                        acquiredHow: { type: "string", enum: ["lootbox", "trade", "mini-game"], description: "How it was acquired" },
                    },
                    required: ["ownershipId", "stoveId", "playerId", "acquiredAt", "acquiredHow"],
                },
                PriceHistory: {
                    type: "object",
                    properties: {
                        historyId: { type: "integer", description: "Unique price history ID" },
                        typeId: { type: "integer", description: "Stove type ID" },
                        salePrice: { type: "integer", description: "Sale price in coins" },
                        saleDate: { type: "string", format: "date-time", description: "When the sale occurred" },
                    },
                    required: ["historyId", "typeId", "salePrice", "saleDate"],
                },
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string", description: "Error message" },
                    },
                },
                SuccessMessage: {
                    type: "object",
                    properties: {
                        message: { type: "string", description: "Success message" },
                    },
                },
                CountResponse: {
                    type: "object",
                    properties: {
                        count: { type: "integer", description: "Count value" },
                    },
                },
                PriceStats: {
                    type: "object",
                    properties: {
                        average: { type: "number", description: "Average price" },
                        min: { type: "integer", description: "Minimum price" },
                        max: { type: "integer", description: "Maximum price" },
                        count: { type: "integer", description: "Number of sales" },
                    },
                },
                CreatePlayerResponse: {
                    type: "object",
                    properties: {
                        playerId: { type: "integer", description: "Created player ID" },
                        username: { type: "string", description: "Player username" },
                    },
                    required: ["playerId", "username"],
                },
                CreateListingResponse: {
                    type: "object",
                    properties: {
                        listingId: { type: "integer", description: "Created listing ID" },
                        message: { type: "string", description: "Success message" },
                    },
                },
                CreateTradeResponse: {
                    type: "object",
                    properties: {
                        tradeId: { type: "integer", description: "Created trade ID" },
                        message: { type: "string", description: "Success message" },
                    },
                },
                CreateLootboxResponse: {
                    type: "object",
                    properties: {
                        lootboxId: { type: "integer", description: "Created lootbox ID (auto-increment)" },
                        message: { type: "string", description: "Success message" },
                    },
                    required: ["lootboxId", "message"],
                },
                TotalWeightResponse: {
                    type: "object",
                    properties: {
                        totalWeight: { type: "integer", description: "Total lootbox weight" },
                    },
                },
                CreateLootboxTypeResponse: {
                    type: "object",
                    properties: {
                        lootboxTypeId: { type: "integer", description: "Created lootbox type ID" },
                        name: { type: "string", description: "Lootbox type name" },
                    },
                    required: ["lootboxTypeId", "name"],
                },
                MiniGameSession: {
                    type: "object",
                    properties: {
                        sessionId: { type: "integer", description: "Unique session ID" },
                        playerId: { type: "integer", description: "Player who played" },
                        gameType: { type: "string", description: "Type of mini-game" },
                        result: { type: "string", description: "Result (win, loss, etc.)" },
                        coinPayout: { type: "integer", description: "Coins earned" },
                        finishedAt: { type: "string", format: "date-time", description: "When the game finished" },
                    },
                    required: ["sessionId", "playerId", "gameType", "result", "coinPayout", "finishedAt"],
                },
                CreateMiniGameSessionResponse: {
                    type: "object",
                    properties: {
                        sessionId: { type: "integer", description: "Created session ID" },
                        playerId: { type: "integer", description: "Player ID" },
                        gameType: { type: "string", description: "Game type" },
                    },
                    required: ["sessionId", "playerId", "gameType"],
                },
                ChatMessage: {
                    type: "object",
                    properties: {
                        messageId: { type: "integer", description: "Unique message ID" },
                        senderId: { type: "integer", description: "Sender's player ID" },
                        receiverId: { type: "integer", nullable: true, description: "Receiver's player ID (null for global)" },
                        content: { type: "string", description: "Message content" },
                        sentAt: { type: "string", format: "date-time", description: "When the message was sent" },
                        isRead: { type: "integer", description: "Read status (0 = unread, 1 = read)" },
                    },
                    required: ["messageId", "senderId", "content", "sentAt", "isRead"],
                },
                CreateChatMessageResponse: {
                    type: "object",
                    properties: {
                        messageId: { type: "integer", description: "Created message ID" },
                        senderId: { type: "integer", description: "Sender ID" },
                        receiverId: { type: "integer", nullable: true, description: "Receiver ID (null for global)" },
                    },
                    required: ["messageId", "senderId"],
                },
                PlayerStatistics: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Unique stat ID" },
                        playerId: { type: "integer", description: "Player ID" },
                        totalLogins: { type: "integer", description: "Total number of logins" },
                        lastLoginAt: { type: "string", format: "date-time", nullable: true, description: "Last login timestamp" },
                        totalSessionMinutes: { type: "integer", description: "Total session time in minutes" },
                        longestSessionMinutes: { type: "integer", description: "Longest single session" },
                        totalLootboxesOpened: { type: "integer", description: "Total lootboxes opened" },
                        totalLootboxesPurchased: { type: "integer", description: "Lootboxes purchased" },
                        totalLootboxesFree: { type: "integer", description: "Free lootboxes received" },
                        totalCoinsSpentOnLootboxes: { type: "integer", description: "Coins spent on lootboxes" },
                        bestDropRarity: { type: "string", enum: ["common", "rare", "epic", "legendary", "limited"], nullable: true, description: "Best rarity ever dropped" },
                        totalStovesFromLootboxes: { type: "integer", description: "Stoves obtained from lootboxes" },
                        totalListingsCreated: { type: "integer", description: "Marketplace listings created" },
                        totalListingsSold: { type: "integer", description: "Listings successfully sold" },
                        totalListingsCancelled: { type: "integer", description: "Listings cancelled" },
                        totalListingsExpired: { type: "integer", description: "Listings expired" },
                        totalPurchases: { type: "integer", description: "Marketplace purchases made" },
                        totalSalesRevenue: { type: "integer", description: "Total coins from sales" },
                        totalPurchaseSpending: { type: "integer", description: "Total coins spent on purchases" },
                        averageListingPrice: { type: "integer", description: "Average listing price" },
                        averageSalePrice: { type: "integer", description: "Average sale price" },
                        fastestSaleMinutes: { type: "integer", nullable: true, description: "Fastest sale time" },
                        totalTradesCompleted: { type: "integer", description: "Trades completed" },
                        totalMiniGamesPlayed: { type: "integer", description: "Mini-games played" },
                        totalMiniGameWins: { type: "integer", description: "Mini-game wins" },
                        totalMiniGameLosses: { type: "integer", description: "Mini-game losses" },
                        totalCoinsFromMiniGames: { type: "integer", description: "Coins won from mini-games" },
                        totalCoinsLostInMiniGames: { type: "integer", description: "Coins lost in mini-games" },
                        favoriteGameType: { type: "string", nullable: true, description: "Most played game type" },
                        luckiestWin: { type: "integer", description: "Biggest coin win" },
                        totalMessagesSent: { type: "integer", description: "Chat messages sent" },
                        totalMessagesReceived: { type: "integer", description: "Chat messages received" },
                        totalGlobalMessages: { type: "integer", description: "Global chat messages sent" },
                        totalPrivateMessages: { type: "integer", description: "Private messages sent" },
                        currentStoveCount: { type: "integer", description: "Current stoves owned" },
                        totalStovesAcquired: { type: "integer", description: "Total stoves ever acquired" },
                        totalStovesSold: { type: "integer", description: "Total stoves sold" },
                        totalStovesTraded: { type: "integer", description: "Total stoves traded" },
                        rarestStoveOwned: { type: "string", enum: ["common", "rare", "epic", "legendary", "limited"], nullable: true, description: "Rarest stove owned" },
                        highestCoinBalance: { type: "integer", description: "Highest coin balance reached" },
                        lowestCoinBalance: { type: "integer", description: "Lowest coin balance reached" },
                        totalCoinsEarned: { type: "integer", description: "Total coins earned" },
                        totalCoinsSpent: { type: "integer", description: "Total coins spent" },
                        netWorthEstimate: { type: "integer", description: "Estimated net worth" },
                        marketActivityScore: { type: "integer", description: "Activity score (0-100)" },
                        updatedAt: { type: "string", format: "date-time", description: "Last update timestamp" },
                    },
                    required: ["statId", "playerId", "updatedAt"],
                },
                CreatePlayerStatisticsResponse: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Created stat ID" },
                        playerId: { type: "integer", description: "Player ID" },
                    },
                    required: ["statId", "playerId"],
                },
                DailyStatistics: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Unique stat ID" },
                        date: { type: "string", format: "date", description: "Date (YYYY-MM-DD)" },
                        uniquePlayersLoggedIn: { type: "integer", description: "Unique players who logged in" },
                        newPlayersJoined: { type: "integer", description: "New players registered" },
                        totalSessions: { type: "integer", description: "Total login sessions" },
                        averageSessionMinutes: { type: "integer", description: "Average session length" },
                        lootboxesOpenedToday: { type: "integer", description: "Lootboxes opened today" },
                        lootboxesPurchasedToday: { type: "integer", description: "Lootboxes purchased today" },
                        coinsSpentOnLootboxesToday: { type: "integer", description: "Coins spent on lootboxes" },
                        newListingsToday: { type: "integer", description: "New marketplace listings" },
                        listingsSoldToday: { type: "integer", description: "Listings sold today" },
                        listingsCancelledToday: { type: "integer", description: "Listings cancelled today" },
                        averageListingPriceToday: { type: "integer", description: "Average listing price" },
                        averageSalePriceToday: { type: "integer", description: "Average sale price" },
                        totalTradingVolume: { type: "integer", description: "Total trading volume in coins" },
                        priceChangePercent: { type: "number", description: "Price change vs yesterday" },
                        miniGamesPlayedToday: { type: "integer", description: "Mini-games played today" },
                        totalCoinPayoutsToday: { type: "integer", description: "Coins paid out in mini-games" },
                        houseProfit: { type: "integer", description: "House profit from mini-games" },
                        messagesSentToday: { type: "integer", description: "Chat messages sent today" },
                        uniqueChattersToday: { type: "integer", description: "Unique players who chatted" },
                        totalCoinsInCirculation: { type: "integer", description: "Total coins in economy" },
                        totalStovesInExistence: { type: "integer", description: "Total stoves minted" },
                        averagePlayerNetWorth: { type: "integer", description: "Average player net worth" },
                        medianPlayerNetWorth: { type: "integer", description: "Median player net worth" },
                        wealthGapRatio: { type: "number", description: "Top 10% / Bottom 10% wealth ratio" },
                        averageTimeToSellHours: { type: "number", description: "Average time to sell" },
                        sellThroughRate: { type: "number", description: "Percentage of listings that sell" },
                        createdAt: { type: "string", format: "date-time", description: "Creation timestamp" },
                    },
                    required: ["statId", "date", "createdAt"],
                },
                CreateDailyStatisticsResponse: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Created stat ID" },
                        date: { type: "string", format: "date", description: "Date" },
                    },
                    required: ["statId", "date"],
                },
                StoveTypeStatistics: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Unique stat ID" },
                        stoveTypeId: { type: "integer", description: "Stove type ID" },
                        totalMinted: { type: "integer", description: "Total stoves minted" },
                        currentlyOwned: { type: "integer", description: "Currently in player inventories" },
                        currentlyListed: { type: "integer", description: "Currently on marketplace" },
                        listedPercent: { type: "number", description: "Percentage of supply listed" },
                        currentLowestPrice: { type: "integer", nullable: true, description: "Lowest active listing price" },
                        currentHighestPrice: { type: "integer", nullable: true, description: "Highest active listing price" },
                        averageListingPrice: { type: "integer", description: "Average listing price" },
                        lastSalePrice: { type: "integer", nullable: true, description: "Last sale price" },
                        averageSalePrice: { type: "integer", description: "Average sale price" },
                        priceHistory7d: { type: "string", description: "JSON array of 7-day prices" },
                        priceHistory30d: { type: "string", description: "JSON array of 30-day prices" },
                        allTimeHighPrice: { type: "integer", nullable: true, description: "Highest price ever" },
                        allTimeLowPrice: { type: "integer", nullable: true, description: "Lowest price ever" },
                        totalVolumeTraded: { type: "integer", description: "Total coins traded for this type" },
                        totalSales: { type: "integer", description: "Total sales count" },
                        salesLast7Days: { type: "integer", description: "Sales in last 7 days" },
                        salesLast30Days: { type: "integer", description: "Sales in last 30 days" },
                        viewsCount: { type: "integer", description: "Total marketplace views" },
                        totalDroppedFromLootboxes: { type: "integer", description: "Count dropped from lootboxes" },
                        actualDropRate: { type: "number", description: "Actual drop rate percentage" },
                        percentOfTotalSupply: { type: "number", description: "Percentage of all stoves" },
                        rarityRank: { type: "integer", description: "Rarity rank (1-9)" },
                        priceTrend7d: { type: "number", description: "7-day price trend %" },
                        priceTrend30d: { type: "number", description: "30-day price trend %" },
                        demandTrend: { type: "string", enum: ["increasing", "stable", "decreasing"], description: "Demand trend direction" },
                        updatedAt: { type: "string", format: "date-time", description: "Last update timestamp" },
                    },
                    required: ["statId", "stoveTypeId", "updatedAt"],
                },
                CreateStoveTypeStatisticsResponse: {
                    type: "object",
                    properties: {
                        statId: { type: "integer", description: "Created stat ID" },
                        stoveTypeId: { type: "integer", description: "Stove type ID" },
                    },
                    required: ["statId", "stoveTypeId"],
                },
                Session: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string", description: "Unique session ID (UUID)" },
                        playerId: { type: "integer", description: "Player who owns the session" },
                        createdAt: { type: "string", format: "date-time", description: "When the session was created" },
                        expiresAt: { type: "string", format: "date-time", description: "When the session expires" },
                        isActive: { type: "integer", description: "Whether the session is active (0 = false, 1 = true)" },
                    },
                    required: ["sessionId", "playerId", "createdAt", "expiresAt", "isActive"],
                },
                LoginRequest: {
                    type: "object",
                    properties: {
                        usernameOrEmail: { type: "string", description: "Username or email address" },
                        password: { type: "string", description: "Password" }
                    },
                    required: ["usernameOrEmail", "password"]
                },
                RegisterRequest: {
                    type: "object",
                    properties: {
                        username: { type: "string", description: "Unique username" },
                        password: { type: "string", description: "Password (min 6 chars)" },
                        email: { type: "string", format: "email", description: "Email address" }
                    },
                    required: ["username", "password", "email"]
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        sessionId: { type: "string", description: "Session ID for authentication" },
                        playerId: { type: "integer", description: "Player ID" }
                    },
                    required: ["sessionId", "playerId"]
                },
                CurrentUser: {
                    type: "object",
                    properties: {
                        playerId: { type: "integer", description: "Unique player ID" },
                        username: { type: "string", description: "Player username" },
                        email: { type: "string", format: "email", description: "Player email" },
                        coins: { type: "integer", description: "Player coin balance" },
                        lootboxCount: { type: "integer", description: "Number of lootboxes" },
                        isAdmin: { type: "integer", description: "Admin flag (0 = false, 1 = true)" },
                        joinedAt: { type: "string", format: "date-time", description: "Join timestamp" }
                    },
                    required: ["playerId", "username", "email", "coins", "lootboxCount", "isAdmin", "joinedAt"]
                },
                LoginHistory: {
                    type: "object",
                    properties: {
                        loginHistoryId: { type: "integer", description: "Unique login history ID" },
                        playerId: { type: "integer", description: "Player ID" },
                        loggedInAt: { type: "string", format: "date-time", description: "Login timestamp" },
                        sessionId: { type: "string", description: "Session ID" }
                    },
                    required: ["loginHistoryId", "playerId", "loggedInAt"]
                },
                CoinTransaction: {
                    type: "object",
                    properties: {
                        transactionId: { type: "integer", description: "Unique transaction ID" },
                        playerId: { type: "integer", description: "Player ID" },
                        amount: { type: "integer", description: "Transaction amount (positive or negative)" },
                        type: { type: "string", description: "Transaction type (trade_in, trade_out, mini_game, listing_sale, listing_purchase, admin_adjust)" },
                        description: { type: "string", description: "Optional transaction description" },
                        createdAt: { type: "string", format: "date-time", description: "Transaction timestamp" }
                    },
                    required: ["transactionId", "playerId", "amount", "type", "createdAt"]
                },
                CreateLoginHistoryResponse: {
                    type: "object",
                    properties: {
                        loginHistoryId: { type: "integer", description: "Created login history ID" },
                        message: { type: "string", description: "Success message" }
                    },
                    required: ["loginHistoryId", "message"]
                },
                CreateCoinTransactionResponse: {
                    type: "object",
                    properties: {
                        transactionId: { type: "integer", description: "Created transaction ID" },
                        message: { type: "string", description: "Success message" }
                    },
                    required: ["transactionId", "message"]
                },
            },
        },
    },
    apis: ["./src/backend/routers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
