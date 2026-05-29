import { Unit } from "../utils/unit";

export interface CollectionProgress {
    name: string;
    total: number;
    owned: number;
    completed: boolean;
    bonusDescription: string;
}

const COLLECTION_BONUSES: Record<string, string> = {
    Industrial: "+10% coins from all sources",
    Dragon: "+5% sparks from salvage",
    Winter: "+1 free Standard Lootbox per day",
};

export class CollectionService {
    constructor(private unit: Unit) {}

    async getPlayerCollections(playerId: number): Promise<CollectionProgress[]> {
        // Get all stove types grouped by collection
        const allTypesStmt = this.unit.prepare<{ collection: string; count: number }>(
            `SELECT collection, COUNT(*) as count FROM StoveType GROUP BY collection ORDER BY collection`
        );
        const allTypes = await allTypesStmt.all();

        // Get player's owned stove types per collection
        const ownedStmt = this.unit.prepare<{ collection: string; count: number }>(
            `SELECT st.collection, COUNT(DISTINCT s.typeId) as count
             FROM Stove s
             JOIN StoveType st ON s.typeId = st.typeId
             WHERE s.currentOwnerId = @playerId
             GROUP BY st.collection`,
            { playerId }
        );
        const owned = await ownedStmt.all();
        const ownedMap = new Map(owned.map(o => [o.collection, o.count]));

        return allTypes.map(t => ({
            name: t.collection,
            total: t.count,
            owned: ownedMap.get(t.collection) ?? 0,
            completed: (ownedMap.get(t.collection) ?? 0) >= t.count,
            bonusDescription: COLLECTION_BONUSES[t.collection] ?? "",
        }));
    }
}
