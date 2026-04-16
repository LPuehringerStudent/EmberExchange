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
            CREATE TABLE IF NOT EXISTS StoveTypeStatistics (
                statId INTEGER PRIMARY KEY AUTOINCREMENT,
                stoveTypeId INTEGER NOT NULL UNIQUE REFERENCES StoveType(typeId),
                totalMinted INTEGER NOT NULL DEFAULT 0,
                totalListed INTEGER NOT NULL DEFAULT 0,
                totalSales INTEGER NOT NULL DEFAULT 0,
                avgSalePrice REAL NOT NULL DEFAULT 0,
                viewCount INTEGER NOT NULL DEFAULT 0,
                expectedDropRate REAL NOT NULL,
                rarityRank INTEGER NOT NULL,
                demandTrend TEXT NOT NULL DEFAULT 'stable' CHECK (demandTrend IN ('increasing', 'stable', 'decreasing')),
                updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES
            (1,  'Common Stove',    '/img/common.png',    'common',    100),
            (2,  'Rare Stove',      '/img/rare.png',      'rare',      50),
            (3,  'Epic Stove',      '/img/epic.png',      'epic',      20),
            (10, 'Legendary Stove', '/img/legendary.png', 'legendary', 5)
        `);

        db.exec(`
            INSERT INTO StoveTypeStatistics (statId, stoveTypeId, totalMinted, totalListed, totalSales, avgSalePrice, viewCount, expectedDropRate, rarityRank, demandTrend) VALUES
            (1, 1, 200, 50, 120, 1500.0, 800, 0.50, 5, 'stable'),
            (2, 2, 80,  20, 60,  3500.0, 450, 0.25, 3, 'increasing'),
            (3, 3, 30,  10, 25,  7500.0, 200, 0.10, 2, 'decreasing')
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
            expect(response.body[0]).toHaveProperty('viewCount');
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
                expect(response.body[0].viewCount).toBeGreaterThanOrEqual(
                    response.body[1].viewCount
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
            expect(response.body.length).toBe(1);
            expect(response.body[0].demandTrend).toBe('increasing');
        });

        it('should return stove types with "stable" trend', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/stable')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            response.body.forEach((s: any) => {
                expect(s.demandTrend).toBe('stable');
            });
        });

        it('should return stove types with "decreasing" trend', async () => {
            const response = await request(app)
                .get('/api/stove-type-statistics/trend/decreasing')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].demandTrend).toBe('decreasing');
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
            expect(response.body).toHaveProperty('totalSales', 120);
            expect(response.body).toHaveProperty('viewCount', 800);
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
        it('should create statistics for a stove type without one', async () => {
            // StoveType 10 ("Legendary Stove") has no stats yet
            const response = await request(app)
                .post('/api/stove-types/10/statistics')
                .send({ expectedDropRate: 0.05, rarityRank: 1 })
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('stoveTypeId', 10);
            expect(typeof response.body.statId).toBe('number');
        });

        it('should return 409 when statistics already exist for the stove type', async () => {
            // StoveType 1 already has stats from seed data
            const response = await request(app)
                .post('/api/stove-types/1/statistics')
                .send({ expectedDropRate: 0.50, rarityRank: 5 })
                .expect(409);

            expect(response.body).toHaveProperty('error');
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
        it('should increment the view count for an existing stove type', async () => {
            const before = await request(app)
                .get('/api/stove-types/1/statistics')
                .expect(200);

            const viewsBefore = before.body.viewCount;

            await request(app)
                .post('/api/stove-types/1/statistics/increment-views')
                .expect(200)
                .then(res => {
                    expect(res.body).toHaveProperty('message', 'View recorded');
                });

            const after = await request(app)
                .get('/api/stove-types/1/statistics')
                .expect(200);

            expect(after.body.viewCount).toBe(viewsBefore + 1);
        });

        it('should return 404 when no statistics exist for the stove type', async () => {
            const response = await request(app)
                .post('/api/stove-types/99999/statistics/increment-views')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/stove-types/:stoveTypeId/statistics
    // -------------------------------------------------------------------------
    describe('DELETE /api/stove-types/:stoveTypeId/statistics', () => {
        it('should delete statistics for an existing stove type', async () => {
            // Use stove type 10 whose stats were created in the POST test above
            const response = await request(app)
                .delete('/api/stove-types/10/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should return 404 for a stove type with no statistics', async () => {
            const response = await request(app)
                .delete('/api/stove-types/99999/statistics')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
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