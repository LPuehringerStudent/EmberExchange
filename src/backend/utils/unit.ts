import { Pool, PoolClient, QueryResult } from "pg";

const COLUMN_MAP: Record<string, string> = {
    "acquiredat": "acquiredAt",
    "acquiredhow": "acquiredHow",
    "actualdroprate": "actualDropRate",
    "alltimehighprice": "allTimeHighPrice",
    "alltimelowprice": "allTimeLowPrice",
    "amount": "amount",
    "averagelistingprice": "averageListingPrice",
    "averagelistingpricetoday": "averageListingPriceToday",
    "averageplayernetworth": "averagePlayerNetWorth",
    "averagesaleprice": "averageSalePrice",
    "averagesalepricetoday": "averageSalePriceToday",
    "averagesessionminutes": "averageSessionMinutes",
    "averagetimetosellhours": "averageTimeToSellHours",
    "bestdroprarity": "bestDropRarity",
    "buyerid": "buyerId",
    "coinpayout": "coinPayout",
    "coins": "coins",
    "coinsspentonlootboxestoday": "coinsSpentOnLootboxesToday",
    "content": "content",
    "costcoins": "costCoins",
    "costfree": "costFree",
    "createdat": "createdAt",
    "currenthighestprice": "currentHighestPrice",
    "currentlowestprice": "currentLowestPrice",
    "currentownerid": "currentOwnerId",
    "currentstovecount": "currentStoveCount",
    "currentlylisted": "currentlyListed",
    "currentlyowned": "currentlyOwned",
    "dailylimit": "dailyLimit",
    "date": "date",
    "demandtrend": "demandTrend",
    "description": "description",
    "dropid": "dropId",
    "email": "email",
    "executedat": "executedAt",
    "expiresat": "expiresAt",
    "fastestsaleminutes": "fastestSaleMinutes",
    "favoritegametype": "favoriteGameType",
    "finishedat": "finishedAt",
    "gametype": "gameType",
    "highestcoinbalance": "highestCoinBalance",
    "historyid": "historyId",
    "houseprofit": "houseProfit",
    "imageurl": "imageUrl",
    "isactive": "isActive",
    "isadmin": "isAdmin",
    "isavailable": "isAvailable",
    "isread": "isRead",
    "joinedat": "joinedAt",
    "lastloginat": "lastLoginAt",
    "lastsaleprice": "lastSalePrice",
    "listedat": "listedAt",
    "listedpercent": "listedPercent",
    "listingid": "listingId",
    "listingscancelledtoday": "listingsCancelledToday",
    "listingssoldtoday": "listingsSoldToday",
    "loggedinat": "loggedInAt",
    "loginhistoryid": "loginHistoryId",
    "longestsessionminutes": "longestSessionMinutes",
    "lootboxcount": "lootboxCount",
    "lootboxid": "lootboxId",
    "lootboxtypeid": "lootboxTypeId",
    "lootboxweight": "lootboxWeight",
    "lootboxesopenedtoday": "lootboxesOpenedToday",
    "lootboxespurchasedtoday": "lootboxesPurchasedToday",
    "lowestcoinbalance": "lowestCoinBalance",
    "luckiestwin": "luckiestWin",
    "marketactivityscore": "marketActivityScore",
    "medianplayernetworth": "medianPlayerNetWorth",
    "messageid": "messageId",
    "messagessenttoday": "messagesSentToday",
    "minigamesplayedtoday": "miniGamesPlayedToday",
    "mintedat": "mintedAt",
    "name": "name",
    "networthestimate": "netWorthEstimate",
    "newlistingstoday": "newListingsToday",
    "newplayersjoined": "newPlayersJoined",
    "openedat": "openedAt",
    "ownershipid": "ownershipId",
    "password": "password",
    "percentoftotalsupply": "percentOfTotalSupply",
    "playerid": "playerId",
    "price": "price",
    "pricechangepercent": "priceChangePercent",
    "pricehistory30d": "priceHistory30d",
    "pricehistory7d": "priceHistory7d",
    "pricetrend30d": "priceTrend30d",
    "pricetrend7d": "priceTrend7d",
    "provider": "provider",
    "providerid": "providerId",
    "rareststoveowned": "rarestStoveOwned",
    "rarity": "rarity",
    "rarityrank": "rarityRank",
    "receiverid": "receiverId",
    "result": "result",
    "saledate": "saleDate",
    "saleprice": "salePrice",
    "saleslast30days": "salesLast30Days",
    "saleslast7days": "salesLast7Days",
    "sellthroughrate": "sellThroughRate",
    "sellerid": "sellerId",
    "senderid": "senderId",
    "sentat": "sentAt",
    "sessionid": "sessionId",
    "statid": "statId",
    "status": "status",
    "stoveid": "stoveId",
    "stovename": "stoveName",
    "stovetypeid": "stoveTypeId",
    "totalcoinpayoutstoday": "totalCoinPayoutsToday",
    "totalcoinsearned": "totalCoinsEarned",
    "totalcoinsfromminigames": "totalCoinsFromMiniGames",
    "totalcoinsincirculation": "totalCoinsInCirculation",
    "totalcoinslostinminigames": "totalCoinsLostInMiniGames",
    "totalcoinsspent": "totalCoinsSpent",
    "totalcoinsspentonlootboxes": "totalCoinsSpentOnLootboxes",
    "totaldroppedfromlootboxes": "totalDroppedFromLootboxes",
    "totalglobalmessages": "totalGlobalMessages",
    "totallistingscancelled": "totalListingsCancelled",
    "totallistingscreated": "totalListingsCreated",
    "totallistingsexpired": "totalListingsExpired",
    "totallistingssold": "totalListingsSold",
    "totallogins": "totalLogins",
    "totallootboxesfree": "totalLootboxesFree",
    "totallootboxesopened": "totalLootboxesOpened",
    "totallootboxespurchased": "totalLootboxesPurchased",
    "totalmessagesreceived": "totalMessagesReceived",
    "totalmessagessent": "totalMessagesSent",
    "totalminigamelosses": "totalMiniGameLosses",
    "totalminigamewins": "totalMiniGameWins",
    "totalminigamesplayed": "totalMiniGamesPlayed",
    "totalminted": "totalMinted",
    "totalprivatemessages": "totalPrivateMessages",
    "totalpurchasespending": "totalPurchaseSpending",
    "totalpurchases": "totalPurchases",
    "totalsales": "totalSales",
    "totalsalesrevenue": "totalSalesRevenue",
    "totalsessionminutes": "totalSessionMinutes",
    "totalsessions": "totalSessions",
    "totalstovesacquired": "totalStovesAcquired",
    "totalstovesfromlootboxes": "totalStovesFromLootboxes",
    "totalstovesinexistence": "totalStovesInExistence",
    "totalstovessold": "totalStovesSold",
    "totalstovestraded": "totalStovesTraded",
    "totaltradescompleted": "totalTradesCompleted",
    "totaltradingvolume": "totalTradingVolume",
    "totalvolumetraded": "totalVolumeTraded",
    "tradeid": "tradeId",
    "transactionid": "transactionId",
    "type": "type",
    "typeid": "typeId",
    "uniquechatterstoday": "uniqueChattersToday",
    "uniqueplayersloggedin": "uniquePlayersLoggedIn",
    "updatedat": "updatedAt",
    "username": "username",
    "viewscount": "viewsCount",
    "wealthgapratio": "wealthGapRatio"
};

