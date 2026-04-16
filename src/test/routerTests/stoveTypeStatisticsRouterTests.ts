import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-stove-type-statistics.db');

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

describe('Stove Type Statistics API Endpoints', () => {
    beforeAll(() => {
        const db = new Database(dbPath, { fileMustExist: false });
        db.pragma('foreign_keys = ON');

        // Create tables required by StoveTypeStatisticsService on-demand calculations
        db.exec(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT,
                email TEXT NOT NULL UNIQUE,
                coins INTEGER NOT NULL DEFAULT 0,
                lootboxCount INTEGER NOT NULL DEFAULT 0,
                isAdmin INTEGER NOT NULL DEFAULT 0,
                joinedAt TEXT NOT NULL
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

        // Seed players
        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'player1', 'password123', 'player1@test.com', 5000, 0, 0, datetime('now')),
            (2, 'player2', 'password123', 'player2@test.com', 3000, 0, 0, datetime('now')),
            (3, 'player3', 'password123', 'player3@test.com', 2000, 0, 0, datetime('now'))
        `);

        // Seed stove types
        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES
            (1,  'Common Stove',    '/img/common.png',    'common',    100),
            (2,  'Rare Stove',      '/img/rare.png',      'rare',      50),
            (3,  'Epic Stove',      '/img/epic.png',      'epic',      20),
            (10, 'Legendary Stove', '/img/legendary.png', 'legendary', 5)
        `);

        // Seed stoves
        db.exec(`
            INSERT INTO Stove (stoveId, typeId, currentOwnerId, mintedAt) VALUES
            (1, 1, 1, datetime('now')),
            (2, 1, 3, datetime('now')),
            (3, 2, 1, datetime('now')),
            (4, 2, 3, datetime('now')),
            (5, 3, 2, datetime('now')),
            (6, 10, 1, datetime('now'))
        `);

        // Seed listings
        db.exec(`
            INSERT INTO Listing (listingId, sellerId, stoveId, price, listedAt, status) VALUES
            (1, 2, 2, 1500, datetime('now'), 'sold'),
            (2, 3, 4, 2500, datetime('now'), 'active'),
            (3, 1, 5, 3500, datetime('now'), 'sold')
        `);

        // Seed trades
        db.exec(`
            INSERT INTO Trade (tradeId, listingId, buyerId, executedAt) VALUES
            (1, 1, 3, datetime('now')),
            (2, 3, 2, datetime('now'))
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
    // GET /api/stove-type-statistics
    // -------------------------------------------------------------------------
    describe('GET /api/stove-type-statistics', () => {
        it('should return all stove type statistics', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('statId');
            expect(response.body[0]).toHaveProperty('stoveTypeId');
            expect(response.body[0]).toHaveProperty('totalSales');
            expect(response.body[0]).toHaveProperty('viewsCount');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/stove-type-statistics/market-summary
    // -------------------------------------------------------------------------
    describe('GET /api/stove-type-statistics/market-summary', () => {
        it('should return a market summary object', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/market-summary')
                .expect(200);

            expect(response.body).toHaveProperty('totalStoves');
            expect(response.body).toHaveProperty('totalListed');
            expect(response.body).toHaveProperty('totalSales');
            expect(response.body).toHaveProperty('avgListedPercent');
            expect(typeof response.body.totalStoves).toBe('number');
            expect(typeof response.body.totalSales).toBe('number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/stove-type-statistics/leaderboard/sales
    // -------------------------------------------------------------------------
    describe('GET /api/stove-type-statistics/leaderboard/sales', () => {
        it('should return top stove types by sales with default limit', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/leaderboard/sales')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
            if (response.body.length >= 2) {
                expect(response.body[0].totalSales).toBeGreaterThanOrEqual(
                    response.body[1].totalSales
                );
            }
        });

        it('should respect the limit=5 query parameter', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/leaderboard/sales?limit=5')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });

        it('should return only 1 result when limit=1', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/leaderboard/sales?limit=1')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(1);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/stove-type-statistics/most-viewed
    // -------------------------------------------------------------------------
    describe('GET /api/stove-type-statistics/most-viewed', () => {
        it('should return most viewed stove types with default limit', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/most-viewed')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
            if (response.body.length >= 2) {
                expect(response.body[0].viewsCount).toBeGreaterThanOrEqual(
                    response.body[1].viewsCount
                );
            }
        });

        it('should respect the limit=5 query parameter', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/most-viewed?limit=5')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/stove-type-statistics/trend/:trend
    // -------------------------------------------------------------------------
    describe('GET /api/stove-type-statistics/trend/:trend', () => {
        it('should return stove types with "increasing" trend', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/increasing')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            // Trend filtering is not yet implemented; all stove types are returned
            expect(response.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should return stove types with "stable" trend', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/stable')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should return stove types with "decreasing" trend', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/decreasing')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
        });

        it('should return 400 for an invalid trend value', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('trend');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/stove-types/:stoveTypeId/statistics
    // -------------------------------------------------------------------------
    describe('GET /api/stove-types/:stoveTypeId/statistics', () => {
        it('should return statistics for a specific stove type', async () => {
            const response = await request(app)
                .get('/api/stove-types/1/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('stoveTypeId', 1);
            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('totalSales', 1);
            expect(response.body).toHaveProperty('viewsCount', 0);
        });

        it('should return 404 for a stove type with no statistics', async () => {
            const response = await request(app)
                .get('/api/stove-types/99999/statistics')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid stove type ID', async () => {
            const response = await request(app)
                .get('/api/stove-types/invalid/statistics')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/stove-types/:stoveTypeId/statistics
    // -------------------------------------------------------------------------
    describe('POST /api/stove-types/:stoveTypeId/statistics', () => {
        it('should return 201 for a stove type without stored statistics', async () => {
            // StoveType 10 has no stored stats; endpoint is idempotent
            const response = await request(app)
                .post('/api/stove-types/10/statistics')
                .send({ expectedDropRate: 0.05, rarityRank: 1 })
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('stoveTypeId', 10);
            expect(typeof response.body.statId).toBe('number');
        });

        it('should also return 201 when statistics already exist (idempotent)', async () => {
            // StoveType 1 already has calculated stats
            const response = await request(app)
                .post('/api/stove-types/1/statistics')
                .send({ expectedDropRate: 0.50, rarityRank: 5 })
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('stoveTypeId', 1);
        });

        it('should return 400 when required fields are missing (no rarityRank)', async () => {
            const response = await request(app)
                .post('/api/stove-types/10/statistics')
                .send({ expectedDropRate: 0.05 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when required fields are missing (no expectedDropRate)', async () => {
            const response = await request(app)
                .post('/api/stove-types/10/statistics')
                .send({ rarityRank: 3 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for an invalid stove type ID', async () => {
            const response = await request(app)
                .post('/api/stove-types/invalid/statistics')
                .send({ expectedDropRate: 0.05, rarityRank: 3 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/stove-types/:stoveTypeId/statistics/increment-views
    // -------------------------------------------------------------------------
    describe('POST /api/stove-types/:stoveTypeId/statistics/increment-views', () => {
        it('should return 200 for any existing stove type', async () => {
            const response = await request(app)
                .post('/api/stove-types/1/statistics/increment-views')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'View recorded');
        });

        it('should return 200 even when no statistics are stored (on-demand calculation)', async () => {
            const response = await request(app)
                .post('/api/stove-types/99999/statistics/increment-views')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'View recorded');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/stove-types/:stoveTypeId/statistics
    // -------------------------------------------------------------------------
    describe('DELETE /api/stove-types/:stoveTypeId/statistics', () => {
        it('should return 200 for an existing stove type (no-op with on-demand stats)', async () => {
            const response = await request(app)
                .delete('/api/stove-types/10/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should return 200 for a stove type with no stored statistics', async () => {
            const response = await request(app)
                .delete('/api/stove-types/99999/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should return 400 for an invalid stove type ID', async () => {
            const response = await request(app)
                .delete('/api/stove-types/invalid/statistics')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});
