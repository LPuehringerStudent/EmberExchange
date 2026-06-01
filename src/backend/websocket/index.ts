import WebSocket, { WebSocketServer } from "ws";
import http from "http";

import { authenticateSession } from "./auth";
import { connectionManager } from "./connection-manager";
import { rateLimiter } from "./rate-limiter";
import { handleMessage } from "./message-handler";
import { RoomPlayerService } from "../services/room-player-service";
import { GameStateService } from "../services/game-state-service";
import { RoomService } from "../services/room-service";
import { Unit } from "../utils/unit";
import { engineRegistry } from "../game-engines";
import { clearTurnTimer } from "./turn-timer";

export let wssInstance: WebSocketServer | null = null;

// Per-IP WebSocket connection limit (P1 DoS hardening)
const wsConnectionsByIp = new Map<string, number>();
const MAX_WS_CONNECTIONS_PER_IP = 10;

function getClientIp(req: http.IncomingMessage): string {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string" && cfIp.length > 0) return cfIp.trim();
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        const hops = forwarded.split(",").map(s => s.trim()).filter(Boolean);
        if (hops.length > 0) return hops[hops.length - 1];
    }
    return req.socket.remoteAddress ?? "unknown";
}

export function setupWebSocketServer(server: http.Server): void {
    const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 65536 });
    wssInstance = wss;

    wss.on("connection", async (ws, req) => {
        const clientIp = getClientIp(req);
        const currentCount = wsConnectionsByIp.get(clientIp) ?? 0;
        if (currentCount >= MAX_WS_CONNECTIONS_PER_IP) {
            console.warn(`[WebSocket] Rejecting connection from ${clientIp}: limit ${MAX_WS_CONNECTIONS_PER_IP} reached`);
            ws.close(1013, "TRY_AGAIN_LATER");
            return;
        }
        wsConnectionsByIp.set(clientIp, currentCount + 1);

        // Read sessionId from WebSocket subprotocol header (avoids leaking it to logs/URL/history)
        const rawProtocol = req.headers["sec-websocket-protocol"];
        const sessionId = typeof rawProtocol === "string" ? rawProtocol.split(",")[0].trim() : undefined;

        // Attach message listener immediately so messages don't get lost
        // while authenticateSession runs asynchronously
        const messageQueue: WebSocket.RawData[] = [];
        let isProcessing = false;
        let activeSocketId = "";
        let authComplete = false;

        async function processQueue(): Promise<void> {
            while (messageQueue.length > 0) {
                const rawData = messageQueue.shift()!;
                try {
                    const data = JSON.parse(rawData.toString());
                    await handleMessage(activeSocketId, data);
                } catch (err) {
                    console.error("WebSocket message parse error:", err);
                    if (activeSocketId) {
                        connectionManager.sendToSocket(activeSocketId, {
                            type: "error",
                            payload: { code: "INVALID_STATE", message: "Invalid message format", recoverable: true }
                        });
                    }
                }
            }
            isProcessing = false;
        }

        ws.on("message", (rawData) => {
            // Cap pre-auth queue to prevent memory exhaustion from unauthenticated sockets
            if (!authComplete && messageQueue.length >= 10) {
                console.warn("WebSocket pre-auth queue full — dropping message");
                return;
            }
            messageQueue.push(rawData);
            if (!isProcessing && authComplete) {
                isProcessing = true;
                void processQueue();
            }
        });

        const auth = await authenticateSession(sessionId || null);
        if (!auth) {
            ws.close(1008, "AUTH_EXPIRED");
            return;
        }

        activeSocketId = connectionManager.generateSocketId();
        connectionManager.register(activeSocketId, ws, auth.playerId);
        authComplete = true;

        // Process any messages that arrived during auth
        if (messageQueue.length > 0 && !isProcessing) {
            isProcessing = true;
            void processQueue();
        }

        ws.on("close", async () => {
            const count = wsConnectionsByIp.get(clientIp) ?? 1;
            if (count <= 1) {
                wsConnectionsByIp.delete(clientIp);
            } else {
                wsConnectionsByIp.set(clientIp, count - 1);
            }
            await handleDisconnect(activeSocketId);
        });

        ws.on("error", (err) => {
            console.error(`WebSocket error for socket ${activeSocketId}:`, err);
        });
    });
}

