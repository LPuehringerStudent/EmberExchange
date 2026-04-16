import path from 'path';
import fs from 'fs';


const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-lootbox.db');

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

describe('Lootbox API Endpoints', () => {
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
                openedAt TEXT,
                acquiredHow TEXT NOT NULL CHECK (acquiredHow IN ('free', 'purchase', 'reward'))
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
            CREATE TABLE IF NOT EXISTS LootboxDrop (
                dropId INTEGER PRIMARY KEY AUTOINCREMENT,
                lootboxId INTEGER NOT NULL UNIQUE REFERENCES Lootbox(lootboxId),
                stoveId INTEGER NOT NULL UNIQUE REFERENCES Stove(stoveId)
            ) STRICT
        `);

        db.exec(`
            INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) VALUES 
            (1, 'player1', 'password1', 'player1@test.com', 5000, 10, 0, datetime('now')),
            (2, 'player2', 'password2', 'player2@test.com', 3000, 5, 0, datetime('now'))
        `);

        db.exec(`
            INSERT INTO LootboxType (lootboxTypeId, name, description, costCoins, costFree, isAvailable) VALUES 
            (1, 'Standard Box', 'A standard lootbox', 0, 1, 1),
            (2, 'Premium Box', 'A premium lootbox', 500, 0, 1),
            (3, 'Unavailable Box', 'Not available', 100, 0, 0)
        `);

        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES 
            (1, 'Test Stove', '/images/test.png', 'common', 100)
        `);

        db.exec(`
            INSERT INTO Stove (stoveId, typeId, currentOwnerId, mintedAt) VALUES 
            (1, 1, 1, datetime('now')),
            (2, 1, 1, datetime('now'))
        `);

        db.exec(`
            INSERT INTO Lootbox (lootboxId, lootboxTypeId, playerId, openedAt, acquiredHow) VALUES 
            (1, 1, 1, datetime('now', '-5 days'), 'free'),
            (2, 1, 1, datetime('now', '-3 days'), 'purchase'),
            (3, 2, 2, datetime('now', '-1 day'), 'reward'),
            (4, 1, 1, null, 'free'),
            (5, 1, 1, null, 'free')
        `);

        db.exec(`
            INSERT INTO LootboxDrop (dropId, lootboxId, stoveId) VALUES 
            (1, 1, 1),
            (2, 2, 2)
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

    describe('GET /api/lootboxes', () => {
        it('should return all lootboxes', async () => {
            const response = await request(app)
                .get('/api/lootboxes')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('lootboxId');
            expect(response.body[0]).toHaveProperty('lootboxTypeId');
            expect(response.body[0]).toHaveProperty('playerId');
            expect(response.body[0]).toHaveProperty('acquiredHow');
        });
    });

    describe('GET /api/lootboxes/:id', () => {
        it('should return a lootbox by valid ID', async () => {
            const response = await request(app)
                .get('/api/lootboxes/1')
                .expect(200);

            expect(response.body).toHaveProperty('lootboxId', 1);
            expect(response.body).toHaveProperty('lootboxTypeId', 1);
            expect(response.body).toHaveProperty('playerId', 1);
            expect(response.body).toHaveProperty('acquiredHow', 'free');
        });

        it('should return 404 for non-existent lootbox ID', async () => {
            const response = await request(app)
                .get('/api/lootboxes/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for invalid ID (string)', async () => {
            const response = await request(app)
                .get('/api/lootboxes/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    describe('GET /api/players/:playerId/lootboxes', () => {
        it('should return all unopened lootboxes for a specific player', async () => {
            const response = await request(app)
                .get('/api/players/1/lootboxes')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            response.body.forEach((lootbox: any) => {
                expect(lootbox.playerId).toBe(1);
                expect(lootbox.openedAt).toBeNull();
            });
        });

        it('should return empty array for player with no lootboxes', async () => {
            const db = new Database(dbPath);
            db.exec(`INSERT INTO Player (playerId, username, password, email, coins, lootboxCount, isAdmin, joinedAt) 
                     VALUES (99, 'nolootboxes', 'password99', 'nolootboxes@test.com', 0, 0, 0, datetime('now'))`);
            db.close();

            const response = await request(app)
                .get('/api/players/99/lootboxes')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for invalid player ID', async () => {
            const response = await request(app)
                .get('/api/players/invalid/lootboxes')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    describe('POST /api/lootboxes', () => {
        it('should create a new lootbox with acquiredHow=purchase', async () => {
            const newLootbox = {
                lootboxTypeId: 1,
                playerId: 1,
                acquiredHow: 'purchase'
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(newLootbox)
                .expect(201);

            expect(response.body).toHaveProperty('lootboxId');
            expect(response.body).toHaveProperty('message', 'Lootbox opened successfully');
        });

        it('should create a new lootbox with acquiredHow=free', async () => {
            const newLootbox = {
                lootboxTypeId: 1,
                playerId: 2,
                acquiredHow: 'free'
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(newLootbox)
                .expect(201);

            expect(response.body).toHaveProperty('lootboxId');
            expect(response.body).toHaveProperty('message', 'Lootbox opened successfully');
        });

        it('should create a new lootbox with acquiredHow=reward', async () => {
            const newLootbox = {
                lootboxTypeId: 2,
                playerId: 1,
                acquiredHow: 'reward'
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(newLootbox)
                .expect(201);

            expect(response.body).toHaveProperty('lootboxId');
            expect(response.body).toHaveProperty('message', 'Lootbox opened successfully');
        });

        it('should return 400 for invalid acquiredHow value', async () => {
            const invalidLootbox = {
                lootboxTypeId: 1,
                playerId: 1,
                acquiredHow: 'invalid'
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(invalidLootbox)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('free');
        });

        it('should return 400 when required fields are missing', async () => {
            const invalidLootbox = {
                playerId: 1
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(invalidLootbox)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when lootboxTypeId is not a number', async () => {
            const invalidLootbox = {
                lootboxTypeId: 'not-a-number',
                playerId: 1,
                acquiredHow: 'free'
            };

            const response = await request(app)
                .post('/api/lootboxes')
                .send(invalidLootbox)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('DELETE /api/lootboxes/:id', () => {
        it('should delete an existing lootbox', async () => {
            const db = new Database(dbPath);
            db.exec(`INSERT INTO Lootbox (lootboxId, lootboxTypeId, playerId, openedAt, acquiredHow) 
                     VALUES (100, 1, 1, datetime('now'), 'free')`);
            db.close();

            const response = await request(app)
                .delete('/api/lootboxes/100')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lootbox deleted');
        });

        it('should return 404 for non-existent lootbox', async () => {
            const response = await request(app)
                .delete('/api/lootboxes/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for invalid ID', async () => {
            const response = await request(app)
                .delete('/api/lootboxes/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });

        it('should return 409 for lootbox with existing drops (constraint violation)', async () => {
            const response = await request(app)
                .delete('/api/lootboxes/1')
                .expect(409);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/lootbox-types', () => {
        it('should return all lootbox types', async () => {
            const response = await request(app)
                .get('/api/lootbox-types')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('lootboxTypeId');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('isAvailable');
        });
    });

    describe('GET /api/lootbox-types/available', () => {
        it('should return only available lootbox types', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/available')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            response.body.forEach((type: any) => {
                expect(type.isAvailable).toBe(1);
            });
        });
    });

    describe('GET /api/lootbox-types/:id', () => {
        it('should return a lootbox type by valid ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/1')
                .expect(200);

            expect(response.body).toHaveProperty('lootboxTypeId', 1);
            expect(response.body).toHaveProperty('name', 'Standard Box');
            expect(response.body).toHaveProperty('isAvailable', 1);
        });

        it('should return 404 for non-existent lootbox type ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for invalid ID (string)', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    describe('GET /api/lootboxes/:lootboxId/drops', () => {
        it('should return all drops for a specific lootbox', async () => {
            const response = await request(app)
                .get('/api/lootboxes/1/drops')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0]).toHaveProperty('lootboxId', 1);
            expect(response.body[0]).toHaveProperty('stoveId');
        });

        it('should return empty array for lootbox with no drops', async () => {
            const response = await request(app)
                .get('/api/lootboxes/99999/drops')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 400 for invalid lootbox ID', async () => {
            const response = await request(app)
                .get('/api/lootboxes/invalid/drops')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    describe('POST /api/lootbox-drops', () => {
        it('should create a new lootbox drop', async () => {
            const db = new Database(dbPath);
            db.exec(`INSERT INTO Lootbox (lootboxId, lootboxTypeId, playerId, openedAt, acquiredHow) 
                     VALUES (50, 1, 1, datetime('now'), 'free')`);
            db.exec(`INSERT INTO Stove (stoveId, typeId, currentOwnerId, mintedAt) 
                     VALUES (50, 1, 1, datetime('now'))`);
            db.close();

            const newDrop = {
                lootboxId: 50,
                stoveId: 50
            };

            const response = await request(app)
                .post('/api/lootbox-drops')
                .send(newDrop)
                .expect(201);

            expect(response.body).toHaveProperty('dropId');
            expect(response.body).toHaveProperty('lootboxId', 50);
            expect(response.body).toHaveProperty('stoveId', 50);
        });

        it('should return 400 when required fields are missing', async () => {
            const invalidDrop = {
                stoveId: 1
            };

            const response = await request(app)
                .post('/api/lootbox-drops')
                .send(invalidDrop)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        it('should return 409 for duplicate drop (constraint violation)', async () => {
            const duplicateDrop = {
                lootboxId: 1,
                stoveId: 1
            };

            const response = await request(app)
                .post('/api/lootbox-drops')
                .send(duplicateDrop)
                .expect(409);

            expect(response.body).toHaveProperty('error');
        });
    });
});