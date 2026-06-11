import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CollectionService, CollectionProgress } from '@core/services/collection.service';
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
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  private collectionService = inject(CollectionService);

  ngOnInit(): void {
    this.loadCollections();
  }

  async loadCollections(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.collectionService.getPlayerCollections());
      this.collections.set(data);
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
}
