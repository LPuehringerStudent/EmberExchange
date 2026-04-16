import {Rarity} from "../shared/model";

export interface LootItem {
    name: string;
    color: string;
    weight: number;
}

export class LootBoxHelper {
    private pool: LootItem[] = [
        { name: 'Common', color: 'rgba(179,229,252,0.45)', weight: 50 },
        { name: 'Rare', color: '#2ecaca', weight: 30 },
        { name: 'Epic', color: '#8e05a6', weight: 15 },
        { name: 'Legendary', color: '#ffc880', weight: 5 }
    ];

    items: LootItem[] = [];
    finalItem: LootItem | null = null;

    private weightedPick(): LootItem {
        const sum = this.pool.reduce((a, b) => a + b.weight, 0);
        let r = Math.random() * sum;
        for (const p of this.pool) {
            if ((r -= p.weight) <= 0) return p;
        }
        return this.pool[0];
    }

    public buildStrip(): void {
        this.items = [];
        for (let i = 0; i < 60; i++) {
            this.items.push(this.weightedPick());
        }
        this.finalItem = this.weightedPick();
        this.items[40] = this.finalItem;
    }
    public returnTypeId(item: LootItem): number {
        if (item.name === 'Common') return 1;
        if (item.name === 'Rare') return 4;
        if (item.name === 'Epic') return 5;
        if (item.name === 'Legendary') return 6;

        return -1;
    }
}
