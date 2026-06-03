import http from "http";
import WebSocket from "ws";
import request from "supertest";
import { app } from "../../backend/app";
import { setupWebSocketServer } from "../../backend/websocket";
import { connectionManager } from "../../backend/websocket/connection-manager";
import { Unit, DB, resetDatabase } from "../../backend/utils/unit";

async function main() {
    const server = http.createServer(app);
    setupWebSocketServer(server);
    await new Promise<void>((resolve, reject) => {
        server.listen(0, (err?: Error) => {
            if (err) reject(err);
            else resolve();
        });
    });
    const address = server.address() as { port: number };
    const baseUrl = `ws://localhost:${address.port}`;

    const client = await DB.createDBConnection();
    await resetDatabase(client);
    client.release();

    const unit = await Unit.create(false);
    const suffix = `${Date.now()}`;
    const playerStmt = unit.prepare<{ playerId: number }, { username: string; email: string }>(
        `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt)
         VALUES (@username, 'password', @email, 1000, 10, 0, NOW()) RETURNING playerId`,
        { username: `p1_${suffix}`, email: `p1_${suffix}@example.com` }
    );
    const p1 = await playerStmt.get();
    const playerStmt2 = unit.prepare<{ playerId: number }, { username: string; email: string }>(
        `INSERT INTO Player (username, password, email, coins, lootboxCount, isAdmin, joinedAt)
         VALUES (@username, 'password', @email, 1000, 10, 0, NOW()) RETURNING playerId`,
        { username: `p2_${suffix}`, email: `p2_${suffix}@example.com` }
    );
    const p2 = await playerStmt2.get();

    const sessionStmt = unit.prepare<unknown, { sessionId: string; playerId: number }>(
        `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
         VALUES (@sessionId, @playerId, NOW(), NOW() + INTERVAL '1 day', 1)`,
        { sessionId: `s1_${suffix}`, playerId: p1!.playerId }
    );
    await sessionStmt.run();
    const sessionStmt2 = unit.prepare<unknown, { sessionId: string; playerId: number }>(
        `INSERT INTO Session (sessionId, playerId, createdAt, expiresAt, isActive)
         VALUES (@sessionId, @playerId, NOW(), NOW() + INTERVAL '1 day', 1)`,
        { sessionId: `s2_${suffix}`, playerId: p2!.playerId }
    );
    await sessionStmt2.run();
    await unit.complete(true);

    // Create room
    const roomRes = await request(app).post("/api/rooms").send({ maxPlayers: 4, gameType: "poker" });
    const roomId = roomRes.body.roomId;
    console.log("Room:", roomId);

    // Connect WS
    const ws1 = new WebSocket(`${baseUrl}/ws?sessionId=s1_${suffix}`);
    const ws2 = new WebSocket(`${baseUrl}/ws?sessionId=s2_${suffix}`);

    await Promise.all([
        new Promise<void>((r) => ws1.on("open", () => r())),
        new Promise<void>((r) => ws2.on("open", () => r()))
    ]);
    console.log("WS connected");

    // Helper to wait for message
    function waitMsg(ws: WebSocket, label: string): Promise<Record<string, unknown>> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), 5000);
            const handler = (data: WebSocket.RawData) => {
                clearTimeout(timer);
                ws.off("message", handler);
                resolve(JSON.parse(data.toString()));
            };
            ws.on("message", handler);
        });
    }

    // Join room
    ws1.send(JSON.stringify({ type: "join_room", payload: { roomId }, clientTimestamp: Date.now(), sequenceNumber: 1 }));
    ws2.send(JSON.stringify({ type: "join_room", payload: { roomId }, clientTimestamp: Date.now(), sequenceNumber: 1 }));

    const j1 = await waitMsg(ws1, "p1 join");
    console.log("P1 join:", j1.type);
    const j2 = await waitMsg(ws2, "p2 join");
    console.log("P2 join:", j2.type);

    // Start game
    ws1.send(JSON.stringify({ type: "start_game", payload: { roomId }, clientTimestamp: Date.now(), sequenceNumber: 2 }));
    const s1 = await waitMsg(ws1, "p1 start");
    console.log("P1 start:", s1.type, (s1.payload as any).stateBlob?.phase);
    const s2 = await waitMsg(ws2, "p2 start");
    console.log("P2 start:", s2.type, (s2.payload as any).stateBlob?.phase);

    // Check preflop
    const blob1 = (s1.payload as any).stateBlob;
    console.log("Active player:", blob1.activePlayer, "P1:", p1!.playerId, "P2:", p2!.playerId);

    // Send checks
    for (let round = 0; round < 4; round++) {
        for (let i = 0; i < 2; i++) {
            const activeWs = blob1.activePlayer === p1!.playerId ? ws1 : ws2;
            console.log(`Round ${round}, check ${i}, activePlayer=${blob1.activePlayer}`);
            activeWs.send(JSON.stringify({
                type: "player_action",
                payload: { roomId, actionType: "check", actionData: {} },
                clientTimestamp: Date.now(),
                sequenceNumber: 10 + round * 2 + i
            }));
            const r1 = await waitMsg(ws1, `p1 r${round}c${i}`);
            const r2 = await waitMsg(ws2, `p2 r${round}c${i}`);
            console.log("P1:", r1.type, (r1.payload as any).stateBlob?.phase, (r1.payload as any)?.code);
            console.log("P2:", r2.type, (r2.payload as any).stateBlob?.phase, (r2.payload as any)?.code);
            blob1.activePlayer = (r1.payload as any).stateBlob?.activePlayer;
            blob1.phase = (r1.payload as any).stateBlob?.phase;
        }
    }

    ws1.close();
    ws2.close();
    connectionManager.clearAll();
    server.close();
    await DB.getPool().end();
    console.log("Done");
}

main().catch(console.error);
