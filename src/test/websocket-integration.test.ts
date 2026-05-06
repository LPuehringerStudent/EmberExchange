import http from "http";
import WebSocket from "ws";
import request from "supertest";
import { app } from "../backend/app";
import { setupWebSocketServer } from "../backend/websocket";
import { connectionManager } from "../backend/websocket/connection-manager";
import { Unit, DB, resetDatabase } from "../backend/utils/unit";
import { PlayerService } from "../backend/services/player-service";

describe("WebSocket Integration", () => {
    let server: http.Server;
    let baseUrl: string;
    let testPlayerId: number;
    let testSessionId: string;
    let testPlayer2Id: number;
    let testSession2Id: string;

    beforeAll(async () => {
        server = http.createServer(app);
        setupWebSocketServer(server);
        await new Promise<void>((resolve, reject) => {
            server.listen(0, (err?: Error) => {
                if (err) reject(err);
                else resolve();
            });
        });
        const address = server.address() as { port: number };
        baseUrl = `ws://localhost:${address.port}`;

        // Ensure all tables exist (tests don't run app.ts main block)
        const client = await DB.createDBConnection();
        try {
            await resetDatabase(client);
        } finally {
            client.release();
        }

        // Create two test players and sessions directly (avoid createPlayer's lootbox seeding)
        const unit = await Unit.create(false);
        try {
            for (let i = 0; i < 2; i++) {
                const suffix = `${Date.now()}_${i}`;
                const username = `ws_test_${suffix}`;
                const email = `ws_test_${suffix}@example.com`;

                const playerStmt = unit.prepare<
                    { playerId: number },
                    { username: string; email: string }
                >(
                    `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt)
                     VALUES (@username, 'password', @email, 1000, 10, 0, NOW())
                     RETURNING playerId`,
                    { username, email }
                );
                const playerRow = await playerStmt.get();
                if (!playerRow) throw new Error("Failed to create test player");
                const playerId = playerRow.playerId;

                const sessionId = `test_session_${suffix}`;
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                const sessionStmt = unit.prepare<
                    unknown,
                    { sessionId: string; playerId: number; expiresAt: string }
                >(
                    `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
                     VALUES (@sessionId, @playerId, NOW(), @expiresAt, 1)`,
                    { sessionId, playerId, expiresAt }
                );
                await sessionStmt.run();

                if (i === 0) {
                    testPlayerId = playerId;
                    testSessionId = sessionId;
                } else {
                    testPlayer2Id = playerId;
                    testSession2Id = sessionId;
                }
            }
        } finally {
            await unit.complete(true);
        }
    });

    afterAll(async () => {
        // Clean up test players
        for (const pid of [testPlayerId, testPlayer2Id]) {
            if (pid) {
                try {
                    const unit = await Unit.create(false);
                    try {
                        const playerService = new PlayerService(unit);
                        await playerService.deletePlayer(pid);
                    } catch {
                        // ignore cleanup errors
                    } finally {
                        await unit.complete(true).catch(() => {});
                    }
                } catch {
                    // ignore
                }
            }
        }

        // Force-close all WS sockets and clear grace timers so server can close
        connectionManager.clearAll();

        (server as any).closeAllConnections?.();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await DB.getPool().end();
    }, 30000);

    function connectWs(sessionId?: string): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            const url = sessionId ? `${baseUrl}/ws?sessionId=${sessionId}` : `${baseUrl}/ws`;
            const ws = new WebSocket(url);
            const timeout = setTimeout(() => {
                ws.terminate();
                reject(new Error("WS connect timeout"));
            }, 3000);

            ws.on("open", () => {
                clearTimeout(timeout);
                setTimeout(() => resolve(ws), 100);
            });

            ws.on("close", () => {
                clearTimeout(timeout);
                setTimeout(() => resolve(ws), 100);
            });

            ws.on("error", (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    function waitForMessage(ws: WebSocket, timeoutMs = 3000, label = "message"): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Message timeout: ${label}`)), timeoutMs);
            const handler = (data: WebSocket.RawData) => {
                clearTimeout(timer);
                ws.off("message", handler);
                try {
                    resolve(JSON.parse(data.toString()));
                } catch (e) {
                    reject(e);
                }
            };
            ws.on("message", handler);
        });
    }

    async function collectMessages(ws: WebSocket, count: number, timeoutMs = 3000): Promise<Record<string, unknown>[]> {
        return new Promise((resolve, reject) => {
            const messages: Record<string, unknown>[] = [];
            const timer = setTimeout(() => resolve(messages), timeoutMs);
            const handler = (data: WebSocket.RawData) => {
                try {
                    messages.push(JSON.parse(data.toString()));
                    if (messages.length >= count) {
                        clearTimeout(timer);
                        ws.off("message", handler);
                        resolve(messages);
                    }
                } catch (e) {
                    clearTimeout(timer);
                    ws.off("message", handler);
                    reject(e);
                }
            };
            ws.on("message", handler);
        });
    }

    async function createRoom(gameType = "poker"): Promise<string> {
        const res = await request(app)
            .post("/api/rooms")
            .send({ maxPlayers: 4, gameType });
        expect(res.status).toBe(201);
        return res.body.roomId as string;
    }

    async function joinRoom(ws: WebSocket, roomId: string, seq: number): Promise<void> {
        ws.send(JSON.stringify({
            type: "join_room",
            payload: { roomId },
            clientTimestamp: Date.now(),
            sequenceNumber: seq
        }));
        const msg = await waitForMessage(ws, 3000, `join_room seq=${seq}`);
        expect(msg.type).toBe("state_update");
    }

    async function startGame(ws: WebSocket, roomId: string, seq: number): Promise<Record<string, unknown>> {
        ws.send(JSON.stringify({
            type: "start_game",
            payload: { roomId },
            clientTimestamp: Date.now(),
            sequenceNumber: seq
        }));
        const msg = await waitForMessage(ws);
        expect(msg.type).toBe("state_update");
        expect((msg.payload as Record<string, unknown>).stateBlob).toEqual(
            expect.objectContaining({ status: "active" })
        );
        return msg;
    }

    it("should reject connection without sessionId", async () => {
        const ws = await connectWs();
        expect(ws.readyState).not.toBe(WebSocket.OPEN);
    });

    it("should reject connection with invalid sessionId", async () => {
        const ws = await connectWs("invalid_session_12345");
        expect(ws.readyState).not.toBe(WebSocket.OPEN);
    });

    it("should accept connection with valid sessionId", async () => {
        const ws = await connectWs(testSessionId);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
    });

    it("should create a room via HTTP", async () => {
        const roomId = await createRoom();
        expect(roomId).toBeDefined();
    });

    it("should join room and receive state update", async () => {
        const roomId = await createRoom();
        const ws = await connectWs(testSessionId);
        await joinRoom(ws, roomId, 1);
        ws.close();
    });

    it.skip("should reject player_action in waiting room", async () => {
        const roomId = await createRoom();
        const ws = await connectWs(testSessionId);
        await joinRoom(ws, roomId, 1);

        ws.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "test", actionData: {}, expectedVersion: 0 },
            clientTimestamp: Date.now(),
            sequenceNumber: 2
        }));

        const errMsg = await waitForMessage(ws);
        expect(errMsg.type).toBe("error");
        expect((errMsg.payload as Record<string, unknown>).code).toBe("INVALID_STATE");
        ws.close();
    });

    it("should handle player_action with optimistic locking", async () => {
        const roomId = await createRoom();
        const ws = await connectWs(testSessionId);
        await joinRoom(ws, roomId, 1);
        const stateMsg = await startGame(ws, roomId, 2);

        const version = (stateMsg.payload as Record<string, unknown>).version as number;

        ws.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "test", actionData: {}, expectedVersion: version },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));

        const actionMsg = await waitForMessage(ws, 3000, "player_action response");
        expect(actionMsg.type).toBe("state_update");
        expect((actionMsg.payload as Record<string, unknown>).version).toBe(version + 1);

        ws.close();
    });

    it("should return VERSION_MISMATCH on stale version", async () => {
        const roomId = await createRoom();
        const ws = await connectWs(testSessionId);
        await joinRoom(ws, roomId, 1);
        await startGame(ws, roomId, 2);

        ws.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "test", actionData: {}, expectedVersion: -1 },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));

        const errMsg = await waitForMessage(ws);
        expect(errMsg.type).toBe("error");
        expect((errMsg.payload as Record<string, unknown>).code).toBe("VERSION_MISMATCH");

        ws.close();
    });

    it("should handle concurrent actions with optimistic locking", async () => {
        const roomId = await createRoom();

        const ws1 = await connectWs(testSessionId);
        const ws2 = await connectWs(testSession2Id);

        await joinRoom(ws1, roomId, 1);
        await joinRoom(ws2, roomId, 1);

        // Start game from player 1
        const stateForP1 = await startGame(ws1, roomId, 2);
        // Player 2 also gets the state_update from start_game
        await waitForMessage(ws2);

        // Both players read version from their latest state_update
        const version = (stateForP1.payload as Record<string, unknown>).version as number;

        // Both send player_action with the same expected version simultaneously
        ws1.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "race", actionData: { player: 1 }, expectedVersion: version },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));
        ws2.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "race", actionData: { player: 2 }, expectedVersion: version },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));

        // Collect responses for both sockets
        // ws1 should get its own success response
        // ws2 may get the broadcast from ws1 AND its own error, so collect multiple
        const [ws1Msg, ws2Msgs] = await Promise.all([
            waitForMessage(ws1, 3000, "ws1 player_action"),
            collectMessages(ws2, 2, 3000)
        ]);

        // ws1 must have succeeded (it wins the race)
        expect(ws1Msg.type).toBe("state_update");
        expect((ws1Msg.payload as Record<string, unknown>).version).toBe(version + 1);

        // ws2 must have received a VERSION_MISMATCH error (may also have received a broadcast)
        const ws2Errors = ws2Msgs.filter((msg) => msg.type === "error");
        expect(ws2Errors.length).toBeGreaterThanOrEqual(1);
        expect((ws2Errors[0].payload as Record<string, unknown>).code).toBe("VERSION_MISMATCH");

        ws1.close();
        ws2.close();
    });

    it("should allow reconnection within grace period", async () => {
        const roomId = await createRoom();
        const ws = await connectWs(testSessionId);
        await joinRoom(ws, roomId, 1);

        // Disconnect
        ws.close();
        await new Promise((r) => setTimeout(r, 500));

        // Reconnect with new socket
        const ws2 = await connectWs(testSessionId);
        ws2.send(JSON.stringify({
            type: "join_room",
            payload: { roomId },
            clientTimestamp: Date.now(),
            sequenceNumber: 2
        }));

        const msg = await waitForMessage(ws2);
        expect(msg.type).toBe("state_update");

        // Verify player is still in room via HTTP
        const roomRes = await request(app).get(`/api/rooms/${roomId}`);
        expect(roomRes.status).toBe(200);
        const players = roomRes.body.players as Array<{ playerId: number; connectionState: string }>;
        const me = players.find((p) => p.playerId === testPlayerId);
        expect(me?.connectionState).toBe("connected");

        ws2.close();
    });

    it("should rate limit excessive messages", async () => {
        const ws = await connectWs(testSessionId);

        let rateLimited = false;
        const handler = (data: WebSocket.RawData) => {
            const msg = JSON.parse(data.toString()) as Record<string, unknown>;
            if (msg.type === "error" && (msg.payload as Record<string, unknown>)?.code === "RATE_LIMITED") {
                rateLimited = true;
            }
        };
        ws.on("message", handler);

        // Burst 50 messages to overwhelm the rate limiter even with sequential processing
        for (let i = 0; i < 50; i++) {
            ws.send(JSON.stringify({
                type: "request_sync",
                payload: { roomId: "00000000-0000-0000-0000-000000000000" },
                clientTimestamp: Date.now(),
                sequenceNumber: i + 1
            }));
        }

        await new Promise((r) => setTimeout(r, 3000));
        expect(rateLimited).toBe(true);
        ws.off("message", handler);
        ws.close();
    });
});
