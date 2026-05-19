import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HallOfGloryService, type GloryProfile, type GloryGuestbookEntry } from '../../core/services/hall-of-glory.service';
import { AuthService } from '../../core/services/auth.service';
import { StoveService, type Stove } from '../../core/services/stove.service';
import { HeatTierPipe } from '@shared/pipes/heat-tier.pipe';
import type { PlayerStatisticsRow as PlayerStatistics } from '@shared/model';

interface Badge {
  id: string;
  label: string;
  unlocked: boolean;
  description: string;
}

interface StatCategory {
  title: string;
  accent: string;
  items: { label: string; value: string | number; type?: 'rarity' }[];
}

@Component({
  selector: 'app-hall-of-glory',
  standalone: true,
  imports: [CommonModule, HeatTierPipe],
  templateUrl: './hall-of-glory.component.html',
  styleUrls: ['./hall-of-glory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HallOfGloryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private gloryService = inject(HallOfGloryService);
  private stoveService = inject(StoveService);
  authService = inject(AuthService);

  // State
  profile = signal<GloryProfile | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  copied = signal(false);
  isOwnProfile = signal(false);
  editMode = signal(false);
  guestbook = signal<GloryGuestbookEntry[]>([]);
  guestbookMessage = signal('');
  guestbookLoading = signal(false);

  // Edit mode data
  availableThemes = signal<any[]>([]);
  availableTitles = signal<any[]>([]);
  availableBanners = signal<any[]>([]);
  ownedStoves = signal<(Stove & { name: string; imageUrl: string; rarity: string })[]>([]);
  showcaseData = signal<Map<number, number>>(new Map());
  editLoading = signal(false);
  editError = signal<string | null>(null);
  showcaseSaving = signal<number | null>(null);
  achievementSaving = signal<string | null>(null);

  // Animated counter values
  animatedCoins = signal(0);
  animatedNetWorth = signal(0);
  animatedStoves = signal(0);
  animatedActivity = signal(0);

  // Computed
  badges = computed<Badge[]>(() => {
    const profile = this.profile();
    const stats = profile?.stats;
    if (!stats) return [];
    const prestigeCount = profile?.prestige?.prestigeCount ?? 0;
    const joinedAt = profile?.joinedAt ? new Date(profile.joinedAt) : null;
    const daysSinceJoin = joinedAt ? Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const hasLegendary = stats.bestDropRarity === 'legendary' || stats.bestDropRarity === 'secret';
    return [
      { id: 'first-steps', label: 'First Steps', unlocked: true, description: 'Joined Ember Exchange' },
      { id: 'trader', label: 'Trader', unlocked: (stats.totalTradesCompleted ?? 0) > 0, description: 'Completed your first trade' },
      { id: 'collector', label: 'Collector', unlocked: (stats.currentStoveCount ?? 0) >= 10, description: 'Own 10+ stoves' },
      { id: 'high-roller', label: 'High Roller', unlocked: (stats.luckiestWin ?? 0) >= 10000, description: 'Win 10,000+ coins in one hand' },
      { id: 'market-shark', label: 'Market Shark', unlocked: (stats.totalSalesRevenue ?? 0) >= 50000, description: 'Earn 50,000+ coins from sales' },
      { id: 'lootbox-addict', label: 'Lootbox Addict', unlocked: (stats.totalLootboxesOpened ?? 0) >= 50, description: 'Open 50+ lootboxes' },
      { id: 'big-spender', label: 'Big Spender', unlocked: (stats.totalPurchaseSpending ?? 0) >= 25000, description: 'Spend 25,000+ coins' },
      { id: 'wealthy', label: 'Wealthy', unlocked: (stats.netWorthEstimate ?? 0) >= 100000, description: 'Reach 100,000+ net worth' },
      { id: 'gambler', label: 'Gambler', unlocked: (stats.totalMiniGamesPlayed ?? 0) >= 50, description: 'Play 50+ mini-games' },
      { id: 'merchant', label: 'Merchant', unlocked: (stats.totalListingsCreated ?? 0) >= 20, description: 'Create 20+ listings' },
      { id: 'dragon-tamer', label: 'Dragon Tamer', unlocked: (stats.totalStovesAcquired ?? 0) >= 50, description: 'Acquire 50+ stoves' },
      { id: 'mini-game-master', label: 'Mini-Game Master', unlocked: (stats.totalMiniGamesPlayed ?? 0) >= 100, description: 'Play 100+ mini-games' },
      { id: 'socialite', label: 'Socialite', unlocked: (stats.totalMessagesSent ?? 0) >= 500, description: 'Send 500+ chat messages' },
      { id: 'ascended', label: 'Ascended', unlocked: prestigeCount >= 1, description: 'Prestige at least once' },
      { id: 'veteran', label: 'Veteran', unlocked: daysSinceJoin >= 30, description: 'Play for 30+ days' },
      { id: 'king-of-the-hill', label: 'King of the Hill', unlocked: (stats.highestCoinBalance ?? 0) >= 500000, description: 'Hold 500,000+ coins at once' },
      { id: 'collector-deluxe', label: 'Collector Deluxe', unlocked: (stats.currentStoveCount ?? 0) >= 50, description: 'Own 50+ stoves' },
      { id: 'burnout', label: 'Burnout', unlocked: (stats.totalMiniGamesPlayed ?? 0) >= 500, description: 'Play 500+ mini-games' },
      { id: 'whale', label: 'Whale', unlocked: (stats.totalPurchaseSpending ?? 0) >= 500000, description: 'Spend 500,000+ coins' },
      { id: 'early-bird', label: 'Early Bird', unlocked: daysSinceJoin >= 1, description: 'Joined Ember Exchange' },
      { id: 'market-maker', label: 'Market Maker', unlocked: (stats.totalSalesRevenue ?? 0) >= 250000, description: 'Earn 250,000+ coins from sales' },
      { id: 'immortal', label: 'Immortal', unlocked: prestigeCount >= 5, description: 'Prestige 5 times' },
      { id: 'centurion', label: 'Centurion', unlocked: (stats.totalLootboxesOpened ?? 0) >= 100, description: 'Open 100+ lootboxes' },
      { id: 'win-streak', label: 'Win Streak', unlocked: (stats.totalMiniGameWins ?? 0) >= 20, description: 'Win 20+ mini-games' },
      { id: 'tycoon', label: 'Tycoon', unlocked: (stats.netWorthEstimate ?? 0) >= 500000, description: 'Reach 500,000+ net worth' },
      { id: 'prestigious', label: 'Prestigious', unlocked: prestigeCount > 0, description: 'Prestige at least once' },
      { id: 'rare-hunter', label: 'Rare Hunter', unlocked: hasLegendary, description: 'Own a legendary or secret stove' },
      { id: 'jackpot', label: 'Jackpot!', unlocked: (stats.luckiestWin ?? 0) >= 100000, description: 'Win 100,000+ coins in one hand' },
      { id: 'trading-empire', label: 'Trading Empire', unlocked: (stats.totalTradesCompleted ?? 0) >= 100, description: 'Complete 100+ trades' },
      { id: 'net-millionaire', label: 'Net Millionaire', unlocked: (stats.netWorthEstimate ?? 0) >= 1000000, description: 'Reach 1,000,000+ net worth' },
      { id: 'coin-millionaire', label: 'Coin Millionaire', unlocked: (stats.totalCoinsEarned ?? 0) >= 1000000, description: 'Earn 1,000,000+ coins total' },
      { id: 'profitable', label: 'Profitable', unlocked: (stats.totalCoinsFromMiniGames ?? 0) >= 10000, description: 'Earn 10,000+ coins from mini-games' },
      { id: 'active-trader', label: 'Active Trader', unlocked: (stats.totalPurchases ?? 0) >= 10, description: 'Make 10+ purchases' },
      { id: 'dedicated', label: 'Dedicated', unlocked: daysSinceJoin >= 7, description: 'Play for 7+ days' },
      { id: 'big-winner', label: 'Big Winner', unlocked: (stats.totalMiniGameWins ?? 0) >= 5, description: 'Win 5+ mini-games' },
    ];
  });

  statCategories = computed<StatCategory[]>(() => {
    const stats = this.profile()?.stats;
    if (!stats) return [];
    return [
      {
        title: 'Lootbox',
        accent: '#e85d04',
        items: [
          { label: 'Opened', value: stats.totalLootboxesOpened ?? 0 },
          { label: 'Best Drop', value: stats.bestDropRarity ?? '-', type: 'rarity' as const },
          { label: 'Coins Spent', value: (stats.totalCoinsSpentOnLootboxes ?? 0).toLocaleString() },
        ],
      },
      {
        title: 'Market',
        accent: '#4caf50',
        items: [
          { label: 'Listings', value: stats.totalListingsCreated ?? 0 },
          { label: 'Sold', value: stats.totalListingsSold ?? 0 },
          { label: 'Trades', value: stats.totalTradesCompleted ?? 0 },
          { label: 'Revenue', value: (stats.totalSalesRevenue ?? 0).toLocaleString() },
        ],
      },
      {
        title: 'Games',
        accent: '#2196f3',
        items: [
          { label: 'Played', value: stats.totalMiniGamesPlayed ?? 0 },
          { label: 'Wins', value: stats.totalMiniGameWins ?? 0 },
          { label: 'Losses', value: stats.totalMiniGameLosses ?? 0 },
          { label: 'Luckiest Win', value: (stats.luckiestWin ?? 0).toLocaleString() },
        ].filter((i) => i.value !== 0 && i.value !== '-'),
      },
      {
        title: 'Collection',
        accent: '#9c27b0',
        items: [
          { label: 'Acquired', value: stats.totalStovesAcquired ?? 0 },
          { label: 'Sold', value: stats.totalStovesSold ?? 0 },
          { label: 'Traded', value: stats.totalStovesTraded ?? 0 },
          { label: 'Current', value: stats.currentStoveCount ?? 0 },
        ],
      },
    ];
  });

  xpToNextLevel = computed(() => {
    const prestige = this.profile()?.prestige;
    if (!prestige) return 0;
    const nextLevel = prestige.currentLevel + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  });

  xpProgress = computed(() => {
    const prestige = this.profile()?.prestige;
    if (!prestige) return 0;
    const currentLevelXP = Math.pow(prestige.currentLevel - 1, 2) * 100;
    const nextLevelXP = Math.pow(prestige.currentLevel, 2) * 100;
    const levelXP = nextLevelXP - currentLevelXP;
    const currentInLevel = prestige.totalXP - currentLevelXP;
    return Math.min(100, Math.max(0, (currentInLevel / levelXP) * 100));
  });

  private countersAnimated = false;

  // XP Toast
  xpToast = signal<{ amount: number; source: string; visible: boolean } | null>(null);
  levelUpToast = signal<{ oldLevel: number; newLevel: number; visible: boolean } | null>(null);
  private lastSeenXP = 0;

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (profile && !this.countersAnimated) {
        this.countersAnimated = true;
        this.animateCounter(profile.coins, this.animatedCoins, 1200);
        this.animateCounter(profile.stats.netWorthEstimate ?? 0, this.animatedNetWorth, 1200);
        this.animateCounter(profile.stats.currentStoveCount ?? 0, this.animatedStoves, 1200);
        this.animateCounter(profile.stats.marketActivityScore ?? 0, this.animatedActivity, 1200);
        this.lastSeenXP = profile.prestige.totalXP;
      }
    });
  }

  showXPToast(amount: number, source: string): void {
    this.xpToast.set({ amount, source, visible: true });
    setTimeout(() => this.xpToast.set(null), 3000);
  }

  showLevelUpToast(oldLevel: number, newLevel: number): void {
    this.levelUpToast.set({ oldLevel, newLevel, visible: true });
    setTimeout(() => this.levelUpToast.set(null), 4000);
  }

  checkXPChange(newTotalXP: number, newLevel: number): void {
    const diff = newTotalXP - this.lastSeenXP;
    if (diff > 0) {
      this.showXPToast(diff, 'Action completed');
      if (newLevel > (this.profile()?.prestige.currentLevel ?? 1)) {
        this.showLevelUpToast(this.profile()?.prestige.currentLevel ?? 1, newLevel);
      }
    }
    this.lastSeenXP = newTotalXP;
  }

  async ngOnInit(): Promise<void> {
    const username = this.route.snapshot.paramMap.get('username');
    const playerIdParam = this.route.snapshot.paramMap.get('playerId');
    let playerId = Number(playerIdParam);

    try {
      let profile: GloryProfile;
      let guestbookEntries: GloryGuestbookEntry[];

      if (username) {
        profile = await firstValueFrom(this.gloryService.getGloryProfileByUsername(username));
        playerId = profile.playerId;
        guestbookEntries = await firstValueFrom(this.gloryService.getGuestbook(playerId));
      } else {
        if (!playerId || isNaN(playerId)) {
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            playerId = currentUser.playerId;
          } else {
            this.error.set('Invalid player ID');
            this.loading.set(false);
            return;
          }
        }
        [profile, guestbookEntries] = await Promise.all([
          firstValueFrom(this.gloryService.getGloryProfile(playerId)),
          firstValueFrom(this.gloryService.getGuestbook(playerId)),
        ]);
      }

      this.profile.set(profile);
      this.guestbook.set(guestbookEntries);
      const currentUser = this.authService.getCurrentUser();
      this.isOwnProfile.set(currentUser?.playerId === playerId);
    } catch (err) {
      this.error.set('Player not found or unable to load profile.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleEditMode(): Promise<void> {
    const enteringEdit = !this.editMode();
    this.editMode.update(v => !v);

    if (enteringEdit && this.isOwnProfile()) {
      this.editLoading.set(true);
      try {
        const customization = await firstValueFrom(
          this.gloryService.getCustomization(this.profile()!.playerId)
        );
        const stoves = await firstValueFrom(
          this.stoveService.getStovesByPlayerId(this.profile()!.playerId)
        ) as (Stove & { name: string; imageUrl: string; rarity: string })[];
        this.availableThemes.set(customization.themes);
        this.availableTitles.set(customization.titles);
        this.availableBanners.set(customization.banners);
        this.refreshShowcaseMap(customization.showcase);
        this.ownedStoves.set(stoves);
      } catch (err) {
        console.error('Failed to load customization:', err);
      } finally {
        this.editLoading.set(false);
      }
    }
  }

  private async withEditError<T>(fn: () => Promise<T>): Promise<T | undefined> {
    this.editError.set(null);
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      this.editError.set(msg);
      console.error('Edit error:', err);
      return undefined;
    }
  }

  private async refreshCustomization(): Promise<void> {
    const customization = await firstValueFrom(
      this.gloryService.getCustomization(this.profile()!.playerId)
    );
    this.availableThemes.set(customization.themes);
    this.availableTitles.set(customization.titles);
    this.availableBanners.set(customization.banners);
    this.refreshShowcaseMap(customization.showcase);
  }

  private onProfileRefreshed(profile: GloryProfile): void {
    this.checkXPChange(profile.prestige.totalXP, profile.prestige.currentLevel);
    this.profile.set(profile);
  }

  private refreshShowcaseMap(showcase: any[]): void {
    const map = new Map<number, number>();
    for (const item of showcase) {
      map.set(item.slotIndex, item.stoveId);
    }
    this.showcaseData.set(map);
  }

  async activateTheme(themeId: number): Promise<void> {
    await this.withEditError(async () => {
      await firstValueFrom(this.gloryService.activateTheme(this.profile()!.playerId, themeId));
      const [profile] = await Promise.all([
        firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId)),
        this.refreshCustomization(),
      ]);
      this.onProfileRefreshed(profile);
    });
  }

  async activateTitle(titleId: string): Promise<void> {
    await this.withEditError(async () => {
      await firstValueFrom(this.gloryService.activateTitle(this.profile()!.playerId, titleId));
      const [profile] = await Promise.all([
        firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId)),
        this.refreshCustomization(),
      ]);
      this.onProfileRefreshed(profile);
    });
  }

  async activateBanner(bannerId: number): Promise<void> {
    await this.withEditError(async () => {
      await firstValueFrom(this.gloryService.activateBanner(this.profile()!.playerId, bannerId));
      const [profile] = await Promise.all([
        firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId)),
        this.refreshCustomization(),
      ]);
      this.onProfileRefreshed(profile);
    });
  }

  async addToShowcase(slotIndex: number, stoveId: number): Promise<void> {
    if (this.isStoveInShowcase(stoveId)) {
      this.editError.set('This stove is already in your showcase.');
      return;
    }
    this.showcaseSaving.set(slotIndex);
    await this.withEditError(async () => {
      await firstValueFrom(this.gloryService.updateShowcase(this.profile()!.playerId, slotIndex, stoveId));
      const [profile] = await Promise.all([
        firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId)),
        this.refreshCustomization(),
      ]);
      this.onProfileRefreshed(profile);
    });
    this.showcaseSaving.set(null);
  }

  async removeFromShowcase(slotIndex: number): Promise<void> {
    this.showcaseSaving.set(slotIndex);
    await this.withEditError(async () => {
      await firstValueFrom(this.gloryService.removeShowcaseSlot(this.profile()!.playerId, slotIndex));
      const [profile] = await Promise.all([
        firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId)),
        this.refreshCustomization(),
      ]);
      this.onProfileRefreshed(profile);
    });
    this.showcaseSaving.set(null);
  }

  isAchievementPinned(achievementId: string): boolean {
    return this.profile()?.featuredAchievements?.includes(achievementId) ?? false;
  }

  async toggleFeaturedAchievement(achievementId: string): Promise<void> {
    this.achievementSaving.set(achievementId);
    await this.withEditError(async () => {
      const isPinned = this.profile()?.featuredAchievements.includes(achievementId);
      if (isPinned) {
        await firstValueFrom(
          this.gloryService.removeFeaturedAchievement(this.profile()!.playerId, achievementId)
        );
      } else {
        const slotIndex = this.profile()?.featuredAchievements.length ?? 0;
        await firstValueFrom(
          this.gloryService.setFeaturedAchievement(this.profile()!.playerId, achievementId, slotIndex)
        );
      }
      const profile = await firstValueFrom(this.gloryService.getGloryProfile(this.profile()!.playerId));
      this.onProfileRefreshed(profile);
    });
    this.achievementSaving.set(null);
  }

  async submitGuestbook(): Promise<void> {
    const message = this.guestbookMessage().trim();
    const profile = this.profile();
    const currentUser = this.authService.getCurrentUser();
    if (!message || !profile || !currentUser) return;

    this.guestbookLoading.set(true);
    try {
      await firstValueFrom(
        this.gloryService.addGuestbookEntry(profile.playerId, currentUser.playerId, message)
      );
      this.guestbookMessage.set('');
      const entries = await firstValueFrom(this.gloryService.getGuestbook(profile.playerId));
      this.guestbook.set(entries);
    } catch (err) {
      console.error('Failed to add guestbook entry:', err);
    } finally {
      this.guestbookLoading.set(false);
    }
  }

  async deleteGuestbookEntry(entryId: number): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;
    try {
      await firstValueFrom(this.gloryService.deleteGuestbookEntry(entryId, currentUser.playerId));
      this.guestbook.update(list => list.filter(e => e.entryId !== entryId));
    } catch (err) {
      console.error('Failed to delete guestbook entry:', err);
    }
  }

  private animateCounter(target: number, signalRef: ReturnType<typeof signal<number>>, duration: number): void {
    const start = performance.now();
    const from = 0;
    const diff = target - from;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      signalRef.set(Math.floor(from + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  copyLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getRarityClass(rarity: string | number): string {
    return `rarity-${String(rarity).toLowerCase()}`;
  }

  getRarityColor(rarity: string): string {
    const map: Record<string, string> = {
      common: '#9e9e9e',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800',
      limited: '#f44336',
      secret: '#00bcd4',
    };
    return map[rarity.toLowerCase()] ?? '#9e9e9e';
  }

  getProviderLabel(provider: string | null): string {
    if (!provider) return 'Local';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  getFirstEmptyShowcaseSlot(): number {
    const map = this.showcaseData();
    for (let i = 0; i < 6; i++) {
      if (!map.has(i)) return i;
    }
    return -1;
  }

  isStoveInShowcase(stoveId: number): boolean {
    for (const showcasedStoveId of this.showcaseData().values()) {
      if (showcasedStoveId === stoveId) return true;
    }
    return false;
  }

  getOwnedStoveById(stoveId: number): (Stove & { name: string; imageUrl: string; rarity: string }) | undefined {
    return this.ownedStoves().find(s => s.stoveId === stoveId);
  }

  getBadgeById(id: string): Badge | undefined {
    return this.badges().find(b => b.id === id);
  }
}
