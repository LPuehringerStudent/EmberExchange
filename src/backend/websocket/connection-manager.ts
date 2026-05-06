import WebSocket from "ws";
import { ServerMessage } from "../../shared/model";

export interface SocketMeta {
    ws: WebSocket;
    playerId: number;
    roomId?: string;
    sequenceNumbers: Set<number>;
}

interface GraceTimer {
    timeout: NodeJS.Timeout;
    roomId: string;
    playerId: number;
}

class ConnectionManager {
    private sockets = new Map<string, SocketMeta>();
    private rooms = new Map<string, Set<string>>();
    private graceTimers = new Map<string, GraceTimer>();
    private nextSocketId = 1;

    generateSocketId(): string {
        return `ws_${this.nextSocketId++}`;
    }

    register(socketId: string, ws: WebSocket, playerId: number): void {
        this.sockets.set(socketId, { ws, playerId, sequenceNumbers: new Set() });
    }

    getMeta(socketId: string): SocketMeta | undefined {
        return this.sockets.get(socketId);
    }

    joinRoom(socketId: string, roomId: string): void {
        const meta = this.sockets.get(socketId);
        if (!meta) return;

        // Leave previous room if any
        if (meta.roomId && meta.roomId !== roomId) {
            this.leaveRoom(socketId, meta.roomId);
        }

        meta.roomId = roomId;
        let room = this.rooms.get(roomId);
        if (!room) {
            room = new Set();
            this.rooms.set(roomId, room);
        }
        room.add(socketId);

        // Cancel any grace timer for this player in this room
        const graceKey = `${roomId}:${meta.playerId}`;
        const grace = this.graceTimers.get(graceKey);
        if (grace) {
            clearTimeout(grace.timeout);
            this.graceTimers.delete(graceKey);
        }
    }

    leaveRoom(socketId: string, roomId: string): void {
        const meta = this.sockets.get(socketId);
        if (meta && meta.roomId === roomId) {
            meta.roomId = undefined;
        }
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(socketId);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
    }

    setGraceTimer(roomId: string, playerId: number, onExpire: () => void): void {
        const graceKey = `${roomId}:${playerId}`;
        // Clear existing timer if any
        const existing = this.graceTimers.get(graceKey);
        if (existing) {
            clearTimeout(existing.timeout);
        }

        const timeout = setTimeout(() => {
            this.graceTimers.delete(graceKey);
            onExpire();
        }, 60000); // 60 seconds

        this.graceTimers.set(graceKey, { timeout, roomId, playerId });
    }

    clearGraceTimer(roomId: string, playerId: number): void {
        const graceKey = `${roomId}:${playerId}`;
        const grace = this.graceTimers.get(graceKey);
        if (grace) {
            clearTimeout(grace.timeout);
            this.graceTimers.delete(graceKey);
        }
    }

    disconnect(socketId: string): void {
        const meta = this.sockets.get(socketId);
        if (meta?.roomId) {
            this.leaveRoom(socketId, meta.roomId);
        }
        this.sockets.delete(socketId);
    }

    broadcastToRoom(roomId: string, message: ServerMessage, excludeSocketId?: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const data = JSON.stringify(message);
        for (const socketId of room) {
            if (socketId === excludeSocketId) continue;
            const meta = this.sockets.get(socketId);
            if (meta && meta.ws.readyState === WebSocket.OPEN) {
                meta.ws.send(data);
            }
        }
    }

    sendToSocket(socketId: string, message: ServerMessage): void {
        const meta = this.sockets.get(socketId);
        if (!meta || meta.ws.readyState !== WebSocket.OPEN) {
            return; // silently drop instead of throwing
        }
        meta.ws.send(JSON.stringify(message));
    }

    sendToPlayer(roomId: string, playerId: number, message: ServerMessage): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        for (const socketId of room) {
            const meta = this.sockets.get(socketId);
            if (meta && meta.playerId === playerId && meta.ws.readyState === WebSocket.OPEN) {
                meta.ws.send(JSON.stringify(message));
                return;
            }
        }
    }

    isDuplicate(socketId: string, sequenceNumber: number): boolean {
        const meta = this.sockets.get(socketId);
        if (!meta) return false;
        if (meta.sequenceNumbers.has(sequenceNumber)) {
            return true;
        }
        meta.sequenceNumbers.add(sequenceNumber);
        // Keep only last 100
        if (meta.sequenceNumbers.size > 100) {
            const first = Array.from(meta.sequenceNumbers)[0];
            if (first !== undefined) {
                meta.sequenceNumbers.delete(first);
            }
        }
        return false;
    }

    getSocketIdsInRoom(roomId: string): string[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room) : [];
    }

    clearAll(): void {
        for (const grace of this.graceTimers.values()) {
            clearTimeout(grace.timeout);
        }
        this.graceTimers.clear();
        for (const meta of this.sockets.values()) {
            if (meta.ws.readyState === WebSocket.OPEN || meta.ws.readyState === WebSocket.CONNECTING) {
                meta.ws.terminate();
            }
        }
        this.sockets.clear();
        this.rooms.clear();
    }
}

export const connectionManager = new ConnectionManager();
