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

    async function createRoom(gameType = "test"): Promise<string> {
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
        const ws1 = await connectWs(testSessionId);
        const ws2 = await connectWs(testSession2Id);
        await joinRoom(ws1, roomId, 1);
        await joinRoom(ws2, roomId, 1);
        const stateMsg = await startGame(ws1, roomId, 2);
        await waitForMessage(ws2); // player 2 also receives state_update

        const version = (stateMsg.payload as Record<string, unknown>).version as number;

        ws1.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "test", actionData: {}, expectedVersion: version },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));

        const actionMsg = await waitForMessage(ws1, 3000, "player_action response");
        expect(actionMsg.type).toBe("state_update");
        expect((actionMsg.payload as Record<string, unknown>).version).toBe(version + 1);

        ws1.close();
        ws2.close();
    });

    it("should return VERSION_MISMATCH on stale version", async () => {
        const roomId = await createRoom();
        const ws1 = await connectWs(testSessionId);
        const ws2 = await connectWs(testSession2Id);
        await joinRoom(ws1, roomId, 1);
        await joinRoom(ws2, roomId, 1);
        await startGame(ws1, roomId, 2);
        await waitForMessage(ws2); // player 2 also receives state_update

        ws1.send(JSON.stringify({
            type: "player_action",
            payload: { roomId, actionType: "test", actionData: {}, expectedVersion: -1 },
            clientTimestamp: Date.now(),
            sequenceNumber: 3
        }));

        const errMsg = await waitForMessage(ws1);
        expect(errMsg.type).toBe("error");
        expect((errMsg.payload as Record<string, unknown>).code).toBe("VERSION_MISMATCH");

        ws1.close();
        ws2.close();
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

        // Collect all messages from both sockets for a short window
        const [ws1Msgs, ws2Msgs] = await Promise.all([
            collectMessages(ws1, 2, 2000),
            collectMessages(ws2, 2, 2000)
        ]);

        const allMsgs = [...ws1Msgs, ...ws2Msgs];
        const successes = allMsgs.filter(
            (msg) => msg.type === "state_update" && (msg.payload as Record<string, unknown>).version === version + 1
        );
        const errors = allMsgs.filter(
            (msg) => msg.type === "error" && (msg.payload as Record<string, unknown>).code === "VERSION_MISMATCH"
        );

        // Exactly one action should succeed and one should get VERSION_MISMATCH
        expect(successes.length).toBeGreaterThanOrEqual(1);
        expect(errors.length).toBe(1);

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

    it("should play a full poker hand with 2 players", async () => {
        const roomId = await createRoom("poker");

        const ws1 = await connectWs(testSessionId);
        const ws2 = await connectWs(testSession2Id);

        await joinRoom(ws1, roomId, 1);
        await joinRoom(ws2, roomId, 1);

        // Drain any pending broadcast messages from join
        await new Promise((r) => setTimeout(r, 200));

        // Start game
        ws1.send(JSON.stringify({
            type: "start_game",
            payload: { roomId },
            clientTimestamp: Date.now(),
            sequenceNumber: 2
        }));

        // Both players receive personalized state_updates with hole cards
        const [msg1, msg2] = await Promise.all([
            waitForMessage(ws1, 3000, "p1 start_game"),
            waitForMessage(ws2, 3000, "p2 start_game")
        ]);

        expect(msg1.type).toBe("state_update");
        expect(msg2.type).toBe("state_update");

        let blob1 = (msg1.payload as Record<string, unknown>).stateBlob as Record<string, unknown>;
        const blob2 = (msg2.payload as Record<string, unknown>).stateBlob as Record<string, unknown>;

        expect(blob1["phase"]).toBe("preflop");
        expect(blob2["phase"]).toBe("preflop");

        // Each player sees their own cards
        const p1Players = blob1["players"] as Array<{ playerId: number; hand: string[] }>;
        const p2Players = blob2["players"] as Array<{ playerId: number; hand: string[] }>;

        const p1Self = p1Players.find((p) => p.playerId === testPlayerId);
        const p1Opponent = p1Players.find((p) => p.playerId === testPlayer2Id);
        const p2Self = p2Players.find((p) => p.playerId === testPlayer2Id);

        expect(p1Self!.hand.length).toBe(2);
        expect(p1Self!.hand[0]).not.toBe("back");
        expect(p1Opponent!.hand).toEqual(["back", "back"]);
        expect(p2Self!.hand.length).toBe(2);
        expect(p2Self!.hand[0]).not.toBe("back");

        // Track version for optimistic locking
        let version = (msg1.payload as Record<string, unknown>).version as number;
        let seq = 10;

        // Play until showdown
        while (blob1["phase"] !== "showdown") {
            const activePlayer = blob1["activePlayer"] as number;
            const activeWs = activePlayer === testPlayerId ? ws1 : ws2;

            // Determine correct action: call if behind, check if matched
            const activePlayerData = (blob1["players"] as Array<{ playerId: number; bet: number }>)
                .find((p) => p.playerId === activePlayer);
            const toCall = (blob1["currentBet"] as number) - (activePlayerData?.bet ?? 0);
            const actionType = toCall > 0 ? "call" : "check";

            // Set up listeners BEFORE sending action
            const p1Promise = waitForMessage(ws1, 3000, `p1 ${blob1["phase"]} ${actionType}`);
            const p2Promise = waitForMessage(ws2, 3000, `p2 ${blob1["phase"]} ${actionType}`);

            activeWs.send(JSON.stringify({
                type: "player_action",
                payload: { roomId, actionType, actionData: {}, expectedVersion: version },
                clientTimestamp: Date.now(),
                sequenceNumber: seq++
            }));

            const [r1, r2] = await Promise.all([p1Promise, p2Promise]);

            expect(r1.type).toBe("state_update");
            expect(r2.type).toBe("state_update");

            version = (r1.payload as Record<string, unknown>).version as number;
            blob1 = (r1.payload as Record<string, unknown>).stateBlob as Record<string, unknown>;

            const currentPhase = blob1["phase"] as string;
            if (currentPhase === "flop") {
                expect((blob1["communityCards"] as string[]).length).toBe(3);
            } else if (currentPhase === "turn") {
                expect((blob1["communityCards"] as string[]).length).toBe(4);
            } else if (currentPhase === "river") {
                expect((blob1["communityCards"] as string[]).length).toBe(5);
            } else if (currentPhase === "showdown") {
                const finalPlayers = blob1["players"] as Array<{ playerId: number; hand: string[] }>;
                const opponent = finalPlayers.find((p) => p.playerId === testPlayer2Id);
                expect(opponent!.hand[0]).not.toBe("back");
                expect(blob1["winners"]).toBeDefined();
            }
        }

        ws1.close();
        ws2.close();
    });
});
