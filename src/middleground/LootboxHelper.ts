import {ChangeDetectorRef} from "@angular/core";
import {Rarity} from "../shared/model";

export interface LootItem {
    name: string;
    color: string;
    weight: number;
}

export class LootBoxHelper {
    private pool: LootItem[] = [
        { name: 'Common', color: '#b3e5fc', weight: 50 },
        { name: 'Uncommon', color: '#81c784', weight: 30 },
        { name: 'Rare', color: '#ba68c8', weight: 15 },
        { name: 'Epic', color: '#ffcc80', weight: 4 },
        { name: 'Legendary', color: '#ff8a80', weight: 1 }
    ];

    items: LootItem[] = [];
    finalItem: LootItem | null = null;
    constructor(private cdr: ChangeDetectorRef) {}

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
        if (item.name === 'Uncommon') return 2;
        if (item.name === 'Rare') return 3;
        if (item.name === 'Epic') return 4;
        if (item.name === 'Legendary') return 5;

        return -1;
    }
    private returnRarity(typeId: number): Rarity {
        if (typeId === 1) return Rarity.COMMON;
        if (typeId === 3) return Rarity.RARE;
        if (typeId === 5) return Rarity.EPIC;
        if (typeId === 7) return Rarity.LEGENDARY;
        return Rarity.COMMON;
    }

}
