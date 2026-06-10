import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestService, Quest, QuestStats } from '@core/services/quest.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { firstValueFrom } from 'rxjs';

const CATEGORY_MAP: Record<string, string> = {
  open_lootboxes: 'loot',
  open_20_lootboxes: 'loot',
  forge_stove: 'forge',
  forge_5_stoves: 'forge',
  salvage_stove: 'forge',
  salvage_10_stoves: 'forge',
  list_item: 'trade',
  complete_10_trades: 'trade',
  claim_daily: 'daily',
  send_messages: 'social',
  visit_glory: 'social',
  win_minigame: 'play',
  earn_minigame_coins: 'play',
};

const TEMPLATE_ICON: Record<string, string> = {
  open_lootboxes: '🎁',
  open_20_lootboxes: '🎁',
  forge_stove: '🔨',
  forge_5_stoves: '🔨',
  list_item: '📋',
  claim_daily: '📅',
  salvage_stove: '♻️',
  salvage_10_stoves: '♻️',
  send_messages: '💬',
  visit_glory: '👤',
  win_minigame: '🏆',
  earn_minigame_coins: '🎰',
  complete_10_trades: '🤝',
};

const TEMPLATE_COLOR: Record<string, string> = {
  loot: '#a855f7',
  forge: '#f59e0b',
  trade: '#3b82f6',
  play: '#22c55e',
  social: '#ec4899',
  daily: '#0ea5e9',
  weekly: '#f59e0b',
};

type FilterCategory = 'all' | 'daily' | 'weekly' | 'loot' | 'forge' | 'trade' | 'play' | 'social';

interface FilterChip {
  id: FilterCategory;
  label: string;
  icon: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'daily', label: 'Daily', icon: '📅' },
  { id: 'weekly', label: 'Weekly', icon: '📆' },
  { id: 'loot', label: 'Loot', icon: '🎁' },
  { id: 'forge', label: 'Forge', icon: '🔨' },
  { id: 'trade', label: 'Trade', icon: '📋' },
  { id: 'play', label: 'Play', icon: '🏆' },
  { id: 'social', label: 'Social', icon: '💬' },
];

