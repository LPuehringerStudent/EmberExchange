import BetterSqlite3 from "better-sqlite3";
import { Database, Statement } from "better-sqlite3";

import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "src", "backend", "db");

// Ensure the db directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

function getDbFileName(): string {
    // Use TEST_DB_PATH environment variable if set (for testing), otherwise use default
    return process.env['TEST_DB_PATH'] || path.join(dbDir, "EmberExchange.db");
}

export class Unit {

    private readonly db: Database;
    private completed: boolean;

    public constructor(public readonly readOnly: boolean) {
        this.completed = false;
        this.db = DB.createDBConnection();
        if (!this.readOnly) {
            DB.beginTransaction(this.db);
        }
    }
    
    public getConnection(): Database {
        return this.db;
    }

    public prepare<TResult, TParams extends Record<string, unknown> = Record<string, unknown>>(
        sql: string,
        bindings?: TParams
    ): ITypedStatement<TResult, TParams> {
        const stmt = this.db.prepare<unknown[], TResult>(sql);
        if (bindings != null) {
            stmt.bind(bindings as unknown);
        }
        return stmt as unknown as ITypedStatement<TResult, TParams>;
    }

    public getLastRowId(): number {
        const stmt = this.prepare<{ id: number }>("SELECT last_insert_rowid() as \"id\"");
        const result = stmt.get();
        if (!result) {
            throw new Error("Unable to retrieve last inserted row id");
        }
        return result.id;
    }

    public complete(commit: boolean | null = null): void {
        if (this.completed) {
            return;
        }
        this.completed = true;

        if (commit !== null) {
            (commit ? DB.commitTransaction(this.db) : DB.rollbackTransaction(this.db));
        } else if (!this.readOnly) {
            throw new Error("transaction has been opened, requires information if commit or rollback needed");
        }
        this.db.close();
    }
}

export function resetDatabase(connection: Database): void {
    // Drop all tables in correct order (respecting foreign keys)
    // Statistics tables first (they reference main tables)
    connection.exec("DROP TABLE IF EXISTS PlayerStatistics");
    connection.exec("DROP TABLE IF EXISTS DailyStatistics");
    connection.exec("DROP TABLE IF EXISTS StoveTypeStatistics");
    // Main tables
    connection.exec("DROP TABLE IF EXISTS ChatMessage");
    connection.exec("DROP TABLE IF EXISTS Ownership");
    connection.exec("DROP TABLE IF EXISTS PriceHistory");
    connection.exec("DROP TABLE IF EXISTS CoinTransaction");
    connection.exec("DROP TABLE IF EXISTS LoginHistory");
    connection.exec("DROP TABLE IF EXISTS MiniGameSession");
    connection.exec("DROP TABLE IF EXISTS Trade");
    connection.exec("DROP TABLE IF EXISTS Listing");
    connection.exec("DROP TABLE IF EXISTS LootboxDrop");
    connection.exec("DROP TABLE IF EXISTS Lootbox");
    connection.exec("DROP TABLE IF EXISTS LootboxType");
    connection.exec("DROP TABLE IF EXISTS Session");
    connection.exec("DROP TABLE IF EXISTS Stove");
    connection.exec("DROP TABLE IF EXISTS StoveType");
    connection.exec("DROP TABLE IF EXISTS Player");
    console.log("🗑️  All tables dropped");
    
    // Recreate tables
    DB.ensureTablesCreated(connection);
    console.log("✅ Tables recreated");
}