function transformRow<T>(row: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
        const mapped = COLUMN_MAP[key] ?? key;
        result[mapped] = value;
    }
    return result as T;
}

function convertNamedParams(sql: string, bindings?: Record<string, unknown>): { sql: string; values: unknown[] } {
    if (!bindings) {
        return { sql, values: [] };
    }
    const keys: string[] = [];
    const regex = /@(\w+)/g;
    let match;
    while ((match = regex.exec(sql)) !== null) {
        keys.push(match[1]);
    }
    const seen = new Set<string>();
    const orderedKeys: string[] = [];
    for (const key of keys) {
        if (!seen.has(key)) {
            seen.add(key);
            orderedKeys.push(key);
        }
    }
    const newSql = sql.replace(/@(\w+)/g, (_, key) => {
        const index = orderedKeys.indexOf(key) + 1;
        return `$${index}`;
    });
    const values = orderedKeys.map(key => bindings[key]);
    return { sql: newSql, values };
}

export interface RunResult {
    changes: number;
}

export interface ITypedStatement<TResult = unknown, TParams = unknown> {
    readonly _params?: TParams;
    get(): Promise<TResult | undefined>;
    all(): Promise<TResult[]>;
    run(): Promise<RunResult>;
}

class TypedStatement<TResult, TParams> implements ITypedStatement<TResult, TParams> {
    readonly _params?: TParams;

    constructor(
        private client: PoolClient,
        private sql: string,
        private values: unknown[]
    ) {}

