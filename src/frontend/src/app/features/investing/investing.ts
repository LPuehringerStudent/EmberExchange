import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { StoveService } from '@core/services/stove.service';
import { LootboxService } from '@core/services/lootbox.service';
import { PriceHistoryService } from '@core/services/price-history.service';
import { LootboxRow, LootboxTypeRow, StoveTypeRow, PriceHistoryRow } from '@shared/model';

/* ─── Models ─── */

interface InvestableAsset {
  id: number;
  ticker: string;
  name: string;
  description: string;
  category: 'stove' | 'lootbox';
  rarity: string;
  currentPrice: number;
  previousPrice: number;
  imageUrl: string;
  heatLevel?: number;
  collection?: string;
  typeId: number;
  acquiredHow?: string;
  totalSupply: number;
  volume24h: number;
}

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
  startDate: Date;
  midDate: Date;
  endDate: Date;
}

interface OwnedStock {
  assetId: number;
  category: 'stove' | 'lootbox';
  ticker: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  imageUrl: string;
  rarity: string;
}

interface PortfolioStock extends OwnedStock {
  currentPrice: number;
  value: number;
  pl: number;
}

type TimeRange = '1d' | '1w' | '1m';
type Category = 'all' | 'stoves' | 'lootboxes';
type View = 'overview' | 'market';

/* ─── Pricing helpers ─── */

function getStoveBasePrice(rarity: string): number {
  switch (rarity.toLowerCase()) {
    case 'common': return 30;
    case 'uncommon': return 75;
    case 'rare': return 180;
    case 'epic': return 450;
    case 'legendary': return 1500;
    case 'limited': return 3000;
    case 'secret': return 8000;
    default: return 25;
  }
}

function getLootboxBasePrice(typeName: string): number {
  const name = typeName.toLowerCase();
  if (name.includes('dragon')) return 950;
  if (name.includes('winter')) return 650;
  if (name.includes('legendary')) return 750;
  if (name.includes('golden')) return 400;
  if (name.includes('epic')) return 500;
  return 120;
}

function generateTicker(name: string, category: 'stove' | 'lootbox'): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return clean.slice(0, 4) || (category === 'stove' ? 'STV' : 'BOX');
}

@Component({
  selector: 'app-investing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './investing.html',
  styleUrl: './investing.css',
})
export class Investing implements OnInit {
  private authService = inject(AuthService);
  private stoveService = inject(StoveService);
  private lootboxService = inject(LootboxService);
  private priceHistoryService = inject(PriceHistoryService);

  readonly gridLineYs = [0, 10, 20, 30, 40];

  playerId = signal<number | null>(null);
  balance = signal<number>(0);

  currentView = signal<View>('overview');
  activeCategory = signal<Category>('all');
  selectedAsset = signal<InvestableAsset | null>(null);
  timeRange = signal<TimeRange>('1w');
  priceHistory = signal<PricePoint[]>([]);
  quantity = signal<number>(1);
  hoverIndex = signal<number>(-1);
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');

  stoveAssets = signal<InvestableAsset[]>([]);
  lootboxAssets = signal<InvestableAsset[]>([]);
  ownedStocks = signal<OwnedStock[]>([]);

  allAssets = computed<InvestableAsset[]>(() => [
    ...this.stoveAssets(),
    ...this.lootboxAssets(),
  ]);

  filteredAssets = computed<InvestableAsset[]>(() => {
    const cat = this.activeCategory();
    if (cat === 'stoves') return this.stoveAssets();
    if (cat === 'lootboxes') return this.lootboxAssets();
    return this.allAssets();
  });

