import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { ToastService } from '@core/services/toast.service';
import { HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';

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

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, HeatTierPipe, RouterLink],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopComponent implements OnInit {
  activeTab = signal<'daily' | 'stoves' | 'lootboxes' | 'sell'>('daily');
  shopItems = signal<ShopItem[]>([]);
  dailyStatus = signal<DailyStatus | null>(null);
  coins = signal<number>(0);
  loading = signal<boolean>(false);
  buyLoading = signal<number | null>(null);
  claimLoading = signal<boolean>(false);
  sellLoading = signal<number | null>(null);
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  countdown = signal<string>('');
  playerStoves = signal<PlayerStove[]>([]);
  sellLoadingStoves = signal<boolean>(false);

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
    }
    await this.loadShopItems();
    await this.loadDailyStatus();
    await this.loadPlayerStoves();
    this.startCountdown();
  }

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

  async buyItem(listingId: number): Promise<void> {
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
      this.successMessage.set(`Purchased ${item?.name ?? 'item'}!`);
      this.coins.set(this.coins() - (item?.price ?? 0));
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
      this.successMessage.set(`${result.message}: +${result.reward.coins} coins${result.reward.lootboxes > 0 ? `, +${result.reward.lootboxes} lootbox` : ''}`);
      this.coins.set(this.coins() + result.reward.coins);
      this.toastService.success('Daily reward claimed', `${result.message}: +${result.reward.coins} coins${result.reward.lootboxes > 0 ? `, +${result.reward.lootboxes} lootbox` : ''}`);
      await this.loadDailyStatus();
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      this.claimLoading.set(false);
    }
  }

  async setTab(tab: 'daily' | 'stoves' | 'lootboxes' | 'sell'): Promise<void> {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (tab === 'sell') {
      await this.loadPlayerStoves();
    }
  }

  async loadPlayerStoves(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.sellLoadingStoves.set(true);
    try {
      const stoves = await firstValueFrom(this.api.get<PlayerStove[]>(`/players/${user.playerId}/stoves`));
      this.playerStoves.set(stoves);
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
      this.successMessage.set(`Sold ${stoveName} for ${result.coinsReceived} coal!`);
      this.coins.set(this.coins() + result.coinsReceived);
      this.toastService.success('Sold to shop', `You sold ${stoveName} for ${result.coinsReceived} coal`);
      await this.loadPlayerStoves();
      await this.authService.refreshUser();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Sale failed');
    } finally {
      this.sellLoading.set(null);
    }
  }

  filteredItems(type: 'stove' | 'lootbox'): ShopItem[] {
    return this.shopItems().filter(i => i.itemType === type);
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
