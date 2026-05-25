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
        interface RawRow extends RoomPlayerRow {
            titleId: string | null;
            titleLabel: string | null;
            titleAnimation: string | null;
            bannerId: number | null;
            bannerName: string | null;
            bannerCssClass: string | null;
        }
        const stmt = this.unit.prepare<RawRow, { roomId: string }>(
            `SELECT rp.*, p.username, p.coins,
              t.titleId, t.label as titleLabel, t.animation as titleAnimation,
              b.bannerId, b.name as bannerName, b.cssClass as bannerCssClass
             FROM RoomPlayer rp
             JOIN Player p ON rp.playerId = p.playerId
             LEFT JOIN PlayerGloryTitle pgt ON p.playerId = pgt.playerId AND pgt.isActive = 1
             LEFT JOIN GloryTitle t ON pgt.titleId = t.titleId
             LEFT JOIN PlayerGloryBanner pgb ON p.playerId = pgb.playerId AND pgb.isActive = 1
             LEFT JOIN GloryBanner b ON pgb.bannerId = b.bannerId
             WHERE rp.roomId = @roomId`,
            { roomId }
        );
        const rows = await stmt.all();
        return rows.map(r => ({
            ...r,
            activeTitle: r.titleId ? {
                titleId: r.titleId,
                label: r.titleLabel,
                animation: r.titleAnimation,
            } : null,
            activeBanner: r.bannerId ? {
                bannerId: r.bannerId,
                name: r.bannerName,
                cssClass: r.bannerCssClass,
            } : null,
        })) as RoomPlayerRow[];
    }

    async getPlayerInRoom(roomId: string, playerId: number): Promise<RoomPlayerRow | null> {
        const stmt = this.unit.prepare<RoomPlayerRow, { roomId: string; playerId: number }>(
            `SELECT * FROM RoomPlayer WHERE roomId = @roomId AND playerId = @playerId`,
            { roomId, playerId }
        );
        return (await stmt.get()) ?? null;
    }

    async updateConnectionState(roomPlayerId: string, state: ConnectionState): Promise<boolean> {
        const disconnectedAt = state === 'disconnected' ? new Date() : null;
        const stmt = this.unit.prepare<
            unknown,
            { roomPlayerId: string; state: string; disconnectedAt: Date | null }
        >(
            `UPDATE RoomPlayer SET connectionState = @state, disconnectedAt = @disconnectedAt WHERE roomPlayerId = @roomPlayerId`,
            { roomPlayerId, state, disconnectedAt }
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
