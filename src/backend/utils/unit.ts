import { Pool, PoolClient, QueryResult } from "pg";
import { hashPassword } from "./password";

const COLUMN_MAP: Record<string, string> = {
    "acquiredat": "acquiredAt",
    "acquiredhow": "acquiredHow",
    "achievementid": "achievementId",
    "authorid": "authorId",
    "awardedat": "awardedAt",
    "actualdroprate": "actualDropRate",
    "activeplayers": "activePlayers",
    "alltimehighprice": "allTimeHighPrice",
    "alltimelowprice": "allTimeLowPrice",
    "amount": "amount",
    "averagelistingprice": "averageListingPrice",
    "avgprice": "avgPrice",
    "averagelistingpricetoday": "averageListingPriceToday",
    "averageplayernetworth": "averagePlayerNetWorth",
    "averagesaleprice": "averageSalePrice",
    "averagesalepricetoday": "averageSalePriceToday",
    "averagesessionminutes": "averageSessionMinutes",
    "avgsaleprice": "avgSalePrice",
    "bannerid": "bannerId",
    "averagetimetosellhours": "averageTimeToSellHours",
    "bestdroprarity": "bestDropRarity",
    "buyerid": "buyerId",
    "coinpayout": "coinPayout",
    "coins": "coins",
    "collection": "collection",
    "minheat": "minHeat",
    "maxheat": "maxHeat",
    "heatlevel": "heatLevel",
    "totalstovescrafted": "totalStovesCrafted",
    "coinsspentonlootboxestoday": "coinsSpentOnLootboxesToday",
    "content": "content",
    "costcoins": "costCoins",
    "costfree": "costFree",
    "createdat": "createdAt",
    "currenthighestprice": "currentHighestPrice",
    "currentlevel": "currentLevel",
    "currentlowestprice": "currentLowestPrice",
    "currentownerid": "currentOwnerId",
    "currentstovecount": "currentStoveCount",
    "currentlylisted": "currentlyListed",
    "currentlyowned": "currentlyOwned",
    "dailylimit": "dailyLimit",
    "date": "date",
    "cssclass": "cssClass",
    "demandtrend": "demandTrend",
    "description": "description",
    "dropid": "dropId",
    "email": "email",
    "entryid": "entryId",
    "eventname": "eventName",
    "addresseeid": "addresseeId",
    "executedat": "executedAt",
    "expiresat": "expiresAt",
    "fastestsaleminutes": "fastestSaleMinutes",
    "favoritegametype": "favoriteGameType",
    "friendid": "friendId",
    "requesterid": "requesterId",
    "finishedat": "finishedAt",
    "gamestoday": "gamesToday",
    "gametype": "gameType",
    "highestcoinbalance": "highestCoinBalance",
    "highestsaleprice": "highestSalePrice",
    "iconurl": "iconUrl",
    "historyid": "historyId",
    "houseprofit": "houseProfit",
    "imageurl": "imageUrl",
    "isactive": "isActive",
    "isadmin": "isAdmin",
    "ispublic": "isPublic",
    "isavailable": "isAvailable",
    "isread": "isRead",
    "itemid": "itemId",
    "itemtype": "itemType",
    "lastclaimat": "lastClaimAt",
    "joinedat": "joinedAt",
    "lastloginat": "lastLoginAt",
    "lastsaleprice": "lastSalePrice",
    "lastprice": "lastPrice",
    "listedat": "listedAt",
    "listedpercent": "listedPercent",
    "listingid": "listingId",
    "listingscreated": "listingsCreated",
    "listingscancelledtoday": "listingsCancelledToday",
    "listingssold": "listingsSold",
    "listingssoldtoday": "listingsSoldToday",
    "lootboxesopened": "lootboxesOpened",
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
    "lowestsaleprice": "lowestSalePrice",
    "luckiestwin": "luckiestWin",
    "marketactivityscore": "marketActivityScore",
    "medianplayernetworth": "medianPlayerNetWorth",
    "messageid": "messageId",
    "messagetype": "messageType",
    "messagessenttoday": "messagesSentToday",
    "minigamesplayed": "miniGamesPlayed",
    "minigamesplayedtoday": "miniGamesPlayedToday",
    "minlevel": "minLevel",
    "minprice": "minPrice",
    "mintedat": "mintedAt",
    "newlistings": "newListings",
    "name": "name",
    "networthestimate": "netWorthEstimate",
    "newlistingstoday": "newListingsToday",
    "notificationid": "notificationId",
    "newplayers": "newPlayers",
    "newplayersjoined": "newPlayersJoined",
    "openedat": "openedAt",
    "ownershipid": "ownershipId",
    "pinnedat": "pinnedAt",
    "postedat": "postedAt",
    "prestigecount": "prestigeCount",
    "password": "password",
    "percentoftotalsupply": "percentOfTotalSupply",
    "playerid": "playerId",
    "price": "price",
    "purchaseid": "purchaseId",
    "purchasedat": "purchasedAt",
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
    "rotationdate": "rotationDate",
    "receiverid": "receiverId",
    "roomid": "roomId",
    "roomplayerid": "roomPlayerId",
    "maxplayers": "maxPlayers",
    "maxprice": "maxPrice",
    "connectionstate": "connectionState",
    "messagestoday": "messagesToday",
    "seatindex": "seatIndex",
    "stateblob": "stateBlob",
    "eventid": "eventId",
    "servertimestamp": "serverTimestamp",
    "clienttimestamp": "clientTimestamp",
    "sequencenumber": "sequenceNumber",
    "result": "result",
    "saledate": "saleDate",
    "saleprice": "salePrice",
    "saleslast30days": "salesLast30Days",
    "saleslast7days": "salesLast7Days",
    "salesrevenue": "salesRevenue",
    "salestoday": "salesToday",
    "sellthroughrate": "sellThroughRate",
    "sellerid": "sellerId",
    "sellername": "sellerName",
    "senderid": "senderId",
    "slotindex": "slotIndex",
    "sentat": "sentAt",
    "sessionid": "sessionId",
    "streakcount": "streakCount",
    "statid": "statId",
    "status": "status",
    "stoveid": "stoveId",
    "themeid": "themeId",
    "titleid": "titleId",
    "titlelabel": "titleLabel",
    "titleanimation": "titleAnimation",
    "bannername": "bannerName",
    "bannercssclass": "bannerCssClass",
    "stovevalue": "stoveValue",
    "stovename": "stoveName",
    "stovetypeid": "stoveTypeId",
    "stovesowned": "stovesOwned",
    "totalcoinpayoutstoday": "totalCoinPayoutsToday",
    "totalcoinsearned": "totalCoinsEarned",
    "totalcoinsfromminigames": "totalCoinsFromMiniGames",
    "totalcoinsincirculation": "totalCoinsInCirculation",
    "totalcoinslostinminigames": "totalCoinsLostInMiniGames",
    "totalcoinsspent": "totalCoinsSpent",
    "totalcoinsspentonlootboxes": "totalCoinsSpentOnLootboxes",
    "totalcoins": "totalCoins",
    "totaldroppedfromlootboxes": "totalDroppedFromLootboxes",
    "totalglobalmessages": "totalGlobalMessages",
    "totallistingscancelled": "totalListingsCancelled",
    "totallistingscreated": "totalListingsCreated",
    "totalstoves": "totalStoves",
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
    "totalxp": "totalXP",
    "tradingvolume": "tradingVolume",
    "tradeid": "tradeId",
    "transactionid": "transactionId",
    "trophyid": "trophyId",
    "type": "type",
    "totpsecret": "totpSecret",
    "totpenabled": "totpEnabled",
    "typeid": "typeId",
    "unlockedat": "unlockedAt",
    "unlockcondition": "unlockCondition",
    "unlockvalue": "unlockValue",
    "uniquechatterstoday": "uniqueChattersToday",
    "uniqueplayersloggedin": "uniquePlayersLoggedIn",
    "updatedat": "updatedAt",
    "username": "username",
    "visitedat": "visitedAt",
    "visitedplayerid": "visitedPlayerId",
    "visitorplayerid": "visitorPlayerId",
    "viewscount": "viewsCount",
    "wealthgapratio": "wealthGapRatio",
    "xpamount": "xpAmount"
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
                motto TEXT NOT NULL DEFAULT '',
                coins INTEGER NOT NULL DEFAULT 0,
                lootboxCount INTEGER NOT NULL DEFAULT 0,
                isAdmin INTEGER NOT NULL DEFAULT 0,
                isPublic INTEGER NOT NULL DEFAULT 1,
                joinedAt TEXT NOT NULL,
                provider TEXT CHECK (provider IN ('google', 'github')),
                providerId TEXT UNIQUE
            )
        `);

        await connection.query(`
            ALTER TABLE Player ADD COLUMN IF NOT EXISTS isPublic INTEGER NOT NULL DEFAULT 1
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS StoveType (
                typeId SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                imageUrl TEXT NOT NULL,
                rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret')),
                lootboxWeight INTEGER NOT NULL,
                collection TEXT NOT NULL DEFAULT 'Industrial',
                minHeat REAL NOT NULL DEFAULT 0.0,
                maxHeat REAL NOT NULL DEFAULT 1.0
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Stove (
                stoveId SERIAL PRIMARY KEY,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                currentOwnerId INTEGER NOT NULL REFERENCES Player(playerId),
                mintedAt TEXT NOT NULL,
                heatLevel REAL NOT NULL DEFAULT 0.0
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
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('free', 'purchase', 'reward', 'shop', 'daily_reward'))
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
                stoveId INTEGER REFERENCES Stove(stoveId),
                lootboxId INTEGER REFERENCES Lootbox(lootboxId),
                price INTEGER NOT NULL CHECK (price >= 1),
                listedAt TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'sold')),
                CHECK ((stoveId IS NOT NULL) OR (lootboxId IS NOT NULL))
            )
        `);

        // Migration: add lootboxId column to existing Listing tables
        await connection.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'listing' AND column_name = 'lootboxid'
                ) THEN
                    ALTER TABLE Listing ADD COLUMN lootboxId INTEGER REFERENCES Lootbox(lootboxId);
                    ALTER TABLE Listing DROP CONSTRAINT IF EXISTS listing_check;
                    ALTER TABLE Listing ADD CONSTRAINT listing_check CHECK ((stoveId IS NOT NULL) OR (lootboxId IS NOT NULL));
                END IF;
            END $$;
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
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('lootbox', 'trade', 'mini-game', 'shop', 'craft'))
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
                type TEXT NOT NULL CHECK (type IN ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust', 'daily_reward', 'shop_purchase', 'shop_sale', 'forgery')),
                description TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // Migrate existing tables to add new constraint values
        try {
            await connection.query(`
                ALTER TABLE Lootbox
                DROP CONSTRAINT IF EXISTS lootbox_acquiredhow_check,
                ADD CONSTRAINT lootbox_acquiredhow_check
                CHECK (acquiredHow IN ('free', 'purchase', 'reward', 'shop', 'daily_reward'))
            `);
        } catch {
            // Constraint may already be correct or table doesn't exist yet
        }
        try {
            await connection.query(`
                ALTER TABLE Ownership
                DROP CONSTRAINT IF EXISTS ownership_acquiredhow_check,
                ADD CONSTRAINT ownership_acquiredhow_check
                CHECK (acquiredHow IN ('lootbox', 'trade', 'mini-game', 'shop', 'craft'))
            `);
        } catch {
            // Constraint may already be correct or table doesn't exist yet
        }
        try {
            await connection.query(`
                ALTER TABLE CoinTransaction
                DROP CONSTRAINT IF EXISTS cointransaction_type_check,
                ADD CONSTRAINT cointransaction_type_check
                CHECK (type IN ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust', 'daily_reward', 'shop_purchase', 'shop_sale', 'forgery'))
            `);
        } catch {
            // Constraint may already be correct or table doesn't exist yet
        }
        try {
            await connection.query(`
                ALTER TABLE StoveType
                ADD COLUMN IF NOT EXISTS collection TEXT NOT NULL DEFAULT 'Industrial',
                ADD COLUMN IF NOT EXISTS minHeat REAL NOT NULL DEFAULT 0.0,
                ADD COLUMN IF NOT EXISTS maxHeat REAL NOT NULL DEFAULT 1.0
            `);
        } catch {
            // Columns may already exist
        }
        try {
            await connection.query(`
                ALTER TABLE Stove
                ADD COLUMN IF NOT EXISTS heatLevel REAL NOT NULL DEFAULT 0.0
            `);
        } catch {
            // Column may already exist
        }
        // Randomize heatLevel for existing stoves that still have the default 0.0
        try {
            const stovesToUpdate = await connection.query<
                { stoveId: number; minHeat: number; maxHeat: number }
            >(`
                SELECT s.stoveId, st.minHeat, st.maxHeat
                FROM Stove s
                JOIN StoveType st ON s.typeId = st.typeId
                WHERE s.heatLevel = 0.0
            `);
            for (const row of stovesToUpdate.rows) {
                const min = row.minHeat ?? 0.0;
                const max = row.maxHeat ?? 1.0;
                const randomizedHeat = min + Math.random() * (max - min);
                await connection.query(
                    `UPDATE Stove SET heatLevel = $1 WHERE stoveId = $2`,
                    [randomizedHeat, row.stoveId]
                );
            }
        } catch {
            // Migration may have already run or no stoves to update
        }
        try {
            await connection.query(`
                ALTER TABLE PlayerStatistics
                ADD COLUMN IF NOT EXISTS totalStovesCrafted INTEGER NOT NULL DEFAULT 0
            `);
        } catch {
            // Column may already exist
        }

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

        // Migrate existing ChatMessage tables to add new columns
        try {
            await connection.query(`ALTER TABLE ChatMessage ADD COLUMN IF NOT EXISTS messageType TEXT NOT NULL DEFAULT 'text' CHECK (messageType IN ('text', 'trade_offer'))`);
        } catch {
            // Column may already exist
        }
        try {
            await connection.query(`ALTER TABLE ChatMessage ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'`);
        } catch {
            // Column may already exist
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Friend (
                friendId SERIAL PRIMARY KEY,
                requesterId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
                addresseeId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
                status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
                createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(requesterId, addresseeId)
            )
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_friend_addressee ON Friend(addresseeId, status)
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
                bestDropRarity TEXT CHECK (bestDropRarity IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret')),
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
                rarestStoveOwned TEXT CHECK (rarestStoveOwned IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret')),
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

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Game (
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
            )
        `);

        // Migration: add missing columns to existing Game table
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT ''`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS gameType TEXT DEFAULT ''`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS minPlayers INTEGER DEFAULT 2`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS maxPlayers INTEGER DEFAULT 6`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS ruleset TEXT DEFAULT ''`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT ''`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`);
        await connection.query(`ALTER TABLE Game ADD COLUMN IF NOT EXISTS isActive INTEGER DEFAULT 1`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Room (
                roomId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
                maxPlayers INTEGER NOT NULL CHECK (maxPlayers > 1),
                createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await connection.query(`
            ALTER TABLE Room ADD COLUMN IF NOT EXISTS gameType TEXT NOT NULL DEFAULT 'unknown'
        `);
        await connection.query(`
            ALTER TABLE Room ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'
        `);
        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_room_gametype ON Room(gameType)
        `);
        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_room_status ON Room(status)
        `);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS RoomPlayer (
                roomPlayerId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                roomId UUID NOT NULL REFERENCES Room(roomId) ON DELETE CASCADE,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                connectionState TEXT NOT NULL DEFAULT 'connected' CHECK (connectionState IN ('connected', 'disconnected', 'away')),
                seatIndex INTEGER NOT NULL,
                disconnectedAt TIMESTAMPTZ,
                UNIQUE(roomId, seatIndex)
            )
        `);
        await connection.query(`
            ALTER TABLE RoomPlayer ADD COLUMN IF NOT EXISTS disconnectedAt TIMESTAMPTZ
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GameState (
                roomId UUID PRIMARY KEY REFERENCES Room(roomId),
                stateBlob JSONB NOT NULL,
                version INTEGER NOT NULL DEFAULT 0,
                updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS EventLog (
                eventId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                roomId UUID NOT NULL REFERENCES Room(roomId),
                playerId INTEGER,
                type TEXT NOT NULL,
                payload JSONB NOT NULL,
                sequenceNumber INTEGER,
                clientTimestamp BIGINT,
                serverTimestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS SupportTicket (
                ticketId SERIAL PRIMARY KEY,
                reporterId INTEGER NOT NULL REFERENCES Player(playerId),
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'support')),
                priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
                createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                notifiedAt TIMESTAMPTZ
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerSettings (
                playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
                notifyFriendRequests INTEGER NOT NULL DEFAULT 1,
                notifyChatMessages INTEGER NOT NULL DEFAULT 1,
                notifyTradeOffers INTEGER NOT NULL DEFAULT 1,
                notifyDailyReward INTEGER NOT NULL DEFAULT 1
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS TwoFactorChallenge (
                challengeId TEXT PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                createdAt TEXT NOT NULL,
                expiresAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS TwoFactorBackupCode (
                codeId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                codeHash TEXT NOT NULL,
                usedAt TEXT
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ShopListing (
                listingId SERIAL PRIMARY KEY,
                itemType TEXT NOT NULL CHECK (itemType IN ('stove', 'lootbox')),
                itemId INTEGER NOT NULL,
                price INTEGER NOT NULL,
                stock INTEGER NOT NULL DEFAULT -1,
                rotationDate TEXT,
                isFeatured INTEGER NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ShopPurchase (
                purchaseId SERIAL PRIMARY KEY,
                listingId INTEGER NOT NULL REFERENCES ShopListing(listingId),
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                quantity INTEGER NOT NULL DEFAULT 1,
                purchasedAt TEXT NOT NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerDailyReward (
                playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
                lastClaimAt TEXT,
                streakCount INTEGER NOT NULL DEFAULT 0
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS Notification (
                notificationId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
                type TEXT NOT NULL CHECK (type IN ('friend_request', 'chat_message', 'trade_offer', 'daily_reward', 'system')),
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                isRead INTEGER NOT NULL DEFAULT 0,
                createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await connection.query(`
            CREATE INDEX IF NOT EXISTS idx_notification_player_unread ON Notification(playerId, isRead)
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerPrestige (
                playerId INTEGER PRIMARY KEY REFERENCES Player(playerId),
                totalXP INTEGER NOT NULL DEFAULT 0,
                currentLevel INTEGER NOT NULL DEFAULT 1,
                prestigeCount INTEGER NOT NULL DEFAULT 0,
                updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PrestigeLog (
                logId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                source TEXT NOT NULL,
                xpAmount INTEGER NOT NULL,
                description TEXT,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryShowcase (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                slotIndex INTEGER NOT NULL CHECK (slotIndex >= 0 AND slotIndex <= 5),
                stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
                pinnedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (playerId, slotIndex)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryFeaturedAchievement (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                achievementId TEXT NOT NULL,
                slotIndex INTEGER NOT NULL CHECK (slotIndex >= 0 AND slotIndex <= 5),
                PRIMARY KEY (playerId, achievementId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerAchievement (
                playerAchievementId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId) ON DELETE CASCADE,
                achievementId TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                target INTEGER NOT NULL DEFAULT 1,
                unlockedAt TIMESTAMPTZ,
                UNIQUE (playerId, achievementId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryTheme (
                themeId SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                cssClass TEXT NOT NULL,
                unlockCondition TEXT,
                unlockValue INTEGER,
                minLevel INTEGER NOT NULL DEFAULT 1
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerGloryTheme (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                themeId INTEGER NOT NULL REFERENCES GloryTheme(themeId),
                unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                isActive INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (playerId, themeId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryTitle (
                titleId TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                animation TEXT NOT NULL DEFAULT 'none',
                unlockCondition TEXT,
                unlockValue INTEGER,
                minLevel INTEGER NOT NULL DEFAULT 1
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerGloryTitle (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                titleId TEXT NOT NULL REFERENCES GloryTitle(titleId),
                unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                isActive INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (playerId, titleId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryBanner (
                bannerId SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                cssClass TEXT NOT NULL,
                unlockCondition TEXT,
                unlockValue INTEGER
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerGloryBanner (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                bannerId INTEGER NOT NULL REFERENCES GloryBanner(bannerId),
                unlockedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                isActive INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (playerId, bannerId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryVisit (
                visitorPlayerId INTEGER NOT NULL REFERENCES Player(playerId),
                visitedPlayerId INTEGER NOT NULL REFERENCES Player(playerId),
                visitedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (visitorPlayerId, visitedPlayerId, visitedAt)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryGuestbook (
                entryId SERIAL PRIMARY KEY,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                authorId INTEGER NOT NULL REFERENCES Player(playerId),
                message TEXT NOT NULL CHECK (LENGTH(message) <= 200),
                postedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS GloryTrophy (
                trophyId TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                iconUrl TEXT,
                season TEXT,
                eventName TEXT,
                rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited', 'secret'))
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS PlayerGloryTrophy (
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                trophyId TEXT NOT NULL REFERENCES GloryTrophy(trophyId),
                awardedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (playerId, trophyId)
            )
        `);

        // Add 2FA columns to Player if they don't exist (idempotent migration)
        await connection.query(`
            ALTER TABLE Player
            ADD COLUMN IF NOT EXISTS totpSecret TEXT,
            ADD COLUMN IF NOT EXISTS totpEnabled INTEGER NOT NULL DEFAULT 0
        `).catch(() => {});
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
        const id = result.rows[0]?.id ?? 0;
        return typeof id === "string" ? parseInt(id, 10) : id;
    }

    public async complete(commit: boolean | null = null): Promise<void> {
        if (this.completed) {
            return;
        }
        this.completed = true;

        try {
            if (this.inTransaction) {
                if (commit === true) {
                    await this.client.query("COMMIT");
                } else if (commit === false) {
                    await this.client.query("ROLLBACK");
                } else {
                    throw new Error("transaction has been opened, requires information if commit or rollback needed");
                }
            }
        } finally {
            this.client.release();
        }
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
        DROP TABLE IF EXISTS Game CASCADE;
        DROP TABLE IF EXISTS SupportTicket CASCADE;
        DROP TABLE IF EXISTS ShopPurchase CASCADE;
        DROP TABLE IF EXISTS ShopListing CASCADE;
        DROP TABLE IF EXISTS EventLog CASCADE;
        DROP TABLE IF EXISTS GameState CASCADE;
        DROP TABLE IF EXISTS RoomPlayer CASCADE;
        DROP TABLE IF EXISTS Room CASCADE;
        DROP TABLE IF EXISTS PlayerGloryTrophy CASCADE;
        DROP TABLE IF EXISTS GloryTrophy CASCADE;
        DROP TABLE IF EXISTS GloryGuestbook CASCADE;
        DROP TABLE IF EXISTS GloryVisit CASCADE;
        DROP TABLE IF EXISTS PlayerGloryBanner CASCADE;
        DROP TABLE IF EXISTS GloryBanner CASCADE;
        DROP TABLE IF EXISTS PlayerGloryTitle CASCADE;
        DROP TABLE IF EXISTS GloryTitle CASCADE;
        DROP TABLE IF EXISTS PlayerGloryTheme CASCADE;
        DROP TABLE IF EXISTS GloryTheme CASCADE;
        DROP TABLE IF EXISTS GloryFeaturedAchievement CASCADE;
        DROP TABLE IF EXISTS PlayerAchievement CASCADE;
        DROP TABLE IF EXISTS GloryShowcase CASCADE;
        DROP TABLE IF EXISTS PrestigeLog CASCADE;
        DROP TABLE IF EXISTS PlayerPrestige CASCADE;
        DROP TABLE IF EXISTS Game CASCADE;
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
            { name: "Standard Lootbox", description: "A standard lootbox with common to legendary items", costCoins: 0, costFree: 1, dailyLimit: null, isAvailable: 1 },
            { name: "Golden Lootbox", description: "Increased odds for rare and epic items", costCoins: 500, costFree: 0, dailyLimit: 100, isAvailable: 1 },
            { name: "Legendary Crate", description: "Guaranteed legendary or limited item", costCoins: 5000, costFree: 0, dailyLimit: 20, isAvailable: 1 },
            { name: "Dragon Crate", description: "Exclusively contains dragon stoves", costCoins: 2500, costFree: 0, dailyLimit: 5, isAvailable: 1 }
        ];
        
        for (const type of types) {
            const stmt = unit.prepare<
                unknown,
                { name: string; description: string; costCoins: number; costFree: number; dailyLimit: number | null; isAvailable: number }
            >(
                `insert into LootboxType (name, description, costCoins, costFree, dailyLimit, isAvailable) 
                 values (@name, @description, @costCoins, @costFree, @dailyLimit, @isAvailable)`,
                type
            );
            await stmt.run();
        }
        console.log("✅ LootboxTypes inserted");
    }

    async function insertPlayers(): Promise<void> {
        const players = [
            { username: "admin", password: "123admin", email: "admin@emberexchange.com", coins: 999999, lootboxCount: 100, isAdmin: 1 },
            { username: "player1", password: "pass123", email: "player1@example.com", coins: 5000, lootboxCount: 10, isAdmin: 0 },
            { username: "player2", password: "pass456", email: "player2@example.com", coins: 3500, lootboxCount: 10, isAdmin: 0 },
            { username: "trader_joe", password: "trade789", email: "trader@example.com", coins: 10000, lootboxCount: 10, isAdmin: 0 },
            { username: "collector", password: "collect000", email: "collector@example.com", coins: 2500, lootboxCount: 10, isAdmin: 0 }
        ];

        for (const player of players) {
            const hashedPassword = await hashPassword(player.password);
            const stmt = unit.prepare<
                unknown,
                { username: string; password: string; email: string; motto: string; coins: number; lootboxCount: number; isAdmin: number; joinedAt: string }
            >(
                `insert into Player (username, password, email, motto, coins, lootboxCount, isAdmin, joinedAt)
                 values (@username, @password, @email, @motto, @coins, @lootboxCount, @isAdmin, @joinedAt)`,
                { ...player, password: hashedPassword, motto: '', joinedAt: new Date().toISOString() }
            );
            await stmt.run();
        }
        console.log("✅ Players inserted");
    }

    async function insertPlayerSettings(): Promise<void> {
        const settings = [
            { playerId: 1, notifyFriendRequests: 1, notifyChatMessages: 1, notifyTradeOffers: 1, notifyDailyReward: 1 },
            { playerId: 2, notifyFriendRequests: 1, notifyChatMessages: 1, notifyTradeOffers: 1, notifyDailyReward: 1 },
            { playerId: 3, notifyFriendRequests: 1, notifyChatMessages: 1, notifyTradeOffers: 1, notifyDailyReward: 1 },
            { playerId: 4, notifyFriendRequests: 1, notifyChatMessages: 1, notifyTradeOffers: 1, notifyDailyReward: 1 },
            { playerId: 5, notifyFriendRequests: 1, notifyChatMessages: 1, notifyTradeOffers: 1, notifyDailyReward: 1 }
        ];
        for (const setting of settings) {
            const stmt = unit.prepare<
                unknown,
                { playerId: number; notifyFriendRequests: number; notifyChatMessages: number; notifyTradeOffers: number; notifyDailyReward: number }
            >(
                `insert into PlayerSettings (playerId, notifyFriendRequests, notifyChatMessages, notifyTradeOffers, notifyDailyReward)
                 values (@playerId, @notifyFriendRequests, @notifyChatMessages, @notifyTradeOffers, @notifyDailyReward)`,
                setting
            );
            await stmt.run();
        }
        console.log("✅ PlayerSettings inserted");
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
            { name: "Galactic Dragon Stove", imageUrl: "/assets/stove_sprites/secret/galactic-dragon-stove.png", rarity: "secret", lootboxWeight: 1, collection: "Dragon", minHeat: 0.0, maxHeat: 0.20 },
            { name: "Magic Stove", imageUrl: "/assets/stove_sprites/legendary/magic-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Special", minHeat: 0.0, maxHeat: 0.50 },
            { name: "Pinaple Stove", imageUrl: "/assets/stove_sprites/epic/pinaple-stove.png", rarity: "epic", lootboxWeight: 15, collection: "Special", minHeat: 0.0, maxHeat: 0.70 },
            { name: "Red Dragon Stove", imageUrl: "/assets/stove_sprites/legendary/red-dragon-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Dragon", minHeat: 0.0, maxHeat: 0.50 },
            { name: "Upgraded Forest Stove", imageUrl: "/assets/stove_sprites/legendary/upgraded-forest-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Nature", minHeat: 0.0, maxHeat: 0.55 },
            { name: "Upgraded Steampunk Stove", imageUrl: "/assets/stove_sprites/legendary/upgraded-steampunk-stove.png", rarity: "legendary", lootboxWeight: 5, collection: "Industrial", minHeat: 0.0, maxHeat: 0.55 },
            { name: "White Blue Stove", imageUrl: "/assets/stove_sprites/rare/white-blue-stove.png", rarity: "rare", lootboxWeight: 40, collection: "Nature", minHeat: 0.0, maxHeat: 0.80 },
            { name: "White Dragon Stove", imageUrl: "/assets/stove_sprites/epic/white-dragon-stove.png", rarity: "epic", lootboxWeight: 15, collection: "Dragon", minHeat: 0.0, maxHeat: 0.70 }
        ];
        
        for (const stove of stoves) {
            const stmt = unit.prepare<
                unknown,
                { name: string; imageUrl: string; rarity: string; lootboxWeight: number; collection: string; minHeat: number; maxHeat: number }
            >(
                `insert into StoveType (name, imageUrl, rarity, lootboxWeight, collection, minHeat, maxHeat) 
                 values (@name, @imageUrl, @rarity, @lootboxWeight, @collection, @minHeat, @maxHeat)`,
                stove
            );
            await stmt.run();
        }
        console.log("✅ StoveTypes inserted");
    }

    async function insertStoves(): Promise<void> {
        const stoves = [
            { typeId: 1, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 5).toISOString(), heatLevel: 0.35 },
            { typeId: 2, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 3).toISOString(), heatLevel: 0.12 },
            { typeId: 3, currentOwnerId: 2, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString(), heatLevel: 0.42 },
            { typeId: 4, currentOwnerId: 3, mintedAt: new Date(Date.now() - 86400000 * 2).toISOString(), heatLevel: 0.28 },
            { typeId: 5, currentOwnerId: 4, mintedAt: new Date(Date.now() - 86400000 * 1).toISOString(), heatLevel: 0.15 },
            { typeId: 7, currentOwnerId: 5, mintedAt: new Date().toISOString(), heatLevel: 0.08 }
        ];
        
        for (const stove of stoves) {
            const stmt = unit.prepare<
                unknown,
                { typeId: number; currentOwnerId: number; mintedAt: string; heatLevel: number }
            >(
                `insert into Stove (typeId, currentOwnerId, mintedAt, heatLevel) 
                 values (@typeId, @currentOwnerId, @mintedAt, @heatLevel)`,
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

    async function insertGloryCatalogs(): Promise<void> {
        // Themes
        const themes = [
            { name: 'Ember', cssClass: 'theme-ember', unlockCondition: null, unlockValue: null, minLevel: 1 },
            { name: 'Midnight', cssClass: 'theme-midnight', unlockCondition: 'level', unlockValue: 10, minLevel: 10 },
            { name: 'Gold Hoarder', cssClass: 'theme-gold', unlockCondition: 'net_worth', unlockValue: 100000, minLevel: 25 },
            { name: 'Forest', cssClass: 'theme-forest', unlockCondition: 'own_stove', unlockValue: null, minLevel: 15 },
            { name: 'Cyber', cssClass: 'theme-cyber', unlockCondition: 'level', unlockValue: 50, minLevel: 50 },
            { name: 'Crimson', cssClass: 'theme-crimson', unlockCondition: 'trades', unlockValue: 25, minLevel: 5 },
            { name: 'Ocean', cssClass: 'theme-ocean', unlockCondition: 'lootboxes', unlockValue: 100, minLevel: 8 },
            { name: 'Void', cssClass: 'theme-void', unlockCondition: 'level', unlockValue: 75, minLevel: 75 },
        ];
        for (const t of themes) {
            await unit.prepare(
                `INSERT INTO GloryTheme (name, cssClass, unlockCondition, unlockValue, minLevel)
                 VALUES (@name, @cssClass, @unlockCondition, @unlockValue, @minLevel)
                 ON CONFLICT DO NOTHING`,
                t
            ).run();
        }

        // Titles
        const titles = [
            { titleId: 'novice', label: 'Novice', animation: 'none', unlockCondition: null, unlockValue: null, minLevel: 1 },
            { titleId: 'trader', label: 'Trader', animation: 'shimmer', unlockCondition: 'trades', unlockValue: 1, minLevel: 1 },
            { titleId: 'collector', label: 'Collector', animation: 'pulse', unlockCondition: 'stoves', unlockValue: 10, minLevel: 5 },
            { titleId: 'high_roller', label: 'High Roller', animation: 'glow', unlockCondition: 'luckiest_win', unlockValue: 10000, minLevel: 10 },
            { titleId: 'market_shark', label: 'Market Shark', animation: 'shimmer', unlockCondition: 'sales_revenue', unlockValue: 50000, minLevel: 15 },
            { titleId: 'legend', label: 'Legend', animation: 'rainbow', unlockCondition: 'level', unlockValue: 100, minLevel: 100 },
            { titleId: 'gambler', label: 'Gambler', animation: 'pulse', unlockCondition: 'games_played', unlockValue: 50, minLevel: 8 },
            { titleId: 'tycoon', label: 'Tycoon', animation: 'shimmer', unlockCondition: 'net_worth', unlockValue: 500000, minLevel: 30 },
            { titleId: 'prestige', label: 'Prestigious', animation: 'rainbow', unlockCondition: 'prestige', unlockValue: 1, minLevel: 1 },
            { titleId: 'veteran', label: 'Veteran', animation: 'glow', unlockCondition: 'level', unlockValue: 25, minLevel: 25 },
        ];
        for (const t of titles) {
            await unit.prepare(
                `INSERT INTO GloryTitle (titleId, label, animation, unlockCondition, unlockValue, minLevel)
                 VALUES (@titleId, @label, @animation, @unlockCondition, @unlockValue, @minLevel)
                 ON CONFLICT DO NOTHING`,
                t
            ).run();
        }

        // Banners
        const banners = [
            { name: 'Default', cssClass: 'banner-default', unlockCondition: null, unlockValue: null },
            { name: 'Particles', cssClass: 'banner-particles', unlockCondition: 'level', unlockValue: 20 },
            { name: 'Golden', cssClass: 'banner-golden', unlockCondition: 'net_worth', unlockValue: 50000 },
            { name: 'Seasonal', cssClass: 'banner-seasonal', unlockCondition: 'level', unlockValue: 40 },
            { name: 'Flames', cssClass: 'banner-flames', unlockCondition: 'trades', unlockValue: 10 },
            { name: 'Royal', cssClass: 'banner-royal', unlockCondition: 'level', unlockValue: 60 },
            { name: 'Neon', cssClass: 'banner-neon', unlockCondition: 'games_played', unlockValue: 25 },
        ];
        for (const b of banners) {
            await unit.prepare(
                `INSERT INTO GloryBanner (name, cssClass, unlockCondition, unlockValue)
                 VALUES (@name, @cssClass, @unlockCondition, @unlockValue)
                 ON CONFLICT DO NOTHING`,
                b
            ).run();
        }

        // Trophies
        const trophies = [
            { trophyId: 'beta_tester', name: 'Beta Tester', description: 'Played during the beta period', iconUrl: '', season: 'Beta', eventName: 'Beta Launch', rarity: 'limited' },
            { trophyId: 'first_trade', name: 'First Trade', description: 'Completed your first marketplace trade', iconUrl: '', season: null, eventName: null, rarity: 'common' },
            { trophyId: 'sprint_champion', name: 'Sprint Champion', description: 'Won a seasonal tournament', iconUrl: '', season: 'S1', eventName: 'Spring Tournament', rarity: 'legendary' },
            { trophyId: 'centurion', name: 'Centurion', description: 'Opened 100 lootboxes', iconUrl: '', season: null, eventName: null, rarity: 'rare' },
            { trophyId: 'millionaire', name: 'Millionaire', description: 'Reached 1,000,000 net worth', iconUrl: '', season: null, eventName: null, rarity: 'epic' },
        ];
        for (const t of trophies) {
            await unit.prepare(
                `INSERT INTO GloryTrophy (trophyId, name, description, iconUrl, season, eventName, rarity)
                 VALUES (@trophyId, @name, @description, @iconUrl, @season, @eventName, @rarity)
                 ON CONFLICT DO NOTHING`,
                t
            ).run();
        }

        console.log("✅ Glory catalogs inserted");
    }

    async function insertPlayerPrestigeAndDefaults(): Promise<void> {
        const now = new Date().toISOString();
        // Initialize PlayerPrestige for all existing players
        const playersStmt = unit.prepare<{ playerId: number }>(`SELECT playerId FROM Player WHERE username != '__shop__'`);
        const players = await playersStmt.all();
        for (const p of players) {
            await unit.prepare(
                `INSERT INTO PlayerPrestige (playerId, totalXP, currentLevel, prestigeCount, updatedAt)
                 VALUES (@playerId, 0, 1, 0, @updatedAt)
                 ON CONFLICT DO NOTHING`,
                { playerId: p.playerId, updatedAt: now }
            ).run();

            // Unlock default theme, title, banner for each player
            await unit.prepare(
                `INSERT INTO PlayerGloryTheme (playerId, themeId, unlockedAt, isActive)
                 SELECT @playerId, themeId, @updatedAt, CASE WHEN themeId = 1 THEN 1 ELSE 0 END
                 FROM GloryTheme WHERE name = 'Ember'
                 ON CONFLICT DO NOTHING`,
                { playerId: p.playerId, updatedAt: now }
            ).run();

            await unit.prepare(
                `INSERT INTO PlayerGloryTitle (playerId, titleId, unlockedAt, isActive)
                 SELECT @playerId, titleId, @updatedAt, CASE WHEN titleId = 'novice' THEN 1 ELSE 0 END
                 FROM GloryTitle WHERE titleId = 'novice'
                 ON CONFLICT DO NOTHING`,
                { playerId: p.playerId, updatedAt: now }
            ).run();

            await unit.prepare(
                `INSERT INTO PlayerGloryBanner (playerId, bannerId, unlockedAt, isActive)
                 SELECT @playerId, bannerId, @updatedAt, CASE WHEN bannerId = 1 THEN 1 ELSE 0 END
                 FROM GloryBanner WHERE name = 'Default'
                 ON CONFLICT DO NOTHING`,
                { playerId: p.playerId, updatedAt: now }
            ).run();
        }
        console.log("✅ PlayerPrestige and default cosmetics inserted");
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

    async function insertGames(): Promise<void> {
        const games = [
            { name: "Poker", slug: "poker", gameType: "poker", minPlayers: 2, maxPlayers: 6, ruleset: "No-Limit Texas Hold'em", description: "Classic Texas Hold'em poker with no betting limits.", genre: "card", tags: JSON.stringify(["poker", "cards", "multiplayer"]), isActive: 1 },
            { name: "Blackjack", slug: "blackjack", gameType: "blackjack", minPlayers: 1, maxPlayers: 5, ruleset: "Standard American casino blackjack", description: "Standard American casino blackjack.", genre: "card", tags: JSON.stringify(["blackjack", "cards", "casino"]), isActive: 1 }
        ];
        for (const game of games) {
            const stmt = unit.prepare<unknown, { name: string; slug: string; gameType: string; minPlayers: number; maxPlayers: number; ruleset: string; description: string; genre: string; tags: string; isActive: number }>(
                `insert into Game (name, slug, gameType, minPlayers, maxPlayers, ruleset, description, genre, tags, isActive)
                 values (@name, @slug, @gameType, @minPlayers, @maxPlayers, @ruleset, @description, @genre, @tags, @isActive)
                 ON CONFLICT (gameType) DO NOTHING`,
                game
            );
            await stmt.run();
        }
        console.log("✅ Games inserted");
    }

    async function insertShopListings(): Promise<void> {
        const listings = [
            { itemType: "stove", itemId: 1, price: 500, stock: 10, rotationDate: null, isFeatured: 1 },
            { itemType: "stove", itemId: 2, price: 800, stock: 5, rotationDate: null, isFeatured: 0 },
            { itemType: "lootbox", itemId: 1, price: 300, stock: -1, rotationDate: null, isFeatured: 0 },
            { itemType: "lootbox", itemId: 2, price: 600, stock: 20, rotationDate: null, isFeatured: 1 },
            { itemType: "lootbox", itemId: 4, price: 2500, stock: 10, rotationDate: null, isFeatured: 0 }
        ];
        for (const listing of listings) {
            const stmt = unit.prepare<unknown, { itemType: string; itemId: number; price: number; stock: number; rotationDate: string | null; isFeatured: number; createdAt: string }>(
                `INSERT INTO ShopListing (itemType, itemId, price, stock, rotationDate, isFeatured, createdAt)
                 VALUES (@itemType, @itemId, @price, @stock, @rotationDate, @isFeatured, @createdAt)`,
                { ...listing, createdAt: new Date().toISOString() }
            );
            await stmt.run();
        }
        console.log("✅ Shop listings inserted");
    }

    if (!(await alreadyPresent())) {
        await insertGames();
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
        await insertGloryCatalogs();
        await insertPlayerPrestigeAndDefaults();
        await insertPlayerStatistics();
        await insertDailyStatistics();
        await insertStoveTypeStatistics();
        await insertShopListings();
        return "inserted";
    }

    // Always ensure shop listings exist (independent of player sample data)
    const shopCheck = unit.prepare<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ShopListing`);
    const shopResult = await shopCheck.get();
    const shopCount = typeof shopResult?.cnt === 'string' ? parseInt(shopResult.cnt, 10) : (shopResult?.cnt ?? 0);
    if (shopCount === 0) {
        await insertShopListings();
    }

    // Always ensure glory catalogs exist
    const themeCheck = unit.prepare<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM GloryTheme`);
    const themeResult = await themeCheck.get();
    const themeCount = typeof themeResult?.cnt === 'string' ? parseInt(themeResult.cnt, 10) : (themeResult?.cnt ?? 0);
    if (themeCount === 0) {
        await insertGloryCatalogs();
    }

    // Always ensure PlayerPrestige and default cosmetics exist for all players
    const prestigeCheck = unit.prepare<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM PlayerPrestige`);
    const prestigeResult = await prestigeCheck.get();
    const prestigeCount = typeof prestigeResult?.cnt === 'string' ? parseInt(prestigeResult.cnt, 10) : (prestigeResult?.cnt ?? 0);
    if (prestigeCount === 0) {
        await insertPlayerPrestigeAndDefaults();
    }

    // Ensure shop NPC exists for item buyback
    try {
        const npcCheck = unit.prepare<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM Player WHERE username = '__shop__'`);
        const npcResult = await npcCheck.get();
        const npcCount = typeof npcResult?.cnt === 'string' ? parseInt(npcResult.cnt, 10) : (npcResult?.cnt ?? 0);
        if (npcCount === 0) {
            await unit.prepare(
                `INSERT INTO Player (username, password, email, motto, coins, lootboxCount, isAdmin, joinedAt)
                 VALUES ('__shop__', '', 'shop@emberexchange.com', 'The shop', 0, 0, 0, @joinedAt)`,
                { joinedAt: new Date().toISOString() }
            ).run();
        }
    } catch {
        // Ignore errors if Player table doesn't exist yet
    }

    return "skipped";
}
