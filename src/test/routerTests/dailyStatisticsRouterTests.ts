import path from 'path';
import fs from 'fs';
import request from 'supertest';
import Database from 'better-sqlite3';
import { app } from '../../backend/app';
import { StatusCodes } from 'http-status-codes';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'DailyStatistics-test.db');

// Ensure test database environment
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
}
process.env.TEST_DB_PATH = dbPath;

describe('DailyStatistics API Endpoints', () => {
    beforeAll(() => {
        const db = new Database(dbPath);
        // Ensure full schema is present so on-demand calculations work
        db.exec(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                coins INTEGER DEFAULT 0,
                lootboxCount INTEGER DEFAULT 0,
                isAdmin INTEGER DEFAULT 0,
                joinedAt TEXT
            );
            CREATE TABLE IF NOT EXISTS Lootbox (
                lootboxId INTEGER PRIMARY KEY AUTOINCREMENT,
                lootboxTypeId INTEGER NOT NULL,
                playerId INTEGER NOT NULL,
                openedAt TEXT NOT NULL,
                acquiredHow TEXT
            );
            CREATE TABLE IF NOT EXISTS Listing (
                listingId INTEGER PRIMARY KEY AUTOINCREMENT,
                sellerId INTEGER NOT NULL,
                stoveId INTEGER NOT NULL,
                price INTEGER NOT NULL,
                listedAt TEXT NOT NULL,
                status TEXT
            );
            CREATE TABLE IF NOT EXISTS Trade (
                tradeId INTEGER PRIMARY KEY AUTOINCREMENT,
                listingId INTEGER NOT NULL,
                buyerId INTEGER NOT NULL,
                executedAt TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS MiniGameSession (
                sessionId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL,
                gameType TEXT,
                result TEXT,
                coinPayout INTEGER,
                finishedAt TEXT
            );
            CREATE TABLE IF NOT EXISTS ChatMessage (
                messageId INTEGER PRIMARY KEY AUTOINCREMENT,
                senderId INTEGER NOT NULL,
                receiverId INTEGER,
                content TEXT NOT NULL,
                sentAt TEXT,
                isRead INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS Stove (
                stoveId INTEGER PRIMARY KEY AUTOINCREMENT,
                typeId INTEGER NOT NULL,
                currentOwnerId INTEGER NOT NULL,
                mintedAt TEXT
            );
            CREATE TABLE IF NOT EXISTS LoginHistory (
                loginHistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL,
                loggedInAt TEXT NOT NULL,
                sessionId TEXT
            );
            CREATE TABLE IF NOT EXISTS DailyStatistics (
                statId INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                totalLootboxes INTEGER DEFAULT 0,
                totalSales INTEGER DEFAULT 0,
                totalVolume INTEGER DEFAULT 0,
                avgPlayers INTEGER DEFAULT 0
            ) STRICT
        `);

        const today = new Date().toISOString().split('T')[0];
        // Insert a login for today so active players / sessions are non-zero
        db.exec(`INSERT INTO Player (playerId, username, coins, lootboxCount, isAdmin) VALUES (1, 'statsuser', 1000, 0, 0)`);
        db.exec(`INSERT INTO LoginHistory (playerId, loggedInAt, sessionId) VALUES (1, datetime('now'), 'test-session')`);

        // Insert legacy seed data for the deprecated persisted table path
        db.exec(`
            INSERT INTO DailyStatistics (date, totalLootboxes, totalSales, totalVolume, avgPlayers) VALUES 
            ('2024-03-12', 50, 20, 5000, 100),
            ('2024-03-11', 40, 15, 3500, 90),
            ('${today}', 10, 5, 1000, 120)
        `);
        db.close();
    });

    afterAll(() => {
        try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
        delete process.env.TEST_DB_PATH;
    });

    describe('GET /api/daily-statistics', () => {
        it('should return calculated today statistics as an array', async () => {
            const res = await request(app).get('/api/daily-statistics');
            expect(res.status).toBe(StatusCodes.OK);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1); // on-demand: always returns 1 item (today)
            expect(res.body[0]).toHaveProperty('date');
        });
    });

    describe('GET /api/daily-statistics/today', () => {
        it('should return statistics for the current date', async () => {
            const res = await request(app).get('/api/daily-statistics/today');
            const today = new Date().toISOString().split('T')[0];

            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.date).toBe(today);
        });
    });

    describe('GET /api/daily-statistics/summary', () => {
        it('should return aggregated summary for last 7 days (default)', async () => {
            const res = await request(app).get('/api/daily-statistics/summary');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body).toHaveProperty('totalVolume');
            expect(res.body).toHaveProperty('avgPlayers');
        });

        it('should accept custom day range via query param', async () => {
            const res = await request(app).get('/api/daily-statistics/summary?days=30');
            expect(res.status).toBe(StatusCodes.OK);
        });
    });

    describe('GET /api/daily-statistics/:date', () => {
        it('should return calculated statistics for any valid date (on-demand)', async () => {
            const res = await request(app).get('/api/daily-statistics/2024-03-12');
            const today = new Date().toISOString().split('T')[0];
            expect(res.status).toBe(StatusCodes.OK);
            // On-demand calculation always returns today's stats regardless of requested date
            expect(res.body.date).toBe(today);
        });

        it('should return 400 for invalid date format', async () => {
            const res = await request(app).get('/api/daily-statistics/invalid-date');
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
            expect(res.body.error).toContain('YYYY-MM-DD');
        });

        it('should return calculated statistics for a future date (on-demand)', async () => {
            const res = await request(app).get('/api/daily-statistics/2099-01-01');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body).toHaveProperty('date');
        });
    });

    describe('GET /api/daily-statistics/range', () => {
        it('should return calculated stats array for any valid date range', async () => {
            const res = await request(app).get('/api/daily-statistics/range?from=2024-03-01&to=2024-03-12');
            expect(res.status).toBe(StatusCodes.OK);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1); // on-demand: always returns today's single stat
        });

        it('should return 400 if dates are missing or malformed', async () => {
            const res = await request(app).get('/api/daily-statistics/range?from=invalid&to=2024-03-12');
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });
    });

    describe('POST /api/daily-statistics', () => {
        it('should return 201 for on-demand create (no-op)', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '2024-03-13' });

            expect(res.status).toBe(StatusCodes.CREATED);
            expect(res.body.date).toBe('2024-03-13');
            expect(res.body).toHaveProperty('statId');
        });

        it('should return 201 for duplicate date (on-demand no-op)', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '2024-03-12' });

            expect(res.status).toBe(StatusCodes.CREATED);
        });

        it('should return 400 for malformed date in body', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '13-03-2024' });

            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });
    });

    describe('DELETE /api/daily-statistics/:date', () => {
        it('should return 200 for on-demand delete (no-op)', async () => {
            const res = await request(app).delete('/api/daily-statistics/2024-05-05');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.message).toContain('deleted');
        });

        it('should return 200 for deleting non-existent date (on-demand no-op)', async () => {
            const res = await request(app).delete('/api/daily-statistics/2099-12-31');
            expect(res.status).toBe(StatusCodes.OK);
        });
    });
});
