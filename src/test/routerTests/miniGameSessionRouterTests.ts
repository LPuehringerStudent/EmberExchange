import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-mini-game-session.db');

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

describe('Mini-Game Session API Endpoints', () => {
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
            CREATE TABLE IF NOT EXISTS MiniGameSession (
                sessionId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                gameType TEXT NOT NULL,
                result TEXT NOT NULL,
                coinPayout INTEGER NOT NULL,
                finishedAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'player1', 'password123', 'player1@test.com', 5000, 0, 0, datetime('now')),
            (2, 'player2', 'password123', 'player2@test.com', 3000, 0, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO MiniGameSession (sessionId, playerId, gameType, result, coinPayout, finishedAt) VALUES
            (1, 1, 'Coin Flip', 'win',     100,  datetime('now')),
            (2, 1, 'Coin Flip', 'loss',    0,    datetime('now', '-1 hour')),
            (3, 2, 'Slots',     'jackpot', 5000, datetime('now')),
            (4, 1, 'Dice Roll', 'win',     250,  datetime('now'))
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
    // GET /api/mini-game-sessions
    // -------------------------------------------------------------------------
    describe('GET /api/mini-game-sessions', () => {
        it('should return all mini-game sessions', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(4);
            expect(response.body[0]).toHaveProperty('sessionId');
            expect(response.body[0]).toHaveProperty('playerId');
            expect(response.body[0]).toHaveProperty('gameType');
            expect(response.body[0]).toHaveProperty('result');
            expect(response.body[0]).toHaveProperty('coinPayout');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/mini-game-sessions/:id
    // -------------------------------------------------------------------------
    describe('GET /api/mini-game-sessions/:id', () => {
        it('should return a session by valid ID', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/1')
                .expect(200);

            expect(response.body).toHaveProperty('sessionId', 1);
            expect(response.body).toHaveProperty('playerId', 1);
            expect(response.body).toHaveProperty('gameType', 'Coin Flip');
            expect(response.body).toHaveProperty('result', 'win');
            expect(response.body).toHaveProperty('coinPayout', 100);
        });

        it('should return 404 for a non-existent session ID', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid (non-numeric) ID', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/players/:playerId/mini-game-sessions
    // -------------------------------------------------------------------------
    describe('GET /api/players/:playerId/mini-game-sessions', () => {
        it('should return all sessions for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/1/mini-game-sessions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
            response.body.forEach((session: any) => {
                expect(session.playerId).toBe(1);
            });
        });

        it('should return an empty array for a player with no sessions', async () => {
            const response = await request(app)
                .get('/api/players/999/mini-game-sessions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/mini-game-sessions')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/mini-game-sessions/type/:gameType
    // -------------------------------------------------------------------------
    describe('GET /api/mini-game-sessions/type/:gameType', () => {
        it('should return sessions filtered by game type (Coin Flip)', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/type/Coin%20Flip')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            response.body.forEach((session: any) => {
                expect(session.gameType).toBe('Coin Flip');
            });
        });

        it('should return sessions filtered by game type (Slots)', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/type/Slots')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].gameType).toBe('Slots');
        });

        it('should return an empty array for a game type with no sessions', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/type/Nonexistent%20Game')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return sessions filtered by game type (Dice Roll)', async () => {
            const response = await request(app)
                .get('/api/mini-game-sessions/type/Dice%20Roll')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/mini-game-sessions
    // -------------------------------------------------------------------------
    describe('POST /api/mini-game-sessions', () => {
        it('should create a winning mini-game session', async () => {
            const payload = { playerId: 1, gameType: 'Coin Flip', result: 'win', coinPayout: 100 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('playerId', 1);
            expect(response.body).toHaveProperty('gameType', 'Coin Flip');
            expect(typeof response.body.sessionId).toBe('number');
        });

        it('should create a losing mini-game session with zero payout', async () => {
            const payload = { playerId: 1, gameType: 'Coin Flip', result: 'loss', coinPayout: 0 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('sessionId');
        });

        it('should create a jackpot session', async () => {
            const payload = { playerId: 2, gameType: 'Slots', result: 'jackpot', coinPayout: 5000 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('sessionId');
            expect(response.body).toHaveProperty('playerId', 2);
        });

        it('should return 400 when playerId is missing', async () => {
            const payload = { gameType: 'Coin Flip', result: 'win', coinPayout: 100 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('playerid');
        });

        it('should return 400 when gameType is missing', async () => {
            const payload = { playerId: 1, result: 'win', coinPayout: 100 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('gametype');
        });

        it('should return 400 when result is missing', async () => {
            const payload = { playerId: 1, gameType: 'Coin Flip', coinPayout: 100 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('result');
        });

        it('should return 400 when coinPayout is negative', async () => {
            const payload = { playerId: 1, gameType: 'Coin Flip', result: 'win', coinPayout: -100 };

            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('coinpayout');
        });

        it('should return 400 when all fields are missing', async () => {
            const response = await request(app)
                .post('/api/mini-game-sessions')
                .send({ playerId: 1 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/mini-game-sessions/:id
    // -------------------------------------------------------------------------
    describe('DELETE /api/mini-game-sessions/:id', () => {
        it('should delete an existing mini-game session', async () => {
            const createResponse = await request(app)
                .post('/api/mini-game-sessions')
                .send({ playerId: 1, gameType: 'Dice Roll', result: 'win', coinPayout: 50 });

            const { sessionId } = createResponse.body;

            const response = await request(app)
                .delete(`/api/mini-game-sessions/${sessionId}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Session deleted');
        });

        it('should return 404 for a non-existent session', async () => {
            const response = await request(app)
                .delete('/api/mini-game-sessions/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .delete('/api/mini-game-sessions/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/players/:playerId/mini-game-stats
    // -------------------------------------------------------------------------
    describe('GET /api/players/:playerId/mini-game-stats', () => {
        it('should return stats for a player with sessions', async () => {
            const response = await request(app)
                .get('/api/players/1/mini-game-stats')
                .expect(200);

            expect(response.body).toHaveProperty('totalSessions');
            expect(response.body).toHaveProperty('totalPayout');
            expect(typeof response.body.totalSessions).toBe('number');
            expect(typeof response.body.totalPayout).toBe('number');
            expect(response.body.totalSessions).toBeGreaterThan(0);
        });

        it('should return zero stats for a player with no sessions', async () => {
            const response = await request(app)
                .get('/api/players/999/mini-game-stats')
                .expect(200);

            expect(response.body).toHaveProperty('totalSessions', 0);
            expect(response.body).toHaveProperty('totalPayout', 0);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/mini-game-stats')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});