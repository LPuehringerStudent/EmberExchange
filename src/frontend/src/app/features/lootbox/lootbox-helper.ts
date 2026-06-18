export interface LootItem {
  name: string;
  label: string;
  rarity: string;
  color: string;
  image: string;
  weight: number;
}

const RARITY_META: Record<string, { label: string; color: string; image: string }> = {
  common: { label: 'Common', color: '#94a3b8', image: '/assets/stove_sprites/common/rusty.png' },
  rare: { label: 'Rare', color: '#3b82f6', image: '/assets/stove_sprites/rare/bronze.png' },
  epic: { label: 'Epic', color: '#a855f7', image: '/assets/stove_sprites/epic/golden.png' },
  legendary: { label: 'Legendary', color: '#f59e0b', image: '/assets/stove_sprites/legendary/dragon.png' },
  secret: { label: 'Secret', color: '#d946ef', image: '/assets/stove_sprites/secret/earthbound-stove.png' },
};

const POOL_WEIGHTS: Record<string, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
  secret: 2,
};

export class LootBoxHelper {
  private pool: LootItem[] = Object.entries(POOL_WEIGHTS).map(([rarity, weight]) => ({
    name: rarity,
    label: RARITY_META[rarity].label,
    rarity,
    color: RARITY_META[rarity].color,
    image: RARITY_META[rarity].image,
    weight,
  }));

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

  public buildStripFor(rarity: string, resultImageUrl?: string): void {
    const targetRarity = rarity.toLowerCase();
    const target = this.pool.find(p => p.rarity === targetRarity) ?? this.pool[0];

    this.items = [];
    for (let i = 0; i < 60; i++) {
      this.items.push(this.weightedPick());
    }

    this.finalItem = {
      ...target,
      image: resultImageUrl && resultImageUrl.trim().length > 0
        ? resultImageUrl
        : target.image,
    };
    this.items[40] = this.finalItem;
  }
}
