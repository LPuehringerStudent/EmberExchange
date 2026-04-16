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

        db.exec(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                coins INTEGER NOT NULL DEFAULT 0,
                lootboxCount INTEGER NOT NULL DEFAULT 0,
                isAdmin INTEGER NOT NULL DEFAULT 0,
                joinedAt TEXT NOT NULL
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS PlayerStatistics (
                statId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL UNIQUE REFERENCES Player(playerId),
                totalListings INTEGER NOT NULL DEFAULT 0,
                totalSales INTEGER NOT NULL DEFAULT 0,
                totalPurchases INTEGER NOT NULL DEFAULT 0,
                totalCoinsEarned INTEGER NOT NULL DEFAULT 0,
                totalCoinsSpent INTEGER NOT NULL DEFAULT 0,
                marketActivityScore REAL NOT NULL DEFAULT 0,
                netWorth INTEGER NOT NULL DEFAULT 0,
                updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'richplayer',    'password123', 'rich@test.com',    9000, 5, 0, datetime('now')),
            (2, 'activeplayer',  'password123', 'active@test.com',  4000, 2, 0, datetime('now')),
            (3, 'newplayer',     'password123', 'new@test.com',     100,  0, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO PlayerStatistics (statId, playerId, totalListings, totalSales, totalPurchases, totalCoinsEarned, totalCoinsSpent, marketActivityScore, netWorth) VALUES
            (1, 1, 10, 8, 3, 9000,  2000, 18.0, 9000),
            (2, 2, 20, 15, 10, 5000, 1500, 45.0, 4000)
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
            expect(response.body[0]).toHaveProperty('netWorth');
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
                expect(response.body[0].netWorth).toBeGreaterThanOrEqual(
                    response.body[1].netWorth
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
            expect(response.body).toHaveProperty('marketActivityScore', 45.0);
            expect(response.body).toHaveProperty('netWorth', 4000);
        });

        it('should return 404 for a player with no statistics record', async () => {
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
        it('should create a statistics record for a player without one', async () => {
            // Player 3 has no stats yet
            const response = await request(app)
                .post('/api/players/3/statistics')
                .expect(201);

            expect(response.body).toHaveProperty('statId');
            expect(response.body).toHaveProperty('playerId', 3);
            expect(typeof response.body.statId).toBe('number');
        });

        it('should return 409 when statistics already exist for the player', async () => {
            // Player 1 already has stats from seed data
            const response = await request(app)
                .post('/api/players/1/statistics')
                .expect(409);

            expect(response.body).toHaveProperty('error');
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
        it('should delete statistics for an existing player', async () => {
            // Player 2's stats exist from seed data
            const response = await request(app)
                .delete('/api/players/2/statistics')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Statistics deleted');
        });

        it('should return 404 for a player with no statistics', async () => {
            const response = await request(app)
                .delete('/api/players/99999/statistics')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
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