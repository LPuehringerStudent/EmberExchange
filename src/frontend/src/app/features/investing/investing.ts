import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { InvestmentService, PortfolioPosition, LeaderboardEntry } from '@core/services/investment.service';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

/* ─── Models ─── */

interface InvestableAsset {
  id: number;
  ticker: string;
  name: string;
  rarity: string;
  currentPrice: number;
  previousPrice: number;
  change24h: number;
  change24hAmount: number;
  basePrice: number;
  imageUrl: string;
  volume30d: number;
  totalMinted: number;
  currentlyListed: number;
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
  ticker: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  imageUrl: string;
  rarity: string;
  currentPrice?: number;
}

interface PortfolioStock extends OwnedStock {
  currentPrice: number;
  value: number;
  pl: number;
}

type TimeRange = '1d' | '1w' | '1m';
type View = 'overview' | 'market';

@Component({
  selector: 'app-investing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterModule, PageBackgroundComponent,
  ],
  templateUrl: './investing.html',
  styleUrl: './investing.css',
})
export class Investing implements OnInit {
  private authService = inject(AuthService);
  private investmentService = inject(InvestmentService);

  readonly gridLineYs = [0, 10, 20, 30, 40];

  playerId = signal<number | null>(null);
  balance = computed(() => this.authService.user()?.coins ?? 0);

  currentView = signal<View>('overview');
  selectedAsset = signal<InvestableAsset | null>(null);
  timeRange = signal<TimeRange>('1w');
  priceHistory = signal<PricePoint[]>([]);
  quantity = signal<number>(1);
  sellQuantity = signal<number>(1);
  hoverIndex = signal<number>(-1);
  sellHoverIndex = signal<number>(-1);
  loading = signal<boolean>(true);
  searchQuery = signal<string>('');
  error = signal<string>('');

  stoveAssets = signal<InvestableAsset[]>([]);
  ownedStocks = signal<OwnedStock[]>([]);
  portfolioAssetHistories = signal<Record<number, PricePoint[]>>({});
  leaderboard = signal<LeaderboardEntry[]>([]);
  private portfolioHistoryRequestId = 0;

  allAssets = computed<InvestableAsset[]>(() => this.stoveAssets());

