import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { ListingService } from '@core/services/listing.service';
import { SparksService } from '@core/services/sparks.service';
import { forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { ShowedStove, StoveRow, LootboxTypeRow } from '@shared/model';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';
import { LootboxService } from '@core/services/lootbox.service';
import { firstValueFrom } from 'rxjs';
import { StoveDetailComponent } from './stove-detail.component';
import { InfoTooltipComponent } from '../../shared/components/info-tooltip/info-tooltip.component';

interface InventoryLootbox {
  id: number;
  typeId: number;
  typeName: string;
  openedAt: Date;
  acquiredHow: string;
}

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeatTierPipe,
    StoveDetailComponent,
    InfoTooltipComponent
  ],
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit, OnDestroy {
  activeTab: 'lootboxes' | 'items' = 'lootboxes';

  // User data
  lootboxes: InventoryLootbox[] = [];
  items: ShowedStove[] = [];
  loading = true;
  error: string | null = null;
  coins = 0;
  sparks = 0;
  playerId: number | null = null;

  // Listing tracking
  listedStoveIds = new Set<number>();
  listedLootboxIds = new Set<number>();

  // Stove detail modal
  showDetailModal = false;
  detailStove: ShowedStove | null = null;
  detailLoading = false;
  detailError: string | null = null;

  // Inspect modal (3D tilt)
  showInspectModal = false;
  inspectStove: ShowedStove | null = null;
  inspectRotateX = 0;
  inspectRotateY = 0;
  inspectGlareX = 50;
  inspectGlareY = 50;

  // Sell modal (for lootboxes)
  showSellModal = false;
  selectedLootbox: InventoryLootbox | null = null;
  sellPrice = '';
  sellError: string | null = null;
  sellLoading = false;

  private _stove = inject(StoveService);
  private _authService = inject(AuthService);
  private _subscription = new Subscription();
  private router = inject(Router);
  private _lootboxService = inject(LootboxService);
  private _listingService = inject(ListingService);
  private _sparksService = inject(SparksService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.playerId = user.playerId;
    this.coins = user.coins;
    this.sparks = user.sparks ?? 0;
    this.loadItems(user.playerId);
    this.loadLootboxes(user.playerId);
    this.loadMyListings(user.playerId);

    // Auto-refresh when service notifies
    const refreshSub = this._stove.refresh$.subscribe(() => {
      const currentUser = this._authService.getCurrentUser();
      if (currentUser) {
        this.loadItems(currentUser.playerId, false);
        this.loadMyListings(currentUser.playerId);
      }
    });
    this._subscription.add(refreshSub);
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  async loadMyListings(playerId: number): Promise<void> {
    try {
      const listings = await firstValueFrom(this._listingService.getActiveListingsBySellerId(playerId));
      this.listedStoveIds.clear();
      this.listedLootboxIds.clear();
      for (const listing of listings) {
        if (listing.stoveId) this.listedStoveIds.add(listing.stoveId);
        if (listing.lootboxId) this.listedLootboxIds.add(listing.lootboxId);
      }
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Failed to load listings:', err);
    }
  }

  loadItems(playerId: number, showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }
    const sub = this._stove.getStovesByPlayerId(playerId).pipe(
      switchMap((stoves: StoveRow[]) => {
        if (stoves.length === 0) return of([]);

        return forkJoin(
          stoves.map((stove) =>
            this._stove.getStoveTypeById(stove.typeId).pipe(
              map(type => ({
                ...stove,
                stoveId: stove.stoveId,
                rarity: type.rarity,
                stoveName: type.name,
                imageUrl: type.imageUrl ?? '',
                collection: type.collection ?? 'Unknown'
              }))
            )
          )
        );
      })
    ).subscribe({
      next: (showedStoves: ShowedStove[]) => {
        this.items = showedStoves;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Failed to get stoves:', err);
        this.error = 'Failed to load your items. Please try again.';
        this.items = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
    this._subscription.add(sub);
  }

  async loadLootboxes(playerId: number): Promise<void> {
    try {
      const [lootboxData, types] = await Promise.all([
        firstValueFrom(this._lootboxService.getLootboxesByPlayerId(playerId)),
        firstValueFrom(this._lootboxService.getAllLootboxTypes())
      ]);

      const typeMap = new Map<number, string>();
      for (const t of types) {
        typeMap.set(t.lootboxTypeId, t.name);
      }

      this.lootboxes = lootboxData.map(lb => ({
        id: lb.lootboxId,
        typeId: lb.lootboxTypeId,
        typeName: typeMap.get(lb.lootboxTypeId) || `Lootbox #${lb.lootboxTypeId}`,
        openedAt: lb.openedAt ? new Date(lb.openedAt) : new Date(),
        acquiredHow: lb.acquiredHow
      }));
    } catch (err) {
      console.error('Failed to load lootboxes:', err);
      this.lootboxes = [];
    } finally {
      this.cdr.markForCheck();
    }
  }

  isStoveListed(stoveId: number): boolean {
    return this.listedStoveIds.has(stoveId);
  }

  isLootboxListed(lootboxId: number): boolean {
    return this.listedLootboxIds.has(lootboxId);
  }

  // ── Stove Detail Modal ───────────────────────────────────────

  openDetailModal(item: ShowedStove): void {
    this.detailStove = item;
    this.detailError = null;
    this.detailLoading = false;
    this.showDetailModal = true;
    this.cdr.markForCheck();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailStove = null;
    this.detailError = null;
    this.cdr.markForCheck();
  }

  // ── Inspect Modal (3D Tilt) ─────────────────────────────────

  openInspectModal(item: ShowedStove, event: Event): void {
    event.stopPropagation();
    this.inspectStove = item;
    this.inspectRotateX = 0;
    this.inspectRotateY = 0;
    this.inspectGlareX = 50;
    this.inspectGlareY = 50;
    this.showInspectModal = true;
    this.cdr.markForCheck();
  }

  closeInspectModal(): void {
    this.showInspectModal = false;
    this.inspectStove = null;
    this.cdr.markForCheck();
  }

  onInspectMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Normalize to -1 to 1
    const xPct = (x - centerX) / centerX;
    const yPct = (y - centerY) / centerY;

    // Max tilt angle
    const maxTilt = 20;
    this.inspectRotateX = -yPct * maxTilt;
    this.inspectRotateY = xPct * maxTilt;

    // Glare moves opposite to tilt
    this.inspectGlareX = 50 + xPct * 40;
    this.inspectGlareY = 50 + yPct * 40;
    this.cdr.markForCheck();
  }

  onInspectMouseLeave(): void {
    this.inspectRotateX = 0;
    this.inspectRotateY = 0;
    this.inspectGlareX = 50;
    this.inspectGlareY = 50;
    this.cdr.markForCheck();
  }

  async onDetailSell(price: number): Promise<void> {
    if (!this.detailStove || this.playerId === null) return;
    this.detailLoading = true;
    this.detailError = null;
    try {
      await firstValueFrom(this._listingService.createListing(this.playerId, price, this.detailStove.stoveId, undefined));
      await this._authService.refreshUser();
      this.coins = this._authService.getCurrentUser()?.coins ?? 0;
      this.closeDetailModal();
      if (this.playerId !== null) {
        this.loadItems(this.playerId, false);
        this.loadMyListings(this.playerId);
      }
    } catch (err: any) {
      this.detailError = err?.message || err?.error?.error || 'Failed to list item. Please try again.';
    } finally {
      this.detailLoading = false;
      this.cdr.markForCheck();
    }
  }

  async onDetailSalvage(): Promise<void> {
    if (!this.detailStove) return;
    this.detailLoading = true;
    this.detailError = null;
    try {
      const result = await firstValueFrom(this._sparksService.salvageStove(this.detailStove.stoveId));
      if (result.success) {
        await this._authService.refreshUser();
        this.sparks = this._authService.getCurrentUser()?.sparks ?? 0;
        this.closeDetailModal();
        if (this.playerId !== null) {
          this.loadItems(this.playerId, false);
          this.loadMyListings(this.playerId);
        }
      } else {
        this.detailError = result.error || 'Failed to salvage stove';
      }
    } catch (err: any) {
      this.detailError = err?.error?.error || 'Failed to salvage stove. Please try again.';
    } finally {
      this.detailLoading = false;
      this.cdr.markForCheck();
    }
  }

  async onDetailReRollHeat(): Promise<void> {
    if (!this.detailStove) return;
    this.detailLoading = true;
    this.detailError = null;
    try {
      const result = await firstValueFrom(this._sparksService.reRollHeat(this.detailStove.stoveId));
      if (result.success) {
        // Update sparks from response if available, otherwise refresh from auth
        if (result.newSparksBalance !== undefined) {
          this.sparks = result.newSparksBalance;
          this._authService.refreshUser(); // sync in background
        } else {
          await this._authService.refreshUser();
          this.sparks = this._authService.getCurrentUser()?.sparks ?? 0;
        }
        // Update the detail stove's heat level and re-roll count so UI reflects change immediately
        if (this.detailStove) {
          this.detailStove = {
            ...this.detailStove,
            heatLevel: result.newHeatLevel ?? this.detailStove.heatLevel,
            reRollCount: (this.detailStove.reRollCount ?? 0) + 1
          };
        }
        // Refresh inventory to get updated data
        if (this.playerId !== null) {
          this.loadItems(this.playerId, false);
        }
      } else {
        this.detailError = result.error || 'Failed to re-roll heat';
      }
    } catch (err: any) {
      this.detailError = err?.error?.error || 'Failed to re-roll heat. Please try again.';
    } finally {
      this.detailLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Lootbox Sell Modal ───────────────────────────────────────

  openSellLootboxModal(box: InventoryLootbox): void {
    this.selectedLootbox = box;
    this.sellPrice = '';
    this.sellError = null;
    this.showSellModal = true;
  }

  closeSellModal(): void {
    this.showSellModal = false;
    this.selectedLootbox = null;
    this.sellPrice = '';
    this.sellError = null;
  }

  getSellModalTitle(): string {
    return this.selectedLootbox?.typeName ?? '';
  }

  async confirmSell(): Promise<void> {
    if (this.playerId === null) return;
    if (!this.selectedLootbox) return;

    const price = Number(this.sellPrice);
    if (!this.sellPrice || isNaN(price) || price < 1) {
      this.sellError = 'Please enter a valid price (minimum 1 Coal).';
      return;
    }

    this.sellLoading = true;
    this.sellError = null;

    try {
      await firstValueFrom(this._listingService.createListing(this.playerId, price, undefined, this.selectedLootbox.id));

      await this._authService.refreshUser();
      this.coins = this._authService.getCurrentUser()?.coins ?? 0;
      this.closeSellModal();
      if (this.playerId !== null) {
        this.loadLootboxes(this.playerId);
        this.loadMyListings(this.playerId);
      }
    } catch (err: any) {
      console.error('Failed to create listing:', err);
      this.sellError = err?.message || err?.error?.error || 'Failed to list item. Please try again.';
      this.cdr.markForCheck();
    } finally {
      this.sellLoading = false;
      this.cdr.markForCheck();
    }
  }

  openBox(): void {
    void this.router.navigate(['/lootboxes']);
  }

  openLootbox(box: InventoryLootbox): void {
    void this.router.navigate(['/lootboxes'], { queryParams: { id: box.id } });
  }

  getHeatColor(heat: number): string {
    if (heat >= 80) return '#ffd700';
    if (heat >= 60) return '#ff4500';
    if (heat >= 40) return '#f59e0b';
    if (heat >= 20) return '#dc2626';
    return '#64748b';
  }

  getLootboxImage(typeName: string): string {
    const name = typeName.toLowerCase();
    if (name.includes('dragon')) {
      return 'assets/animation/dragon-chest-idle-animation.gif';
    }
    if (name.includes('winter')) {
      return 'assets/animation/winter-chest-idle-animation.gif';
    }
    if (name.includes('legendary')) {
      return 'assets/animation/legendary-chest-idle-animation.gif';
    }
    if (name.includes('golden')) {
      return 'assets/animation/chest-idle-gold.gif';
    }
    return 'assets/animation/chest-idle.gif';
  }
}
