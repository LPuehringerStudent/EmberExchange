import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { RoomRow, RoomStatus } from "../../shared/model";

export class RoomService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async createRoom(maxPlayers: number, gameType: string, settings: Record<string, unknown> = {}): Promise<RoomRow> {
        const stmt = this.unit.prepare<RoomRow, { maxPlayers: number; gameType: string; settings: string }>(
            `INSERT INTO Room (maxPlayers, status, gameType, settings, createdAt, updatedAt)
             VALUES (@maxPlayers, 'waiting', @gameType, @settings::jsonb, NOW(), NOW())
             RETURNING *`,
            { maxPlayers, gameType, settings: JSON.stringify(settings) }
        );
        const row = await stmt.get();
        if (!row) {
            throw new Error("Failed to create room");
        }
        return row;
    }

    async getRoomById(roomId: string): Promise<RoomRow | null> {
        const stmt = this.unit.prepare<RoomRow, { roomId: string }>(
            `SELECT * FROM Room WHERE roomId = @roomId`,
            { roomId }
        );
        return (await stmt.get()) ?? null;
    }

    async getRoomByIdForUpdate(roomId: string): Promise<RoomRow | null> {
        const stmt = this.unit.prepare<RoomRow, { roomId: string }>(
            `SELECT * FROM Room WHERE roomId = @roomId FOR UPDATE`,
            { roomId }
        );
        return (await stmt.get()) ?? null;
    }

    async updateRoomStatus(roomId: string, status: RoomStatus): Promise<boolean> {
        const stmt = this.unit.prepare<
            unknown,
            { roomId: string; status: string }
        >(
            `UPDATE Room SET status = @status, updatedAt = NOW() WHERE roomId = @roomId`,
            { roomId, status }
        );
        return (await stmt.run()).changes === 1;
    }

    async listRoomsByGameType(gameType: string, status?: RoomStatus): Promise<RoomRow[]> {
        if (status) {
            const stmt = this.unit.prepare<RoomRow, { gameType: string; status: string }>(
                `SELECT * FROM Room WHERE gameType = @gameType AND status = @status ORDER BY createdAt DESC`,
                { gameType, status }
            );
            return await stmt.all();
        }
        const stmt = this.unit.prepare<RoomRow, { gameType: string }>(
            `SELECT * FROM Room WHERE gameType = @gameType ORDER BY createdAt DESC`,
            { gameType }
        );
        return await stmt.all();
    }

    async deleteRoom(roomId: string): Promise<boolean> {
        const stmt = this.unit.prepare<unknown, { roomId: string }>(
            `DELETE FROM Room WHERE roomId = @roomId`,
            { roomId }
        );
        return (await stmt.run()).changes === 1;
    }
}
