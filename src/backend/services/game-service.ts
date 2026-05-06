import { ServiceBase } from "./service-base";
import { Unit } from "../utils/unit";
import { GameRow } from "../../shared/model";

export class GameService extends ServiceBase {
    constructor(unit: Unit) {
        super(unit);
    }

    async getAllGames(): Promise<GameRow[]> {
        const stmt = this.unit.prepare<GameRow>(
            `SELECT * FROM Game WHERE isActive = 1 ORDER BY name ASC`
        );
        return stmt.all();
    }

    async getGameByType(gameType: string): Promise<GameRow | null> {
        const stmt = this.unit.prepare<GameRow, { gameType: string }>(
            `SELECT * FROM Game WHERE gameType = @gameType AND isActive = 1`,
            { gameType }
        );
        const row = await stmt.get();
        return row ?? null;
    }
}
