import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { StoveApiService } from '../../services/stove';
import {forkJoin, map, of, Subscription, switchMap} from 'rxjs';
import { ShowedStove, StoveRow } from '../../../../shared/model';

interface InventoryLootbox {
  count: number;
  locked: boolean;
  menuOpen: boolean;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  templateUrl: '../html/inventory.html',
  imports: [
    RouterModule
  ],
  styleUrls: ['../css/inventory.css']
})
export class InventoryComponent implements OnInit, OnDestroy {
  activeTab: 'lootboxes' | 'items' = 'lootboxes';

  // Empty arrays to show empty state
  lootboxes: any[] = [];
  items: ShowedStove[] = [];
  private _stove = inject(StoveApiService);
  private _subscription = new Subscription();
  private router = inject(Router);


  ngOnInit(): void {
    this.getItems();

    // Auto-refresh when service notifies
    const refreshSub = this._stove.refresh$.subscribe(() => {
      this.getItems();
    });
    this._subscription.add(refreshSub);
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }
  getItems(): void {
    const sub = this._stove.getStoves(1).pipe(
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
      },
      error: (err) => {
        console.error('Failed to get stoves:', err);
        this.items = [];
      }
    });
    this._subscription.add(sub);
  }


  private getStoveName(typeId: number): string {
    const nameMap: Record<number, string> = {
      1: 'Basic Stove',
      2: 'Iron Stove',
      3: 'Steel Stove',
      // ... add your stove names
    };
    return nameMap[typeId] || `Stove #${typeId}`;
  }

  toggleMenu(box: InventoryLootbox) {
    box.menuOpen = !box.menuOpen;
  }

  toggleLock(box: InventoryLootbox) {
    box.locked = !box.locked;
  }

  openBox(): void {
    void this.router.navigate(['/lootboxes']);
  }

  deleteBox(box: InventoryLootbox) {
    if (box.locked) return;
    box.count = 0;
  }
}
