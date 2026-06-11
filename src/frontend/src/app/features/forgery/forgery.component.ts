import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { forkJoin, of, switchMap, map } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { StoveService } from '@core/services/stove.service';
import { ForgeryService } from '@core/services/forgery.service';
import { ShowedStove, Rarity, ForgeryResult } from '@shared/model';
import { InfoTooltipComponent } from '../../shared/components/info-tooltip/info-tooltip.component';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

const RARITY_ORDER: Rarity[] = [
  Rarity.COMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY,
  Rarity.LIMITED,
  Rarity.SECRET
];

const FORGEABLE_RARITIES: Rarity[] = [
  Rarity.COMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY
];

interface ForgeSlot {
  stove: ShowedStove | null;
}

type MergePhase = 'charging' | 'igniting' | 'converging' | 'flash' | null;

@Component({
  selector: 'app-forgery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, InfoTooltipComponent, PageBackgroundComponent,
  ],
  templateUrl: './forgery.component.html',
  styleUrls: ['./forgery.component.css']
})
export class ForgeryComponent {
  private auth = inject(AuthService);
  private stoveService = inject(StoveService);
  private forgeryService = inject(ForgeryService);
  router = inject(Router);

  // ─── State ───
  stoves = signal<ShowedStove[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  selectedRarity = signal<Rarity | null>(null);
  slots = signal<ForgeSlot[]>(Array.from({ length: 6 }, () => ({ stove: null })));
  forging = signal(false);

  result = signal<ForgeryResult | null>(null);
  showResult = signal(false);

  // ─── Merge Animation State ───
  mergeAnimating = signal(false);
  mergeAnimSlot = signal<number>(-1);
  mergePhase = signal<MergePhase>(null);
  mergeResultData = signal<ForgeryResult | null>(null);
  readonly blueFireGif = 'assets/animation/blue-fire.gif';
  private mergeTimeouts: ReturnType<typeof setTimeout>[] = [];

  // ─── Computed ───
  selectedStoveIds = computed(() => {
    const ids = new Set<number>();
    for (const slot of this.slots()) {
      if (slot.stove) ids.add(slot.stove.stoveId);
    }
    return ids;
  });

  selectedCount = computed(() => this.selectedStoveIds().size);

  canForge = computed(() => {
    const count = this.selectedCount();
    if (count !== 6) return false;
    const selected = this.slots()
      .map(s => s.stove)
      .filter((s): s is ShowedStove => s !== null);
    const firstRarity = selected[0]?.rarity;
    return selected.every(s => s.rarity === firstRarity);
  });

  targetRarity = computed(() => {
    const selected = this.slots()
      .map(s => s.stove)
      .filter((s): s is ShowedStove => s !== null);
    if (selected.length === 0) return null;
    const current = selected[0].rarity;
    const idx = RARITY_ORDER.indexOf(current);
    return idx >= 0 && idx < RARITY_ORDER.length - 1 ? RARITY_ORDER[idx + 1] : null;
  });

  filteredStoves = computed(() => {
    const rarity = this.selectedRarity();
    if (!rarity) return this.stoves();
    return this.stoves().filter(s => s.rarity === rarity);
  });

  rarityCounts = computed(() => {
    const counts = new Map<Rarity, number>();
    for (const r of FORGEABLE_RARITIES) counts.set(r, 0);
    for (const stove of this.stoves()) {
      counts.set(stove.rarity, (counts.get(stove.rarity) ?? 0) + 1);
    }
    return counts;
  });

  readonly forgeableRarities = FORGEABLE_RARITIES;
  readonly rarityOrder = RARITY_ORDER;

  readonly slotPositions = [
    { left: '50%', top: '10%', transform: 'translate(-50%, -50%)' },   // top
    { left: '86%', top: '32%', transform: 'translate(-50%, -50%)' },  // top-right
    { left: '86%', top: '68%', transform: 'translate(-50%, -50%)' },  // bottom-right
    { left: '50%', top: '88%', transform: 'translate(-50%, -50%)' },  // bottom
    { left: '14%', top: '68%', transform: 'translate(-50%, -50%)' },  // bottom-left
    { left: '14%', top: '32%', transform: 'translate(-50%, -50%)' },  // top-left
  ];

  constructor() {
    this.loadStoves();
  }

  // ─── Loading ───
  async loadStoves(): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const stoves = await firstValueFrom(
        this.stoveService.getStovesByPlayerId(user.playerId).pipe(
          switchMap((stoveRows) => {
            if (stoveRows.length === 0) return of([]);
            return forkJoin(
              stoveRows.map(stove =>
                this.stoveService.getStoveTypeById(stove.typeId).pipe(
                  map(type => ({
                    ...stove,
                    stoveName: type.name,
                    rarity: type.rarity,
                    imageUrl: type.imageUrl ?? '',
                    collection: type.collection ?? 'Unknown'
                  }))
                )
              )
            );
          })
        )
      );

      this.stoves.set(stoves as ShowedStove[]);
    } catch (err: any) {
      console.error('Failed to load stoves:', err);
      this.error.set(err?.message || 'Failed to load your stoves. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Selection ───
  isSelected(stoveId: number): boolean {
    return this.selectedStoveIds().has(stoveId);
  }

  toggleStove(stove: ShowedStove): void {
    if (this.isSelected(stove.stoveId)) {
      this.removeStove(stove.stoveId);
      return;
    }

    if (this.selectedCount() >= 6) return;

    // Enforce same-rarity selection
    const currentSlots = this.slots();
    const firstSelected = currentSlots.find(s => s.stove !== null)?.stove;
    if (firstSelected && firstSelected.rarity !== stove.rarity) {
      return;
    }

    const emptyIdx = currentSlots.findIndex(s => s.stove === null);
    if (emptyIdx === -1) return;

    const updated = [...currentSlots];
    updated[emptyIdx] = { stove };
    this.slots.set(updated);

    // Auto-select rarity filter on first pick
    if (this.selectedCount() === 1) {
      this.selectedRarity.set(stove.rarity);
    }
  }

  removeStove(stoveId: number): void {
    const updated = this.slots().map(s =>
      s.stove?.stoveId === stoveId ? { stove: null } : s
    );
    this.slots.set(updated);
  }

  clearSlots(): void {
    this.slots.set(Array.from({ length: 6 }, () => ({ stove: null })));
    this.selectedRarity.set(null);
  }

  setRarityFilter(rarity: Rarity): void {
    const current = this.selectedRarity();
    this.selectedRarity.set(current === rarity ? null : rarity);
  }

  // ─── Forging ───
  async onForge(): Promise<void> {
    if (!this.canForge() || this.mergeAnimating()) return;

    const sessionId = this.auth.getSessionId();
    if (!sessionId) {
      this.router.navigate(['/login']);
      return;
    }

    const stoveIds = this.slots()
      .map(s => s.stove?.stoveId)
      .filter((id): id is number => id !== undefined);

    this.forging.set(true);
    this.error.set(null);

    try {
      const res = await this.forgeryService.forge(sessionId, stoveIds);

      if (res.success) {
        this.startMergeAnimation(res);
      } else {
        this.result.set(res);
        this.showResult.set(true);
      }
    } catch (err: any) {
      console.error('Forge failed:', err);
      this.error.set(err?.message || 'Forging failed. Please try again.');
    } finally {
      this.forging.set(false);
    }
  }

  private startMergeAnimation(result: ForgeryResult): void {
    this.mergeTimeouts.forEach(clearTimeout);
    this.mergeTimeouts = [];
    this.mergeAnimating.set(true);
    this.mergeAnimSlot.set(-1);
    this.mergePhase.set('charging');
    this.mergeResultData.set(result);

    const t = (fn: () => void, delay: number) => {
      this.mergeTimeouts.push(setTimeout(fn, delay));
    };

    // Phase 1: Charging (0-700ms)
    t(() => {
      this.mergePhase.set('igniting');

      // Phase 2: Ignite slots one by one, 750ms apart
      for (let i = 0; i < 6; i++) {
        t(() => {
          this.mergeAnimSlot.set(i);
        }, 700 + i * 750);
      }

      // Phase 3: Convergence to center
      t(() => {
        this.mergePhase.set('converging');
      }, 700 + 6 * 750 + 1500);

      // Phase 4: Flash explosion
      t(() => {
        this.mergePhase.set('flash');
        t(() => {
          this.finishMergeAnimation();
        }, 900);
      }, 700 + 6 * 750 + 1500 + 1000);
    }, 100);
  }

  skipMergeAnimation(): void {
    this.mergeTimeouts.forEach(clearTimeout);
    this.mergeTimeouts = [];
    this.finishMergeAnimation();
  }

  private finishMergeAnimation(): void {
    this.mergePhase.set(null);
    this.mergeAnimating.set(false);
    this.mergeAnimSlot.set(-1);
    this.slots.set(Array.from({ length: 6 }, () => ({ stove: null })));
    this.result.set(this.mergeResultData());
    this.showResult.set(true);
    this.loadStoves();
  }

  closeResult(): void {
    this.showResult.set(false);
    this.result.set(null);
  }

  // ─── Helpers ───
  rarityLabel(rarity: Rarity): string {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  }

  getRarityGradient(rarity: Rarity): string {
    const map: Record<Rarity, string> = {
      [Rarity.COMMON]: 'from-gray-400 to-gray-500',
      [Rarity.RARE]: 'from-blue-400 to-blue-600',
      [Rarity.EPIC]: 'from-purple-400 to-purple-600',
      [Rarity.LEGENDARY]: 'from-amber-400 to-orange-500',
      [Rarity.LIMITED]: 'from-rose-400 to-red-600',
      [Rarity.SECRET]: 'from-emerald-400 to-teal-600',
    };
    return map[rarity] || 'from-gray-400 to-gray-500';
  }

  getRarityGlow(rarity: Rarity): string {
    const map: Record<Rarity, string> = {
      [Rarity.COMMON]: 'shadow-gray-500/20',
      [Rarity.RARE]: 'shadow-blue-500/20',
      [Rarity.EPIC]: 'shadow-purple-500/20',
      [Rarity.LEGENDARY]: 'shadow-amber-500/20',
      [Rarity.LIMITED]: 'shadow-rose-500/20',
      [Rarity.SECRET]: 'shadow-emerald-500/20',
    };
    return map[rarity] || 'shadow-gray-500/20';
  }

  getRarityBorder(rarity: Rarity): string {
    const map: Record<Rarity, string> = {
      [Rarity.COMMON]: 'border-gray-400/40',
      [Rarity.RARE]: 'border-blue-400/40',
      [Rarity.EPIC]: 'border-purple-400/40',
      [Rarity.LEGENDARY]: 'border-amber-400/40',
      [Rarity.LIMITED]: 'border-rose-400/40',
      [Rarity.SECRET]: 'border-emerald-400/40',
    };
    return map[rarity] || 'border-gray-400/40';
  }

  getRarityText(rarity: Rarity): string {
    const map: Record<Rarity, string> = {
      [Rarity.COMMON]: 'text-gray-500',
      [Rarity.RARE]: 'text-blue-500',
      [Rarity.EPIC]: 'text-purple-500',
      [Rarity.LEGENDARY]: 'text-amber-500',
      [Rarity.LIMITED]: 'text-rose-500',
      [Rarity.SECRET]: 'text-emerald-500',
    };
    return map[rarity] || 'text-gray-500';
  }

  getHeatColor(heat: number): string {
    if (heat >= 80) return '#ffd700';
    if (heat >= 60) return '#ff4500';
    if (heat >= 40) return '#f59e0b';
    if (heat >= 20) return '#dc2626';
    return '#64748b';
  }
}