@Component({
  selector: 'app-quests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './quests.component.html',
  styleUrls: ['./quests.component.css'],
})
export class QuestsComponent implements OnInit, OnDestroy {
  /* ── Data ── */
  quests = signal<Quest[]>([]);
  stats = signal<QuestStats | null>(null);
  history = signal<Quest[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  /* ── UI State ── */
  claimingId = signal<number | null>(null);
  claimingAll = signal<boolean>(false);
  activeFilter = signal<FilterCategory>('all');
  showHistory = signal<boolean>(false);
  now = signal<number>(Date.now());

  /* ── Derived ── */
  readonly filteredQuests = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.quests();
    if (filter === 'daily') return this.quests().filter((q) => q.questType === 'daily');
    if (filter === 'weekly') return this.quests().filter((q) => q.questType === 'weekly');
    return this.quests().filter((q) => CATEGORY_MAP[q.templateId] === filter);
  });

  readonly dailyQuests = computed(() =>
    this.filteredQuests().filter((q) => q.questType === 'daily')
  );
  readonly weeklyQuests = computed(() =>
    this.filteredQuests().filter((q) => q.questType === 'weekly')
  );

  readonly hasClaimable = computed(() =>
    this.quests().some((q) => q.isCompleted && !q.isClaimed)
  );

  readonly claimableCount = computed(() =>
    this.quests().filter((q) => q.isCompleted && !q.isClaimed).length
  );

  /* ── Services ── */
  private questService = inject(QuestService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadQuests();
    this.timerId = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }

  /* ── Loading ── */
  async loadQuests(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [quests, stats] = await Promise.all([
        firstValueFrom(this.questService.getActiveQuests()),
        firstValueFrom(this.questService.getStats()),
      ]);
      this.quests.set(quests);
      this.stats.set(stats);
    } catch (err: any) {
      console.error('Failed to load quests:', err);
      this.error.set(err?.message || 'Failed to load quests');
    } finally {
      this.loading.set(false);
    }
  }

  async loadHistory(): Promise<void> {
    try {
      const history = await firstValueFrom(this.questService.getHistory(30));
      this.history.set(history);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    }
  }

  /* ── Claiming ── */
  async claimReward(quest: Quest): Promise<void> {
    if (quest.isClaimed || !quest.isCompleted) return;
    this.claimingId.set(quest.questId);
    try {
      const result = await firstValueFrom(this.questService.claimReward(quest.questId));
      if (result.success) {
        this.toastService.success(
          'Reward Claimed',
          `Claimed ${result.rewards?.coins ?? 0} coins${result.rewards?.xp ? ` + ${result.rewards.xp} XP` : ''}${result.rewards?.lootboxTypeId ? ' + Lootbox' : ''}!`
        );
        await this.authService.refreshUser();
        await this.loadQuests();
      } else {
        this.toastService.error('Claim Failed', result.error || 'Unable to claim reward');
      }
    } catch (err: any) {
      this.toastService.error('Claim Failed', err?.message || 'Unable to claim reward');
    } finally {
      this.claimingId.set(null);
    }
  }

  async claimAll(): Promise<void> {
    if (!this.hasClaimable()) return;
    this.claimingAll.set(true);
    try {
      const result = await firstValueFrom(this.questService.claimAll());
      if (result.success) {
        const parts: string[] = [];
        if (result.totalCoins > 0) parts.push(`${result.totalCoins.toLocaleString()} coins`);
        if (result.totalXP > 0) parts.push(`${result.totalXP.toLocaleString()} XP`);
        if (result.lootboxes > 0) parts.push(`${result.lootboxes} lootbox${result.lootboxes > 1 ? 'es' : ''}`);
        this.toastService.success('All Rewards Claimed', `Claimed ${parts.join(' + ')} from ${result.claimed} quest${result.claimed > 1 ? 's' : ''}!`);
        await this.authService.refreshUser();
        await this.loadQuests();
      } else {
        this.toastService.error('Claim Failed', result.error || 'Unable to claim rewards');
      }
    } catch (err: any) {
      this.toastService.error('Claim Failed', err?.message || 'Unable to claim rewards');
    } finally {
      this.claimingAll.set(false);
    }
  }

  /* ── Helpers ── */
  getProgressPercent(quest: Quest): number {
    return Math.min(100, Math.round((quest.currentValue / quest.targetValue) * 100));
  }

  getTimeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - this.now();
    if (diff <= 0) return 'Expired';
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    return `${minutes}m ${seconds % 60}s`;
  }

  getTimeLeftUrgent(expiresAt: string): boolean {
    const diff = new Date(expiresAt).getTime() - this.now();
    return diff > 0 && diff < 1000 * 60 * 60; // less than 1 hour
  }

  getCategory(templateId: string): string {
    return CATEGORY_MAP[templateId] || 'daily';
  }

  getTemplateIcon(templateId: string): string {
    return TEMPLATE_ICON[templateId] || '✨';
  }

  getTemplateColor(templateId: string): string {
    const cat = this.getCategory(templateId);
    return TEMPLATE_COLOR[cat] || TEMPLATE_COLOR['daily'];
  }

  getRarityColor(quest: Quest): string {
    if (quest.questType === 'weekly') return '#f59e0b';
    const cat = this.getCategory(quest.templateId);
    return TEMPLATE_COLOR[cat] || '#0ea5e9';
  }

  getFilterChips(): FilterChip[] {
    return FILTER_CHIPS;
  }

  setFilter(filter: FilterCategory): void {
    this.activeFilter.set(filter);
  }

  toggleHistory(): void {
    const next = !this.showHistory();
    this.showHistory.set(next);
    if (next && this.history().length === 0) {
      void this.loadHistory();
    }
  }

  /* ── SVG Progress Ring ── */
  getRingCircumference(radius: number): number {
    return 2 * Math.PI * radius;
  }

  getRingOffset(percent: number, radius: number): number {
    return this.getRingCircumference(radius) * (1 - percent / 100);
  }

  formatNumber(n: number): string {
    return n.toLocaleString();
  }

  getDailyPercent(): number {
    const s = this.stats();
    if (!s || s.dailyTotal === 0) return 0;
    return Math.round((s.dailyCompleted / s.dailyTotal) * 100);
  }

  getWeeklyPercent(): number {
    const s = this.stats();
    if (!s || s.weeklyTotal === 0) return 0;
    return Math.round((s.weeklyCompleted / s.weeklyTotal) * 100);
  }

  getTemplateDescription(templateId: string): string {
    const descriptions: Record<string, string> = {
      open_lootboxes: 'Open lootboxes to discover new stoves',
      open_20_lootboxes: 'Open 20 lootboxes this week',
      forge_stove: 'Forge a new stove at the forgery',
      forge_5_stoves: 'Forge 5 stoves this week',
      list_item: 'List an item on the marketplace',
      claim_daily: 'Claim your daily login reward',
      salvage_stove: 'Salvage a stove for sparks',
      salvage_10_stoves: 'Salvage 10 stoves this week',
      send_messages: 'Send messages to other players',
      visit_glory: 'Visit another player\'s profile',
      win_minigame: 'Win a mini-game session',
      earn_minigame_coins: 'Earn coins from mini-games',
      complete_10_trades: 'Complete 10 marketplace trades',
    };
    return descriptions[templateId] || 'Complete this quest to earn rewards';
  }
}
