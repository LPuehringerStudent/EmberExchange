import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src','backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-login-history.db');

if (!fs.existsSync(dbDir)){
    fs.mkdirSync(dbDir, {recursive: true});
}

if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
    }catch (e) {
        // Ignore errors
    }
}

process.env.TEST_DB_PATH = dbPath;

import {app} from '../../backend/app';
import request from 'supertest';
import Database from 'better-sqlite3';

describe('Login History API Endpoints', () => {
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
            CREATE TABLE IF NOT EXISTS LoginHistory (
                loginHistoryId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                sessionId TEXT,
                loggedInAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'player1', 'password123', 'player1@test.com', 0, 0, 0, datetime('now')),
            (2, 'player2', 'password123', 'player2@test.com', 0, 0, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO LoginHistory (loginHistoryId, playerId, sessionId, loggedInAt) VALUES
            (1, 1, 'session-aaa', datetime('now')),
            (2, 1, 'session-bbb', datetime('now', '-1 hour')),
            (3, 2, 'session-ccc', datetime('now'))
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
    // GET /api/login-history
    // -------------------------------------------------------------------------
    describe('GET /api/login-history', () => {
        it('should return all login history records', async () => {
            const response = await request(app)
                .get('/api/login-history')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('loginHistoryId');
            expect(response.body[0]).toHaveProperty('playerId');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/login-history/:id
    // -------------------------------------------------------------------------
    describe('GET /api/login-history/:id', () => {
        it('should return a login history record by valid ID', async () => {
            const response = await request(app)
                .get('/api/login-history/1')
                .expect(200);

            expect(response.body).toHaveProperty('loginHistoryId', 1);
            expect(response.body).toHaveProperty('playerId', 1);
            expect(response.body).toHaveProperty('sessionId', 'session-aaa');
        });

        it('should return 404 for a non-existent ID', async () => {
            const response = await request(app)
                .get('/api/login-history/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid (non-numeric) ID', async () => {
            const response = await request(app)
                .get('/api/login-history/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/players/:playerId/login-history
    // -------------------------------------------------------------------------
    describe('GET /api/players/:playerId/login-history', () => {
        it('should return all login history for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/1/login-history')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            response.body.forEach((record: any) => {
                expect(record.playerId).toBe(1);
            });
        });

        it('should return an empty array for a player with no login history', async () => {
            const response = await request(app)
                .get('/api/players/999/login-history')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/login-history')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/login-history
    // -------------------------------------------------------------------------
    describe('POST /api/login-history', () => {
        it('should create a login history record with a sessionId', async () => {
            const payload = { playerId: 1, sessionId: 'test-session-id' };

            const response = await request(app)
                .post('/api/login-history')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('loginHistoryId');
            expect(response.body).toHaveProperty('message', 'Login history recorded');
            expect(typeof response.body.loginHistoryId).toBe('number');
        });

        it('should create a login history record without a sessionId', async () => {
            const payload = { playerId: 2 };

            const response = await request(app)
                .post('/api/login-history')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('loginHistoryId');
            expect(response.body).toHaveProperty('message', 'Login history recorded');
        });

        it('should return 400 when playerId is missing', async () => {
            const payload = { sessionId: 'test-session-id' };

            const response = await request(app)
                .post('/api/login-history')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('playerid');
        });

        it('should return 400 when playerId is not a number', async () => {
            const payload = { playerId: 'not-a-number', sessionId: 'abc' };

            const response = await request(app)
                .post('/api/login-history')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/login-history/:id
    // -------------------------------------------------------------------------
    describe('DELETE /api/login-history/:id', () => {
        it('should delete an existing login history record', async () => {
            const createResponse = await request(app)
                .post('/api/login-history')
                .send({ playerId: 1, sessionId: 'to-delete' });

            const { loginHistoryId } = createResponse.body;

            const response = await request(app)
                .delete(`/api/login-history/${loginHistoryId}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Login history deleted');
        });

        it('should return 404 for a non-existent login history record', async () => {
            const response = await request(app)
                .delete('/api/login-history/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .delete('/api/login-history/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});