  searchedAssets = computed<InvestableAsset[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const assets = this.filteredAssets();
    if (!query) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.ticker.toLowerCase().includes(query)
    );
  });

  chartModel = computed<ChartModel | null>(() => {
    const data = this.priceHistory();
    if (data.length < 2) return null;

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05 || max * 0.05;
    const minPrice = min - padding;
    const maxPrice = max + padding;
    const range = maxPrice - minPrice || 1;

    const width = 100;
    const height = 40;

    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((d.price - minPrice) / range) * height,
      price: d.price,
      timestamp: d.timestamp,
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
      startDate: points[0].timestamp,
      midDate: points[Math.floor(points.length / 2)].timestamp,
      endDate: points[points.length - 1].timestamp,
    };
  });

  changePercent = computed(() => {
    const asset = this.selectedAsset();
    if (!asset || asset.previousPrice === 0) return 0;
    return ((asset.currentPrice - asset.previousPrice) / asset.previousPrice) * 100;
  });

  totalCost = computed(() => {
    const asset = this.selectedAsset();
    if (!asset) return 0;
    return asset.currentPrice * this.quantity();
  });

  canInvest = computed(() => this.totalCost() <= this.balance());

  periodHigh = computed(() => {
    const data = this.priceHistory();
    return data.length ? Math.max(...data.map((d) => d.price)) : 0;
  });

  periodLow = computed(() => {
    const data = this.priceHistory();
    return data.length ? Math.min(...data.map((d) => d.price)) : 0;
  });

  periodChange = computed(() => {
    const data = this.priceHistory();
    if (data.length < 2) return 0;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    return ((last - first) / first) * 100;
  });

  hoveredPoint = computed(() => {
    const model = this.chartModel();
    const index = this.hoverIndex();
    if (!model || index < 0 || index >= model.points.length) return null;
    return model.points[index];
  });

  formattedBalance = computed(() => this.formatCoal(this.balance()));
  formattedTotalCost = computed(() => this.formatCoal(this.totalCost()));

  /* ── Portfolio derived state ── */
  portfolioCurrentValue = computed(() => {
    const stocks = this.ownedStocks();
    const assets = this.allAssets();
    return stocks.reduce((sum, s) => {
      const asset = assets.find(
        (a) => a.id === s.assetId && a.category === s.category
      );
      return sum + s.quantity * (asset?.currentPrice ?? s.avgBuyPrice);
    }, 0);
  });

  portfolioCostBasis = computed(() =>
    this.ownedStocks().reduce((sum, s) => sum + s.quantity * s.avgBuyPrice, 0)
  );

  portfolioPL = computed(() => {
    const cost = this.portfolioCostBasis();
    const value = this.portfolioCurrentValue();
    return cost > 0 ? ((value - cost) / cost) * 100 : 0;
  });

  portfolioSummary = computed(() => {
    const stocks = this.ownedStocks();
    const assets = this.allAssets();
    let totalValue = 0;
    let totalCost = 0;
    const performers: PortfolioStock[] = [];

    for (const stock of stocks) {
      const asset = assets.find(
        (a) => a.id === stock.assetId && a.category === stock.category
      );
      if (!asset) continue;
      const value = stock.quantity * asset.currentPrice;
      const cost = stock.quantity * stock.avgBuyPrice;
      const pl = cost > 0 ? ((asset.currentPrice - stock.avgBuyPrice) / stock.avgBuyPrice) * 100 : 0;
      totalValue += value;
      totalCost += cost;
      performers.push({ ...stock, currentPrice: asset.currentPrice, value, pl });
    }

    const sorted = [...performers].sort((a, b) => b.pl - a.pl);
    const topGainers = sorted.slice(0, 3);
    const topLosers = sorted.slice(-3).reverse();
    const totalPL = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return { totalValue, totalCost, totalPL, performers, topGainers, topLosers };
  });

  selectedAssetPosition = computed(() => {
    const asset = this.selectedAsset();
    if (!asset) return null;
    return (
      this.ownedStocks().find(
        (s) => s.assetId === asset.id && s.category === asset.category
      ) ?? null
    );
  });

  selectedAssetPL = computed(() => {
    const asset = this.selectedAsset();
    const pos = this.selectedAssetPosition();
    if (!asset || !pos) return 0;
    return ((asset.currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 100;
  });

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.playerId.set(user.playerId);
      this.balance.set(user.coins ?? 0);
      this.loadPortfolio(user.playerId);
    }

    await Promise.all([this.loadStoves(), this.loadLootboxes()]);

    this.loading.set(false);

    const assets = this.filteredAssets();
    if (assets.length > 0 && !this.selectedAsset()) {
      this.selectAsset(assets[0]);
    }
  }

  setCategory(category: Category): void {
    this.activeCategory.set(category);
    const assets = this.filteredAssets();
    if (assets.length > 0) {
      this.selectAsset(assets[0]);
    } else {
      this.selectedAsset.set(null);
      this.priceHistory.set([]);
    }
  }

  selectAsset(asset: InvestableAsset): void {
    this.selectedAsset.set(asset);
    this.quantity.set(1);
    this.loadPriceHistory(asset);
  }

  setTimeRange(range: TimeRange): void {
    this.timeRange.set(range);
    const asset = this.selectedAsset();
    if (asset) {
      this.loadPriceHistory(asset);
    }
  }

  updateQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    this.quantity.set(isNaN(value) || value < 1 ? 1 : value);
  }

  incrementQuantity(): void {
    this.quantity.update((q) => q + 1);
  }

  decrementQuantity(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
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

  viewAsset(stock: OwnedStock | PortfolioStock): void {
    const asset = this.allAssets().find(
      (a) => a.id === stock.assetId && a.category === stock.category
    );
    if (asset) {
      this.selectAsset(asset);
    } else {
      this.activeCategory.set('all');
      this.selectedAsset.set(null);
      this.priceHistory.set([]);
    }
    this.currentView.set('market');
  }

  executeInvestment(): void {
    const asset = this.selectedAsset();
    const cost = this.totalCost();
    const qty = this.quantity();
    if (!asset || cost > this.balance()) return;

    this.balance.update((b) => b - cost);

    const existing = this.ownedStocks().find(
      (s) => s.assetId === asset.id && s.category === asset.category
    );

    if (existing) {
      const totalQty = existing.quantity + qty;
      const totalCost = existing.quantity * existing.avgBuyPrice + qty * asset.currentPrice;
      const newAvg = Math.round((totalCost / totalQty) * 100) / 100;

      this.ownedStocks.update((stocks) =>
        stocks.map((s) =>
          s.assetId === asset.id && s.category === asset.category
            ? { ...s, quantity: totalQty, avgBuyPrice: newAvg }
            : s
        )
      );
    } else {
      const newStock: OwnedStock = {
        assetId: asset.id,
        category: asset.category,
        ticker: asset.ticker,
        name: asset.name,
        quantity: qty,
        avgBuyPrice: asset.currentPrice,
        imageUrl: asset.imageUrl,
        rarity: asset.rarity,
      };
      this.ownedStocks.update((stocks) => [...stocks, newStock]);
    }

    this.savePortfolio();
  }

  getStockCurrentPrice(stock: OwnedStock): number {
    const asset = this.allAssets().find(
      (a) => a.id === stock.assetId && a.category === stock.category
    );
    return asset?.currentPrice ?? stock.avgBuyPrice;
  }

  /* ── Portfolio persistence ── */
  private portfolioKey(): string {
    const id = this.playerId();
    return id !== null ? `investing_portfolio_${id}` : 'investing_portfolio_guest';
  }

  private loadPortfolio(playerId: number): void {
    try {
      const raw = localStorage.getItem(`investing_portfolio_${playerId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as OwnedStock[];
        this.ownedStocks.set(parsed);
      }
    } catch {
      this.ownedStocks.set([]);
    }
  }

  private savePortfolio(): void {
    try {
      localStorage.setItem(this.portfolioKey(), JSON.stringify(this.ownedStocks()));
    } catch {
      /* ignore storage errors */
    }
  }

  formatCoal(value: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value) + ' Coal';
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getRarityColor(rarity: string): string {
    switch (rarity.toLowerCase()) {
      case 'common': return '#94a3b8';
      case 'uncommon': return '#22c55e';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      case 'limited': return '#ef4444';
      case 'secret': return '#d946ef';
      default: return '#94a3b8';
    }
  }

  getLootboxImage(typeName: string): string {
    const name = typeName.toLowerCase();
    if (name.includes('dragon')) return 'assets/animation/dragon-chest-idle-animation.gif';
    if (name.includes('winter')) return 'assets/animation/winter-chest-idle-animation.gif';
    if (name.includes('legendary')) return 'assets/animation/legendary-chest-idle-animation.gif';
    if (name.includes('golden')) return 'assets/animation/chest-idle-gold.gif';
    return 'assets/animation/chest-idle.gif';
  }

  getAssetImageUrl(asset: InvestableAsset): string {
    if (asset.category === 'lootbox') {
      return this.getLootboxImage(asset.name);
    }
    return asset.imageUrl;
  }

  /* ─── Data loading ─── */

  private async loadStoves(): Promise<void> {
    try {
      const types = await firstValueFrom(this.stoveService.getAllStoveTypes());
      if (types.length === 0) {
        this.stoveAssets.set([]);
        return;
      }

      const assets = types.map((type: StoveTypeRow) => {
        const base = getStoveBasePrice(type.rarity);
        const heat = (type.minHeat + type.maxHeat) / 2;
        const price = Math.round(base * (1 + heat * 2.5) * 100) / 100;
        const prev = price * (0.92 + Math.random() * 0.16);

        return {
          id: type.typeId,
          ticker: generateTicker(type.name, 'stove'),
          name: type.name,
          description: `A ${type.rarity} stove from the ${type.collection} collection.`,
          category: 'stove' as const,
          rarity: type.rarity,
          currentPrice: price,
          previousPrice: Math.round(prev * 100) / 100,
          imageUrl: type.imageUrl ?? '',
          collection: type.collection ?? 'Unknown',
          typeId: type.typeId,
          totalSupply: 10000,
          volume24h: Math.floor(Math.random() * 500000) + 50000,
        } satisfies InvestableAsset;
      });

      this.stoveAssets.set(assets);
    } catch (err) {
      console.error('Failed to load stove types:', err);
      this.stoveAssets.set([]);
    }
  }

  private async loadLootboxes(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.lootboxAssets.set([]);
      return;
    }

    try {
      const [lootboxes, types] = await Promise.all([
        firstValueFrom(this.lootboxService.getLootboxesByPlayerId(user.playerId)),
        firstValueFrom(this.lootboxService.getAllLootboxTypes()),
      ]);

      const typeMap = new Map<number, LootboxTypeRow>();
      for (const t of types) {
        typeMap.set(t.lootboxTypeId, t);
      }

      const assets = lootboxes.map((lb: LootboxRow) => {
        const type = typeMap.get(lb.lootboxTypeId);
        const name = type?.name ?? `Lootbox #${lb.lootboxTypeId}`;
        const base = getLootboxBasePrice(name);
        const price = Math.round(base * (0.9 + Math.random() * 0.2) * 100) / 100;
        const prev = price * (0.92 + Math.random() * 0.16);

        return {
          id: lb.lootboxId,
          ticker: generateTicker(name, 'lootbox'),
          name,
          description: type?.description ?? `A sealed ${name} lootbox.`,
          category: 'lootbox' as const,
          rarity: 'lootbox',
          currentPrice: price,
          previousPrice: Math.round(prev * 100) / 100,
          imageUrl: this.getLootboxImage(name),
          typeId: lb.lootboxTypeId,
          acquiredHow: lb.acquiredHow,
          totalSupply: 50000,
          volume24h: Math.floor(Math.random() * 800000) + 100000,
        } satisfies InvestableAsset;
      });

      this.lootboxAssets.set(assets);
    } catch (err) {
      console.error('Failed to load lootboxes:', err);
      this.lootboxAssets.set([]);
    }
  }

  private async loadPriceHistory(asset: InvestableAsset): Promise<void> {
    this.priceHistory.set([]);

    if (asset.category === 'stove') {
      try {
        const svc = this.priceHistoryService as unknown as {
          getPriceHistoryByTypeId?: (typeId: number) => Observable<PriceHistoryRow[]>;
        };

        if (svc.getPriceHistoryByTypeId) {
          const raw = await firstValueFrom(svc.getPriceHistoryByTypeId(asset.typeId));
          if (raw && raw.length > 0) {
            const bucketed = this.bucketByDay(raw);
            const sorted = bucketed.sort(
              (a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
            );

            const points: PricePoint[] = sorted.map((h) => ({
              timestamp: new Date(h.saleDate),
              price: h.avgPrice,
            }));

            const filtered = this.filterByTimeRange(points, this.timeRange());
            this.priceHistory.set(filtered);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load real price history:', err);
      }
    }

    /* Fallback to mock history */
    const history = this.generateMockHistory(asset.currentPrice, this.timeRange());
    this.priceHistory.set(history);
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

  private filterByTimeRange(points: PricePoint[], range: TimeRange): PricePoint[] {
    if (points.length === 0) return [];

    const now = new Date();
    let cutoff = new Date();

    switch (range) {
      case '1d':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const filtered = points.filter((p) => p.timestamp >= cutoff);
    return filtered.length >= 2 ? filtered : points;
  }

  private generateMockHistory(currentPrice: number, range: TimeRange): PricePoint[] {
    const now = new Date();
    let count: number;
    let intervalMs: number;

    switch (range) {
      case '1d':
        count = 48;
        intervalMs = 30 * 60 * 1000;
        break;
      case '1w':
        count = 56;
        intervalMs = 3 * 60 * 60 * 1000;
        break;
      case '1m':
        count = 30;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
    }

    const points: PricePoint[] = [];
    let price = currentPrice * (0.88 + Math.random() * 0.12);

    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const volatility = range === '1d' ? 0.008 : range === '1w' ? 0.015 : 0.03;
      const change = (Math.random() - 0.48) * currentPrice * volatility;
      price = Math.max(currentPrice * 0.4, price + change);
      points.push({ timestamp, price: Math.round(price * 100) / 100 });
    }

    points[points.length - 1].price = currentPrice;
    return points;
  }
}
