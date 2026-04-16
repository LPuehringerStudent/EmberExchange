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

        // Create schema matching DailyStatistics table
        db.exec(`
            CREATE TABLE IF NOT EXISTS DailyStatistics (
                statId INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                totalLootboxes INTEGER DEFAULT 0,
                totalSales INTEGER DEFAULT 0,
                totalVolume INTEGER DEFAULT 0,
                avgPlayers INTEGER DEFAULT 0
            ) STRICT
        `);

        // Insert seed data for tests
        const today = new Date().toISOString().split('T')[0];
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
        it('should return all recorded statistics', async () => {
            const res = await request(app).get('/api/daily-statistics');
            expect(res.status).toBe(StatusCodes.OK);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
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
        it('should return stats for a valid specific date', async () => {
            const res = await request(app).get('/api/daily-statistics/2024-03-12');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.date).toBe('2024-03-12');
        });

        it('should return 400 for invalid date format', async () => {
            const res = await request(app).get('/api/daily-statistics/invalid-date');
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
            expect(res.body.error).toContain('YYYY-MM-DD');
        });

        it('should return 404 for a date with no data', async () => {
            const res = await request(app).get('/api/daily-statistics/2099-01-01');
            expect(res.status).toBe(StatusCodes.NOT_FOUND);
        });
    });

    describe('GET /api/daily-statistics/range', () => {
        it('should return stats between two valid dates', async () => {
            const res = await request(app).get('/api/daily-statistics/range?from=2024-03-01&to=2024-03-12');
            expect(res.status).toBe(StatusCodes.OK);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return 400 if dates are missing or malformed', async () => {
            const res = await request(app).get('/api/daily-statistics/range?from=invalid&to=2024-03-12');
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });
    });

    describe('POST /api/daily-statistics', () => {
        it('should create a new daily stat record', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '2024-03-13' });

            expect(res.status).toBe(StatusCodes.CREATED);
            expect(res.body.date).toBe('2024-03-13');
            expect(res.body).toHaveProperty('statId');
        });

        it('should return 409 when creating a record for an existing date', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '2024-03-12' }); // Date already exists from beforeAll

            expect(res.status).toBe(StatusCodes.CONFLICT);
        });

        it('should return 400 for malformed date in body', async () => {
            const res = await request(app)
                .post('/api/daily-statistics')
                .send({ date: '13-03-2024' });

            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });
    });

    describe('DELETE /api/daily-statistics/:date', () => {
        it('should delete an existing record', async () => {
            // First create it
            await request(app).post('/api/daily-statistics').send({ date: '2024-05-05' });

            // Then delete it
            const res = await request(app).delete('/api/daily-statistics/2024-05-05');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.message).toContain('deleted');
        });

        it('should return 404 for deleting non-existent date', async () => {
            const res = await request(app).delete('/api/daily-statistics/2099-12-31');
            expect(res.status).toBe(StatusCodes.NOT_FOUND);
        });
    });
});