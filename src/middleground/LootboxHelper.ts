import {ChangeDetectorRef} from "@angular/core";
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
        { name: 'Legendary', color: '#ff8a80', weight: 5 }
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
        if (item.name === 'Rare') return 5;
        if (item.name === 'Epic') return 6;
        if (item.name === 'Legendary') return 7;

        return -1;
    }
    private returnRarity(typeId: number): Rarity {
        if (typeId === 1) return Rarity.COMMON;
        if (typeId === 3) return Rarity.RARE;
        if (typeId === 5) return Rarity.EPIC;
        if (typeId === 7) return Rarity.LEGENDARY;
        return Rarity.COMMON;
    }
    // TODO: Implement proper database saving with typeId and currentOwnerId
    // private saveToDataBase(): void{
    //     const service: StoveService = new StoveService(new Unit(false));
    //     service.createStove(typeId, currentOwnerId);
    // }
}