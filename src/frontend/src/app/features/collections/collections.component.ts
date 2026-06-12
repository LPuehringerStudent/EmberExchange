import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CollectionService, CollectionProgress, CollectionStoveProgress } from '@core/services/collection.service';
import { firstValueFrom } from 'rxjs';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

@Component({
  selector: 'app-collections',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, PageBackgroundComponent,
  ],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.css']
})
export class CollectionsComponent implements OnInit {
  collections = signal<CollectionProgress[]>([]);
  selectedCollectionName = signal<string | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  claimMessage = signal<string | null>(null);
  claimingTypeId = signal<number | null>(null);

  private collectionService = inject(CollectionService);

  ngOnInit(): void {
    this.loadCollections();
  }

  async loadCollections(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.collectionService.getPlayerCollections());
      this.collections.set(this.filterRenderableCollections(data));
    } catch (err: any) {
      console.error('Failed to load collections:', err);
      this.error.set(err?.message || 'Failed to load collections');
    } finally {
      this.loading.set(false);
    }
  }

  getProgressPercent(collection: CollectionProgress): number {
    if (collection.total === 0) return 0;
    return Math.min(100, Math.round((collection.owned / collection.total) * 100));
  }

  selectedCollection(): CollectionProgress | null {
    const name = this.selectedCollectionName();
    if (!name) return null;
    return this.collections().find(collection => collection.name === name) ?? null;
  }

  openBook(collection: CollectionProgress): void {
    this.claimMessage.set(null);
    this.selectedCollectionName.set(collection.name);
  }

  closeBook(): void {
    this.claimMessage.set(null);
    this.selectedCollectionName.set(null);
  }

  async claimReward(stove: CollectionStoveProgress): Promise<void> {
    if (!stove.discovered || stove.rewardClaimed || this.claimingTypeId() !== null) return;
    this.claimingTypeId.set(stove.typeId);
    this.claimMessage.set(null);
    this.error.set(null);

    try {
      await firstValueFrom(this.collectionService.claimStoveReward(stove.typeId));
      this.collections.update(collections => collections.map(collection => ({
        ...collection,
        stoves: collection.stoves.map(item =>
          item.typeId === stove.typeId ? { ...item, rewardClaimed: true } : item
        )
      })));
      this.claimMessage.set(`Claimed ${stove.rewardCoins} coal and ${stove.rewardXP} XP.`);
    } catch (err: any) {
      console.error('Failed to claim collection reward:', err);
      this.error.set(err?.message || 'Failed to claim reward');
    } finally {
      this.claimingTypeId.set(null);
    }
  }

  getRarityColorClass(name: string): string {
    const colors: Record<string, string> = {
      Industrial: 'from-slate-500 to-slate-400',
      Dragon: 'from-red-600 to-orange-500',
      Winter: 'from-cyan-500 to-blue-400',
      Standard: 'from-gray-500 to-gray-400',
      Ancient: 'from-amber-600 to-yellow-500',
    };
    return colors[name] || 'from-accent to-orange-400';
  }

  rarityClass(rarity: string): string {
    return rarity.toLowerCase();
  }

  visibleStoveName(stove: CollectionStoveProgress): string {
    return stove.discovered ? stove.name : 'Unknown Stove';
  }

  collectionIcon(collection: CollectionProgress): string {
    const firstDiscovered = collection.stoves.find(stove => stove.discovered && stove.imageUrl);
    return firstDiscovered?.imageUrl || '/icon/collections.png';
  }

  stoveImage(stove: CollectionStoveProgress): string {
    return stove.imageUrl || '/icon/collections.png';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/icon/collections.png';
  }

  claimableCount(collection: CollectionProgress): number {
    return collection.stoves.filter(stove => stove.discovered && !stove.rewardClaimed).length;
  }

  private filterRenderableCollections(collections: CollectionProgress[]): CollectionProgress[] {
    const grouped = new Map<string, CollectionProgress>();

    for (const collection of collections) {
      const existing = grouped.get(collection.name);
      const stoves = this.mergeStoves([
        ...(existing?.stoves ?? []),
        ...collection.stoves.filter(stove =>
          stove.rarity.toLowerCase() !== 'limited' && stove.name !== 'One of a Kind'
        )
      ]);

      const owned = stoves.filter(stove => stove.discovered).length;
      const total = stoves.length;

      grouped.set(collection.name, {
        ...collection,
        bonusDescription: existing?.bonusDescription || collection.bonusDescription,
        stoves,
        owned,
        total,
        completed: total > 0 && owned >= total,
      });
    }

    return Array.from(grouped.values()).filter(collection => collection.total > 0);
  }

  private mergeStoves(stoves: CollectionStoveProgress[]): CollectionStoveProgress[] {
    const byType = new Map<number, CollectionStoveProgress>();
    for (const stove of stoves) {
      const existing = byType.get(stove.typeId);
      if (!existing) {
        byType.set(stove.typeId, stove);
        continue;
      }

      byType.set(stove.typeId, {
        ...existing,
        name: existing.name || stove.name,
        imageUrl: existing.imageUrl || stove.imageUrl,
        discovered: existing.discovered || stove.discovered,
        rewardClaimed: existing.rewardClaimed || stove.rewardClaimed,
        rewardCoins: Math.max(existing.rewardCoins, stove.rewardCoins),
        rewardXP: Math.max(existing.rewardXP, stove.rewardXP),
      });
    }

    return Array.from(byType.values());
  }
}
