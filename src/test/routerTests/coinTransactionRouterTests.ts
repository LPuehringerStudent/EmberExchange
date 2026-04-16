import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-coin-transaction.db');

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

describe('Coin Transaction API Endpoints', () => {
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
            CREATE TABLE IF NOT EXISTS CoinTransaction (
                transactionId INTEGER PRIMARY KEY AUTOINCREMENT,
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                amount INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust')),
                description TEXT,
                createdAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'player1', 'password123', 'player1@test.com', 5000, 0, 0, datetime('now')),
            (2, 'player2', 'password123', 'player2@test.com', 3000, 0, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO CoinTransaction (transactionId, playerId, amount, type, description, createdAt) VALUES
            (1, 1, 500,  'listing_sale',     'Sold stove',    datetime('now')),
            (2, 1, -200, 'listing_purchase', 'Bought stove',  datetime('now')),
            (3, 2, 100,  'mini_game',        'Won coin flip', datetime('now'))
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


    describe('GET /api/coin-transactions', () => {
        it('should return all coin transactions', async () => {
            const response = await request(app)
                .get('/api/coin-transactions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('transactionId');
            expect(response.body[0]).toHaveProperty('playerId');
            expect(response.body[0]).toHaveProperty('amount');
            expect(response.body[0]).toHaveProperty('type');
        });
    });


    describe('GET /api/coin-transactions/:id', () => {
        it('should return a coin transaction by valid ID', async () => {
            const response = await request(app)
                .get('/api/coin-transactions/1')
                .expect(200);

            expect(response.body).toHaveProperty('transactionId', 1);
            expect(response.body).toHaveProperty('playerId', 1);
            expect(response.body).toHaveProperty('amount', 500);
            expect(response.body).toHaveProperty('type', 'listing_sale');
        });

        it('should return 404 for a non-existent ID', async () => {
            const response = await request(app)
                .get('/api/coin-transactions/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid (non-numeric) ID', async () => {
            const response = await request(app)
                .get('/api/coin-transactions/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });


    describe('GET /api/players/:playerId/coin-transactions', () => {
        it('should return all coin transactions for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/1/coin-transactions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            response.body.forEach((tx: any) => {
                expect(tx.playerId).toBe(1);
            });
        });

        it('should return an empty array for a player with no transactions', async () => {
            // Player 3 has no transactions but does not exist — use a valid player with no data
            // Insert a third player inline for this test
            const response = await request(app)
                .get('/api/players/999/coin-transactions')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/coin-transactions')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    describe('POST /api/coin-transactions', () => {
        it('should create a coin transaction successfully', async () => {
            const payload = {
                playerId: 1,
                amount: 500,
                type: 'listing_sale',
                description: 'Test sale',
            };

            const response = await request(app)
                .post('/api/coin-transactions')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('transactionId');
            expect(response.body).toHaveProperty('message', 'Coin transaction recorded');
            expect(typeof response.body.transactionId).toBe('number');
        });

        it('should create a transaction without an optional description', async () => {
            const payload = { playerId: 2, amount: -100, type: 'trade_out' };

            const response = await request(app)
                .post('/api/coin-transactions')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('transactionId');
        });

        it('should return 400 for an invalid transaction type', async () => {
            const payload = { playerId: 1, amount: 500, type: 'invalid_type' };

            const response = await request(app)
                .post('/api/coin-transactions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('type');
        });

        it('should return 400 when required fields are missing', async () => {
            const payload = { playerId: 1 };

            const response = await request(app)
                .post('/api/coin-transactions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when playerId is missing', async () => {
            const payload = { amount: 100, type: 'mini_game' };

            const response = await request(app)
                .post('/api/coin-transactions')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should accept all valid transaction types', async () => {
            const validTypes = ['trade_in', 'trade_out', 'mini_game', 'listing_sale', 'listing_purchase', 'admin_adjust'];

            for (const type of validTypes) {
                const response = await request(app)
                    .post('/api/coin-transactions')
                    .send({ playerId: 1, amount: 10, type })
                    .expect(201);

                expect(response.body).toHaveProperty('transactionId');
            }
        });
    });

    describe('DELETE /api/coin-transactions/:id', () => {
        it('should delete an existing coin transaction', async () => {
            // First create one to delete
            const createResponse = await request(app)
                .post('/api/coin-transactions')
                .send({ playerId: 1, amount: 50, type: 'admin_adjust' });

            const { transactionId } = createResponse.body;

            const response = await request(app)
                .delete(`/api/coin-transactions/${transactionId}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Coin transaction deleted');
        });

        it('should return 404 for a non-existent coin transaction', async () => {
            const response = await request(app)
                .delete('/api/coin-transactions/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .delete('/api/coin-transactions/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});