    async get(): Promise<TResult | undefined> {
        const result = await this.client.query(this.sql, this.values);
        const row = (result as QueryResult<any>).rows[0];
        return row ? transformRow<TResult>(row) : undefined;
    }

    async all(): Promise<TResult[]> {
        const result = await this.client.query(this.sql, this.values);
        return (result as QueryResult<any>).rows.map(transformRow<TResult>);
    }

    async run(): Promise<RunResult> {
        const result = await this.client.query(this.sql, this.values);
        return { changes: result.rowCount ?? 0 };
    }
}

export class DB {
    private static pool: Pool | null = null;

    public static getPool(): Pool {
        if (!DB.pool) {
            const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/emberexchange";
            DB.pool = new Pool({ connectionString });
        }
        return DB.pool;
    }

    public static async createDBConnection(): Promise<PoolClient> {
        const client = await DB.getPool().connect();
        await client.query("SET timezone = 'UTC'");
        return client;
    }

    public static async ensureTablesCreated(connection: PoolClient): Promise<void> {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT,
                email TEXT NOT NULL UNIQUE,
                coins INTEGER NOT NULL DEFAULT 0,
                lootboxCount INTEGER NOT NULL DEFAULT 0,
                isAdmin INTEGER NOT NULL DEFAULT 0,
                joinedAt TEXT NOT NULL,
                provider TEXT CHECK (provider IN ('google', 'github')),
                providerId TEXT UNIQUE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS StoveType (
                typeId SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                imageUrl TEXT NOT NULL,
                rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited')),
                lootboxWeight INTEGER NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Stove (
                stoveId SERIAL PRIMARY KEY,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                currentOwnerId INTEGER NOT NULL REFERENCES Player(playerId),
                mintedAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS LootboxType (
                lootboxTypeId SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                costCoins INTEGER NOT NULL DEFAULT 0,
                costFree INTEGER NOT NULL DEFAULT 1,
                dailyLimit INTEGER,
                isAvailable INTEGER NOT NULL DEFAULT 1
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Lootbox (
                lootboxId SERIAL PRIMARY KEY,
                lootboxTypeId INTEGER NOT NULL REFERENCES LootboxType(lootboxTypeId),
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                openedAt TEXT,
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('free', 'purchase', 'reward'))
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS LootboxDrop (
                dropId SERIAL PRIMARY KEY,
                lootboxId INTEGER NOT NULL UNIQUE REFERENCES Lootbox(lootboxId),
                stoveId INTEGER NOT NULL UNIQUE REFERENCES Stove(stoveId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Listing (
                listingId SERIAL PRIMARY KEY,
                sellerId INTEGER NOT NULL REFERENCES Player(playerId),
                stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
                price INTEGER NOT NULL CHECK (price >= 1),
                listedAt TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'sold'))
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Trade (
                tradeId SERIAL PRIMARY KEY,
                listingId INTEGER NOT NULL UNIQUE REFERENCES Listing(listingId),
                buyerId INTEGER NOT NULL REFERENCES Player(playerId),
                executedAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS MiniGameSession (
                sessionId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                gameType TEXT NOT NULL,
                result TEXT NOT NULL,
                coinPayout INTEGER NOT NULL DEFAULT 0,
                finishedAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Session (
                sessionId TEXT PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                createdAt TEXT NOT NULL,
                expiresAt TEXT NOT NULL,
                isActive INTEGER NOT NULL DEFAULT 1
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PriceHistory (
                historyId SERIAL PRIMARY KEY,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                salePrice INTEGER NOT NULL,
                saleDate TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Ownership (
                ownershipId SERIAL PRIMARY KEY,
                stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                acquiredAt TEXT NOT NULL,
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('lootbox', 'trade', 'mini-game'))
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS LoginHistory (
                loginHistoryId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                loggedInAt TEXT NOT NULL,
                sessionId TEXT
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS CoinTransaction (
                transactionId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                amount INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust')),
                description TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ChatMessage (
                messageId SERIAL PRIMARY KEY,
                senderId INTEGER NOT NULL REFERENCES Player(playerId),
                receiverId INTEGER REFERENCES Player(playerId),
                content TEXT NOT NULL,
                sentAt TEXT NOT NULL,
                isRead INTEGER NOT NULL DEFAULT 0
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerStatistics (
                statId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL UNIQUE REFERENCES Player(playerId),
                totalLogins INTEGER NOT NULL DEFAULT 0,
                lastLoginAt TEXT,
                totalSessionMinutes INTEGER NOT NULL DEFAULT 0,
                longestSessionMinutes INTEGER NOT NULL DEFAULT 0,
                totalLootboxesOpened INTEGER NOT NULL DEFAULT 0,
                totalLootboxesPurchased INTEGER NOT NULL DEFAULT 0,
                totalLootboxesFree INTEGER NOT NULL DEFAULT 0,
                totalCoinsSpentOnLootboxes INTEGER NOT NULL DEFAULT 0,
                bestDropRarity TEXT CHECK (bestDropRarity IN ('common', 'rare', 'epic', 'legendary', 'limited')),
                totalStovesFromLootboxes INTEGER NOT NULL DEFAULT 0,
                totalListingsCreated INTEGER NOT NULL DEFAULT 0,
                totalListingsSold INTEGER NOT NULL DEFAULT 0,
                totalListingsCancelled INTEGER NOT NULL DEFAULT 0,
                totalListingsExpired INTEGER NOT NULL DEFAULT 0,
                totalPurchases INTEGER NOT NULL DEFAULT 0,
                totalSalesRevenue INTEGER NOT NULL DEFAULT 0,
                totalPurchaseSpending INTEGER NOT NULL DEFAULT 0,
                averageListingPrice INTEGER NOT NULL DEFAULT 0,
                averageSalePrice INTEGER NOT NULL DEFAULT 0,
                fastestSaleMinutes INTEGER,
                totalTradesCompleted INTEGER NOT NULL DEFAULT 0,
                totalMiniGamesPlayed INTEGER NOT NULL DEFAULT 0,
                totalMiniGameWins INTEGER NOT NULL DEFAULT 0,
                totalMiniGameLosses INTEGER NOT NULL DEFAULT 0,
                totalCoinsFromMiniGames INTEGER NOT NULL DEFAULT 0,
                totalCoinsLostInMiniGames INTEGER NOT NULL DEFAULT 0,
                favoriteGameType TEXT,
                luckiestWin INTEGER NOT NULL DEFAULT 0,
                totalMessagesSent INTEGER NOT NULL DEFAULT 0,
                totalMessagesReceived INTEGER NOT NULL DEFAULT 0,
                totalGlobalMessages INTEGER NOT NULL DEFAULT 0,
                totalPrivateMessages INTEGER NOT NULL DEFAULT 0,
                currentStoveCount INTEGER NOT NULL DEFAULT 0,
                totalStovesAcquired INTEGER NOT NULL DEFAULT 0,
                totalStovesSold INTEGER NOT NULL DEFAULT 0,
                totalStovesTraded INTEGER NOT NULL DEFAULT 0,
                rarestStoveOwned TEXT CHECK (rarestStoveOwned IN ('common', 'rare', 'epic', 'legendary', 'limited')),
                highestCoinBalance INTEGER NOT NULL DEFAULT 0,
                lowestCoinBalance INTEGER NOT NULL DEFAULT 0,
                totalCoinsEarned INTEGER NOT NULL DEFAULT 0,
                totalCoinsSpent INTEGER NOT NULL DEFAULT 0,
                netWorthEstimate INTEGER NOT NULL DEFAULT 0,
                marketActivityScore INTEGER NOT NULL DEFAULT 0,
                updatedAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS DailyStatistics (
                statId SERIAL PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                uniquePlayersLoggedIn INTEGER NOT NULL DEFAULT 0,
                newPlayersJoined INTEGER NOT NULL DEFAULT 0,
                totalSessions INTEGER NOT NULL DEFAULT 0,
                averageSessionMinutes INTEGER NOT NULL DEFAULT 0,
                lootboxesOpenedToday INTEGER NOT NULL DEFAULT 0,
                lootboxesPurchasedToday INTEGER NOT NULL DEFAULT 0,
                coinsSpentOnLootboxesToday INTEGER NOT NULL DEFAULT 0,
                newListingsToday INTEGER NOT NULL DEFAULT 0,
                listingsSoldToday INTEGER NOT NULL DEFAULT 0,
                listingsCancelledToday INTEGER NOT NULL DEFAULT 0,
                averageListingPriceToday INTEGER NOT NULL DEFAULT 0,
                averageSalePriceToday INTEGER NOT NULL DEFAULT 0,
                totalTradingVolume INTEGER NOT NULL DEFAULT 0,
                priceChangePercent REAL NOT NULL DEFAULT 0,
                miniGamesPlayedToday INTEGER NOT NULL DEFAULT 0,
                totalCoinPayoutsToday INTEGER NOT NULL DEFAULT 0,
                houseProfit INTEGER NOT NULL DEFAULT 0,
                messagesSentToday INTEGER NOT NULL DEFAULT 0,
                uniqueChattersToday INTEGER NOT NULL DEFAULT 0,
                totalCoinsInCirculation INTEGER NOT NULL DEFAULT 0,
                totalStovesInExistence INTEGER NOT NULL DEFAULT 0,
                averagePlayerNetWorth INTEGER NOT NULL DEFAULT 0,
                medianPlayerNetWorth INTEGER NOT NULL DEFAULT 0,
                wealthGapRatio REAL NOT NULL DEFAULT 0,
                averageTimeToSellHours REAL NOT NULL DEFAULT 0,
                sellThroughRate REAL NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS StoveTypeStatistics (
                statId SERIAL PRIMARY KEY,
                stoveTypeId INTEGER NOT NULL UNIQUE REFERENCES StoveType(typeId),
                totalMinted INTEGER NOT NULL DEFAULT 0,
                currentlyOwned INTEGER NOT NULL DEFAULT 0,
                currentlyListed INTEGER NOT NULL DEFAULT 0,
                listedPercent REAL NOT NULL DEFAULT 0,
                currentLowestPrice INTEGER,
                currentHighestPrice INTEGER,
                averageListingPrice INTEGER NOT NULL DEFAULT 0,
                lastSalePrice INTEGER,
                averageSalePrice INTEGER NOT NULL DEFAULT 0,
                priceHistory7d TEXT NOT NULL DEFAULT '[]',
                priceHistory30d TEXT NOT NULL DEFAULT '[]',
                allTimeHighPrice INTEGER,
                allTimeLowPrice INTEGER,
                totalSales INTEGER NOT NULL DEFAULT 0,
                salesLast7Days INTEGER NOT NULL DEFAULT 0,
                salesLast30Days INTEGER NOT NULL DEFAULT 0,
                viewsCount INTEGER NOT NULL DEFAULT 0,
                totalDroppedFromLootboxes INTEGER NOT NULL DEFAULT 0,
                actualDropRate REAL NOT NULL DEFAULT 0,
                percentOfTotalSupply REAL NOT NULL DEFAULT 0,
                rarityRank INTEGER NOT NULL DEFAULT 0,
                priceTrend7d REAL NOT NULL DEFAULT 0,
                priceTrend30d REAL NOT NULL DEFAULT 0,
                demandTrend TEXT NOT NULL DEFAULT 'stable' CHECK (demandTrend IN ('increasing', 'stable', 'decreasing')),
                updatedAt TEXT NOT NULL
            )
        `);
    }
}

export class Unit {
    private client: PoolClient;
    private completed: boolean;
    private inTransaction: boolean;

    private constructor(client: PoolClient, inTransaction: boolean) {
        this.client = client;
        this.completed = false;
        this.inTransaction = inTransaction;
    }

    public static async create(readOnly: boolean): Promise<Unit> {
        const client = await DB.createDBConnection();
        if (!readOnly) {
            await client.query("BEGIN");
        }
        return new Unit(client, !readOnly);
    }

    public getConnection(): PoolClient {
        return this.client;
    }

    public prepare<TResult, TParams extends Record<string, unknown> = Record<string, unknown>>(
        sql: string,
        bindings?: TParams
    ): ITypedStatement<TResult, TParams> {
        const { sql: convertedSql, values } = convertNamedParams(sql, bindings);
        return new TypedStatement<TResult, TParams>(this.client, convertedSql, values);
    }

    public async getLastRowId(): Promise<number> {
        const result = await this.client.query<{ id: number }>("SELECT lastval() as id");
        return result.rows[0]?.id ?? 0;
    }

    public async complete(commit: boolean | null = null): Promise<void> {
        if (this.completed) {
            return;
        }
        this.completed = true;

        if (this.inTransaction) {
            if (commit === true) {
                await this.client.query("COMMIT");
            } else if (commit === false) {
                await this.client.query("ROLLBACK");
            } else {
                throw new Error("transaction has been opened, requires information if commit or rollback needed");
            }
        }
        this.client.release();
    }
}

export async function resetDatabase(connection: PoolClient): Promise<void> {
    await connection.query(`
        DROP TABLE IF EXISTS PlayerStatistics CASCADE;
        DROP TABLE IF EXISTS DailyStatistics CASCADE;
        DROP TABLE IF EXISTS StoveTypeStatistics CASCADE;
        DROP TABLE IF EXISTS ChatMessage CASCADE;
        DROP TABLE IF EXISTS Ownership CASCADE;
        DROP TABLE IF EXISTS PriceHistory CASCADE;
        DROP TABLE IF EXISTS CoinTransaction CASCADE;
        DROP TABLE IF EXISTS LoginHistory CASCADE;
        DROP TABLE IF EXISTS MiniGameSession CASCADE;
        DROP TABLE IF EXISTS Trade CASCADE;
        DROP TABLE IF EXISTS Listing CASCADE;
        DROP TABLE IF EXISTS LootboxDrop CASCADE;
        DROP TABLE IF EXISTS Lootbox CASCADE;
        DROP TABLE IF EXISTS LootboxType CASCADE;
        DROP TABLE IF EXISTS Session CASCADE;
        DROP TABLE IF EXISTS Stove CASCADE;
        DROP TABLE IF EXISTS StoveType CASCADE;
        DROP TABLE IF EXISTS Player CASCADE
    `);
    console.log("🗑️  All tables dropped");
    await DB.ensureTablesCreated(connection);
    console.log("✅ Tables recreated");
}

export async function ensureSampleDataInserted(unit: Unit): Promise<"inserted" | "skipped"> {
    async function alreadyPresent(): Promise<boolean> {
        try {
            const checkStmt = unit.prepare<{ cnt: number }>(
                'select count(*) as cnt from Player where isAdmin = 1'
            );
            const result = await checkStmt.get();
            return (result?.cnt ?? 0) > 0;
        } catch {
            return false;
        }
    }

    async function insertLootboxTypes(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ LootboxTypes inserted");
    }

    async function insertPlayers(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ Players inserted");
    }

    async function insertPlayerLootboxes(): Promise<void> {
        const playerIds = [2, 3, 4, 5];
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
                await stmt.run();
            }
        }
        console.log("✅ Player lootboxes inserted");
    }

    async function insertStoveTypes(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ StoveTypes inserted");
    }

    async function insertStoves(): Promise<void> {
        const stoves = [
            { typeId: 1, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
            { typeId: 2, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
            { typeId: 3, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
            { typeId: 4, currentOwnerId: 3, mintedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
            { typeId: 5, currentOwnerId: 4, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
            { typeId: 7, currentOwnerId: 5, mintedAt: new Date().toISOString() }
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
            await stmt.run();
        }
        console.log("✅ Stoves inserted");
    }

    async function insertLootboxes(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ Historical lootboxes inserted");
    }

    async function insertLootboxDrops(): Promise<void> {
        const drops = [
            { lootboxId: 1, stoveId: 1 },
            { lootboxId: 2, stoveId: 2 },
            { lootboxId: 3, stoveId: 3 },
            { lootboxId: 4, stoveId: 4 },
            { lootboxId: 5, stoveId: 5 }
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
            await stmt.run();
        }
        console.log("✅ LootboxDrops inserted");
    }

    async function insertOwnerships(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ Ownerships inserted");
    }

    async function insertListings(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ Listings inserted");
    }

    async function insertTrades(): Promise<void> {
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
        await stmt.run();
        console.log("✅ Trades inserted");
    }

    async function insertPriceHistory(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ PriceHistory inserted");
    }

    async function insertMiniGameSessions(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ MiniGameSessions inserted");
    }

    async function insertChatMessages(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ ChatMessages inserted");
    }

    async function insertPlayerStatistics(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ PlayerStatistics inserted");
    }

    async function insertDailyStatistics(): Promise<void> {
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
        await stmt.run();
        console.log("✅ DailyStatistics inserted");
    }

    async function insertStoveTypeStatistics(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ StoveTypeStatistics inserted");
    }

    async function insertLoginHistory(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ LoginHistory inserted");
    }

    async function insertCoinTransactions(): Promise<void> {
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
            await stmt.run();
        }
        console.log("✅ CoinTransactions inserted");
    }

    if (!(await alreadyPresent())) {
        await insertLootboxTypes();
        await insertPlayers();
        await insertStoveTypes();
        await insertStoves();
        await insertLootboxes();
        await insertPlayerLootboxes();
        await insertLootboxDrops();
        await insertOwnerships();
        await insertListings();
        await insertTrades();
        await insertPriceHistory();
        await insertMiniGameSessions();
        await insertChatMessages();
        await insertLoginHistory();
        await insertCoinTransactions();
        await insertPlayerStatistics();
        await insertDailyStatistics();
        await insertStoveTypeStatistics();
        return "inserted";
    }
    return "skipped";
}
