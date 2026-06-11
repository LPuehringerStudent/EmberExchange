import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

interface ShopItem {
  listingId: number;
  itemType: 'stove' | 'lootbox';
  itemId: number;
  price: number;
  stock: number;
  isFeatured: boolean;
  createdAt: string;
  name: string;
  imageUrl: string;
  rarity: string;
}

interface DailyStatus {
  canClaim: boolean;
  streakCount: number;
  nextClaimAt: string | null;
  reward: { coins: number; lootboxes: number };
}

interface PlayerStove {
  stoveId: number;
  typeId: number;
  currentOwnerId: number;
  mintedAt: string;
  heatLevel: number;
  imageUrl: string;
  name: string;
  rarity: string;
}

interface StoveMarketStats {
  averageSalePrice: number;
  currentLowestPrice: number | null;
}

interface DropRateEntry {
  rarity: string;
  rate: string;
}

const DROP_RATES: Record<number, DropRateEntry[]> = {
  1: [ // Standard Lootbox
    { rarity: 'common', rate: '75%' },
    { rarity: 'rare', rate: '20%' },
    { rarity: 'epic', rate: '4%' },
    { rarity: 'legendary', rate: '1%' },
    { rarity: 'secret', rate: '0%' },
  ],
  2: [ // Golden Lootbox
    { rarity: 'common', rate: '45%' },
    { rarity: 'rare', rate: '35%' },
    { rarity: 'epic', rate: '15%' },
    { rarity: 'legendary', rate: '4%' },
    { rarity: 'secret', rate: '1%' },
  ],
  3: [ // Legendary Crate
    { rarity: 'common', rate: '0%' },
    { rarity: 'rare', rate: '25%' },
    { rarity: 'epic', rate: '40%' },
    { rarity: 'legendary', rate: '30%' },
    { rarity: 'secret', rate: '5%' },
  ],
  4: [ // Dragon Crate
    { rarity: 'common', rate: '30%' },
    { rarity: 'rare', rate: '30%' },
    { rarity: 'epic', rate: '25%' },
    { rarity: 'legendary', rate: '12%' },
    { rarity: 'secret', rate: '3%' },
  ],
  5: [ // Winter Crate
    { rarity: 'common', rate: '49%' },
    { rarity: 'rare', rate: '30%' },
    { rarity: 'epic', rate: '15%' },
    { rarity: 'legendary', rate: '5%' },
    { rarity: 'secret', rate: '1%' },
  ],
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'secret', 'limited'];

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule, HeatTierPipe, RouterLink, PageBackgroundComponent,
  ],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopComponent implements OnInit {
  activeTab = signal<'daily' | 'stoves' | 'lootboxes' | 'sell' | 'codes'>('daily');
  shopItems = signal<ShopItem[]>([]);
  dailyStatus = signal<DailyStatus | null>(null);
  coins = signal<number>(0);
  displayCoins = signal<number>(0);
  loading = signal<boolean>(false);
  buyLoading = signal<number | null>(null);
  claimLoading = signal<boolean>(false);
  sellLoading = signal<number | null>(null);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  countdown = signal<string>('');
  playerStoves = signal<PlayerStove[]>([]);
  sellLoadingStoves = signal<boolean>(false);
  redeemCodeInput = signal<string>('');
  redeemLoading = signal<boolean>(false);

  // ── Buy confirmation modal ──
  confirmModalOpen = signal(false);
  confirmModalItem = signal<ShopItem | null>(null);

  // ── Filter & Sort ──
  rarityFilter = signal<string>('all');
  sortBy = signal<string>('featured');

  // ── Lootbox odds ──
  showOddsFor = signal<number | null>(null);

  // ── Marketplace stats cache ──
  marketStats = signal<Record<number, StoveMarketStats>>({});

  private authService = inject(AuthService);
  private api = inject(ApiService);
  private toastService = inject(ToastService);

  private raritySellPrices: Record<string, number> = {
    common: 50,
    rare: 100,
    epic: 200,
    legendary: 400,
    limited: 500,
  };

  async ngOnInit(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.coins.set(user.coins);
      this.displayCoins.set(user.coins);
    }
    await this.loadShopItems();
    await this.loadDailyStatus();
    await this.loadPlayerStoves();
    this.startCountdown();
  }

  // ════════════════════════════════════════
  //  COIN ANIMATION
  // ════════════════════════════════════════
  animateCoins(target: number): void {
    const from = this.displayCoins();
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - p, 3);
      this.displayCoins.set(Math.floor(from + (target - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ════════════════════════════════════════
  //  BUY CONFIRMATION MODAL
  // ════════════════════════════════════════
  openConfirmModal(item: ShopItem): void {
    this.confirmModalItem.set(item);
    this.confirmModalOpen.set(true);
  }

  closeConfirmModal(): void {
    this.confirmModalOpen.set(false);
    this.confirmModalItem.set(null);
  }

  async confirmBuy(): Promise<void> {
    const item = this.confirmModalItem();
    if (!item) return;
    this.closeConfirmModal();
    await this.doBuyItem(item.listingId);
  }

  async onBuyClick(listingId: number): Promise<void> {
    const item = this.shopItems().find(i => i.listingId === listingId);
    if (!item) return;
    // Instant buy for cheap items, modal for expensive ones
    if (item.price <= 200) {
      await this.doBuyItem(listingId);
    } else {
      this.openConfirmModal(item);
    }
  }

  // ════════════════════════════════════════
  //  FILTER & SORT
  // ════════════════════════════════════════
  setRarityFilter(filter: string): void {
    this.rarityFilter.set(filter);
  }

  setSortBy(sort: string): void {
    this.sortBy.set(sort);
  }

  getFilteredItems(type: 'stove' | 'lootbox'): ShopItem[] {
    let items = this.shopItems().filter(i => i.itemType === type);

    // Rarity filter
    const filter = this.rarityFilter().toLowerCase();
    if (filter !== 'all') {
      items = items.filter(i => i.rarity.toLowerCase() === filter);
    }

    // Sort
    const sort = this.sortBy();
    switch (sort) {
      case 'price_asc':
        items = [...items].sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        items = [...items].sort((a, b) => b.price - a.price);
        break;
      case 'name':
        items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        items = [...items].sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return a.listingId - b.listingId;
        });
        break;
    }

    return items;
  }

  // ════════════════════════════════════════
  //  LOOTBOX ODDS
  // ════════════════════════════════════════
  toggleOdds(listingId: number): void {
    this.showOddsFor.update(current => current === listingId ? null : listingId);
  }

  getLootboxOdds(itemId: number): DropRateEntry[] {
    return DROP_RATES[itemId] ?? [];
  }

  getRarityColor(rarity: string): string {
    const map: Record<string, string> = {
      common: '#94a3b8',
      rare: '#3b82f6',
      epic: '#a855f7',
      legendary: '#f59e0b',
      secret: '#d946ef',
      limited: '#ef4444',
    };
    return map[rarity.toLowerCase()] ?? '#94a3b8';
  }

  parseRatePercent(rate: string): number {
    const num = parseInt(rate, 10);
    return isNaN(num) ? 0 : num;
  }

  // ════════════════════════════════════════
  //  DAILY REWARD PROGRESS
  // ════════════════════════════════════════
  getCooldownPercent(): number {
    const status = this.dailyStatus();
    if (!status) return 0;
    if (status.canClaim) return 100;
    if (!status.nextClaimAt) return 100;
    const now = Date.now();
    const next = new Date(status.nextClaimAt).getTime();
    const total = 24 * 60 * 60 * 1000; // 24 hours
    const remaining = next - now;
    const elapsed = total - remaining;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  // ════════════════════════════════════════
  //  MARKETPLACE STATS
  // ════════════════════════════════════════
  async loadMarketStats(stoveTypeId: number): Promise<void> {
    const cached = this.marketStats()[stoveTypeId];
    if (cached) return;
    try {
      const stats = await firstValueFrom(
        this.api.get<StoveMarketStats>(`/stove-types/${stoveTypeId}/statistics`)
      );
      this.marketStats.update(m => ({ ...m, [stoveTypeId]: stats }));
    } catch {
      // Silently ignore missing stats
    }
  }

  getMarketStats(stoveTypeId: number): StoveMarketStats | null {
    return this.marketStats()[stoveTypeId] ?? null;
  }

  getMarketplaceTip(stove: PlayerStove): string | null {
    const stats = this.getMarketStats(stove.typeId);
    if (!stats) return null;
    const shopPrice = this.getSellPrice(stove.rarity);
    const marketAvg = stats.averageSalePrice;
    if (marketAvg > shopPrice * 2) {
      return `Marketplace avg: ${marketAvg.toLocaleString()} coal (~${Math.round(marketAvg / shopPrice)}× more!)`;
    }
    return null;
  }

  // ════════════════════════════════════════
  //  EXISTING METHODS
  // ════════════════════════════════════════

  async loadShopItems(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await firstValueFrom(this.api.get<ShopItem[]>('/shop/items'));
      this.shopItems.set(items);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      this.loading.set(false);
    }
  }

  async loadDailyStatus(): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) return;
    try {
      const status = await firstValueFrom(
        this.api.get<DailyStatus>('/shop/daily-status', new HttpHeaders({ 'session-id': sessionId }))
      );
      this.dailyStatus.set(status);
    } catch (err) {
      console.error('Failed to load daily status:', err);
    }
  }

  private async doBuyItem(listingId: number): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.buyLoading.set(listingId);

    const sessionId = this.authService.getSessionId();
    if (!sessionId) {
      this.errorMessage.set('Not authenticated');
      this.buyLoading.set(null);
      return;
    }

    const item = this.shopItems().find(i => i.listingId === listingId);
    if (item && this.coins() < item.price) {
      this.errorMessage.set('Insufficient coins');
      this.buyLoading.set(null);
      return;
    }

    try {
      await firstValueFrom(
        this.api.post('/shop/buy', { listingId }, new HttpHeaders({ 'session-id': sessionId }))
      );
      const newCoins = this.coins() - (item?.price ?? 0);
      this.successMessage.set(`Purchased ${item?.name ?? 'item'}!`);
      this.coins.set(newCoins);
      this.animateCoins(newCoins);
      this.toastService.success('Purchase successful', `You bought ${item?.name ?? 'item'} for ${item?.price ?? 0} coal`);
      await this.loadShopItems();
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      this.buyLoading.set(null);
    }
  }

  async claimDaily(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.claimLoading.set(true);

    const sessionId = this.authService.getSessionId();
    if (!sessionId) {
      this.errorMessage.set('Not authenticated');
      this.claimLoading.set(false);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.api.post<{ message: string; reward: { coins: number; lootboxes: number }; newStreak: number }>(
          '/shop/claim-daily', null, new HttpHeaders({ 'session-id': sessionId })
        )
      );
      const newCoins = this.coins() + result.reward.coins;
      this.successMessage.set(`${result.message}: +${result.reward.coins} coins${result.reward.lootboxes > 0 ? `, +${result.reward.lootboxes} lootbox` : ''}`);
      this.coins.set(newCoins);
      this.animateCoins(newCoins);
      this.toastService.success('Daily reward claimed', `${result.message}: +${result.reward.coins} coins${result.reward.lootboxes > 0 ? `, +${result.reward.lootboxes} lootbox` : ''}`);
      await this.loadDailyStatus();
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      this.claimLoading.set(false);
    }
  }

  async setTab(tab: 'daily' | 'stoves' | 'lootboxes' | 'sell' | 'codes'): Promise<void> {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (tab === 'sell') {
      await this.loadPlayerStoves();
    }
  }

  async redeemCode(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    const code = this.redeemCodeInput().trim();
    if (!code) {
      this.errorMessage.set('Please enter a code');
      return;
    }

    const sessionId = this.authService.getSessionId();
    if (!sessionId) {
      this.errorMessage.set('Not authenticated');
      return;
    }

    this.redeemLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.post<{ message: string; rewardCoins: number; rewardLootboxes: number; rewardSparks: number; rewardSpins: number }>(
          '/shop/redeem', { code }, new HttpHeaders({ 'session-id': sessionId })
        )
      );
      const rewardText = [
        result.rewardCoins > 0 ? `${result.rewardCoins} coins` : '',
        result.rewardLootboxes > 0 ? `${result.rewardLootboxes} lootbox${result.rewardLootboxes > 1 ? 'es' : ''}` : '',
        result.rewardSparks > 0 ? `${result.rewardSparks} sparks` : '',
        result.rewardSpins > 0 ? `${result.rewardSpins} spin${result.rewardSpins > 1 ? 's' : ''}` : ''
      ].filter(Boolean).join(' + ');
      const newCoins = this.coins() + (result.rewardCoins ?? 0);
      this.successMessage.set(`Code redeemed! You received ${rewardText}`);
      this.toastService.success('Code redeemed', `You received ${rewardText}`);
      this.coins.set(newCoins);
      this.animateCoins(newCoins);
      this.redeemCodeInput.set('');
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Failed to redeem code');
    } finally {
      this.redeemLoading.set(false);
    }
  }

  async loadPlayerStoves(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.sellLoadingStoves.set(true);
    try {
      const stoves = await firstValueFrom(this.api.get<PlayerStove[]>(`/players/${user.playerId}/stoves`));
      this.playerStoves.set(stoves);
      // Pre-load marketplace stats for each stove type
      const uniqueTypeIds = [...new Set(stoves.map(s => s.typeId))];
      await Promise.all(uniqueTypeIds.map(id => this.loadMarketStats(id)));
    } catch (err) {
      console.error('Failed to load player stoves:', err);
    } finally {
      this.sellLoadingStoves.set(false);
    }
  }

  getSellPrice(rarity: string): number {
    return this.raritySellPrices[rarity.toLowerCase()] ?? 25;
  }

  async sellStove(stoveId: number, stoveName: string): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.sellLoading.set(stoveId);

    const sessionId = this.authService.getSessionId();
    if (!sessionId) {
      this.errorMessage.set('Not authenticated');
      this.sellLoading.set(null);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.api.post<{ message: string; coinsReceived: number }>('/shop/sell', { stoveId }, new HttpHeaders({ 'session-id': sessionId }))
      );
      const newCoins = this.coins() + result.coinsReceived;
      this.successMessage.set(`Sold ${stoveName} for ${result.coinsReceived} coal!`);
      this.coins.set(newCoins);
      this.animateCoins(newCoins);
      this.toastService.success('Sold to shop', `You sold ${stoveName} for ${result.coinsReceived} coal`);
      await this.loadPlayerStoves();
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Sale failed');
    } finally {
      this.sellLoading.set(null);
    }
  }

  getRewardForDay(day: number): string {
    const rewards = ['', '100', '200', '300', '400', '500', '750', '1000 + Box'];
    return rewards[day] ?? '';
  }

  getItemImage(item: ShopItem): string {
    if (item.itemType === 'lootbox') {
      const name = item.name?.toLowerCase() || '';
      if (name.includes('dragon')) {
        return 'assets/animation/dragon-chest-idle-animation.gif';
      }
      if (name.includes('winter')) {
        return 'assets/animation/winter-chest-idle-animation.gif';
      }
      if (name.includes('legendary')) {
        return 'assets/animation/legendary-chest-idle-animation.gif';
      }
      if (name.includes('golden')) {
        return 'assets/animation/chest-idle-gold.gif';
      }
      return 'assets/animation/chest-idle.gif';
    }
    return item.imageUrl || '';
  }

  getRarityClass(item: ShopItem): string {
    if (item.itemType === 'lootbox') return 'rarity-common';
    return 'rarity-' + (item.rarity?.toLowerCase() || 'common');
  }

  private startCountdown(): void {
    setInterval(() => {
      const status = this.dailyStatus();
      if (!status?.nextClaimAt) {
        this.countdown.set('');
        return;
      }
      const now = new Date().getTime();
      const next = new Date(status.nextClaimAt).getTime();
      const diff = next - now;
      if (diff <= 0) {
        this.countdown.set('Available now!');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      this.countdown.set(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
  }
}
