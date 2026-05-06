import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { EventLog } from "../../shared/model";

export class EventLogService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async logEvent(
        roomId: string,
        type: string,
        payload: unknown,
        playerId: number | null = null,
        sequenceNumber: number | null = null,
        clientTimestamp: number | null = null
    ): Promise<void> {
        const stmt = this.unit.prepare<
            unknown,
            { roomId: string; type: string; payload: string; playerId: number | null; sequenceNumber: number | null; clientTimestamp: number | null }
        >(
            `INSERT INTO EventLog (roomId, type, payload, playerId, sequenceNumber, clientTimestamp, serverTimestamp)
             VALUES (@roomId, @type, @payload::jsonb, @playerId, @sequenceNumber, @clientTimestamp, NOW())`,
            { roomId, type, payload: JSON.stringify(payload), playerId, sequenceNumber, clientTimestamp }
        );
        await stmt.run();
    }

    async getEventsAfter(roomId: string, afterSequenceNumber: number): Promise<EventLog[]> {
        const stmt = this.unit.prepare<EventLog, { roomId: string; afterSequenceNumber: number }>(
            `SELECT * FROM EventLog
             WHERE roomId = @roomId AND sequenceNumber > @afterSequenceNumber
             ORDER BY sequenceNumber ASC`,
            { roomId, afterSequenceNumber }
        );
        return stmt.all();
    }

    async getEventsForRoom(roomId: string, limit: number = 100): Promise<EventLog[]> {
        const stmt = this.unit.prepare<EventLog, { roomId: string; limit: number }>(
            `SELECT * FROM EventLog
             WHERE roomId = @roomId
             ORDER BY serverTimestamp DESC
             LIMIT @limit`,
            { roomId, limit }
        );
        return stmt.all();
    }
}
