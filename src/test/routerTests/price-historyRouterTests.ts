// Set test database to use a unique file for test isolation
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), "src", "backend", "db");
const dbPath = path.join(dbDir, "EmberExchange-test-price-history.db");

// Ensure test database directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Remove any existing test database to start fresh
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
    } catch (e) {
        // Ignore errors
    }
}

// Set environment variable to use test database
process.env.TEST_DB_PATH = dbPath;

// Now import the app and other modules
import request from "supertest";
import { app } from "../../backend/app";
import Database from "better-sqlite3";

describe("PriceHistory API Endpoints", () => {
    beforeAll(() => {
        // Create database schema
        const db = new Database(dbPath, { fileMustExist: false });
        db.pragma("foreign_keys = ON");

        // Create required tables
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
            CREATE TABLE IF NOT EXISTS PriceHistory (
                historyId INTEGER PRIMARY KEY AUTOINCREMENT,
                typeId INTEGER NOT NULL REFERENCES StoveType(typeId),
                salePrice INTEGER NOT NULL,
                saleDate TEXT NOT NULL
            ) STRICT
        `);

        // Insert test data
        db.exec(`
            INSERT INTO StoveType (typeId, name, imageUrl, rarity, lootboxWeight) VALUES 
            (1, 'Test Stove Common', '/images/test1.png', 'common', 100),
            (2, 'Test Stove Rare', '/images/test2.png', 'rare', 50),
            (3, 'Test Stove Legendary', '/images/test3.png', 'legendary', 5)
        `);

        // Insert test price history records
        db.exec(`
            INSERT INTO PriceHistory (historyId, typeId, salePrice, saleDate) VALUES 
            (1, 1, 5000, datetime('now', '-10 days')),
            (2, 1, 5500, datetime('now', '-8 days')),
            (3, 1, 6000, datetime('now', '-5 days')),
            (4, 1, 5800, datetime('now', '-3 days')),
            (5, 1, 6200, datetime('now', '-1 day')),
            (6, 2, 15000, datetime('now', '-7 days')),
            (7, 2, 16000, datetime('now', '-2 days')),
            (8, 3, 50000, datetime('now', '-1 day'))
        `);

        db.close();
    });

    afterAll(() => {
        // Clean up test database file
        try {
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        delete process.env.TEST_DB_PATH;
    });

    describe("GET /api/price-history", () => {
        it("should return all price history records", async () => {
            const response = await request(app)
                .get("/api/price-history")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(8);
            expect(response.body[0]).toHaveProperty("historyId");
            expect(response.body[0]).toHaveProperty("typeId");
            expect(response.body[0]).toHaveProperty("salePrice");
            expect(response.body[0]).toHaveProperty("saleDate");
        });
    });

    describe("GET /api/price-history/:id", () => {
        it("should return a price history record by valid ID", async () => {
            const response = await request(app)
                .get("/api/price-history/1")
                .expect(200);

            expect(response.body).toHaveProperty("historyId", 1);
            expect(response.body).toHaveProperty("typeId", 1);
            expect(response.body).toHaveProperty("salePrice", 5000);
            expect(response.body).toHaveProperty("saleDate");
        });

        it("should return 404 for non-existent price history ID", async () => {
            const response = await request(app)
                .get("/api/price-history/99999")
                .expect(404);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("not found");
        });

        it("should return 400 for invalid ID (string)", async () => {
            const response = await request(app)
                .get("/api/price-history/invalid")
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("valid number");
        });
    });

    describe("GET /api/stove-types/:typeId/price-history", () => {
        it("should return price history for a specific stove type", async () => {
            const response = await request(app)
                .get("/api/stove-types/1/price-history")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(5);
            response.body.forEach((record: any) => {
                expect(record.typeId).toBe(1);
            });
        });

        it("should return empty array for stove type with no price history", async () => {
            const response = await request(app)
                .get("/api/stove-types/99999/price-history")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it("should return 400 for invalid stove type ID", async () => {
            const response = await request(app)
                .get("/api/stove-types/invalid/price-history")
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("valid number");
        });
    });

    describe("POST /api/price-history", () => {
        it("should record a new sale with valid data", async () => {
            const newSale = {
                typeId: 1,
                salePrice: 7500
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(newSale)
                .expect(201);

            expect(response.body).toHaveProperty("historyId");
            expect(response.body).toHaveProperty("message", "Sale recorded successfully");
            expect(typeof response.body.historyId).toBe("number");
        });

        it("should record another sale with different price", async () => {
            const newSale = {
                typeId: 2,
                salePrice: 18000
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(newSale)
                .expect(201);

            expect(response.body).toHaveProperty("historyId");
            expect(response.body).toHaveProperty("message", "Sale recorded successfully");
        });

        it("should return 400 when required fields are missing", async () => {
            const invalidSale = {
                typeId: 1
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(invalidSale)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("required");
        });

        it("should return 400 when salePrice is negative", async () => {
            const invalidSale = {
                typeId: 1,
                salePrice: -100
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(invalidSale)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("positive");
        });

        it("should return 400 when salePrice is zero", async () => {
            const invalidSale = {
                typeId: 1,
                salePrice: 0
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(invalidSale)
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("positive");
        });

        it("should return 400 when typeId does not exist", async () => {
            const invalidSale = {
                typeId: 99999,
                salePrice: 5000
            };

            const response = await request(app)
                .post("/api/price-history")
                .send(invalidSale)
                .expect(400);

            expect(response.body).toHaveProperty("error");
        });
    });

    describe("GET /api/stove-types/:typeId/price-stats", () => {
        it("should return price statistics for a stove type", async () => {
            const response = await request(app)
                .get("/api/stove-types/1/price-stats")
                .expect(200);

            expect(response.body).toHaveProperty("typeId", 1);
            expect(response.body).toHaveProperty("count");
            expect(response.body).toHaveProperty("average");
            expect(response.body).toHaveProperty("min");
            expect(response.body).toHaveProperty("max");
            expect(response.body).toHaveProperty("median");
            expect(typeof response.body.count).toBe("number");
            expect(typeof response.body.average).toBe("number");
        });

        it("should return 404 for stove type with no price history", async () => {
            const response = await request(app)
                .get("/api/stove-types/99999/price-stats")
                .expect(404);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("not found");
        });

        it("should return 400 for invalid stove type ID", async () => {
            const response = await request(app)
                .get("/api/stove-types/invalid/price-stats")
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("valid number");
        });
    });

    describe("GET /api/stove-types/:typeId/recent-prices", () => {
        it("should return recent prices with default limit", async () => {
            const response = await request(app)
                .get("/api/stove-types/1/recent-prices")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            response.body.forEach((record: any) => {
                expect(record.typeId).toBe(1);
            });
        });

        it("should return recent prices with specified limit", async () => {
            const response = await request(app)
                .get("/api/stove-types/1/recent-prices?limit=5")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(5);
        });

        it("should return 400 for invalid limit parameter", async () => {
            const response = await request(app)
                .get("/api/stove-types/1/recent-prices?limit=invalid")
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("valid number");
        });

        it("should return empty array for stove type with no prices", async () => {
            const response = await request(app)
                .get("/api/stove-types/99999/recent-prices")
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });
    });

    describe("DELETE /api/price-history/:id", () => {
        it("should delete an existing price history record", async () => {
            const createResponse = await request(app)
                .post("/api/price-history")
                .send({ typeId: 1, salePrice: 9999 });

            const historyId = createResponse.body.historyId;

            const response = await request(app)
                .delete(`/api/price-history/${historyId}`)
                .expect(200);

            expect(response.body).toHaveProperty("message", "Price history record deleted");
        });

        it("should return 404 for non-existent price history record", async () => {
            const response = await request(app)
                .delete("/api/price-history/99999")
                .expect(404);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("not found");
        });

        it("should return 400 for invalid ID", async () => {
            const response = await request(app)
                .delete("/api/price-history/invalid")
                .expect(400);

            expect(response.body).toHaveProperty("error");
            expect(response.body.error.toLowerCase()).toContain("valid number");
        });
    });
});