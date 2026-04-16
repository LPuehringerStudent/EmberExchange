import path from 'path';
import fs from 'fs';
import request from 'supertest';
import Database from 'better-sqlite3';
import { app } from '../../backend/app'; // Adjust path to your express app
import { StatusCodes } from 'http-status-codes';

const dbDir = path.join(process.cwd(), 'src', 'backend', 'db');
const dbPath = path.join(dbDir, 'ChatMessage-test.db');

// Setup environment
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
}
process.env.TEST_DB_PATH = dbPath;

describe('ChatMessage API Endpoints', () => {
    beforeAll(() => {
        const db = new Database(dbPath);
        db.pragma('foreign_keys = ON');

        // Setup necessary tables for constraints
        db.exec(`
            CREATE TABLE IF NOT EXISTS Player (
                playerId INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS ChatMessage (
                messageId INTEGER PRIMARY KEY AUTOINCREMENT,
                senderId INTEGER NOT NULL REFERENCES Player(playerId),
                receiverId INTEGER REFERENCES Player(playerId),
                content TEXT NOT NULL,
                isRead INTEGER DEFAULT 0,
                sentAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert initial data
        db.exec(`
            INSERT INTO Player (playerId, username) VALUES (1, 'PlayerOne'), (2, 'PlayerTwo');
            
            INSERT INTO ChatMessage (messageId, senderId, receiverId, content, isRead) VALUES 
            (1, 1, NULL, 'Global Message 1', 0),
            (2, 1, 2, 'Private Hello', 0),
            (3, 2, 1, 'Reply to Hello', 1);
        `);
        db.close();
    });

    afterAll(() => {
        try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
        delete process.env.TEST_DB_PATH;
    });

    describe('GET /api/chat-messages', () => {
        it('should return all messages', async () => {
            const res = await request(app).get('/api/chat-messages');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should return only global messages', async () => {
            const res = await request(app).get('/api/chat-messages/global');
            expect(res.status).toBe(StatusCodes.OK);
            res.body.forEach((msg: any) => expect(msg.receiverId).toBeNull());
        });
    });

    describe('GET /api/chat-messages/:id', () => {
        it('should return message by ID', async () => {
            const res = await request(app).get('/api/chat-messages/1');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body.messageId).toBe(1);
        });

        it('should return 404 for missing message', async () => {
            const res = await request(app).get('/api/chat-messages/999');
            expect(res.status).toBe(StatusCodes.NOT_FOUND);
        });

        it('should return 400 for invalid ID format', async () => {
            const res = await request(app).get('/api/chat-messages/abc');
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });
    });

    describe('POST /api/chat-messages', () => {
        it('should send a global message successfully', async () => {
            const res = await request(app)
                .post('/api/chat-messages')
                .send({ senderId: 1, content: 'Test Global' });
            expect(res.status).toBe(StatusCodes.CREATED);
            expect(res.body).toHaveProperty('messageId');
        });

        it('should send a private message successfully', async () => {
            const res = await request(app)
                .post('/api/chat-messages')
                .send({ senderId: 1, receiverId: 2, content: 'Test Private' });
            expect(res.status).toBe(StatusCodes.CREATED);
        });

        it('should return 400 if content is empty', async () => {
            const res = await request(app)
                .post('/api/chat-messages')
                .send({ senderId: 1, content: ' ' });
            expect(res.status).toBe(StatusCodes.BAD_REQUEST);
        });

        it('should return 409 if sender does not exist (FK check)', async () => {
            const res = await request(app)
                .post('/api/chat-messages')
                .send({ senderId: 999, content: 'Ghost message' });
            expect(res.status).toBe(StatusCodes.CONFLICT);
        });
    });

    describe('PATCH /api/chat-messages/:id/read', () => {
        it('should mark message as read', async () => {
            const res = await request(app).patch('/api/chat-messages/2/read');
            expect(res.status).toBe(StatusCodes.OK);
        });
    });

    describe('Player Stats', () => {
        it('should return unread count for player 2', async () => {
            const res = await request(app).get('/api/players/2/unread-count');
            expect(res.status).toBe(StatusCodes.OK);
            expect(res.body).toHaveProperty('count');
        });

        it('should return conversation between players', async () => {
            const res = await request(app).get('/api/chat-messages/conversation/1/2');
            expect(res.status).toBe(StatusCodes.OK);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('DELETE /api/chat-messages/:id', () => {
        it('should delete a message', async () => {
            const res = await request(app).delete('/api/chat-messages/1');
            expect(res.status).toBe(StatusCodes.OK);
        });
    });
});