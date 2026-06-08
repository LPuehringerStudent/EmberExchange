import { Component, input, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShowedStove } from '@shared/model';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';
import { InfoTooltipComponent } from '../../shared/components/info-tooltip/info-tooltip.component';

const REROLL_BASE_COST: Record<string, number> = {
  common: 10, rare: 20, epic: 40, legendary: 80, limited: 100, secret: 150,
};

@Component({
  selector: 'app-stove-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HeatTierPipe, InfoTooltipComponent],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4" (click)="onClose.emit()">
      <div class="bg-surface border border-border rounded-[20px] max-w-[420px] w-full max-h-[90vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">

        <!-- Header image -->
        <div class="relative h-52 flex items-center justify-center bg-gradient-to-br from-surface-secondary to-body shrink-0">
          @if (stove().imageUrl) {
            <img [src]="stove().imageUrl" [alt]="stove().stoveName" class="w-44 h-44 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]" />
          } @else {
            <div class="w-32 h-32 rounded-2xl bg-accent/10 flex items-center justify-center">
              <svg class="w-16 h-16 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 18h16M4 14h16M8 14V8a4 4 0 0 1 8 0v6"/>
                <circle cx="12" cy="5" r="2"/>
              </svg>
            </div>
          }
          <button (click)="onClose.emit()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors border-none cursor-pointer">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Info -->
        <div class="p-6 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 class="text-xl font-bold text-text-primary m-0 mb-2">{{ stove().stoveName || 'Stove #' + stove().stoveId }}</h2>
            <div class="flex flex-wrap items-center gap-2">
              <span [class]="'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ' + stove().rarity.toLowerCase()"
                [style.background]="rarityBg(stove().rarity)"
                [style.color]="rarityColor(stove().rarity)">
                <app-info-tooltip text="How rare this stove is. Higher rarity means fewer exist and they're worth more.">{{ stove().rarity }}</app-info-tooltip>
              </span>
              <span [class]="'px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider heat-' + (stove().heatLevel | heatTier | lowercase)"
                class="heat-badge">
                {{ stove().heatLevel | heatTier }}
              </span>
              @if (isListed()) {
                <span class="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 border border-orange-500/20">Listed</span>
              }
            </div>
          </div>

          <!-- Stats grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-body rounded-xl p-3 border border-border">
              <p class="text-[11px] uppercase tracking-wider text-text-muted m-0 mb-1">Type ID</p>
              <p class="text-sm font-semibold text-text-primary m-0">#{{ stove().typeId }}</p>
            </div>
            <div class="bg-body rounded-xl p-3 border border-border">
              <p class="text-[11px] uppercase tracking-wider text-text-muted m-0 mb-1"><app-info-tooltip text="A score from 1–100. Hotter stoves are more valuable and produce more in the Factory.">Heat Level</app-info-tooltip></p>
              <p class="text-sm font-semibold text-text-primary m-0">{{ (stove().heatLevel * 100).toFixed(1) }}%</p>
            </div>
            <div class="bg-body rounded-xl p-3 border border-border">
              <p class="text-[11px] uppercase tracking-wider text-text-muted m-0 mb-1">Collection</p>
              <p class="text-sm font-semibold text-text-primary m-0">{{ stove().collection || 'Unknown' }}</p>
            </div>
            <div class="bg-body rounded-xl p-3 border border-border">
              <p class="text-[11px] uppercase tracking-wider text-text-muted m-0 mb-1">Re-rolls</p>
              <p class="text-sm font-semibold text-text-primary m-0">{{ stove().reRollCount ?? 0 }}</p>
            </div>
          </div>

          <!-- Error / Loading -->
          @if (detailError()) {
            <div class="px-3.5 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-red-500 text-[13px] font-medium">
              {{ detailError() }}
            </div>
          }
          @if (detailLoading()) {
            <div class="flex items-center justify-center gap-2 py-2">
              <span class="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></span>
              <span class="text-sm text-text-secondary">Processing...</span>
            </div>
          }

          <!-- Actions -->
          @if (!isListed()) {
            <div class="flex flex-col gap-2">
              <!-- Action buttons row -->
              <div class="grid grid-cols-3 gap-2">
                <button (click)="toggleAction('sell')" [class.ring-2]="activeAction() === 'sell'"
                  [disabled]="detailLoading()"
                  class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gradient-to-br from-[#e85d04] to-[#f48c06] text-white text-xs font-semibold border-none cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                  Sell
                </button>
                <button (click)="toggleAction('salvage')" [class.ring-2]="activeAction() === 'salvage'"
                  [disabled]="detailLoading()"
                  class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#ff7043] text-white text-xs font-semibold border-none cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Salvage
                </button>
                <button (click)="toggleAction('reroll')" [class.ring-2]="activeAction() === 'reroll'"
                  [disabled]="detailLoading()"
                  class="flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white text-xs font-semibold border-none cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg>
                  <app-info-tooltip text="A currency you get by breaking down unwanted stoves. Spend Sparks to re-roll a stove's Heat."><span class="inline-flex items-center gap-1">Re-Roll</span></app-info-tooltip>
                </button>
              </div>

              <!-- Sell panel -->
              @if (activeAction() === 'sell') {
                <div class="bg-body rounded-xl p-4 border border-border">
                  <label class="block text-xs font-semibold text-text-primary uppercase tracking-wide mb-2">Price (Coal)</label>
                  <input [(ngModel)]="sellPrice" type="number" min="1" placeholder="e.g. 500"
                    class="w-full px-3.5 py-2.5 border-2 border-border rounded-xl text-sm text-text-primary bg-surface focus:outline-none focus:border-accent transition-all mb-3" />
                  <div class="flex gap-2">
                    <button (click)="toggleAction('none')" class="flex-1 py-2.5 rounded-xl bg-surface-secondary text-text-secondary text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors">Cancel</button>
                    <button (click)="confirmSell()" [disabled]="!sellPrice || +sellPrice < 1" class="flex-1 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">List for Sale</button>
                  </div>
                </div>
              }

              <!-- Salvage panel -->
              @if (activeAction() === 'salvage') {
                <div class="bg-[rgba(255,87,34,0.08)] border border-[rgba(255,87,34,0.2)] rounded-xl p-4">
                  <p class="text-sm text-text-secondary m-0 mb-3">Burn this stove permanently to receive Sparks.</p>
                  <div class="flex items-center justify-center gap-2 mb-3 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-[#ff5722]">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span class="text-[#ff5722] font-bold text-lg">+{{ sparksReward() }} Sparks</span>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="toggleAction('none')" class="flex-1 py-2.5 rounded-xl bg-surface text-text-secondary text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors">Cancel</button>
                    <button (click)="onSalvage.emit()" class="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#ff7043] text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity">Salvage</button>
                  </div>
                </div>
              }

              <!-- Re-Roll panel -->
              @if (activeAction() === 'reroll') {
                <div class="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] rounded-xl p-4">
                  <p class="text-sm text-text-secondary m-0 mb-2">Re-roll this stove's heat level within its type's range.</p>
                  <div class="flex items-center justify-center gap-2 mb-1 py-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-[#3b82f6]">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    <span class="text-[#3b82f6] font-bold text-lg">-{{ reRollCost() }} Sparks</span>
                  </div>
                  <p class="text-[11px] text-text-muted text-center m-0 mb-3">
                    Base {{ baseCost() }} × 1.5<sup>{{ stove().reRollCount ?? 0 }}</sup> = {{ reRollCost() }}
                    ({{ (stove().reRollCount ?? 0) + 1 }}{{ ordinalSuffix((stove().reRollCount ?? 0) + 1) }} re-roll)
                  </p>
                  @if (sparksBalance() < reRollCost()) {
                    <p class="text-xs text-red-400 text-center m-0 mb-3">You need {{ reRollCost() }} Sparks. Current balance: {{ sparksBalance() }}</p>
                  }
                  <div class="flex gap-2">
                    <button (click)="toggleAction('none')" class="flex-1 py-2.5 rounded-xl bg-surface text-text-secondary text-xs font-semibold border border-border cursor-pointer hover:text-text-primary transition-colors">Cancel</button>
                    <button (click)="onReRollHeat.emit()" [disabled]="sparksBalance() < reRollCost()" class="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white text-xs font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">Re-Roll Heat</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
              <p class="text-sm text-orange-400 font-medium m-0">This stove is currently listed for sale.</p>
              <p class="text-xs text-text-secondary m-0 mt-1">Cancel the listing to perform actions.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoveDetailComponent {
  stove = input.required<ShowedStove>();
  sparksBalance = input.required<number>();
  isListed = input.required<boolean>();
  detailError = input<string | null>(null);
  detailLoading = input<boolean>(false);

  onClose = output<void>();
  onSell = output<number>();
  onSalvage = output<void>();
  onReRollHeat = output<void>();

  activeAction = signal<'none' | 'sell' | 'salvage' | 'reroll'>('none');
  sellPrice = '';

  baseCost(): number {
    return REROLL_BASE_COST[this.stove().rarity.toLowerCase()] ?? 20;
  }

  reRollCost(): number {
    const count = this.stove().reRollCount ?? 0;
    return Math.ceil(this.baseCost() * Math.pow(1.5, count));
  }

  sparksReward(): number {
    const baseMap: Record<string, number> = { common: 5, rare: 15, epic: 40, legendary: 100, limited: 150, secret: 250 };
    const base = baseMap[this.stove().rarity.toLowerCase()] ?? 1;
    return Math.floor(base * (1 + this.stove().heatLevel));
  }

  toggleAction(action: 'none' | 'sell' | 'salvage' | 'reroll'): void {
    this.activeAction.update(current => current === action ? 'none' : action);
    if (action !== 'sell') {
      this.sellPrice = '';
    }
  }

  confirmSell(): void {
    const price = Number(this.sellPrice);
    if (!this.sellPrice || isNaN(price) || price < 1) return;
    this.onSell.emit(price);
  }

  ordinalSuffix(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  rarityBg(rarity: string): string {
    const map: Record<string, string> = {
      common: '#94a3b8', uncommon: '#22c55e', rare: '#3b82f6',
      epic: '#a855f7', legendary: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      limited: '#ef4444', secret: 'linear-gradient(135deg, #d946ef, #f0abfc)'
    };
    return map[rarity.toLowerCase()] ?? '#94a3b8';
  }

  rarityColor(rarity: string): string {
    return rarity.toLowerCase() === 'legendary' ? '#7c2d12' : 'white';
  }
}