async function handleDisconnect(socketId: string): Promise<void> {
    const meta = connectionManager.getMeta(socketId);
    if (!meta || !meta.roomId) {
        rateLimiter.remove(socketId);
        connectionManager.disconnect(socketId);
        return;
    }

    const roomId = meta.roomId;
    const playerId = meta.playerId;

    // Remove socket from active registry immediately so broadcasts skip it
    rateLimiter.remove(socketId);
    connectionManager.disconnect(socketId);

    // Update DB connection state to disconnected
    const unit = await Unit.create(false);
    let ok = false;
    try {
        const roomPlayerService = new RoomPlayerService(unit);
        const roomPlayer = await roomPlayerService.getPlayerInRoom(roomId, playerId);
        if (roomPlayer) {
            await roomPlayerService.updateConnectionState(roomPlayer.roomPlayerId, "disconnected");
        }
        ok = true;
    } finally {
        await unit.complete(ok);
    }

    // Set auto-fold timer for active games
    const foldUnit = await Unit.create(true);
    try {
        const roomService = new RoomService(foldUnit);
        const room = await roomService.getRoomById(roomId);
        if (room && room.status === "active") {
            connectionManager.setAutoFoldTimer(roomId, playerId, async () => {
                const afUnit = await Unit.create(false);
                let afOk = false;
                try {
                    const afRoomService = new RoomService(afUnit);
                    const afRoomPlayerService = new RoomPlayerService(afUnit);
                    const afGameStateService = new GameStateService(afUnit);

                    const afRoom = await afRoomService.getRoomById(roomId);
                    if (!afRoom || afRoom.status !== "active") return;

                    const state = await afGameStateService.getState(roomId);
                    if (!state) return;

                    const rp = await afRoomPlayerService.getPlayerInRoom(roomId, playerId);
                    if (!rp || rp.connectionState !== "disconnected") return;

                    const engine = engineRegistry.get(afRoom.gameType);
                    const result = engine.processAction(
                        state.stateBlob as Record<string, unknown>,
                        { type: "fold" },
                        playerId
                    );

                    if (!result.valid) return;

                    const updateResult = await afGameStateService.updateState(
                        roomId,
                        result.newFullState!,
                        state.version
                    );
                    if (!updateResult.success) return;

                    const playersInRoom = await afRoomPlayerService.getPlayersInRoom(roomId);
                    for (const p of playersInRoom) {
                        const view = result.playerViews!.get(p.playerId);
                        if (view) {
                            const targetSocket = connectionManager.getSocketIdForPlayer(roomId, p.playerId);
                            if (targetSocket) {
                                connectionManager.sendToSocket(targetSocket, {
                                    type: "state_update",
                                    payload: {
                                        stateBlob: view,
                                        version: updateResult.newVersion,
                                        actingPlayer: playerId
                                    }
                                });
                            }
                        }
                    }
                    clearTurnTimer(roomId);
                    afOk = true;
                } finally {
                    await afUnit.complete(afOk);
                }
            });
        }
    } finally {
        await foldUnit.complete();
    }

    // Re-check DB state before starting grace timer — player may have reconnected already
    const checkUnit = await Unit.create(true);
    try {
        const roomPlayerService = new RoomPlayerService(checkUnit);
        const currentPlayer = await roomPlayerService.getPlayerInRoom(roomId, playerId);
        if (currentPlayer && currentPlayer.connectionState === "disconnected") {
            connectionManager.setGraceTimer(roomId, playerId, async () => {
                const graceUnit = await Unit.create(false);
                let graceOk = false;
                try {
                    const roomPlayerService = new RoomPlayerService(graceUnit);
                    const gameStateService = new GameStateService(graceUnit);

                    const roomPlayer = await roomPlayerService.getPlayerInRoom(roomId, playerId);
                    if (roomPlayer && roomPlayer.connectionState === "disconnected") {
                        await roomPlayerService.removePlayer(roomPlayer.roomPlayerId);

                        const state = await gameStateService.getState(roomId);
                        if (state) {
                            const playersInRoom = await roomPlayerService.getPlayersInRoom(roomId);
                            const baseBlob = (typeof state.stateBlob === "object" && state.stateBlob !== null)
                                ? state.stateBlob as Record<string, unknown>
                                : { players: [], status: "waiting", log: [] };

                            const newBlob = {
                                ...baseBlob,
                                players: playersInRoom.map(p => ({
                                    playerId: p.playerId,
                                    username: p.username,
                                    activeTitle: p.activeTitle,
                                    activeBanner: p.activeBanner,
                                    connectionState: p.connectionState,
                                    seatIndex: p.seatIndex
                                }))
                            };
                            await gameStateService.updateState(roomId, newBlob, state.version);
                        }

                        connectionManager.broadcastToRoom(roomId, {
                            type: "player_left",
                            payload: { playerId, reason: "disconnected" }
                        });

                        const currentState = await gameStateService.getState(roomId);
                        if (currentState) {
                            connectionManager.broadcastToRoom(roomId, {
                                type: "state_update",
                                payload: {
                                    stateBlob: currentState.stateBlob,
                                    version: currentState.version,
                                    actingPlayer: playerId
                                }
                            });
                        }
                    }
                    graceOk = true;
                } finally {
                    await graceUnit.complete(graceOk);
                }
            });
        }
    } finally {
        await checkUnit.complete();
    }
}
