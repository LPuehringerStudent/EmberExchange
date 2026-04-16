import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-player-statistics.db');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
    } catch (e) {
        // Ignore errors
    }
}

process.env.TEST_DB_PATH = dbPath;

import { app } from '../../backend/app';
import request from 'supertest';
import Database from 'better-sqlite3';

describe('Player Statistics API Endpoints', () => {
    beforeAll(() => {
        const db = new Database(dbPath, { fileMustExist: false });
        db.pragma('foreign_keys = ON');

        // Create all tables required by PlayerStatisticsService on-demand calculations
        db.exec(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT,
                email TEXT NOT NULL UNIQUE,
                coins INTEGER NOT NULL DEFAULT 0,
                lootboxCount INTEGER NOT NULL DEFAULT 0,
                isAdmin INTEGER NOT NULL DEFAULT 0,
                joinedAt TEXT NOT NULL,
                provider TEXT,
                providerId TEXT
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS StoveType (
                typeId INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                imageUrl TEXT NOT NULL,
                rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited')),
                lootboxWeight INTEGER NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS Stove (
                stoveId INTEGER PRIMARY KEY AUTOINCREMENT,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                currentOwnerId INTEGER NOT NULL REFERENCES Player(playerId),
                mintedAt TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS LootboxType (
                lootboxTypeId INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                costCoins INTEGER NOT NULL DEFAULT 0,
                costFree INTEGER NOT NULL DEFAULT 1,
                dailyLimit INTEGER,
                isAvailable INTEGER NOT NULL DEFAULT 1
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS Lootbox (
                lootboxId INTEGER PRIMARY KEY AUTOINCREMENT,
                lootboxTypeId INTEGER NOT NULL REFERENCES LootboxType(lootboxTypeId),
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                openedAt TEXT NOT NULL,
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('free', 'purchase', 'reward'))
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS LootboxDrop (
                dropId INTEGER PRIMARY KEY AUTOINCREMENT,
                lootboxId INTEGER NOT NULL UNIQUE REFERENCES Lootbox(lootboxId),
                stoveId INTEGER NOT NULL UNIQUE REFERENCES Stove(stoveId)
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS Listing (
                listingId INTEGER PRIMARY KEY AUTOINCREMENT,
                sellerId INTEGER NOT NULL REFERENCES Player(playerId),
                stoveId INTEGER NOT NULL REFERENCES Stove(stoveId),
                price INTEGER NOT NULL CHECK (price >= 1),
                listedAt TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'sold'))
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS Trade (
                tradeId INTEGER PRIMARY KEY AUTOINCREMENT,
                listingId INTEGER NOT NULL UNIQUE REFERENCES Listing(listingId),
                buyerId INTEGER NOT NULL REFERENCES Player(playerId),
                executedAt TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS MiniGameSession (
                sessionId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                gameType TEXT NOT NULL,
                result TEXT NOT NULL,
                coinPayout INTEGER NOT NULL DEFAULT 0,
                finishedAt TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS PriceHistory (
                historyId INTEGER PRIMARY KEY AUTOINCREMENT,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                salePrice INTEGER NOT NULL,
                saleDate TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS LoginHistory (
                loginHistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                sessionId TEXT,
                loggedInAt TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS CoinTransaction (
                transactionId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                amount INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust')),
                description TEXT,
                createdAt TEXT NOT NULL
            ) STRICT
        `);

        // Seed players
        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'richplayer',    'password123', 'rich@test.com',    9000, 5, 0, datetime('now')),
            (2, 'activeplayer',  'password123', 'active@test.com',  4000, 2, 0, datetime('now')),
            (3, 'newplayer',     'password123', 'new@test.com',     100,  0, 0, datetime('now'))
        `);

        // Seed stove types
        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES
            (1, 'Common Stove', '/img/common.png', 'common', 100)
        `);

        // Seed stoves
        // stove 1: owned by player 3 (bought from player 2)
        // stove 2: owned by player 1 (listed, not sold)
        // stove 3: owned by player 2 (bought from player 3)
        db.exec(`
            INSERT INTO Stove (stoveId, typeId, currentOwnerId, mintedAt) VALUES
            (1, 1, 3, datetime('now')),
            (2, 1, 1, datetime('now')),
            (3, 1, 2, datetime('now'))
        `);

        // Seed lootbox types
        db.exec(`
            INSERT INTO LootboxType (lootboxTypeId, name, description, costCoins, costFree, dailyLimit, isAvailable) VALUES
            (1, 'Standard Box', 'A standard lootbox', 500, 0, NULL, 1)
        `);

        // Seed lootboxes
        db.exec(`
            INSERT INTO Lootbox (lootboxId, lootboxTypeId, playerId, openedAt, acquiredHow) VALUES
            (1, 1, 1, datetime('now'), 'free'),
            (2, 1, 1, datetime('now'), 'purchase'),
            (3, 1, 2, datetime('now'), 'free')
        `);

        // Seed lootbox drops (connect lootboxes to stoves they originally dropped)
        db.exec(`
            INSERT INTO LootboxDrop (dropId, lootboxId, stoveId) VALUES
            (1, 1, 1),
            (2, 2, 2),
            (3, 3, 3)
        `);

        // Seed listings
        // listing 1: player2 sold stove1 to player3
        // listing 2: player1 listed stove2 (active)
        // listing 3: player3 sold stove3 to player2
        db.exec(`
            INSERT INTO Listing (listingId, sellerId, stoveId, price, listedAt, status) VALUES
            (1, 2, 1, 2500, datetime('now'), 'sold'),
            (2, 1, 2, 1500, datetime('now'), 'active'),
            (3, 3, 3, 1000, datetime('now'), 'sold')
        `);

        // Seed trades
        db.exec(`
            INSERT INTO Trade (tradeId, listingId, buyerId, executedAt) VALUES
            (1, 1, 3, datetime('now')),
            (2, 3, 2, datetime('now'))
        `);

        // Seed mini-game sessions
        db.exec(`
            INSERT INTO MiniGameSession (sessionId, playerId, gameType, result, coinPayout, finishedAt) VALUES
            (1, 1, 'Coin Flip', 'win', 100, datetime('now')),
            (2, 2, 'Slots', 'jackpot', 500, datetime('now'))
        `);

        // Seed price history (used for stove value calculation)
        db.exec(`
            INSERT INTO PriceHistory (historyId, typeId, salePrice, saleDate) VALUES
            (1, 1, 500, datetime('now'))
        `);

        // Seed login history
        db.exec(`
            INSERT INTO LoginHistory (loginHistoryId, playerId, sessionId, loggedInAt) VALUES
            (1, 1, 'sess-a', datetime('now')),
            (2, 1, 'sess-b', datetime('now')),
            (3, 2, 'sess-c', datetime('now'))
        `);

        // Seed coin transactions
        db.exec(`
            INSERT INTO CoinTransaction (transactionId, playerId, amount, type, description, createdAt) VALUES
            (1, 1, 500, 'trade_in', 'Deposit', datetime('now')),
            (2, 2, -300, 'trade_out', 'Withdrawal', datetime('now'))
        `);

        db.close();
    });

    afterAll(() => {
        try {
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        delete process.env.TEST_DB_PATH;
    });

    // -------------------------------------------------------------------------
    // GET /api/player-statistics
    // -------------------------------------------------------------------------
    describe('GET /api/player-statistics', () => {
        it('should return all player statistics', async () => {
            const response = await request(app)
                .get('/api/player-statistics')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2);
            expect(response.body[0]).toHaveProperty('statId');
            expect(response.body[0]).toHaveProperty('playerId');
            expect(response.body[0]).toHaveProperty('netWorthEstimate');
            expect(response.body[0]).toHaveProperty('marketActivityScore');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/player-statistics/leaderboard/activity
    // -------------------------------------------------------------------------
    describe('GET /api/player-statistics/leaderboard/activity', () => {
        it('should return top players by activity with default limit', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/activity')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
            // Should be ordered highest activity first
            if (response.body.length >= 2) {
                expect(response.body[0].marketActivityScore).toBeGreaterThanOrEqual(
                    response.body[1].marketActivityScore
                );
            }
        });

        it('should respect the limit query parameter', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/activity?limit=1')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(1);
        });

        it('should return top 5 when limit=5 is specified', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/activity?limit=5')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/player-statistics/leaderboard/wealth
    // -------------------------------------------------------------------------
    describe('GET /api/player-statistics/leaderboard/wealth', () => {
        it('should return top players by net worth with default limit', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/wealth')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
            if (response.body.length >= 2) {
                expect(response.body[0].netWorthEstimate).toBeGreaterThanOrEqual(
                    response.body[1].netWorthEstimate
                );
            }
        });

        it('should respect the limit query parameter', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/wealth?limit=1')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(1);
        });

        it('should return top 5 when limit=5 is specified', async () => {
            const response = await request(app)
                .get('/api/player-statistics/leaderboard/wealth?limit=5')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/players/:playerId/statistics
    // -------------------------------------------------------------------------
    describe('GET /api/players/:playerId/statistics', () => {
        it('should return statistics for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/2/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('playerId', 2);
            expect(response.body).toHaveProperty('statId');
            // Activity score: 1 listing created (10) + 1 sold (20) + 1 purchase (15) = 45
            expect(response.body).toHaveProperty('marketActivityScore', 45);
        });

        it('should return 404 for a non-existent player', async () => {
            const response = await request(app)
                .get('/api/players/99999/statistics')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/statistics')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/players/:playerId/statistics
    // -------------------------------------------------------------------------
    describe('POST /api/players/:playerId/statistics', () => {
        it('should return 201 for any valid player (statistics are calculated on-demand)', async () => {
            const response = await request(app)
                .post('/api/players/3/statistics')
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('playerId', 3);
            expect(typeof response.body.statId).toBe('number');
        });

        it('should also return 201 when called for a player that already has calculated statistics', async () => {
            // Player 1 already has stats from seed data; endpoint is idempotent
            const response = await request(app)
                .post('/api/players/1/statistics')
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('playerId', 1);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .post('/api/players/invalid/statistics')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/players/:playerId/statistics
    // -------------------------------------------------------------------------
    describe('DELETE /api/players/:playerId/statistics', () => {
        it('should return 200 for any valid player (delete is a no-op with on-demand stats)', async () => {
            const response = await request(app)
                .delete('/api/players/2/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should also return 200 for a player with no stored statistics', async () => {
            const response = await request(app)
                .delete('/api/players/99999/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .delete('/api/players/invalid/statistics')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});
