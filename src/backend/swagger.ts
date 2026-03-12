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
                        password: { type: "string", description: "Player password hash" },
                        email: { type: "string", format: "email", description: "Player email address" },
                        coins: { type: "integer", description: "Player coin balance" },
                        lootboxCount: { type: "integer", description: "Number of lootboxes owned" },
                        isAdmin: { type: "integer", description: "Admin flag (0 = false, 1 = true)" },
                        joinedAt: { type: "string", format: "date-time", description: "Join timestamp" },
                    },
                    required: ["playerId", "username", "password", "email", "coins", "lootboxCount", "isAdmin", "joinedAt"],
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
            },
        },
    },
    apis: ["./src/backend/routers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
