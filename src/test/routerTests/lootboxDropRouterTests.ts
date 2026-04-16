import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-lootbox-drop.db');

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

describe('Lootbox Drop API Endpoints', () => {
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
                costFree INTEGER NOT NULL DEFAULT 0,
                dailyLimit INTEGER,
                isAvailable INTEGER NOT NULL DEFAULT 1,
                createdAt TEXT NOT NULL DEFAULT (datetime('now'))
            ) STRICT
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS Lootbox (
                lootboxId INTEGER PRIMARY KEY AUTOINCREMENT,
                lootboxTypeId INTEGER NOT NULL REFERENCES LootboxType(lootboxTypeId),
                playerId INTEGER NOT NULL REFERENCES Player(playerId),
                openedAt TEXT,
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

        // Seed data
        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES
            (1, 'player1', 'password123', 'player1@test.com', 5000, 3, 0, datetime('now')),
            (2, 'player2', 'password123', 'player2@test.com', 1000, 1, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES
            (1, 'Common Stove', '/img/common.png', 'common', 100)
        `);

        db.exec(`
            INSERT INTO Stove (stoveId, typeId, currentOwnerId, mintedAt) VALUES
            (1, 1, 1, datetime('now')),
            (2, 1, 1, datetime('now')),
            (3, 1, 2, datetime('now')),
            (4, 1, 1, datetime('now')),
            (5, 1, 1, datetime('now'))
        `);

        db.exec(`
            INSERT INTO LootboxType (lootboxTypeId, name, costCoins, costFree, isAvailable) VALUES
            (1, 'Standard Box', 500, 0, 1)
        `);

        db.exec(`
            INSERT INTO Lootbox (lootboxId, lootboxTypeId, playerId, openedAt, acquiredHow) VALUES
            (1, 1, 1, datetime('now'), 'free'),
            (2, 1, 1, datetime('now'), 'purchase'),
            (3, 1, 2, datetime('now'), 'free'),
            (4, 1, 1, datetime('now'), 'reward'),
            (5, 1, 1, datetime('now'), 'free')
        `);

        db.exec(`
            INSERT INTO LootboxDrop (dropId, lootboxId, stoveId) VALUES
            (1, 1, 1),
            (2, 2, 2),
            (3, 3, 3)
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
    // GET /api/lootbox-drops
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-drops', () => {
        it('should return all lootbox drops', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('dropId');
            expect(response.body[0]).toHaveProperty('lootboxId');
            expect(response.body[0]).toHaveProperty('stoveId');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-drops/count
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-drops/count', () => {
        it('should return the total count of lootbox drops', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/count')
                .expect(200);

            expect(response.body).toHaveProperty('count');
            expect(typeof response.body.count).toBe('number');
            expect(response.body.count).toBeGreaterThanOrEqual(3);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-drops/:id
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-drops/:id', () => {
        it('should return a lootbox drop by valid ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/1')
                .expect(200);

            expect(response.body).toHaveProperty('dropId', 1);
            expect(response.body).toHaveProperty('lootboxId', 1);
            expect(response.body).toHaveProperty('stoveId', 1);
        });

        it('should return 404 for a non-existent drop ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid (non-numeric) ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-drops/lootbox/:lootboxId
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-drops/lootbox/:lootboxId', () => {
        it('should return the drop for a specific lootbox', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/lootbox/1')
                .expect(200);

            expect(response.body).toHaveProperty('lootboxId', 1);
            expect(response.body).toHaveProperty('stoveId', 1);
        });

        it('should return 404 for a lootbox with no drop', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/lootbox/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('no drop');
        });

        it('should return 400 for an invalid lootbox ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/lootbox/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-drops/stove/:stoveId
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-drops/stove/:stoveId', () => {
        it('should return the drop that produced a specific stove', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/stove/2')
                .expect(200);

            expect(response.body).toHaveProperty('stoveId', 2);
            expect(response.body).toHaveProperty('lootboxId', 2);
        });

        it('should return 404 for a stove with no drop record', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/stove/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('no drop');
        });

        it('should return 400 for an invalid stove ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-drops/stove/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/players/:playerId/lootbox-drops
    // -------------------------------------------------------------------------
    describe('GET /api/players/:playerId/lootbox-drops', () => {
        it('should return all drops for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/1/lootbox-drops')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should return an empty array for a player with no drops', async () => {
            const response = await request(app)
                .get('/api/players/999/lootbox-drops')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for an invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/lootbox-drops')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/lootbox-drops
    // -------------------------------------------------------------------------
    describe('POST /api/lootbox-drops', () => {
        it('should create a lootbox drop successfully', async () => {
            // Lootbox 4 and Stove 4 are seeded but not yet linked
            const response = await request(app)
                .post('/api/lootbox-drops')
                .send({ lootboxId: 4, stoveId: 4 })
                .expect(201);

            expect(response.body).toHaveProperty('dropId');
            expect(response.body).toHaveProperty('lootboxId', 4);
            expect(response.body).toHaveProperty('stoveId', 4);
            expect(typeof response.body.dropId).toBe('number');
        });

        it('should return 400 when lootboxId is missing', async () => {
            const response = await request(app)
                .post('/api/lootbox-drops')
                .send({ stoveId: 5 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when stoveId is missing', async () => {
            const response = await request(app)
                .post('/api/lootbox-drops')
                .send({ lootboxId: 5 })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 409 when the lootbox already has a drop (UNIQUE constraint)', async () => {
            // Lootbox 1 was already given a drop in seed data
            const response = await request(app)
                .post('/api/lootbox-drops')
                .send({ lootboxId: 1, stoveId: 5 })
                .expect(409);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 409 when the stove is already associated with a drop (UNIQUE constraint)', async () => {
            // Stove 1 was already given a drop in seed data
            const response = await request(app)
                .post('/api/lootbox-drops')
                .send({ lootboxId: 5, stoveId: 1 })
                .expect(409);

            expect(response.body).toHaveProperty('error');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/lootbox-drops/:id
    // -------------------------------------------------------------------------
    describe('DELETE /api/lootbox-drops/:id', () => {
        it('should delete an existing lootbox drop', async () => {
            // Create a fresh drop to delete
            const createResponse = await request(app)
                .post('/api/lootbox-drops')
                .send({ lootboxId: 5, stoveId: 5 });

            const { dropId } = createResponse.body;

            const response = await request(app)
                .delete(`/api/lootbox-drops/${dropId}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lootbox drop deleted');
        });

        it('should return 404 for a non-existent drop', async () => {
            const response = await request(app)
                .delete('/api/lootbox-drops/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .delete('/api/lootbox-drops/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});