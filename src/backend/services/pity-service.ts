import { Unit } from "../utils/unit";

interface PityCounters {
    standardOpens: number;
    goldenOpens: number;
    legendaryOpens: number;
    dragonOpens: number;
    winterOpens: number;
}

const COLUMN_MAP: Record<number, keyof PityCounters> = {
    1: 'standardOpens',
    2: 'goldenOpens',
    3: 'legendaryOpens',
    4: 'dragonOpens',
    5: 'winterOpens',
};

/** Pity thresholds: [guaranteedEpicEvery, guaranteedLegendaryEvery] */
const PITY_THRESHOLDS: Record<number, [number, number]> = {
    1: [25, 100],   // Standard
    2: [15, 50],    // Golden
    3: [10, 25],    // Legendary
    4: [15, 50],    // Dragon
    5: [15, 50],    // Winter
};

const RARITY_PRIORITY: Record<string, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3,
    limited: 4,
    secret: 5,
};

export class PityService {
    constructor(private unit: Unit) {}

    private getColumn(lootboxTypeId: number): keyof PityCounters {
        return COLUMN_MAP[lootboxTypeId] ?? 'standardOpens';
    }

    async getCounters(playerId: number): Promise<PityCounters> {
        const stmt = this.unit.prepare<PityCounters>(
            `SELECT standardOpens, goldenOpens, legendaryOpens, dragonOpens, winterOpens
             FROM PlayerPity WHERE playerId = @playerId`,
            { playerId }
        );
        const row = await stmt.get();
        return row ?? {
            standardOpens: 0,
            goldenOpens: 0,
            legendaryOpens: 0,
            dragonOpens: 0,
            winterOpens: 0,
        };
    }

    async incrementCounter(playerId: number, lootboxTypeId: number): Promise<void> {
        const col = this.getColumn(lootboxTypeId);
        const stmt = this.unit.prepare(
            `INSERT INTO PlayerPity (playerId, ${col})
             VALUES (@playerId, 1)
             ON CONFLICT (playerId)
             DO UPDATE SET ${col} = PlayerPity.${col} + 1`,
            { playerId }
        );
        await stmt.run();
    }

    async resetCounter(playerId: number, lootboxTypeId: number): Promise<void> {
        const col = this.getColumn(lootboxTypeId);
        const stmt = this.unit.prepare(
            `INSERT INTO PlayerPity (playerId, ${col})
             VALUES (@playerId, 0)
             ON CONFLICT (playerId)
             DO UPDATE SET ${col} = 0`,
            { playerId }
        );
        await stmt.run();
    }

    /**
     * Checks if pity should override the rolled rarity.
     * Returns the guaranteed rarity if a threshold is met, otherwise null.
     * Legendary threshold takes precedence over epic.
     *
     * `count` = opens since last reset. The current open makes it `count + 1` total,
     * so we trigger when `count + 1 >= threshold` (fixes off-by-one).
     */
    async checkPity(playerId: number, lootboxTypeId: number, rolledRarity: string): Promise<string | null> {
        const counters = await this.getCounters(playerId);
        const col = this.getColumn(lootboxTypeId);
        const count = counters[col];
        const thresholds = PITY_THRESHOLDS[lootboxTypeId] ?? [999, 999];
        const [epicThreshold, legendaryThreshold] = thresholds;

        const rolledPriority = RARITY_PRIORITY[rolledRarity.toLowerCase()] ?? 0;
        const totalOpens = count + 1; // include the current open

        // Legendary threshold takes precedence
        if (totalOpens >= legendaryThreshold) {
            return 'legendary';
        }
        // Epic threshold only applies if we didn't already roll epic or better
        if (totalOpens >= epicThreshold && rolledPriority < RARITY_PRIORITY['epic']) {
            return 'epic';
        }
        return null;
    }

    /**
     * Returns current pity progress for a specific crate type.
     */
    async getPityProgress(playerId: number, lootboxTypeId: number): Promise<{ opens: number; epicThreshold: number; legendaryThreshold: number }> {
        const counters = await this.getCounters(playerId);
        const col = this.getColumn(lootboxTypeId);
        const thresholds = PITY_THRESHOLDS[lootboxTypeId] ?? [999, 999];
        return {
            opens: counters[col],
            epicThreshold: thresholds[0],
            legendaryThreshold: thresholds[1],
        };
    }
}
