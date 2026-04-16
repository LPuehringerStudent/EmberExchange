import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'EmberExchange-test-lootbox-type.db');

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

describe('Lootbox Type API Endpoints', () => {
    beforeAll(() => {
        const db = new Database(dbPath, { fileMustExist: false });
        db.pragma('foreign_keys = ON');

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
            INSERT INTO LootboxType (lootboxTypeId, name, description, costCoins, costFree, dailyLimit, isAvailable) VALUES
            (1, 'Standard Box',  'A regular lootbox',    500,  0, NULL, 1),
            (2, 'Daily Free Box','Free once a day',      0,    1, 1,    1),
            (3, 'Premium Box',   'High chance of rare',  2000, 0, NULL, 1),
            (4, 'Retired Box',   'No longer available',  1000, 0, NULL, 0)
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
    // GET /api/lootbox-types
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-types', () => {
        it('should return all lootbox types including unavailable ones', async () => {
            const response = await request(app)
                .get('/api/lootbox-types')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(4);
            expect(response.body[0]).toHaveProperty('lootboxTypeId');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('costCoins');
            expect(response.body[0]).toHaveProperty('isAvailable');
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-types/available
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-types/available', () => {
        it('should return only available lootbox types', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/available')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
            response.body.forEach((lt: any) => {
                expect(lt.isAvailable).toBeTruthy();
            });
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-types/count
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-types/count', () => {
        it('should return the total count of lootbox types', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/count')
                .expect(200);

            expect(response.body).toHaveProperty('count');
            expect(typeof response.body.count).toBe('number');
            expect(response.body.count).toBeGreaterThanOrEqual(4);
        });
    });

    // -------------------------------------------------------------------------
    // GET /api/lootbox-types/:id
    // -------------------------------------------------------------------------
    describe('GET /api/lootbox-types/:id', () => {
        it('should return a lootbox type by valid ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/1')
                .expect(200);

            expect(response.body).toHaveProperty('lootboxTypeId', 1);
            expect(response.body).toHaveProperty('name', 'Standard Box');
            expect(response.body).toHaveProperty('costCoins', 500);
        });

        it('should return an unavailable lootbox type by ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/4')
                .expect(200);

            expect(response.body).toHaveProperty('lootboxTypeId', 4);
            expect(response.body).toHaveProperty('name', 'Retired Box');
        });

        it('should return 404 for a non-existent lootbox type ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid (non-numeric) ID', async () => {
            const response = await request(app)
                .get('/api/lootbox-types/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // POST /api/lootbox-types
    // -------------------------------------------------------------------------
    describe('POST /api/lootbox-types', () => {
        it('should create a new lootbox type successfully', async () => {
            const payload = {
                name: 'Test Box',
                description: 'A test lootbox type',
                costCoins: 300,
                costFree: false,
                dailyLimit: null,
                isAvailable: true,
            };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('lootboxTypeId');
            expect(response.body).toHaveProperty('name', 'Test Box');
            expect(typeof response.body.lootboxTypeId).toBe('number');
        });

        it('should create a free daily lootbox type', async () => {
            const payload = {
                name: 'Another Free Box',
                costCoins: 0,
                costFree: true,
                dailyLimit: 1,
                isAvailable: true,
            };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(201);

            expect(response.body).toHaveProperty('lootboxTypeId');
        });

        it('should return 400 when name is missing', async () => {
            const payload = { costCoins: 100, costFree: false, isAvailable: true };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('name');
        });

        it('should return 400 when costCoins is negative', async () => {
            const payload = { name: 'Bad Box', costCoins: -50, costFree: false, isAvailable: true };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('costcoins');
        });

        it('should return 400 when costFree is not a boolean', async () => {
            const payload = { name: 'Bad Box', costCoins: 100, costFree: 'yes', isAvailable: true };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('costfree');
        });

        it('should return 400 when isAvailable is not a boolean', async () => {
            const payload = { name: 'Bad Box', costCoins: 100, costFree: false, isAvailable: 'true' };

            const response = await request(app)
                .post('/api/lootbox-types')
                .send(payload)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('isavailable');
        });
    });

    // -------------------------------------------------------------------------
    // PATCH /api/lootbox-types/:id
    // -------------------------------------------------------------------------
    describe('PATCH /api/lootbox-types/:id', () => {
        it('should update an existing lootbox type successfully', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/1')
                .send({ name: 'Updated Standard Box', costCoins: 600 })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lootbox type updated');
        });

        it('should allow partial updates (only one field)', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/2')
                .send({ dailyLimit: 3 })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lootbox type updated');
        });

        it('should return 404 for a non-existent lootbox type', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/99999')
                .send({ name: 'Ghost Box' })
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/invalid')
                .send({ name: 'Whatever' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // PATCH /api/lootbox-types/:id/availability
    // -------------------------------------------------------------------------
    describe('PATCH /api/lootbox-types/:id/availability', () => {
        it('should set a lootbox type to unavailable', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/3/availability')
                .send({ isAvailable: false })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Availability updated');
        });

        it('should re-enable an unavailable lootbox type', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/4/availability')
                .send({ isAvailable: true })
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Availability updated');
        });

        it('should return 404 for a non-existent lootbox type', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/99999/availability')
                .send({ isAvailable: false })
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 when isAvailable is not a boolean', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/1/availability')
                .send({ isAvailable: 'yes' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('isavailable');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .patch('/api/lootbox-types/invalid/availability')
                .send({ isAvailable: true })
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });

    // -------------------------------------------------------------------------
    // DELETE /api/lootbox-types/:id
    // -------------------------------------------------------------------------
    describe('DELETE /api/lootbox-types/:id', () => {
        it('should delete a lootbox type that has no associated lootboxes', async () => {
            // Create a temporary lootbox type to delete
            const createResponse = await request(app)
                .post('/api/lootbox-types')
                .send({ name: 'Temp Delete Box', costCoins: 0, costFree: false, isAvailable: false });

            const { lootboxTypeId } = createResponse.body;

            const response = await request(app)
                .delete(`/api/lootbox-types/${lootboxTypeId}`)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lootbox type deleted');
        });

        it('should return 404 for a non-existent lootbox type', async () => {
            const response = await request(app)
                .delete('/api/lootbox-types/99999')
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('not found');
        });

        it('should return 400 for an invalid ID', async () => {
            const response = await request(app)
                .delete('/api/lootbox-types/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error.toLowerCase()).toContain('valid number');
        });
    });
});