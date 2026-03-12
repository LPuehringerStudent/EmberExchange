import BetterSqlite3 from "better-sqlite3";
import { Database, Statement } from "better-sqlite3";

import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "src", "backend", "db");
// Use TEST_DB_PATH environment variable if set (for testing), otherwise use default
const dbFileName = process.env['TEST_DB_PATH'] || path.join(dbDir, "EmberExchange.db");

// Ensure the db directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
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
    connection.exec("DROP TABLE IF EXISTS ChatMessage");
    connection.exec("DROP TABLE IF EXISTS Ownership");
    connection.exec("DROP TABLE IF EXISTS PriceHistory");
    connection.exec("DROP TABLE IF EXISTS MiniGameSession");
    connection.exec("DROP TABLE IF EXISTS Trade");
    connection.exec("DROP TABLE IF EXISTS Listing");
    connection.exec("DROP TABLE IF EXISTS LootboxDrop");
    connection.exec("DROP TABLE IF EXISTS Lootbox");
    connection.exec("DROP TABLE IF EXISTS LootboxType");
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
            { username: "player2", password: "pass456", email: "player2@example.com", coins: 3500, lootboxCount: 5, isAdmin: 0 },
            { username: "trader_joe", password: "trade789", email: "trader@example.com", coins: 10000, lootboxCount: 20, isAdmin: 0 },
            { username: "collector", password: "collect000", email: "collector@example.com", coins: 2500, lootboxCount: 3, isAdmin: 0 }
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

    function insertStoveTypes(): void {
        const stoves = [
            { name: "Rusty Stove", imageUrl: "/images/stoves/rusty.png", rarity: "common", lootboxWeight: 100 },
            { name: "Standard Stove", imageUrl: "/images/stoves/standard.png", rarity: "common", lootboxWeight: 80 },
            { name: "Bronze Stove", imageUrl: "/images/stoves/bronze.png", rarity: "rare", lootboxWeight: 50 },
            { name: "Silver Stove", imageUrl: "/images/stoves/silver.png", rarity: "rare", lootboxWeight: 40 },
            { name: "Golden Stove", imageUrl: "/images/stoves/golden.png", rarity: "epic", lootboxWeight: 20 },
            { name: "Crystal Stove", imageUrl: "/images/stoves/crystal.png", rarity: "epic", lootboxWeight: 15 },
            { name: "Dragon Stove", imageUrl: "/images/stoves/dragon.png", rarity: "legendary", lootboxWeight: 5 },
            { name: "Phoenix Stove", imageUrl: "/images/stoves/phoenix.png", rarity: "legendary", lootboxWeight: 3 },
            { name: "One of a Kind", imageUrl: "/images/stoves/unique.png", rarity: "limited", lootboxWeight: 1 }
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
        console.log("✅ Lootboxes inserted");
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

    if (!(alreadyPresent())) {
        insertLootboxTypes();
        insertPlayers();
        insertStoveTypes();
        insertStoves();
        insertLootboxes();
        insertLootboxDrops();
        insertOwnerships();
        insertListings();
        insertTrades();
        insertPriceHistory();
        insertMiniGameSessions();
        insertChatMessages();
        return "inserted";
    }
    return "skipped";
}

class DB {
    public static createDBConnection(): Database {
        const db = new BetterSqlite3(dbFileName, {
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
        connection.exec(`
            create table if not exists Player (
                playerId integer primary key autoincrement,
                username text not null unique,
                password text not null,
                email text not null unique,
                coins integer not null default 0,
                lootboxCount integer not null default 0,
                isAdmin integer not null default 0,
                joinedAt text not null
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
                openedAt text not null,
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
            create table if not exists ChatMessage (
                messageId integer primary key autoincrement,
                senderId integer not null references Player(playerId),
                receiverId integer references Player(playerId),
                content text not null,
                sentAt text not null,
                isRead integer not null default 0
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
        connection.exec(`create index if not exists idx_chat_sender on ChatMessage(senderId)`);
        connection.exec(`create index if not exists idx_chat_receiver on ChatMessage(receiverId)`);
        connection.exec(`create index if not exists idx_lootbox_player on Lootbox(playerId)`);
        connection.exec(`create index if not exists idx_lootbox_type on Lootbox(lootboxTypeId)`);
        connection.exec(`create index if not exists idx_minigame_player on MiniGameSession(playerId)`);
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