export function ensureSampleDataInserted(unit: Unit): "inserted" | "skipped" {
    function alreadyPresent(): boolean {
        // Check if admin player exists (indicates setup is complete)
        try {
            const checkStmt = unit.prepare<{ cnt: number }>(
                'select count(*) as "cnt" from Player where isAdmin = 1'
            );
            const result = checkStmt.get()?.cnt ?? 0;
            return result > 0;
        } catch {
            // Table doesn't exist yet
            return false;
        }
    }

    function insertLootboxTypes(): void {
        const types = [
            { name: "Standard Lootbox", description: "A standard lootbox with common to legendary items", costCoins: 0, costFree: 1, isAvailable: 1 },
            { name: "Premium Lootbox", description: "Higher chance for rare and above items", costCoins: 500, costFree: 0, isAvailable: 1 },
            { name: "Legendary Crate", description: "Guaranteed legendary or limited item", costCoins: 5000, costFree: 0, isAvailable: 1 }
        ];
        
        for (const type of types) {
            const stmt = unit.prepare<
                unknown,
                { name: string; description: string; costCoins: number; costFree: number; isAvailable: number }
            >(
                `insert into LootboxType (name, description, costCoins, costFree, isAvailable) 
                 values (@name, @description, @costCoins, @costFree, @isAvailable)`,
                type
            );
            stmt.run();
        }
        console.log("✅ LootboxTypes inserted");
    }

    function insertPlayers(): void {
        const players = [
            { username: "admin", password: "admin123", email: "admin@emberexchange.com", coins: 999999, lootboxCount: 100, isAdmin: 1 },
            { username: "player1", password: "pass123", email: "player1@example.com", coins: 5000, lootboxCount: 10, isAdmin: 0 },
            { username: "player2", password: "pass456", email: "player2@example.com", coins: 3500, lootboxCount: 10, isAdmin: 0 },
            { username: "trader_joe", password: "trade789", email: "trader@example.com", coins: 10000, lootboxCount: 10, isAdmin: 0 },
            { username: "collector", password: "collect000", email: "collector@example.com", coins: 2500, lootboxCount: 10, isAdmin: 0 }
        ];
        
        for (const player of players) {
            const stmt = unit.prepare<
                unknown,
                { username: string; password: string; email: string; coins: number; lootboxCount: number; isAdmin: number; joinedAt: string }
            >(
                `insert into Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt) 
                 values (@username, @password, @email, @coins, @lootboxCount, @isAdmin, @joinedAt)`,
                { ...player, joinedAt: new Date().toISOString() }
            );
            stmt.run();
        }
        console.log("✅ Players inserted");
    }

    function insertPlayerLootboxes(): void {
        const playerIds = [2, 3, 4, 5]; // non-admin players
        for (const playerId of playerIds) {
            for (let i = 0; i < 10; i++) {
                const stmt = unit.prepare<
                    unknown,
                    { lootboxTypeId: number; playerId: number; acquiredHow: string }
                >(
                    `insert into Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
                     values (@lootboxTypeId, @playerId, null, @acquiredHow)`,
                    { lootboxTypeId: 1, playerId, acquiredHow: "free" }
                );
                stmt.run();
            }
        }
        console.log("✅ Player lootboxes inserted");
    }

    function insertStoveTypes(): void {
        const stoves = [
            { name: "Rusty Stove", imageUrl: "/assets/stove_sprites/rusty.png", rarity: "common", lootboxWeight: 100 },
            { name: "Standard Stove", imageUrl: "/assets/stove_sprites/standard.png", rarity: "common", lootboxWeight: 80 },
            { name: "Bronze Stove", imageUrl: "/assets/stove_sprites/bronze.png", rarity: "rare", lootboxWeight: 50 },
            { name: "Forest Stove", imageUrl: "/assets/stove_sprites/forest.png", rarity: "rare", lootboxWeight: 40 },
            { name: "Golden Stove", imageUrl: "/assets/stove_sprites/golden.png", rarity: "epic", lootboxWeight: 20 },
            { name: "Steampunk Stove", imageUrl: "/assets/stove_sprites/steampunk.png", rarity: "epic", lootboxWeight: 15 },
            { name: "Dragon Stove", imageUrl: "/assets/stove_sprites/dragon.png", rarity: "legendary", lootboxWeight: 5 },
            { name: "Crystal Stove", imageUrl: "/assets/stove_sprites/crystal.png", rarity: "legendary", lootboxWeight: 3 },
            { name: "One of a Kind", imageUrl: "", rarity: "limited", lootboxWeight: 1 }
        ];
        
        for (const stove of stoves) {
            const stmt = unit.prepare<
                unknown,
                { name: string; imageUrl: string; rarity: string; lootboxWeight: number }
            >(
                `insert into StoveType (name, imageUrl, rarity, lootboxWeight) 
                 values (@name, @imageUrl, @rarity, @lootboxWeight)`,
                stove
            );
            stmt.run();
        }
        console.log("✅ StoveTypes inserted");
    }

    function insertStoves(): void {
        // player1 has some stoves
        const stoves = [
            { typeId: 1, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 5).toISOString() }, // Rusty
            { typeId: 2, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 3).toISOString() }, // Standard
            { typeId: 3, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString() }, // Bronze
            { typeId: 4, currentOwnerId: 3, mintedAt: new Date(Date.now() - 86400000 * 2).toISOString() }, // Silver
            { typeId: 5, currentOwnerId: 4, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString() }, // Golden
            { typeId: 7, currentOwnerId: 5, mintedAt: new Date().toISOString() } // Dragon
        ];
        
        for (const stove of stoves) {
            const stmt = unit.prepare<
                unknown,
                { typeId: number; currentOwnerId: number; mintedAt: string }
            >(
                `insert into Stove (typeId, currentOwnerId, mintedAt) 
                 values (@typeId, @currentOwnerId, @mintedAt)`,
                stove
            );
            stmt.run();
        }
        console.log("✅ Stoves inserted");
    }

    function insertLootboxes(): void {
        // Historical opened lootboxes for stats
        const lootboxes = [
            { lootboxTypeId: 1, playerId: 2, openedAt: new Date(Date.now() - 86400000 * 5).toISOString(), acquiredHow: "free" },
            { lootboxTypeId: 1, playerId: 2, openedAt: new Date(Date.now() - 86400000 * 3).toISOString(), acquiredHow: "purchase" },
            { lootboxTypeId: 1, playerId: 2, openedAt: new Date(Date.now() - 86400000 * 1).toISOString(), acquiredHow: "free" },
            { lootboxTypeId: 2, playerId: 3, openedAt: new Date(Date.now() - 86400000 * 2).toISOString(), acquiredHow: "purchase" },
            { lootboxTypeId: 1, playerId: 4, openedAt: new Date(Date.now() - 86400000 * 1).toISOString(), acquiredHow: "reward" }
        ];
        
        for (const lootbox of lootboxes) {
            const stmt = unit.prepare<
                unknown,
                { lootboxTypeId: number; playerId: number; openedAt: string; acquiredHow: string }
            >(
                `insert into Lootbox (lootboxTypeId, playerId, openedAt, acquiredHow) 
                 values (@lootboxTypeId, @playerId, @openedAt, @acquiredHow)`,
                lootbox
            );
            stmt.run();
        }
        console.log("✅ Historical lootboxes inserted");
    }

    function insertLootboxDrops(): void {
        // Connect stoves to lootboxes that created them
        const drops = [
            { lootboxId: 1, stoveId: 1 }, // Rusty from lootbox 1
            { lootboxId: 2, stoveId: 2 }, // Standard from lootbox 2
            { lootboxId: 3, stoveId: 3 }, // Bronze from lootbox 3
            { lootboxId: 4, stoveId: 4 }, // Silver from lootbox 4
            { lootboxId: 5, stoveId: 5 }  // Golden from lootbox 5
        ];
        
        for (const drop of drops) {
            const stmt = unit.prepare<
                unknown,
                { lootboxId: number; stoveId: number }
            >(
                `insert into LootboxDrop (lootboxId, stoveId) 
                 values (@lootboxId, @stoveId)`,
                drop
            );
            stmt.run();
        }
        console.log("✅ LootboxDrops inserted");
    }

    function insertOwnerships(): void {
        const ownerships = [
            { stoveId: 1, playerId: 2, acquiredAt: new Date(Date.now() - 86400000 * 5).toISOString(), acquiredHow: "lootbox" },
            { stoveId: 2, playerId: 2, acquiredAt: new Date(Date.now() - 86400000 * 3).toISOString(), acquiredHow: "lootbox" },
            { stoveId: 3, playerId: 2, acquiredAt: new Date(Date.now() - 86400000 * 1).toISOString(), acquiredHow: "lootbox" },
            { stoveId: 4, playerId: 3, acquiredAt: new Date(Date.now() - 86400000 * 2).toISOString(), acquiredHow: "lootbox" },
            { stoveId: 5, playerId: 4, acquiredAt: new Date(Date.now() - 86400000 * 1).toISOString(), acquiredHow: "lootbox" },
            { stoveId: 6, playerId: 5, acquiredAt: new Date().toISOString(), acquiredHow: "lootbox" }
        ];
        
        for (const ownership of ownerships) {
            const stmt = unit.prepare<
                unknown,
                { stoveId: number; playerId: number; acquiredAt: string; acquiredHow: string }
            >(
                `insert into Ownership (stoveId, playerId, acquiredAt, acquiredHow) 
                 values (@stoveId, @playerId, @acquiredAt, @acquiredHow)`,
                ownership
            );
            stmt.run();
        }
        console.log("✅ Ownerships inserted");
    }

    function insertListings(): void {
        const listings = [
            { sellerId: 2, stoveId: 3, price: 1500, listedAt: new Date(Date.now() - 3600000 * 2).toISOString(), status: "active" },
            { sellerId: 3, stoveId: 4, price: 2500, listedAt: new Date(Date.now() - 3600000 * 4).toISOString(), status: "active" },
            { sellerId: 2, stoveId: 1, price: 500, listedAt: new Date(Date.now() - 86400000).toISOString(), status: "sold" }
        ];
        
        for (const listing of listings) {
            const stmt = unit.prepare<
                unknown,
                { sellerId: number; stoveId: number; price: number; listedAt: string; status: string }
            >(
                `insert into Listing (sellerId, stoveId, price, listedAt, status) 
                 values (@sellerId, @stoveId, @price, @listedAt, @status)`,
                listing
            );
            stmt.run();
        }
        console.log("✅ Listings inserted");
    }

    function insertTrades(): void {
        // One completed trade
        const stmt = unit.prepare<
            unknown,
            { listingId: number; buyerId: number; executedAt: string }
        >(
            `insert into Trade (listingId, buyerId, executedAt) 
             values (@listingId, @buyerId, @executedAt)`,
            {
                listingId: 3,
                buyerId: 4,
                executedAt: new Date(Date.now() - 3600000 * 12).toISOString()
            }
        );
        stmt.run();
        console.log("✅ Trades inserted");
    }

    function insertPriceHistory(): void {
        const prices = [
            { typeId: 1, salePrice: 400, saleDate: new Date(Date.now() - 86400000 * 10).toISOString() },
            { typeId: 1, salePrice: 500, saleDate: new Date(Date.now() - 86400000 * 5).toISOString() },
            { typeId: 1, salePrice: 500, saleDate: new Date(Date.now() - 3600000 * 12).toISOString() },
            { typeId: 3, salePrice: 1500, saleDate: new Date(Date.now() - 86400000 * 7).toISOString() },
            { typeId: 3, salePrice: 1800, saleDate: new Date(Date.now() - 86400000 * 3).toISOString() },
            { typeId: 4, salePrice: 2500, saleDate: new Date(Date.now() - 86400000 * 4).toISOString() }
        ];
        
        for (const price of prices) {
            const stmt = unit.prepare<
                unknown,
                { typeId: number; salePrice: number; saleDate: string }
            >(
                `insert into PriceHistory (typeId, salePrice, saleDate) 
                 values (@typeId, @salePrice, @saleDate)`,
                price
            );
            stmt.run();
        }
        console.log("✅ PriceHistory inserted");
    }

    function insertMiniGameSessions(): void {
        const sessions = [
            { playerId: 2, gameType: "Coin Flip", result: "win", coinPayout: 100, finishedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { playerId: 2, gameType: "Coin Flip", result: "loss", coinPayout: 0, finishedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
            { playerId: 3, gameType: "Dice Roll", result: "win", coinPayout: 250, finishedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
            { playerId: 4, gameType: "Slots", result: "jackpot", coinPayout: 1000, finishedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
            { playerId: 5, gameType: "Coin Flip", result: "loss", coinPayout: 0, finishedAt: new Date(Date.now() - 3600000 * 2).toISOString() }
        ];
        
        for (const session of sessions) {
            const stmt = unit.prepare<
                unknown,
                { playerId: number; gameType: string; result: string; coinPayout: number; finishedAt: string }
            >(
                `insert into MiniGameSession (playerId, gameType, result, coinPayout, finishedAt) 
                 values (@playerId, @gameType, @result, @coinPayout, @finishedAt)`,
                session
            );
            stmt.run();
        }
        console.log("✅ MiniGameSessions inserted");
    }

    function insertChatMessages(): void {
        const messages = [
            { senderId: 2, receiverId: null as number | null, content: "Hello everyone!", sentAt: new Date(Date.now() - 3600000 * 5).toISOString(), isRead: true },
            { senderId: 3, receiverId: null, content: "Good luck with your trades!", sentAt: new Date(Date.now() - 3600000 * 4).toISOString(), isRead: true },
            { senderId: 2, receiverId: 3, content: "Hey, want to trade stoves?", sentAt: new Date(Date.now() - 3600000 * 3).toISOString(), isRead: false },
            { senderId: 3, receiverId: 2, content: "Sure, what do you have?", sentAt: new Date(Date.now() - 3600000 * 2).toISOString(), isRead: false },
            { senderId: 4, receiverId: null, content: "Just got a legendary stove!", sentAt: new Date(Date.now() - 3600000 * 1).toISOString(), isRead: false }
        ];
        
        for (const message of messages) {
            const stmt = unit.prepare<
                unknown,
                { senderId: number; receiverId: number | null; content: string; sentAt: string; isRead: number }
            >(
                `insert into ChatMessage (senderId, receiverId, content, sentAt, isRead) 
                 values (@senderId, @receiverId, @content, @sentAt, @isRead)`,
                { ...message, isRead: message.isRead ? 1 : 0 }
            );
            stmt.run();
        }
        console.log("✅ ChatMessages inserted");
    }

    function insertPlayerStatistics(): void {
        const now = new Date().toISOString();
        const stats = [
            { playerId: 2, totalLogins: 15, totalSessionMinutes: 450, totalLootboxesOpened: 3, totalListingsCreated: 2, totalListingsSold: 1, totalPurchases: 0, totalMiniGamesPlayed: 5, luckiestWin: 0, totalMessagesSent: 3, currentStoveCount: 3, highestCoinBalance: 5500, netWorthEstimate: 8000, marketActivityScore: 75, updatedAt: now },
            { playerId: 3, totalLogins: 10, totalSessionMinutes: 280, totalLootboxesOpened: 1, totalListingsCreated: 1, totalListingsSold: 0, totalPurchases: 1, totalMiniGamesPlayed: 3, luckiestWin: 0, totalMessagesSent: 2, currentStoveCount: 2, highestCoinBalance: 3800, netWorthEstimate: 5500, marketActivityScore: 50, updatedAt: now },
            { playerId: 4, totalLogins: 20, totalSessionMinutes: 600, totalLootboxesOpened: 5, totalListingsCreated: 3, totalListingsSold: 2, totalPurchases: 0, totalMiniGamesPlayed: 8, luckiestWin: 1000, totalMessagesSent: 1, currentStoveCount: 4, highestCoinBalance: 12000, netWorthEstimate: 15000, marketActivityScore: 95, updatedAt: now },
            { playerId: 5, totalLogins: 5, totalSessionMinutes: 120, totalLootboxesOpened: 1, totalListingsCreated: 0, totalListingsSold: 0, totalPurchases: 0, totalMiniGamesPlayed: 1, luckiestWin: 0, totalMessagesSent: 0, currentStoveCount: 1, highestCoinBalance: 2600, netWorthEstimate: 4000, marketActivityScore: 25, updatedAt: now }
        ];
        
        for (const stat of stats) {
            const stmt = unit.prepare(
                `insert into PlayerStatistics (playerId, totalLogins, totalSessionMinutes, totalLootboxesOpened, 
                 totalListingsCreated, totalListingsSold, totalPurchases, totalMiniGamesPlayed, luckiestWin,
                 totalMessagesSent, currentStoveCount, highestCoinBalance, netWorthEstimate, marketActivityScore, updatedAt) 
                 values (@playerId, @totalLogins, @totalSessionMinutes, @totalLootboxesOpened, @totalListingsCreated,
                 @totalListingsSold, @totalPurchases, @totalMiniGamesPlayed, @luckiestWin, @totalMessagesSent,
                 @currentStoveCount, @highestCoinBalance, @netWorthEstimate, @marketActivityScore, @updatedAt)`,
                stat
            );
            stmt.run();
        }
        console.log("✅ PlayerStatistics inserted");
    }

    function insertDailyStatistics(): void {
        const today = new Date().toISOString().split('T')[0];
        const stmt = unit.prepare<
            unknown,
            { date: string; uniquePlayersLoggedIn: number; newPlayersJoined: number; lootboxesOpenedToday: number; newListingsToday: number; listingsSoldToday: number; averageSalePriceToday: number; totalTradingVolume: number; miniGamesPlayedToday: number; messagesSentToday: number; totalCoinsInCirculation: number; totalStovesInExistence: number; createdAt: string }
        >(
            `insert into DailyStatistics (date, uniquePlayersLoggedIn, newPlayersJoined, lootboxesOpenedToday,
             newListingsToday, listingsSoldToday, averageSalePriceToday, totalTradingVolume, miniGamesPlayedToday,
             messagesSentToday, totalCoinsInCirculation, totalStovesInExistence, createdAt)
             values (@date, @uniquePlayersLoggedIn, @newPlayersJoined, @lootboxesOpenedToday, @newListingsToday,
             @listingsSoldToday, @averageSalePriceToday, @totalTradingVolume, @miniGamesPlayedToday,
             @messagesSentToday, @totalCoinsInCirculation, @totalStovesInExistence, @createdAt)`,
            {
                date: today,
                uniquePlayersLoggedIn: 4,
                newPlayersJoined: 0,
                lootboxesOpenedToday: 5,
                newListingsToday: 2,
                listingsSoldToday: 1,
                averageSalePriceToday: 1500,
                totalTradingVolume: 1500,
                miniGamesPlayedToday: 5,
                messagesSentToday: 5,
                totalCoinsInCirculation: 21800,
                totalStovesInExistence: 6,
                createdAt: new Date().toISOString()
            }
        );
        stmt.run();
        console.log("✅ DailyStatistics inserted");
    }

    function insertStoveTypeStatistics(): void {
        const now = new Date().toISOString();
        const stats = [
            { stoveTypeId: 1, totalMinted: 1, currentlyOwned: 1, currentlyListed: 0, currentLowestPrice: 0, currentHighestPrice: 0, averageListingPrice: 500, averageSalePrice: 500, totalSales: 1, salesLast7Days: 1, rarityRank: 9, percentOfTotalSupply: 16.67 },
            { stoveTypeId: 2, totalMinted: 1, currentlyOwned: 1, currentlyListed: 0, currentLowestPrice: 0, currentHighestPrice: 0, averageListingPrice: 0, averageSalePrice: 0, totalSales: 0, salesLast7Days: 0, rarityRank: 8, percentOfTotalSupply: 16.67 },
            { stoveTypeId: 3, totalMinted: 1, currentlyOwned: 0, currentlyListed: 1, currentLowestPrice: 1500, currentHighestPrice: 1500, averageListingPrice: 1500, averageSalePrice: 0, totalSales: 0, salesLast7Days: 0, rarityRank: 6, percentOfTotalSupply: 16.67 },
            { stoveTypeId: 4, totalMinted: 1, currentlyOwned: 1, currentlyListed: 1, currentLowestPrice: 2500, currentHighestPrice: 2500, averageListingPrice: 2500, averageSalePrice: 0, totalSales: 0, salesLast7Days: 0, rarityRank: 5, percentOfTotalSupply: 16.67 },
            { stoveTypeId: 5, totalMinted: 1, currentlyOwned: 0, currentlyListed: 0, currentLowestPrice: 0, currentHighestPrice: 0, averageListingPrice: 0, averageSalePrice: 0, totalSales: 0, salesLast7Days: 0, rarityRank: 4, percentOfTotalSupply: 16.67 },
            { stoveTypeId: 7, totalMinted: 1, currentlyOwned: 1, currentlyListed: 0, currentLowestPrice: 0, currentHighestPrice: 0, averageListingPrice: 0, averageSalePrice: 0, totalSales: 0, salesLast7Days: 0, rarityRank: 2, percentOfTotalSupply: 16.67 }
        ];
        
        for (const stat of stats) {
            const stmt = unit.prepare<
                unknown,
                { stoveTypeId: number; totalMinted: number; currentlyOwned: number; currentlyListed: number; currentLowestPrice?: number; currentHighestPrice?: number; averageListingPrice: number; averageSalePrice: number; totalSales: number; salesLast7Days: number; rarityRank: number; percentOfTotalSupply: number; updatedAt: string }
            >(
                `insert into StoveTypeStatistics (stoveTypeId, totalMinted, currentlyOwned, currentlyListed,
                 currentLowestPrice, currentHighestPrice, averageListingPrice, averageSalePrice, totalSales,
                 salesLast7Days, rarityRank, percentOfTotalSupply, updatedAt)
                 values (@stoveTypeId, @totalMinted, @currentlyOwned, @currentlyListed, @currentLowestPrice,
                 @currentHighestPrice, @averageListingPrice, @averageSalePrice, @totalSales, @salesLast7Days,
                 @rarityRank, @percentOfTotalSupply, @updatedAt)`,
                { ...stat, updatedAt: now }
            );
            stmt.run();
        }
        console.log("✅ StoveTypeStatistics inserted");
    }

    function insertLoginHistory(): void {
        const logins = [
            { playerId: 2, loggedInAt: new Date(Date.now() - 86400000 * 2).toISOString(), sessionId: 'sample-session-1' },
            { playerId: 2, loggedInAt: new Date(Date.now() - 86400000).toISOString(), sessionId: 'sample-session-2' },
            { playerId: 3, loggedInAt: new Date(Date.now() - 86400000 * 3).toISOString(), sessionId: 'sample-session-3' }
        ];
        for (const login of logins) {
            const stmt = unit.prepare<unknown, { playerId: number; loggedInAt: string; sessionId: string }>(
                `insert into LoginHistory (playerId, loggedInAt, sessionId) values (@playerId, @loggedInAt, @sessionId)`,
                login
            );
            stmt.run();
        }
        console.log("✅ LoginHistory inserted");
    }

    function insertCoinTransactions(): void {
        const transactions = [
            { playerId: 2, amount: 500, type: 'listing_sale', description: 'Sold Rusty Stove', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { playerId: 2, amount: -200, type: 'listing_purchase', description: 'Bought Standard Stove', createdAt: new Date(Date.now() - 86400000).toISOString() },
            { playerId: 4, amount: 1000, type: 'listing_sale', description: 'Sold Golden Stove', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }
        ];
        for (const tx of transactions) {
            const stmt = unit.prepare<unknown, { playerId: number; amount: number; type: string; description: string; createdAt: string }>(
                `insert into CoinTransaction (playerId, amount, type, description, createdAt) values (@playerId, @amount, @type, @description, @createdAt)`,
                tx
            );
            stmt.run();
        }
        console.log("✅ CoinTransactions inserted");
    }

    if (!(alreadyPresent())) {
        insertLootboxTypes();
        insertPlayers();
        insertStoveTypes();
        insertStoves();
        insertLootboxes();
        insertPlayerLootboxes();
        insertLootboxDrops();
        insertOwnerships();
        insertListings();
        insertTrades();
        insertPriceHistory();
        insertMiniGameSessions();
        insertChatMessages();
        insertLoginHistory();
        insertCoinTransactions();
        insertPlayerStatistics();
        insertDailyStatistics();
        insertStoveTypeStatistics();
        return "inserted";
    }
    return "skipped";
}

class DB {
    public static createDBConnection(): Database {
        const db = new BetterSqlite3(getDbFileName(), {
            fileMustExist: false,
            verbose: (s: unknown) => DB.logStatement(s)
        });
        db.pragma("foreign_keys = ON");

        DB.ensureTablesCreated(db);

        return db;
    }

    public static beginTransaction(connection: Database): void {
        connection.exec("begin transaction;");
    }

    public static commitTransaction(connection: Database): void {
        connection.exec("commit;");
    }

    public static rollbackTransaction(connection: Database): void {
        connection.exec("rollback;");
    }

    private static logStatement(statement: string | unknown): void {
        if (typeof statement !== "string") {
            return;
        }
        const start = statement.slice(0, 6).trim().toLowerCase();
        if (start.startsWith("pragma") || start.startsWith("create")) {
            return;
        }
        console.log(`SQL: ${statement}`);
    }

    public static ensureTablesCreated(connection: Database): void {
        // Migration: make Lootbox.openedAt nullable if table exists with old schema
        try {
            const info = connection.prepare("PRAGMA table_info(Lootbox)").all() as { name: string; notnull: number }[];
            const openedAtCol = info.find(c => c.name === 'openedAt');
            if (openedAtCol && openedAtCol.notnull === 1) {
                connection.exec(`
                    PRAGMA foreign_keys = OFF;
                    BEGIN TRANSACTION;
                    CREATE TABLE Lootbox_new (
                        lootboxId integer primary key autoincrement,
                        lootboxTypeId integer not null references LootboxType(lootboxTypeId),
                        playerId integer not null references Player(playerId),
                        openedAt text,
                        acquiredHow text not null check (acquiredHow in ('free', 'purchase', 'reward'))
                    ) strict;
                    INSERT INTO Lootbox_new SELECT * FROM Lootbox;
                    DROP TABLE Lootbox;
                    ALTER TABLE Lootbox_new RENAME TO Lootbox;
                    COMMIT;
                    PRAGMA foreign_keys = ON;
                `);
            }
        } catch {
            // Table doesn't exist yet, no migration needed
        }

        connection.exec(`
            create table if not exists Player (
                playerId integer primary key autoincrement,
                username text not null unique,
                password text,
                email text not null unique,
                coins integer not null default 0,
                lootboxCount integer not null default 0,
                isAdmin integer not null default 0,
                joinedAt text not null,
                provider text check (provider in ('google', 'github')),
                providerId text unique
            ) strict
        `);

        connection.exec(`
            create table if not exists StoveType (
                typeId integer primary key autoincrement,
                name text not null,
                imageUrl text not null,
                rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary', 'limited')),
                lootboxWeight integer not null
            ) strict
        `);

        connection.exec(`
            create table if not exists Stove (
                stoveId integer primary key autoincrement,
                typeId integer not null references StoveType(typeId),
                currentOwnerId integer not null references Player(playerId),
                mintedAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists LootboxType (
                lootboxTypeId integer primary key autoincrement,
                name text not null,
                description text,
                costCoins integer not null default 0,
                costFree integer not null default 1,
                dailyLimit integer,
                isAvailable integer not null default 1
            ) strict
        `);

        connection.exec(`
            create table if not exists Lootbox (
                lootboxId integer primary key autoincrement,
                lootboxTypeId integer not null references LootboxType(lootboxTypeId),
                playerId integer not null references Player(playerId),
                openedAt text,
                acquiredHow text not null check (acquiredHow in ('free', 'purchase', 'reward'))
            ) strict
        `);

        connection.exec(`
            create table if not exists LootboxDrop (
                dropId integer primary key autoincrement,
                lootboxId integer not null unique references Lootbox(lootboxId),
                stoveId integer not null unique references Stove(stoveId)
            ) strict
        `);

        connection.exec(`
            create table if not exists Listing (
                listingId integer primary key autoincrement,
                sellerId integer not null references Player(playerId),
                stoveId integer not null references Stove(stoveId),
                price integer not null check (price >= 1),
                listedAt text not null,
                status text not null default 'active' check (status in ('active', 'cancelled', 'sold'))
            ) strict
        `);

        connection.exec(`
            create table if not exists Trade (
                tradeId integer primary key autoincrement,
                listingId integer not null unique references Listing(listingId),
                buyerId integer not null references Player(playerId),
                executedAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists MiniGameSession (
                sessionId integer primary key autoincrement,
                playerId integer not null references Player(playerId),
                gameType text not null,
                result text not null,
                coinPayout integer not null default 0,
                finishedAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists Session (
                sessionId text primary key,
                playerId integer not null references Player(playerId),
                createdAt text not null,
                expiresAt text not null,
                isActive integer not null default 1
            ) strict
        `);

        connection.exec(`
            create table if not exists PriceHistory (
                historyId integer primary key autoincrement,
                typeId integer not null references StoveType(typeId),
                salePrice integer not null,
                saleDate text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists Ownership (
                ownershipId integer primary key autoincrement,
                stoveId integer not null references Stove(stoveId),
                playerId integer not null references Player(playerId),
                acquiredAt text not null,
                acquiredHow text not null check (acquiredHow in ('lootbox', 'trade', 'mini-game'))
            ) strict
        `);

        connection.exec(`
            create table if not exists LoginHistory (
                loginHistoryId integer primary key autoincrement,
                playerId integer not null references Player(playerId),
                loggedInAt text not null,
                sessionId text
            ) strict
        `);

        connection.exec(`
            create table if not exists CoinTransaction (
                transactionId integer primary key autoincrement,
                playerId integer not null references Player(playerId),
                amount integer not null,
                type text not null check (type in ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust')),
                description text,
                createdAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists ChatMessage (
                messageId integer primary key autoincrement,
                senderId integer not null references Player(playerId),
                receiverId integer references Player(playerId),
                content text not null,
                sentAt text not null,
                isRead integer not null default 0
            ) strict
        `);

        // Statistics Tables
        connection.exec(`
            create table if not exists PlayerStatistics (
                statId integer primary key autoincrement,
                playerId integer not null unique references Player(playerId),
                totalLogins integer not null default 0,
                lastLoginAt text,
                totalSessionMinutes integer not null default 0,
                longestSessionMinutes integer not null default 0,
                totalLootboxesOpened integer not null default 0,
                totalLootboxesPurchased integer not null default 0,
                totalLootboxesFree integer not null default 0,
                totalCoinsSpentOnLootboxes integer not null default 0,
                bestDropRarity text check (bestDropRarity in ('common', 'rare', 'epic', 'legendary', 'limited')),
                totalStovesFromLootboxes integer not null default 0,
                totalListingsCreated integer not null default 0,
                totalListingsSold integer not null default 0,
                totalListingsCancelled integer not null default 0,
                totalListingsExpired integer not null default 0,
                totalPurchases integer not null default 0,
                totalSalesRevenue integer not null default 0,
                totalPurchaseSpending integer not null default 0,
                averageListingPrice integer not null default 0,
                averageSalePrice integer not null default 0,
                fastestSaleMinutes integer,
                totalTradesCompleted integer not null default 0,
                totalMiniGamesPlayed integer not null default 0,
                totalMiniGameWins integer not null default 0,
                totalMiniGameLosses integer not null default 0,
                totalCoinsFromMiniGames integer not null default 0,
                totalCoinsLostInMiniGames integer not null default 0,
                favoriteGameType text,
                luckiestWin integer not null default 0,
                totalMessagesSent integer not null default 0,
                totalMessagesReceived integer not null default 0,
                totalGlobalMessages integer not null default 0,
                totalPrivateMessages integer not null default 0,
                currentStoveCount integer not null default 0,
                totalStovesAcquired integer not null default 0,
                totalStovesSold integer not null default 0,
                totalStovesTraded integer not null default 0,
                rarestStoveOwned text check (rarestStoveOwned in ('common', 'rare', 'epic', 'legendary', 'limited')),
                highestCoinBalance integer not null default 0,
                lowestCoinBalance integer not null default 0,
                totalCoinsEarned integer not null default 0,
                totalCoinsSpent integer not null default 0,
                netWorthEstimate integer not null default 0,
                marketActivityScore integer not null default 0,
                updatedAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists DailyStatistics (
                statId integer primary key autoincrement,
                date text not null unique,
                uniquePlayersLoggedIn integer not null default 0,
                newPlayersJoined integer not null default 0,
                totalSessions integer not null default 0,
                averageSessionMinutes integer not null default 0,
                lootboxesOpenedToday integer not null default 0,
                lootboxesPurchasedToday integer not null default 0,
                coinsSpentOnLootboxesToday integer not null default 0,
                newListingsToday integer not null default 0,
                listingsSoldToday integer not null default 0,
                listingsCancelledToday integer not null default 0,
                averageListingPriceToday integer not null default 0,
                averageSalePriceToday integer not null default 0,
                totalTradingVolume integer not null default 0,
                priceChangePercent real not null default 0,
                miniGamesPlayedToday integer not null default 0,
                totalCoinPayoutsToday integer not null default 0,
                houseProfit integer not null default 0,
                messagesSentToday integer not null default 0,
                uniqueChattersToday integer not null default 0,
                totalCoinsInCirculation integer not null default 0,
                totalStovesInExistence integer not null default 0,
                averagePlayerNetWorth integer not null default 0,
                medianPlayerNetWorth integer not null default 0,
                wealthGapRatio real not null default 0,
                averageTimeToSellHours real not null default 0,
                sellThroughRate real not null default 0,
                createdAt text not null
            ) strict
        `);

        connection.exec(`
            create table if not exists StoveTypeStatistics (
                statId integer primary key autoincrement,
                stoveTypeId integer not null unique references StoveType(typeId),
                totalMinted integer not null default 0,
                currentlyOwned integer not null default 0,
                currentlyListed integer not null default 0,
                listedPercent real not null default 0,
                currentLowestPrice integer,
                currentHighestPrice integer,
                averageListingPrice integer not null default 0,
                lastSalePrice integer,
                averageSalePrice integer not null default 0,
                priceHistory7d text not null default '[]',
                priceHistory30d text not null default '[]',
                allTimeHighPrice integer,
                allTimeLowPrice integer,
                totalSales integer not null default 0,
                salesLast7Days integer not null default 0,
                salesLast30Days integer not null default 0,
                viewsCount integer not null default 0,
                totalDroppedFromLootboxes integer not null default 0,
                actualDropRate real not null default 0,
                percentOfTotalSupply real not null default 0,
                rarityRank integer not null default 0,
                priceTrend7d real not null default 0,
                priceTrend30d real not null default 0,
                demandTrend text not null default 'stable' check (demandTrend in ('increasing', 'stable', 'decreasing')),
                updatedAt text not null
            ) strict
        `);

        // Create indexes for better query performance
        connection.exec(`create index if not exists idx_stove_owner on Stove(currentOwnerId)`);
        connection.exec(`create index if not exists idx_stove_type on Stove(typeId)`);
        connection.exec(`create index if not exists idx_listing_seller on Listing(sellerId)`);
        connection.exec(`create index if not exists idx_listing_stove on Listing(stoveId)`);
        connection.exec(`create index if not exists idx_listing_status on Listing(status)`);
        connection.exec(`create index if not exists idx_trade_buyer on Trade(buyerId)`);
        connection.exec(`create index if not exists idx_ownership_stove on Ownership(stoveId)`);
        connection.exec(`create index if not exists idx_ownership_player on Ownership(playerId)`);
        connection.exec(`create index if not exists idx_pricehistory_type on PriceHistory(typeId)`);
        connection.exec(`create index if not exists idx_loginhistory_player on LoginHistory(playerId)`);
        connection.exec(`create index if not exists idx_cointransaction_player on CoinTransaction(playerId)`);
        connection.exec(`create index if not exists idx_chat_sender on ChatMessage(senderId)`);
        connection.exec(`create index if not exists idx_chat_receiver on ChatMessage(receiverId)`);
        connection.exec(`create index if not exists idx_lootbox_player on Lootbox(playerId)`);
        connection.exec(`create index if not exists idx_lootbox_type on Lootbox(lootboxTypeId)`);
        connection.exec(`create index if not exists idx_minigame_player on MiniGameSession(playerId)`);
        connection.exec(`create index if not exists idx_playerstats_player on PlayerStatistics(playerId)`);
        connection.exec(`create index if not exists idx_dailystats_date on DailyStatistics(date)`);
        connection.exec(`create index if not exists idx_stovetypestats_type on StoveTypeStatistics(stoveTypeId)`);
    }
}

type RawStatement<TResult> = BetterSqlite3.Statement<unknown[], TResult>;
type RunResult = ReturnType<RawStatement<unknown>["run"]>;

export interface ITypedStatement<TResult = unknown, TParams = unknown> {
    // phantom type, just carries the params type for tooling
    readonly _params?: TParams;

    get(): TResult | undefined;

    all(): TResult[];

    run(): RunResult;
}
