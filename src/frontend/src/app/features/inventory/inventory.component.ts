import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { ListingService } from '@core/services/listing.service';
import { forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { ShowedStove, StoveRow } from '../../../../../shared/model';
import { LootboxService } from '@core/services/lootbox.service';
import { firstValueFrom } from 'rxjs';

interface InventoryLootbox {
  id: number;
  typeName: string;
  openedAt: Date;
  acquiredHow: string;
  droppedItem?: string;
}

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

  // Sell modal
  showSellModal = false;
  selectedItem: ShowedStove | null = null;
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

    // Auto-refresh when service notifies
    const refreshSub = this._stove.refresh$.subscribe(() => {
      const currentUser = this._authService.getCurrentUser();
      if (currentUser) {
        this.loadItems(currentUser.playerId);
      }
    });
    this._subscription.add(refreshSub);
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  loadItems(playerId: number): void {
    this.loading = true;
    const sub = this._stove.getStovesByPlayerId(playerId).pipe(
      switchMap((stoves: StoveRow[]) => {
        if (stoves.length === 0) return of([]);

        return forkJoin(
          stoves.map((stove) =>
            this._stove.checkRarity(stove.typeId).pipe(
              map(rarity => ({
                ...stove,
                stoveId: stove.stoveId,
                rarity,
                stoveName: this.getStoveName(stove.typeId)
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
      const lootboxData = await firstValueFrom(this._lootboxService.getLootboxesByPlayerId(playerId));
      this.lootboxes = lootboxData.map(lb => ({
        id: lb.lootboxId,
        typeName: this.getLootboxTypeName(lb.lootboxTypeId),
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

  openSellModal(item: ShowedStove): void {
    this.selectedItem = item;
    this.sellPrice = '';
    this.sellError = null;
    this.showSellModal = true;
  }

  closeSellModal(): void {
    this.showSellModal = false;
    this.selectedItem = null;
    this.sellPrice = '';
    this.sellError = null;
  }

  async confirmSell(): Promise<void> {
    if (!this.selectedItem || this.playerId === null) return;

    const price = Number(this.sellPrice);
    if (!this.sellPrice || isNaN(price) || price < 1) {
      this.sellError = 'Please enter a valid price (minimum 1 Coal).';
      return;
    }

    this.sellLoading = true;
    this.sellError = null;

    try {
      await firstValueFrom(this._listingService.createListing(this.playerId, this.selectedItem.stoveId, price));
      await this._authService.refreshUser();
      this.coins = this._authService.getCurrentUser()?.coins ?? 0;
      this.closeSellModal();
      if (this.playerId !== null) {
        this.loadItems(this.playerId);
      }
    } catch (err: any) {
      console.error('Failed to create listing:', err);
      this.sellError = err?.error?.error || 'Failed to list item. Please try again.';
      this.cdr.markForCheck();
    } finally {
      this.sellLoading = false;
      this.cdr.markForCheck();
    }
  }

  private getStoveName(typeId: number): string {
    const nameMap: Record<number, string> = {
      1: 'Rusty Stove',
      2: 'Standard Stove',
      3: 'Bronze Stove',
      4: 'Silver Stove',
      5: 'Golden Stove',
      6: 'Crystal Stove',
      7: 'Dragon Stove',
      8: 'Phoenix Stove',
      9: 'One of a Kind',
    };
    return nameMap[typeId] || `Stove #${typeId}`;
  }

  private getLootboxTypeName(typeId: number): string {
    const nameMap: Record<number, string> = {
      1: 'Standard Lootbox',
      2: 'Premium Lootbox',
      3: 'Legendary Crate',
    };
    return nameMap[typeId] || `Lootbox #${typeId}`;
  }

  openBox(lootboxId?: number): void {
    if (lootboxId) {
      void this.router.navigate(['/lootboxes'], { queryParams: { open: lootboxId } });
    } else {
      void this.router.navigate(['/lootboxes']);
    }
  }
}
