import { Component, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, inject, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { StoveRow } from '@shared/model';

interface InventoryStove {
  stoveId: number;
  typeId: number;
  rarity: string;
  stoveName: string;
  imageUrl: string;
}

interface FactorySlot {
  stove: InventoryStove | null;
  state: 'empty' | 'building' | 'active';
  buildStartedAt: number;
  buildDurationMs: number;
  coalGenerated: number;
}

const BUILD_CONFIG: Record<string, { durationMs: number; coalPerHour: number }> = {
  common:    { durationMs: 10_000,    coalPerHour: 10 },
  rare:      { durationMs: 120_000,   coalPerHour: 25 },
  epic:      { durationMs: 600_000,   coalPerHour: 50 },
  legendary: { durationMs: 1_800_000, coalPerHour: 100 },
  secret:    { durationMs: 7_200_000, coalPerHour: 150 },
};

const PAYOUT_INTERVAL_MS = 3_600_000;

@Component({
  selector: 'app-factory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './factory.html',
  styleUrls: ['./factory.css']
})
export class Factory implements OnInit, OnDestroy {
  readonly maxSlots = 10;

  private stoveService = inject(StoveService);
  private authService = inject(AuthService);

  slots = signal<FactorySlot[]>(
    Array.from({ length: this.maxSlots }, () => ({
      stove: null,
      state: 'empty',
      buildStartedAt: 0,
      buildDurationMs: 0,
      coalGenerated: 0,
    }))
  );

  inventoryItems = signal<InventoryStove[]>([]);
  selectedSlotIndex = signal<number | null>(null);
  nextPayoutAt = signal<number>(Date.now() + PAYOUT_INTERVAL_MS);

  totalCoal = computed(() => this.slots().reduce((sum, s) => sum + s.coalGenerated, 0));

  stovePlaced = output<InventoryStove>();
  stoveRemoved = output<InventoryStove>();

  private ticker: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadInventory();
    this.startTicker();
  }

  ngOnDestroy(): void {
    if (this.ticker) clearInterval(this.ticker);
  }

  private async loadInventory(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    try {
      const stoves = await firstValueFrom(
        this.stoveService.getStovesByPlayerId(user.playerId).pipe(
          switchMap((stoves: StoveRow[]) => {
            if (stoves.length === 0) return of<InventoryStove[]>([]);
            return forkJoin(
              stoves.map(stove =>
                this.stoveService.getStoveTypeById(stove.typeId).pipe(
                  map(type => ({
                    stoveId: stove.stoveId,
                    typeId: stove.typeId,
                    rarity: type.rarity,
                    stoveName: type.name,
                    imageUrl: type.imageUrl ?? '',
                  }))
                )
              )
            );
          })
        )
      );
      this.inventoryItems.set(stoves);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  }

  private startTicker(): void {
    this.ticker = setInterval(() => {
      const now = Date.now();

      this.slots.update(current =>
        current.map(slot => {
          if (slot.state === 'building' && now >= slot.buildStartedAt + slot.buildDurationMs) {
            return { ...slot, state: 'active' };
          }
          return slot;
        })
      );

      if (now >= this.nextPayoutAt()) {
        this.slots.update(current =>
          current.map(slot => {
            if (slot.state === 'active' && slot.stove) {
              const config = BUILD_CONFIG[slot.stove.rarity.toLowerCase()];
              if (config) {
                return {
                  ...slot,
                  coalGenerated: slot.coalGenerated + config.coalPerHour,
                };
              }
            }
            return slot;
          })
        );

        let next = this.nextPayoutAt() + PAYOUT_INTERVAL_MS;
        while (next < now) next += PAYOUT_INTERVAL_MS;
        this.nextPayoutAt.set(next);
      }
    }, 1000);
  }

  onSlotClick(index: number): void {
    const slot = this.slots()[index];
    if (slot.state === 'empty') {
      this.selectedSlotIndex.set(index);
    } else {
      this.removeStove(index);
    }
  }

  onSlotKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter') this.onSlotClick(index);
  }

  closePopup(): void {
    this.selectedSlotIndex.set(null);
  }

  availableForSlot(index: number): InventoryStove[] {
    const placedTypeIds = new Set(
      this.slots().filter(s => s.stove).map(s => s.stove!.typeId)
    );
    const isPremium = index < 2;
    return this.inventoryItems().filter(item => {
      if (placedTypeIds.has(item.typeId)) return false;
      if (!isPremium && (item.rarity === 'legendary' || item.rarity === 'secret')) return false;
      return true;
    });
  }

  placeStove(index: number, stove: InventoryStove): void {
    const rarity = stove.rarity.toLowerCase();
    const config = BUILD_CONFIG[rarity];
    if (!config) return;

    this.slots.update(current => {
      const next = [...current];
      next[index] = {
        stove,
        state: 'building',
        buildStartedAt: Date.now(),
        buildDurationMs: config.durationMs,
        coalGenerated: 0,
      };
      return next;
    });
    this.selectedSlotIndex.set(null);
    this.stovePlaced.emit(stove);
  }

  removeStove(index: number): void {
    const slot = this.slots()[index];
    if (!slot.stove) return;

    const stove = slot.stove;
    this.slots.update(current => {
      const next = [...current];
      next[index] = {
        stove: null,
        state: 'empty',
        buildStartedAt: 0,
        buildDurationMs: 0,
        coalGenerated: 0,
      };
      return next;
    });
    this.stoveRemoved.emit(stove);
  }

  isOccupied(index: number): boolean {
    return this.slots()[index].state !== 'empty';
  }

  hasRightPipe(index: number): boolean {
    return index % 5 !== 4 && this.isOccupied(index) && this.isOccupied(index + 1);
  }

  hasLeftPipe(index: number): boolean {
    return index % 5 !== 0 && this.isOccupied(index) && this.isOccupied(index - 1);
  }

  hasBottomPipe(index: number): boolean {
    return index < 5 && this.isOccupied(index) && this.isOccupied(index + 5);
  }

  hasTopPipe(index: number): boolean {
    return index >= 5 && this.isOccupied(index) && this.isOccupied(index - 5);
  }

  formatBuildTime(slot: FactorySlot): string {
    const ms = Math.max(0, slot.buildStartedAt + slot.buildDurationMs - Date.now());
    const sec = Math.ceil(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatPayoutTime(): string {
    const ms = Math.max(0, this.nextPayoutAt() - Date.now());
    const sec = Math.ceil(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
