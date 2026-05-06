import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { RoomPlayerRow, ConnectionState } from "../../shared/model";

export class RoomPlayerService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async addPlayer(roomId: string, playerId: number, seatIndex: number): Promise<RoomPlayerRow> {
        const stmt = this.unit.prepare<RoomPlayerRow, { roomId: string; playerId: number; seatIndex: number }>(
            `INSERT INTO RoomPlayer (roomId, playerId, connectionState, seatIndex)
             VALUES (@roomId, @playerId, 'connected', @seatIndex)
             RETURNING *`,
            { roomId, playerId, seatIndex }
        );
        const row = await stmt.get();
        if (!row) {
            throw new Error("Failed to add player to room");
        }
        return row;
    }

    async getPlayersInRoom(roomId: string): Promise<RoomPlayerRow[]> {
        const stmt = this.unit.prepare<RoomPlayerRow, { roomId: string }>(
            `SELECT * FROM RoomPlayer WHERE roomId = @roomId`,
            { roomId }
        );
        return stmt.all();
    }

    async getPlayerInRoom(roomId: string, playerId: number): Promise<RoomPlayerRow | null> {
        const stmt = this.unit.prepare<RoomPlayerRow, { roomId: string; playerId: number }>(
            `SELECT * FROM RoomPlayer WHERE roomId = @roomId AND playerId = @playerId`,
            { roomId, playerId }
        );
        return (await stmt.get()) ?? null;
    }

    async updateConnectionState(roomPlayerId: string, state: ConnectionState): Promise<boolean> {
        const stmt = this.unit.prepare<
            unknown,
            { roomPlayerId: string; state: string }
        >(
            `UPDATE RoomPlayer SET connectionState = @state WHERE roomPlayerId = @roomPlayerId`,
            { roomPlayerId, state }
        );
        return (await stmt.run()).changes === 1;
    }

    async removePlayer(roomPlayerId: string): Promise<boolean> {
        const stmt = this.unit.prepare<unknown, { roomPlayerId: string }>(
            `DELETE FROM RoomPlayer WHERE roomPlayerId = @roomPlayerId`,
            { roomPlayerId }
        );
        return (await stmt.run()).changes === 1;
    }

    async removePlayerFromRoom(roomId: string, playerId: number): Promise<boolean> {
        const stmt = this.unit.prepare<unknown, { roomId: string; playerId: number }>(
            `DELETE FROM RoomPlayer WHERE roomId = @roomId AND playerId = @playerId`,
            { roomId, playerId }
        );
        return (await stmt.run()).changes === 1;
    }

    async countPlayersInRoom(roomId: string): Promise<number> {
        const stmt = this.unit.prepare<{ cnt: number }, { roomId: string }>(
            `SELECT COUNT(*) as cnt FROM RoomPlayer WHERE roomId = @roomId`,
            { roomId }
        );
        const result = await stmt.get();
        return result?.cnt ?? 0;
    }

    async findNextSeatIndex(roomId: string): Promise<number> {
        const stmt = this.unit.prepare<{ maxSeat: number | null }, { roomId: string }>(
            `SELECT MAX(seatIndex) as "maxSeat" FROM RoomPlayer WHERE roomId = @roomId`,
            { roomId }
        );
        const result = await stmt.get();
        return (result?.maxSeat ?? -1) + 1;
    }
}
