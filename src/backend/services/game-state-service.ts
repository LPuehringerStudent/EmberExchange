import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { GameStateRow } from "../../shared/model";

export class GameStateService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async createInitialState(roomId: string, stateBlob: unknown): Promise<boolean> {
        const stmt = this.unit.prepare<unknown, { roomId: string; stateBlob: string }>(
            `INSERT INTO GameState (roomId, stateBlob, version, updatedAt)
             VALUES (@roomId, @stateBlob::jsonb, 0, NOW())
             ON CONFLICT (roomId) DO NOTHING`,
            { roomId, stateBlob: JSON.stringify(stateBlob) }
        );
        return (await stmt.run()).changes === 1;
    }

    async getState(roomId: string): Promise<GameStateRow | null> {
        const stmt = this.unit.prepare<GameStateRow, { roomId: string }>(
            `SELECT roomId, stateBlob, version, updatedAt FROM GameState WHERE roomId = @roomId`,
            { roomId }
        );
        const row = await stmt.get();
        return row ?? null;
    }

    async updateState(
        roomId: string,
        newBlob: unknown,
        expectedVersion: number
    ): Promise<{ success: boolean; newVersion: number }> {
        const stmt = this.unit.prepare<
            { version: number },
            { roomId: string; newBlob: string; expectedVersion: number }
        >(
            `UPDATE GameState
             SET stateBlob = @newBlob::jsonb,
                 version = version + 1,
                 updatedAt = NOW()
             WHERE roomId = @roomId AND version = @expectedVersion
             RETURNING version`,
            { roomId, newBlob: JSON.stringify(newBlob), expectedVersion }
        );
        const row = await stmt.get();
        if (row) {
            return { success: true, newVersion: row.version };
        }
        return { success: false, newVersion: -1 };
    }
}
