import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { StoveService } from '@core/services/stove.service';
import { AuthService } from '@core/services/auth.service';
import { StoveRow } from '@shared/model';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'secret';

interface InventoryStove {
  stoveId: number;
  typeId: number;
  rarity: Rarity;
  stoveName: string;
  imageUrl: string;
  heatLevel: number;
}

interface FactorySlot {
  stove: InventoryStove | null;
}

interface RoundResultItem {
  stoveId: number;
  oldHeat: number;
  newHeat: number;
  destroyed: boolean;
  coalEarned: number;
}

const BUILD_CONFIG: Record<Rarity, { baseCoal: number }> = {
  common:    { baseCoal: 25 },
  rare:      { baseCoal: 60 },
  epic:      { baseCoal: 150 },
  legendary: { baseCoal: 400 },
  secret:    { baseCoal: 417 },
};

const ROUND_MULTIPLIERS = [1.0, 1.5, 2.5, 4.0, 6.0];

const LOWER_CHANCE: Record<Rarity, number[]> = {
  common:    [0.10, 0.18, 0.30, 0.45, 0.65],
  rare:      [0.07, 0.14, 0.24, 0.38, 0.55],
  epic:      [0.05, 0.10, 0.18, 0.30, 0.45],
  legendary: [0.03, 0.07, 0.13, 0.22, 0.35],
  secret:    [0.02, 0.05, 0.10, 0.18, 0.28],
};

const HEAT_DAMAGE = 0.2;

@Component({
  selector: 'app-factory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: './factory.html',
  styleUrls: ['./factory.css']
})
export class Factory implements OnInit {
  readonly maxSlots = 10;
  readonly maxRounds = 5;

  readonly roundMultipliers = ROUND_MULTIPLIERS;
  readonly lowerChance = LOWER_CHANCE;

  private stoveService = inject(StoveService);
  private authService = inject(AuthService);
  private router = inject(Router);

  slots = signal<FactorySlot[]>(
    Array.from({ length: this.maxSlots }, () => ({ stove: null }))
  );

  inventoryItems = signal<InventoryStove[]>([]);
  selectedSlotIndex = signal<number | null>(null);
  currentRound = signal<number>(0);
  isResolving = signal<boolean>(false);
  roundResult = signal<RoundResultItem[] | null>(null);
  totalSessionCoal = signal<number>(0);
  gameOver = signal<boolean>(false);

  filledCount = computed(() => this.slots().filter(s => s.stove !== null).length);
  isFull = computed(() => this.filledCount() >= this.maxSlots);
  canStartRound1 = computed(() => this.isFull() && this.currentRound() === 0 && !this.isResolving() && !this.gameOver());
  canContinueRound = computed(() => this.filledCount() > 0 && this.currentRound() > 0 && this.currentRound() < this.maxRounds && !this.isResolving() && !this.gameOver());
  canIgnite = computed(() => this.canStartRound1() || this.canContinueRound());
  allDestroyed = computed(() => this.slots().every(s => s.stove === null));
  isLocked = computed(() => this.currentRound() > 0);

  activeStoves = computed(() => this.slots().filter(s => s.stove !== null).map(s => s.stove!));

  ngOnInit(): void {
    this.loadInventory();
  }

  private async loadInventory(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

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
                    rarity: type.rarity.toLowerCase() as Rarity,
                    stoveName: type.name,
                    imageUrl: type.imageUrl ?? '',
                    heatLevel: stove.heatLevel,
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

  onSlotClick(index: number): void {
    if (this.isResolving() || this.gameOver() || this.isLocked()) return;
    const slot = this.slots()[index];
    if (slot.stove === null) {
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
    if (this.isLocked()) return;
    this.slots.update(current => {
      const next = [...current];
      next[index] = { stove };
      return next;
    });
    this.selectedSlotIndex.set(null);
  }

  removeStove(index: number): void {
    if (this.isLocked()) return;
    this.slots.update(current => {
      const next = [...current];
      next[index] = { stove: null };
      return next;
    });
  }

  ignite(): void {
    if (!this.canIgnite()) return;

    const nextRound = this.currentRound() + 1;

    this.isResolving.set(true);
    this.roundResult.set(null);

    setTimeout(() => {
      this.completeRound(nextRound);
    }, 800);
  }

  private completeRound(round: number): void {
    const results: RoundResultItem[] = [];
    let roundCoal = 0;

    this.slots.update(current =>
      current.map(slot => {
        if (!slot.stove) return slot;

        const stove = slot.stove;
        const rarity = stove.rarity;
        const chance = LOWER_CHANCE[rarity][round - 1];
        const roll = Math.random();

        let newHeat = stove.heatLevel;
        let destroyed = false;

        if (roll < chance) {
          newHeat = Math.max(0, stove.heatLevel - HEAT_DAMAGE);
          if (newHeat <= 0) {
            destroyed = true;
          }
        }

        const config = BUILD_CONFIG[rarity];
        const coal = Math.round(config.baseCoal * ROUND_MULTIPLIERS[round - 1]);
        roundCoal += coal;

        results.push({
          stoveId: stove.stoveId,
          oldHeat: stove.heatLevel,
          newHeat,
          destroyed,
          coalEarned: coal,
        });

        if (destroyed) {
          return { stove: null };
        }

        return {
          stove: { ...stove, heatLevel: newHeat },
        };
      })
    );

    this.currentRound.set(round);
    this.isResolving.set(false);
    this.roundResult.set(results);
    this.totalSessionCoal.update(t => t + roundCoal);

    if (this.allDestroyed()) {
      this.gameOver.set(true);
    }
  }

  cashOut(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const coal = this.totalSessionCoal();
    if (coal > 0) {
      console.log(`Cashing out ${coal} coal`);
    }

    this.resetGame();
  }

  resetGame(): void {
    this.slots.set(Array.from({ length: this.maxSlots }, () => ({ stove: null })));
    this.currentRound.set(0);
    this.isResolving.set(false);
    this.roundResult.set(null);
    this.totalSessionCoal.set(0);
    this.gameOver.set(false);
    this.selectedSlotIndex.set(null);
  }

  heatLabel(heat: number): string {
    if (heat >= 0.8) return 'Inferno';
    if (heat >= 0.6) return 'Blazing';
    if (heat >= 0.4) return 'Smoldering';
    if (heat >= 0.2) return 'Dying';
    return 'Extinguished';
  }

  heatColor(heat: number): string {
    if (heat >= 0.8) return '#ef4444';
    if (heat >= 0.6) return '#f97316';
    if (heat >= 0.4) return '#eab308';
    if (heat >= 0.2) return '#6b7280';
    return '#3b82f6';
  }

  heatBarWidth(heat: number): string {
    return `${(heat * 100).toFixed(0)}%`;
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

  isOccupied(index: number): boolean {
    return this.slots()[index].stove !== null;
  }
}
