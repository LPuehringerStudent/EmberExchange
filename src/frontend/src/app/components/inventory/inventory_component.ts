import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StoveApiService } from '../../../services/stove.service';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { ShowedStove, StoveRow, LootboxRow } from '../../../../../shared/model';
import { getLootboxesByPlayerId } from '../../fetchers/lootbox.fetcher';

interface InventoryLootbox {
  id: number;
  typeName: string;
  openedAt: Date;
  acquiredHow: string;
  droppedItem?: string;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  templateUrl: './inventory.html',
  imports: [
    CommonModule,
    RouterModule
  ],
  styleUrls: ['./inventory.css']
})
export class InventoryComponent implements OnInit, OnDestroy {
  activeTab: 'lootboxes' | 'items' = 'lootboxes';

  // User data
  lootboxes: InventoryLootbox[] = [];
  items: ShowedStove[] = [];
  loading = true;
  error: string | null = null;

  private _stove = inject(StoveApiService);
  private _authService = inject(AuthService);
  private _subscription = new Subscription();
  private router = inject(Router);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      // Redirect to login if not authenticated
      this.router.navigate(['/login']);
      return;
    }

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
    const sub = this._stove.getStoves(playerId).pipe(
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
      },
      error: (err) => {
        console.error('Failed to get stoves:', err);
        this.error = 'Failed to load your items. Please try again.';
        this.items = [];
        this.loading = false;
      }
    });
    this._subscription.add(sub);
  }

  async loadLootboxes(playerId: number): Promise<void> {
    try {
      const lootboxData = await getLootboxesByPlayerId(playerId);
      // Transform lootbox data to inventory format
      this.lootboxes = lootboxData.map(lb => ({
        id: lb.lootboxId,
        typeName: this.getLootboxTypeName(lb.lootboxTypeId),
        openedAt: new Date(lb.openedAt),
        acquiredHow: lb.acquiredHow
      }));
    } catch (err) {
      console.error('Failed to load lootboxes:', err);
      // Don't set error here - just show empty lootboxes
      this.lootboxes = [];
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

  openBox(): void {
    void this.router.navigate(['/lootboxes']);
  }
}
