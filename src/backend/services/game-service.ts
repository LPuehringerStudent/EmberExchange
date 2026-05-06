import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { Game } from "../../shared/model";

export class GameService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getAllGames(): Promise<Game[]> {
        const stmt = this.unit.prepare<Game>(
            `SELECT gameType, name, minPlayers, maxPlayers, ruleset, description, genre, tags, createdAt FROM Game ORDER BY name`
        );
        const rows = await stmt.all();
        return rows.map(row => ({
            ...row,
            tags: JSON.parse((row.tags as unknown as string) || '[]')
        }));
    }

    async getGameByType(gameType: string): Promise<Game | null> {
        const stmt = this.unit.prepare<Game, { gameType: string }>(
            `SELECT gameType, name, minPlayers, maxPlayers, ruleset, description, genre, tags, createdAt FROM Game WHERE gameType = @gameType`,
            { gameType }
        );
        const row = await stmt.get();
        if (!row) return null;
        return {
            ...row,
            tags: JSON.parse((row.tags as unknown as string) || '[]')
        };
    }
}
