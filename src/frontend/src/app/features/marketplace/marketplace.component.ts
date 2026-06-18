import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { ListingService, Listing } from '@core/services/listing.service';
import { TradeService } from '@core/services/trade.service';
import { StoveService, StoveType } from '@core/services/stove.service';
import { LootboxService, LootboxType } from '@core/services/lootbox.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { InvestmentService } from '@core/services/investment.service';
import { ChatMessageService } from '@core/services/chat-message.service';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';
import { PageBackgroundComponent } from '../../shared/components/page-background/page-background.component';

type MarketplaceTab = 'all' | 'my';
type RarityFilter = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'limited' | 'secret';

interface PricePoint {
  timestamp: Date;
  price: number;
}

interface ChartSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isUp: boolean;
}

interface ChartPoint {
  x: number;
  y: number;
  price: number;
  timestamp: Date;
}

interface ChartModel {
  viewBox: string;
  segments: ChartSegment[];
  areaPath: string;
  points: ChartPoint[];
  minPrice: number;
  maxPrice: number;
  priceRange: number;
}

interface PriceTrend {
  previous: number;
  latest: number;
  delta: number;
  percent: number;
}

@Component({
  selector: 'app-marketplace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CommonModule, HeatTierPipe, PageBackgroundComponent],
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.css'],
})
export class MarketplaceComponent implements OnInit {
  readonly activeTab = signal<MarketplaceTab>('all');
  readonly selectedRarities = signal<Set<RarityFilter>>(new Set());

  readonly rarityFilters: { value: RarityFilter; label: string }[] = [
    { value: 'common', label: 'Common' },
    { value: 'uncommon', label: 'Uncommon' },
    { value: 'rare', label: 'Rare' },
    { value: 'epic', label: 'Epic' },
    { value: 'legendary', label: 'Legendary' },
    { value: 'limited', label: 'Limited' },
    { value: 'secret', label: 'Secret' },
  ];

  allListings = signal<Listing[]>([]);
  myListings = signal<Listing[]>([]);
  historyListings = signal<Listing[]>([]);
  priceTrends = signal<Map<number, PriceTrend>>(new Map());
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  processingId = signal<number | null>(null);

  playerId: number | null = null;
  coins = signal<number>(0);

  stoveTypes = signal<Map<number, StoveType>>(new Map());
  lootboxTypes = signal<Map<number, LootboxType>>(new Map());
  investmentPrices = signal<Map<number, number>>(new Map());

  readonly selectedListing = signal<Listing | null>(null);
  readonly priceHistory = signal<PricePoint[]>([]);
  readonly hoverIndex = signal<number>(-1);

  readonly confirmModal = signal<boolean>(false);
  readonly confirmListing = signal<Listing | null>(null);
  readonly confirmType = signal<'buy' | 'cancel' | null>(null);

  readonly messageMode = signal<boolean>(false);
  readonly messageText = signal<string>('');
  readonly messageSent = signal<boolean>(false);

  readonly filteredActiveListings = computed(() =>
    this.allListings().filter((listing) => this.matchesRarityFilter(listing))
  );

  readonly filteredMyListings = computed(() =>
    this.myListings().filter((listing) => this.matchesRarityFilter(listing))
  );

  readonly recentSales = computed(() =>
    this.historyListings()
      .filter((listing) => listing.status === 'sold' && this.matchesRarityFilter(listing))
      .sort((a, b) => this.dateValue(b.listedAt) - this.dateValue(a.listedAt))
      .slice(0, 16)
  );

  readonly risingListings = computed(() =>
    this.filteredActiveListings()
      .filter((listing) => {
        if (!listing.typeId) return false;
        return (this.priceTrends().get(listing.typeId)?.delta ?? 0) > 0;
      })
      .sort((a, b) => (this.getTrendPercent(b) ?? 0) - (this.getTrendPercent(a) ?? 0))
      .slice(0, 16)
  );

  readonly currentListings = computed(() =>
    this.activeTab() === 'all' ? this.filteredActiveListings() : this.filteredMyListings()
  );

