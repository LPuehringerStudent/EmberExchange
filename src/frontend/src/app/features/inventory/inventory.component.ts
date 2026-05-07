import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { ListingService } from '@core/services/listing.service';
import { forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { ShowedStove, StoveRow, LootboxTypeRow } from '../../../../../shared/model';
import { LootboxService } from '@core/services/lootbox.service';
import { firstValueFrom } from 'rxjs';

interface InventoryLootbox {
  id: number;
  typeId: number;
  typeName: string;
  openedAt: Date;
  acquiredHow: string;
}

type SellableItem = { stoveId: number; name: string } | { lootboxId: number; name: string };

@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
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
  playerId: number | null = null;

  // Listing tracking
  listedStoveIds = new Set<number>();
  listedLootboxIds = new Set<number>();

  // Sell modal
  showSellModal = false;
  selectedStove: ShowedStove | null = null;
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
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.playerId = user.playerId;
    this.coins = user.coins;
    this.loadItems(user.playerId);
    this.loadLootboxes(user.playerId);
    this.loadMyListings(user.playerId);

    // Auto-refresh when service notifies
    const refreshSub = this._stove.refresh$.subscribe(() => {
      const currentUser = this._authService.getCurrentUser();
      if (currentUser) {
        this.loadItems(currentUser.playerId);
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

  loadItems(playerId: number): void {
    this.loading = true;
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
                imageUrl: type.imageUrl ?? ''
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

  openSellStoveModal(item: ShowedStove): void {
    this.selectedStove = item;
    this.selectedLootbox = null;
    this.sellPrice = '';
    this.sellError = null;
    this.showSellModal = true;
  }

  openSellLootboxModal(box: InventoryLootbox): void {
    this.selectedStove = null;
    this.selectedLootbox = box;
    this.sellPrice = '';
    this.sellError = null;
    this.showSellModal = true;
  }

  closeSellModal(): void {
    this.showSellModal = false;
    this.selectedStove = null;
    this.selectedLootbox = null;
    this.sellPrice = '';
    this.sellError = null;
  }

  getSellModalTitle(): string {
    if (this.selectedStove) return this.selectedStove.stoveName;
    if (this.selectedLootbox) return this.selectedLootbox.typeName;
    return '';
  }

  async confirmSell(): Promise<void> {
    if (this.playerId === null) return;
    if (!this.selectedStove && !this.selectedLootbox) return;

    const price = Number(this.sellPrice);
    if (!this.sellPrice || isNaN(price) || price < 1) {
      this.sellError = 'Please enter a valid price (minimum 1 Coal).';
      return;
    }

    this.sellLoading = true;
    this.sellError = null;

    try {
      if (this.selectedStove) {
        await firstValueFrom(this._listingService.createListing(this.playerId, price, this.selectedStove.stoveId, undefined));
      } else if (this.selectedLootbox) {
        await firstValueFrom(this._listingService.createListing(this.playerId, price, undefined, this.selectedLootbox.id));
      }

      await this._authService.refreshUser();
      this.coins = this._authService.getCurrentUser()?.coins ?? 0;
      this.closeSellModal();
      if (this.playerId !== null) {
        this.loadItems(this.playerId);
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
}