  searchedAssets = computed<InvestableAsset[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const assets = this.allAssets();
    if (!query) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.ticker.toLowerCase().includes(query)
    );
  });

  chartModel = computed<ChartModel | null>(() => {
    const data = this.compactFlatTail(this.priceHistory().filter(
      (d) => Number.isFinite(d.price) && d.price >= 0
    ));
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

  totalSaleValue = computed(() => {
    const asset = this.selectedAsset();
    if (!asset) return 0;
    return asset.currentPrice * this.sellQuantity();
  });

  canSell = computed(() => {
    const pos = this.selectedAssetPosition();
    if (!pos) return false;
    return this.sellQuantity() > 0 && this.sellQuantity() <= pos.quantity;
  });

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
      let rawPrice = s.currentPrice;
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = assets.find((a) => a.id === s.assetId)?.currentPrice;
      }
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = s.avgBuyPrice;
      }
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = 0;
      }
      const price = rawPrice;
      return sum + s.quantity * price;
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
      const asset = assets.find((a) => a.id === stock.assetId);
      let rawPrice = stock.currentPrice;
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = asset?.currentPrice;
      }
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = stock.avgBuyPrice;
      }
      if (!Number.isFinite(rawPrice) || rawPrice === undefined || rawPrice <= 0) {
        rawPrice = 0;
      }
      const currentPrice = rawPrice;
      const value = stock.quantity * currentPrice;
      const cost = stock.quantity * stock.avgBuyPrice;
      const pl = cost > 0 ? ((currentPrice - stock.avgBuyPrice) / stock.avgBuyPrice) * 100 : 0;
      totalValue += value;
      totalCost += cost;
      performers.push({ ...stock, currentPrice, value, pl });
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
      this.ownedStocks().find((s) => s.assetId === asset.id) ?? null
    );
  });

  selectedAssetPL = computed(() => {
    const asset = this.selectedAsset();
    const pos = this.selectedAssetPosition();
    if (!asset || !pos) return 0;
    return ((asset.currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 100;
  });

  /* ── Portfolio chart ── */
  portfolioHoverIndex = signal<number>(-1);

  portfolioPriceHistory = computed<PricePoint[]>(() => {
    const stocks = this.ownedStocks();
    const histories = this.portfolioAssetHistories();
    const range = this.timeRange();
    if (stocks.length === 0) return [];

    const now = new Date();
    const historyTimelines = stocks
      .map((stock) => histories[stock.assetId] ?? [])
      .filter((history) => history.length > 0);
    const longestHistory = historyTimelines.reduce<PricePoint[]>(
      (longest, history) => history.length > longest.length ? history : longest,
      []
    );
    const timestamps = longestHistory.length > 0
      ? longestHistory.map((point) => point.timestamp)
      : this.createFallbackTimeline(now, range);
    const count = timestamps.length;

    const points: PricePoint[] = [];
    for (let i = 0; i < count; i++) {
      const timestamp = timestamps[i];
      let totalValue = 0;
      for (const stock of stocks) {
        const history = histories[stock.assetId] ?? [];
        const price = this.getHistoricalPriceAt(history, timestamp, this.getStockCurrentPrice(stock));
        totalValue += Math.round(price * 100) / 100 * stock.quantity;
      }
      points.push({ timestamp, price: Math.round(totalValue * 100) / 100 });
    }

    /* Pin the last point to the actual current value */
    const currentValue = this.portfolioCurrentValue();
    if (points.length > 0 && currentValue > 0) {
      points[points.length - 1].price = currentValue;
    }
    return points;
  });

  portfolioChartModel = computed<ChartModel | null>(() => {
    const data = this.compactFlatTail(this.portfolioPriceHistory().filter(
      (d) => Number.isFinite(d.price) && d.price >= 0
    ));
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

  portfolioHoveredPoint = computed(() => {
    const model = this.portfolioChartModel();
    const index = this.portfolioHoverIndex();
    if (!model || index < 0 || index >= model.points.length) return null;
    return model.points[index];
  });

  portfolioPeriodChange = computed(() => {
    const data = this.portfolioPriceHistory();
    if (data.length < 2) return 0;
    const first = data[0].price;
    const last = data[data.length - 1].price;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  });

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.playerId.set(user.playerId);
    }

    await this.loadAssets();
    await this.loadPortfolio();
    await this.loadLeaderboard();

    this.loading.set(false);

    const assets = this.searchedAssets();
    if (assets.length > 0 && !this.selectedAsset()) {
      this.selectAsset(assets[0]);
    }
  }

  selectAsset(asset: InvestableAsset): void {
    this.selectedAsset.set(asset);
    this.quantity.set(1);
    this.loadPriceHistory(asset.id, this.timeRange());
  }

  setTimeRange(range: TimeRange): void {
    this.timeRange.set(range);
    this.loadPortfolioPriceHistories(this.ownedStocks(), range);
    const asset = this.selectedAsset();
    if (asset) {
      this.loadPriceHistory(asset.id, range);
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

  onPortfolioChartMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const model = this.portfolioChartModel();
    if (!model || model.points.length === 0) return;

    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.round(ratio * (model.points.length - 1));
    this.portfolioHoverIndex.set(index);
  }

  onPortfolioChartMouseLeave(): void {
    this.portfolioHoverIndex.set(-1);
  }

  viewAsset(stock: OwnedStock | PortfolioStock): void {
    const asset = this.allAssets().find((a) => a.id === stock.assetId);
    if (asset) {
      this.selectAsset(asset);
    } else {
      this.selectedAsset.set(null);
      this.priceHistory.set([]);
    }
    this.currentView.set('market');
  }

  async executeInvestment(): Promise<void> {
    const asset = this.selectedAsset();
    const qty = this.quantity();
    if (!asset || qty < 1 || this.totalCost() > this.balance()) return;

    try {
      const result = await firstValueFrom(this.investmentService.buy(asset.id, qty));
      if (result.success) {
        await this.authService.refreshUser();
        await this.loadPortfolio();
        await this.loadPriceHistory(asset.id, this.timeRange());
        this.quantity.set(1);
        this.error.set('');
      } else {
        this.error.set(result.error || 'Buy failed');
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Buy failed');
    }
  }

  async executeSale(): Promise<void> {
    const asset = this.selectedAsset();
    const qty = this.sellQuantity();
    const pos = this.selectedAssetPosition();
    if (!asset || !pos || qty > pos.quantity || qty < 1) return;

    try {
      const result = await firstValueFrom(this.investmentService.sell(asset.id, qty));
      if (result.success) {
        console.log('Sale fee:', result.fee);
        await this.authService.refreshUser();
        await this.loadPortfolio();
        await this.loadPriceHistory(asset.id, this.timeRange());
        this.sellQuantity.set(1);
        this.error.set('');
      } else {
        this.error.set(result.error || 'Sell failed');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (err?.status === 429 || msg.includes('Cooldown')) {
        this.error.set('Cooldown active — please wait before selling again');
      } else {
        this.error.set(msg || 'Sell failed');
      }
    }
  }

  updateSellQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    const pos = this.selectedAssetPosition();
    const maxQty = pos?.quantity ?? 1;
    this.sellQuantity.set(isNaN(value) || value < 1 ? 1 : Math.min(value, maxQty));
  }

  incrementSellQuantity(): void {
    const pos = this.selectedAssetPosition();
    const maxQty = pos?.quantity ?? 1;
    this.sellQuantity.update((q) => Math.min(q + 1, maxQty));
  }

  decrementSellQuantity(): void {
    this.sellQuantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  getStockCurrentPrice(stock: OwnedStock): number {
    if (stock.currentPrice !== undefined) return stock.currentPrice;
    const asset = this.allAssets().find((a) => a.id === stock.assetId);
    return asset?.currentPrice ?? stock.avgBuyPrice;
  }

  getHistoricalPriceAt(history: PricePoint[], timestamp: Date, fallbackPrice: number): number {
    if (history.length === 0) return fallbackPrice;

    const time = timestamp.getTime();
    let closest = history[0];
    let closestDistance = Math.abs(closest.timestamp.getTime() - time);

    for (const point of history) {
      const distance = Math.abs(point.timestamp.getTime() - time);
      if (distance < closestDistance) {
        closest = point;
        closestDistance = distance;
      }
    }

    return Number.isFinite(closest.price) && closest.price > 0 ? closest.price : fallbackPrice;
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

  createFallbackTimeline(now: Date, range: TimeRange): Date[] {
    const count = range === '1d' ? 48 : range === '1w' ? 56 : 30;
    const intervalMs = range === '1d'
      ? 30 * 60 * 1000
      : range === '1w'
        ? 3 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

    return Array.from(
      { length: count },
      (_, i) => new Date(now.getTime() - (count - 1 - i) * intervalMs)
    );
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

  /* ─── Data loading ─── */

  async loadPortfolio(): Promise<void> {
    try {
      const result = await firstValueFrom(this.investmentService.getPortfolio());
      const assets = this.allAssets();
      const positions = result.positions.map((pos: PortfolioPosition) => {
        const asset = assets.find((a) => a.id === pos.assetId);
        return {
          assetId: pos.assetId,
          ticker: asset?.ticker ?? '',
          name: asset?.name ?? '',
          quantity: pos.quantity,
          avgBuyPrice: pos.avgBuyPrice,
          imageUrl: asset?.imageUrl ?? '',
          rarity: asset?.rarity ?? '',
          currentPrice: pos.currentPrice,
        } satisfies OwnedStock;
      });
      this.ownedStocks.set(positions);
      await this.loadPortfolioPriceHistories(positions, this.timeRange());
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      this.ownedStocks.set([]);
      this.portfolioAssetHistories.set({});
    }
  }

  async loadPortfolioPriceHistories(stocks: OwnedStock[], range: TimeRange): Promise<void> {
    const requestId = ++this.portfolioHistoryRequestId;
    if (stocks.length === 0) {
      this.portfolioAssetHistories.set({});
      return;
    }

    const uniqueAssetIds = Array.from(new Set(stocks.map((stock) => stock.assetId)));
    const entries = await Promise.all(
      uniqueAssetIds.map(async (assetId) => {
        try {
          const result = await firstValueFrom(this.investmentService.getPriceHistory(assetId, range));
          return [
            assetId,
            result.prices.map((point) => ({
              timestamp: new Date(point.timestamp),
              price: point.price,
            })),
          ] as const;
        } catch (err) {
          console.error('Failed to load portfolio price history:', err);
          return [assetId, []] as const;
        }
      })
    );

    if (requestId !== this.portfolioHistoryRequestId) return;
    this.portfolioAssetHistories.set(Object.fromEntries(entries));
  }

  async loadLeaderboard(): Promise<void> {
    try {
      const result = await firstValueFrom(this.investmentService.getLeaderboard(10));
      this.leaderboard.set(result.investors);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      this.leaderboard.set([]);
    }
  }

  async loadAssets(): Promise<void> {
    try {
      const result = await firstValueFrom(this.investmentService.getAssets());
      this.stoveAssets.set(result.assets.map(a => {
        const change24hAmount = a.currentPrice - a.previousPrice;
        const change24h = a.previousPrice > 0
          ? Math.round((change24hAmount / a.previousPrice) * 10000) / 100
          : 0;
        return {
          id: a.assetId,
          ticker: a.ticker,
          name: a.name,
          rarity: a.rarity,
          currentPrice: a.currentPrice,
          previousPrice: a.previousPrice,
          change24h,
          change24hAmount,
          basePrice: a.basePrice,
          imageUrl: a.imageUrl,
          volume30d: a.volume30d,
          totalMinted: a.totalMinted,
          currentlyListed: a.currentlyListed,
        };
      }));
    } catch (err) {
      console.error('Failed to load assets:', err);
    }
  }

  async loadPriceHistory(typeId: number, range: '1d' | '1w' | '1m' = '1w'): Promise<void> {
    try {
      const result = await firstValueFrom(this.investmentService.getPriceHistory(typeId, range));
      this.priceHistory.set(result.prices.map(p => ({
        timestamp: new Date(p.timestamp),
        price: p.price,
      })));
    } catch (err) {
      console.error('Failed to load price history:', err);
      this.priceHistory.set([]);
    }
  }
}