  readonly lowestPrice = computed(() => {
    const list = this.filteredActiveListings();
    return list.length ? Math.min(...list.map((l) => l.price)) : 0;
  });

  readonly chartModel = computed<ChartModel | null>(() => {
    const history = this.compactFlatTail(this.priceHistory().filter(
      (point) => Number.isFinite(point.price) && point.price >= 0
    ));
    if (history.length < 2) return null;

    const prices = history.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05 || max * 0.05;
    const minPrice = Math.max(0, min - padding);
    const maxPrice = max + padding;
    const range = maxPrice - minPrice || 1;
    const width = 100;
    const height = 40;

    const points = history.map((h, i) => ({
      x: (i / (history.length - 1)) * width,
      y: height - ((h.price - minPrice) / range) * height,
      price: h.price,
      timestamp: h.timestamp,
    }));

    const segments: ChartSegment[] = [];
    for (let i = 1; i < points.length; i++) {
      segments.push({
        x1: points[i - 1].x,
        y1: points[i - 1].y,
        x2: points[i].x,
        y2: points[i].y,
        isUp: points[i].price >= points[i - 1].price,
      });
    }

    const areaPath =
      `M ${points[0].x} ${height} ` +
      points.map((p) => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${height} Z`;

    return {
      viewBox: `0 0 ${width} ${height}`,
      segments,
      areaPath,
      points,
      minPrice,
      maxPrice,
      priceRange: range,
    };
  });

  readonly hoveredPoint = computed(() => {
    const model = this.chartModel();
    const index = this.hoverIndex();
    if (!model || index < 0 || index >= model.points.length) return null;
    return model.points[index];
  });

  readonly averageHistoryPrice = computed(() => {
    const h = this.priceHistory();
    if (!h.length) return 0;
    return Math.round(h.reduce((s, p) => s + p.price, 0) / h.length);
  });

  readonly historyLowPrice = computed(() => {
    const h = this.priceHistory().filter((p) => Number.isFinite(p.price) && p.price >= 0);
    return h.length ? Math.min(...h.map((p) => p.price)) : 0;
  });

  readonly historyHighPrice = computed(() => {
    const h = this.priceHistory().filter((p) => Number.isFinite(p.price) && p.price >= 0);
    return h.length ? Math.max(...h.map((p) => p.price)) : 0;
  });

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _listingService = inject(ListingService);
  private _tradeService = inject(TradeService);
  private _stoveService = inject(StoveService);
  private _lootboxService = inject(LootboxService);
  private _priceHistoryService = inject(PriceHistoryService);
  private _investmentService = inject(InvestmentService);
  private _chatService = inject(ChatMessageService);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (!user) {
      void this._router.navigate(['/login']);
      return;
    }
    this.playerId = user.playerId;
    this.coins.set(user.coins);
    void this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [active, history, mine, types, lootboxTypeList, investments] = await Promise.all([
        firstValueFrom(this._listingService.getActiveListings()),
        firstValueFrom(this._listingService.getAllListings(100, 0)),
        this.playerId !== null
          ? firstValueFrom(this._listingService.getListingsBySellerId(this.playerId))
          : Promise.resolve([]),
        firstValueFrom(this._stoveService.getAllStoveTypes()),
        firstValueFrom(this._lootboxService.getAllLootboxTypes()),
        firstValueFrom(this._investmentService.getAssets()),
      ]);

      this.allListings.set(active);
      this.historyListings.set(history);
      this.myListings.set(mine);

      const typeMap = new Map<number, StoveType>();
      for (const t of types) typeMap.set(t.typeId, t);
      this.stoveTypes.set(typeMap);

      const lootboxTypeMap = new Map<number, LootboxType>();
      for (const lt of lootboxTypeList) lootboxTypeMap.set(lt.lootboxTypeId, lt);
      this.lootboxTypes.set(lootboxTypeMap);

      const investmentPriceMap = new Map<number, number>();
      for (const asset of investments.assets) {
        investmentPriceMap.set(asset.assetId, asset.currentPrice);
      }
      this.investmentPrices.set(investmentPriceMap);

      await this.loadPriceTrends(active);

      const selected = this.selectedListing();
      if (selected) {
        const updated =
          active.find((l) => l.listingId === selected.listingId) ||
          mine.find((l) => l.listingId === selected.listingId) ||
          history.find((l) => l.listingId === selected.listingId);
        this.selectedListing.set(updated ?? null);
      }
    } catch (err) {
      console.error('Failed to load marketplace:', err);
      this.error.set('Failed to load marketplace listings. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPriceTrends(listings: Listing[]): Promise<void> {
    const typeIds = Array.from(
      new Set(
        listings
          .map((listing) => listing.typeId)
          .filter((typeId): typeId is number => typeof typeId === 'number')
      )
    ).slice(0, 24);

    const trendEntries = await Promise.all(
      typeIds.map(async (typeId) => {
        try {
          const points = await firstValueFrom(this._priceHistoryService.getRecentPrices(typeId, 2));
          const sorted = [...points].sort(
            (a, b) => this.dateValue(a.saleDate) - this.dateValue(b.saleDate)
          );
          if (sorted.length < 2) return null;

          const previous = sorted[sorted.length - 2].salePrice;
          const latest = sorted[sorted.length - 1].salePrice;
          if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(latest)) return null;

          const delta = latest - previous;
          const percent = (delta / previous) * 100;
          return [typeId, { previous, latest, delta, percent }] as const;
        } catch {
          return null;
        }
      })
    );

    const trendMap = new Map<number, PriceTrend>();
    for (const entry of trendEntries) {
      if (entry) trendMap.set(entry[0], entry[1]);
    }
    this.priceTrends.set(trendMap);
  }

  async openDetails(listing: Listing): Promise<void> {
    this.selectedListing.set(listing);
    this.priceHistory.set([]);
    this.hoverIndex.set(-1);
    this.messageMode.set(false);
    this.messageText.set('');
    this.messageSent.set(false);

    if (listing.stoveId) {
      const typeId = listing.typeId;
      if (typeId) {
        try {
          const result = await firstValueFrom(
            this._investmentService.getPriceHistory(typeId, '1m')
          );

          const points: PricePoint[] = result.prices.map((h) => ({
            timestamp: new Date(h.timestamp),
            price: h.price,
          }));

          const currentInvestmentPrice = this.investmentPrices().get(typeId);
          if (currentInvestmentPrice !== undefined && currentInvestmentPrice >= 0) {
            if (points.length > 0) {
              points[points.length - 1] = {
                ...points[points.length - 1],
                price: currentInvestmentPrice,
              };
            } else {
              points.push({
                timestamp: new Date(),
                price: currentInvestmentPrice,
              });
            }
          }

          if (points.length === 1) {
            points.push({
              timestamp: new Date(),
              price: points[0].price,
            });
          }
          this.priceHistory.set(points);
        } catch (err) {
          console.error('Failed to load price history:', err);
          this.priceHistory.set([
            {
              timestamp: new Date(),
              price: listing.price,
            },
          ]);
        }
      }
    } else if (listing.lootboxId) {
      this.priceHistory.set([
        {
          timestamp: new Date(),
          price: listing.price,
        },
      ]);
    }
  }

  private bucketByDay(
    records: { saleDate: Date | string; salePrice: number }[]
  ): { saleDate: string; avgPrice: number }[] {
    const map = new Map<string, number[]>();

    for (const r of records) {
      const day = new Date(r.saleDate).toISOString().slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(r.salePrice);
      map.set(day, arr);
    }

    const result: { saleDate: string; avgPrice: number }[] = [];
    for (const [day, prices] of map) {
      const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
      result.push({ saleDate: day, avgPrice: avg });
    }

    return result;
  }

  closeDetails(): void {
    this.selectedListing.set(null);
    this.priceHistory.set([]);
    this.hoverIndex.set(-1);
    this.messageMode.set(false);
  }

  showConfirm(listing: Listing, type: 'buy' | 'cancel'): void {
    this.confirmListing.set(listing);
    this.confirmType.set(type);
    this.confirmModal.set(true);
  }

  closeConfirm(): void {
    this.confirmModal.set(false);
    this.confirmListing.set(null);
    this.confirmType.set(null);
  }

  async executeConfirmedAction(): Promise<void> {
    const listing = this.confirmListing();
    const type = this.confirmType();
    if (!listing || !type) return;

    if (type === 'buy') {
      await this.buyListing(listing);
    } else {
      await this.cancelListing(listing);
    }

    if (!this.error()) {
      this.closeConfirm();
    }
  }

  async buyListing(listing: Listing): Promise<void> {
    if (this.playerId === null || listing.status !== 'active') return;

    if (this.coins() < listing.price) {
      this.error.set('You do not have enough coins to buy this item.');
      return;
    }

    this.processingId.set(listing.listingId);
    try {
      await firstValueFrom(this._tradeService.executeTrade(listing.listingId, this.playerId));
      await this._authService.refreshUser();
      this.coins.set(this._authService.getCurrentUser()?.coins ?? 0);
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { message?: string; error?: { error?: string } };
      this.error.set(e?.message ?? e?.error?.error ?? 'Purchase failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  async cancelListing(listing: Listing): Promise<void> {
    if (listing.status !== 'active') return;

    this.processingId.set(listing.listingId);
    try {
      await firstValueFrom(this._listingService.cancelListing(listing.listingId));
      await this.loadData();
    } catch (err: unknown) {
      const e = err as { message?: string; error?: { error?: string } };
      this.error.set(e?.message ?? e?.error?.error ?? 'Cancellation failed. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  toggleMessageMode(): void {
    this.messageMode.update((v) => !v);
    this.messageSent.set(false);
  }

  async sendMessageToSeller(): Promise<void> {
    const listing = this.selectedListing();
    const text = this.messageText().trim();
    if (!listing || !text || !this.playerId || !this.canMessageSeller(listing)) return;

    this.processingId.set(-1);
    try {
      await firstValueFrom(
        this._chatService.sendChatMessage(this.playerId, text, listing.sellerId, 'text', { source: 'marketplace' })
      );
      this.messageSent.set(true);
      this.messageText.set('');
      setTimeout(() => this.messageSent.set(false), 3000);
    } catch (err) {
      console.error('Failed to send message:', err);
      const e = err as { message?: string };
      this.error.set(e?.message ?? 'Failed to send message. Please try again.');
    } finally {
      this.processingId.set(null);
    }
  }

  onChartMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const model = this.chartModel();
    if (!model || model.points.length === 0) return;

    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(ratio * (model.points.length - 1));
    this.hoverIndex.set(index);
  }

  onChartMouseLeave(): void {
    this.hoverIndex.set(-1);
  }

  setTab(tab: MarketplaceTab): void {
    this.activeTab.set(tab);
  }

  toggleRarity(rarity: RarityFilter): void {
    this.selectedRarities.update((current) => {
      const next = new Set(current);
      if (next.has(rarity)) {
        next.delete(rarity);
      } else {
        next.add(rarity);
      }
      return next;
    });
  }

  clearRarityFilters(): void {
    this.selectedRarities.set(new Set());
  }

  isRaritySelected(rarity: RarityFilter): boolean {
    return this.selectedRarities().has(rarity);
  }

  hasRarityFilters(): boolean {
    return this.selectedRarities().size > 0;
  }

  scrollRow(row: HTMLElement, direction: 'left' | 'right'): void {
    const distance = Math.max(280, row.clientWidth * 0.78);
    row.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
  }

  scrollRowById(rowId: string, direction: 'left' | 'right'): void {
    const row = document.getElementById(rowId);
    if (!row) return;
    this.scrollRow(row, direction);
  }

  private matchesRarityFilter(listing: Listing): boolean {
    const selected = this.selectedRarities();
    if (!selected.size) return true;
    return selected.has(this.getRarity(listing) as RarityFilter);
  }

  private dateValue(date: Date | string): number {
    return new Date(date).getTime() || 0;
  }

  isStoveListing(listing: Listing): boolean {
    return !!listing.stoveId;
  }

  isLootboxListing(listing: Listing): boolean {
    return !!listing.lootboxId;
  }

  getItemName(listing: Listing): string {
    if (listing.stoveId) {
      return listing.stoveName ?? `Stove #${listing.stoveId}`;
    }
    if (listing.lootboxId) {
      return listing.lootboxTypeName ?? `Lootbox #${listing.lootboxId}`;
    }
    return 'Unknown Item';
  }

  getItemDescription(listing: Listing): string {
    if (listing.stoveId) {
      return `A ${listing.rarity ?? 'common'} stove from the ${listing.collection ?? 'Unknown'} collection.`;
    }
    if (listing.lootboxId) {
      const type = this.lootboxTypes().get(listing.lootboxTypeId ?? -1);
      return type?.description ?? 'A sealed lootbox.';
    }
    return '';
  }

  getRarity(listing: Listing): string {
    if (listing.stoveId) {
      return listing.rarity?.toLowerCase() ?? 'common';
    }
    return 'common';
  }

  getRarityColor(listing: Listing): string {
    const rarity = this.getRarity(listing);
    switch (rarity) {
      case 'common':
        return '#94a3b8';
      case 'uncommon':
        return '#22c55e';
      case 'rare':
        return '#3b82f6';
      case 'epic':
        return '#a855f7';
      case 'legendary':
        return '#f59e0b';
      case 'limited':
        return '#ef4444';
      case 'secret':
        return '#d946ef';
      default:
        return '#94a3b8';
    }
  }

  getHeatLevel(listing: Listing): number | null {
    if (listing.stoveId) return listing.heatLevel ?? null;
    return null;
  }

  getImageUrl(listing: Listing): string {
    if (listing.stoveId) {
      return listing.imageUrl ?? '';
    }
    if (listing.lootboxId) {
      const type = this.lootboxTypes().get(listing.lootboxTypeId ?? -1);
      if (!type) return '';
      const name = type.name.toLowerCase();
      if (name.includes('dragon')) return 'assets/animation/dragon-chest-idle-animation.gif';
      if (name.includes('winter')) return 'assets/animation/winter-chest-idle-animation.gif';
      if (name.includes('legendary')) return 'assets/animation/legendary-chest-idle-animation.gif';
      if (name.includes('golden')) return 'assets/animation/chest-idle-gold.gif';
      return 'assets/animation/chest-idle.gif';
    }
    return '';
  }

  getItemMeta(listing: Listing): string {
    if (listing.stoveId) return `Stove #${listing.stoveId}`;
    if (listing.lootboxId) return `Lootbox #${listing.lootboxId}`;
    return '';
  }

  getTrend(listing: Listing): PriceTrend | null {
    if (!listing.typeId) return null;
    return this.priceTrends().get(listing.typeId) ?? null;
  }

  getTrendPercent(listing: Listing): number | null {
    return this.getTrend(listing)?.percent ?? null;
  }

  isOwnListing(listing: Listing): boolean {
    return this.playerId !== null && listing.sellerId === this.playerId;
  }

  canMessageSeller(listing: Listing): boolean {
    return listing.status === 'active' && !this.isOwnListing(listing);
  }

  formatPrice(price: number): string {
    return Math.round(price).toLocaleString();
  }

  formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  compactFlatTail(points: PricePoint[]): PricePoint[] {
    if (points.length <= 2) return points;

    let lastMeaningfulIndex = points.length - 1;
    while (
      lastMeaningfulIndex > 0 &&
      points[lastMeaningfulIndex].price === points[lastMeaningfulIndex - 1].price
    ) {
      lastMeaningfulIndex--;
    }

    if (lastMeaningfulIndex === 0) {
      return [points[0], points[points.length - 1]];
    }

    return points.slice(0, lastMeaningfulIndex + 1);
  }

  formatCompact(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (abs >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (abs >= 1_000) {
      return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return value.toFixed(0);
  }

  formatDate(dateString: Date | string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected readonly Math = Math;
}
