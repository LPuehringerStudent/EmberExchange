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

type QuestCategory = 'loot' | 'forge' | 'trade' | 'play' | 'social' | 'daily';
type FilterCategory = 'all' | QuestCategory;
type TypeFilter = 'all' | 'daily' | 'weekly';
type StatusFilter = 'all' | 'ready' | 'progress' | 'claimed';
type SortMode = 'ending' | 'progress' | 'reward';

interface QuestMeta {
  category: QuestCategory;
  label: string;
  icon: string;
  color: string;
}

interface FilterOption<T extends string> {
  id: T;
  label: string;
}

interface CategoryFilter extends FilterOption<FilterCategory> {
  icon: string;
}

const QUEST_META: Record<string, QuestMeta> = {
  open_lootboxes: { category: 'loot', label: 'Loot', icon: 'icon/lootboxes.png', color: '#ef4444' },
  open_20_lootboxes: { category: 'loot', label: 'Loot', icon: 'icon/lootboxes.png', color: '#ef4444' },
  forge_stove: { category: 'forge', label: 'Forge', icon: 'icon/the_forge.png', color: '#f59e0b' },
  forge_5_stoves: { category: 'forge', label: 'Forge', icon: 'icon/the_forge.png', color: '#f59e0b' },
  salvage_stove: { category: 'forge', label: 'Forge', icon: 'icon/the_forge.png', color: '#f59e0b' },
  salvage_10_stoves: { category: 'forge', label: 'Forge', icon: 'icon/the_forge.png', color: '#f59e0b' },
  list_item: { category: 'trade', label: 'Trade', icon: 'icon/marketplace.png', color: '#8b5cf6' },
  complete_10_trades: { category: 'trade', label: 'Trade', icon: 'icon/marketplace.png', color: '#8b5cf6' },
  claim_daily: { category: 'daily', label: 'Daily', icon: 'icon/shop.png', color: '#0ea5e9' },
  send_messages: { category: 'social', label: 'Social', icon: 'icon/socials.png', color: '#ec4899' },
  visit_glory: { category: 'social', label: 'Social', icon: 'icon/socials.png', color: '#ec4899' },
  win_minigame: { category: 'play', label: 'Play', icon: 'icon/games.png', color: '#22c55e' },
  earn_minigame_coins: { category: 'play', label: 'Play', icon: 'icon/games.png', color: '#22c55e' },
};

const FALLBACK_META: QuestMeta = {
  category: 'daily',
  label: 'Quest',
  icon: 'icon/quests.png',
  color: '#14b8a6',
};

const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: 'all', label: 'All', icon: 'icon/quests.png' },
  { id: 'daily', label: 'Daily', icon: 'icon/shop.png' },
  { id: 'loot', label: 'Loot', icon: 'icon/lootboxes.png' },
  { id: 'forge', label: 'Forge', icon: 'icon/the_forge.png' },
  { id: 'trade', label: 'Trade', icon: 'icon/marketplace.png' },
  { id: 'play', label: 'Play', icon: 'icon/games.png' },
  { id: 'social', label: 'Social', icon: 'icon/socials.png' },
];

const TYPE_FILTERS: FilterOption<TypeFilter>[] = [
  { id: 'all', label: 'All Types' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

const STATUS_FILTERS: FilterOption<StatusFilter>[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'ready', label: 'Ready' },
  { id: 'progress', label: 'In Progress' },
  { id: 'claimed', label: 'Claimed' },
];

const SORT_OPTIONS: FilterOption<SortMode>[] = [
  { id: 'ending', label: 'Ending Soon' },
  { id: 'progress', label: 'Most Progress' },
  { id: 'reward', label: 'Reward Value' },
];

@Component({
  selector: 'app-quests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './quests.component.html',
  styleUrls: ['./quests.component.css'],
})
export class QuestsComponent implements OnInit, OnDestroy {
  quests = signal<Quest[]>([]);
  stats = signal<QuestStats | null>(null);
  history = signal<Quest[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  claimingId = signal<number | null>(null);
  claimingAll = signal<boolean>(false);
  activeFilter = signal<FilterCategory>('all');
  typeFilter = signal<TypeFilter>('all');
  statusFilter = signal<StatusFilter>('all');
  sortMode = signal<SortMode>('ending');
  searchTerm = signal<string>('');
  showHistory = signal<boolean>(false);
  now = signal<number>(Date.now());

  readonly filteredQuests = computed(() => {
    const category = this.activeFilter();
    const type = this.typeFilter();
    const status = this.statusFilter();
    const search = this.searchTerm().trim().toLowerCase();

    const filtered = this.quests().filter((quest) => {
      const meta = this.getQuestMeta(quest.templateId);
      const matchesCategory = category === 'all' || meta.category === category;
      const matchesType = type === 'all' || quest.questType === type;
      const matchesStatus =
        status === 'all' ||
        (status === 'ready' && !!quest.isCompleted && !quest.isClaimed) ||
        (status === 'progress' && !quest.isCompleted && !quest.isClaimed) ||
        (status === 'claimed' && !!quest.isClaimed);
      const searchable = `${quest.label} ${this.getTemplateDescription(quest.templateId)} ${meta.label}`.toLowerCase();
      const matchesSearch = !search || searchable.includes(search);
      return matchesCategory && matchesType && matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (this.sortMode() === 'progress') {
        return this.getProgressPercent(b) - this.getProgressPercent(a);
      }
      if (this.sortMode() === 'reward') {
        return this.getRewardValue(b) - this.getRewardValue(a);
      }
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    });
  });

  readonly hasClaimable = computed(() =>
    this.quests().some((q) => q.isCompleted && !q.isClaimed)
  );

  readonly claimableCount = computed(() =>
    this.quests().filter((q) => q.isCompleted && !q.isClaimed).length
  );

  readonly completedCount = computed(() =>
    this.quests().filter((q) => q.isCompleted).length
  );

  readonly activeCount = computed(() =>
    this.quests().filter((q) => !q.isClaimed).length
  );

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
    } catch (err: unknown) {
      console.error('Failed to load quests:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      this.loading.set(false);
    }
  }

  async loadHistory(): Promise<void> {
    try {
      const history = await firstValueFrom(this.questService.getHistory(30));
      this.history.set(history);
    } catch (err: unknown) {
      console.error('Failed to load history:', err);
    }
  }

  async claimReward(quest: Quest): Promise<void> {
    if (quest.isClaimed || !quest.isCompleted) return;
    this.claimingId.set(quest.questId);
    try {
      const result = await firstValueFrom(this.questService.claimReward(quest.questId));
      if (result.success) {
        this.toastService.success(
          'Reward Claimed',
          `Claimed ${result.rewards?.coins ?? 0} coins${result.rewards?.xp ? ` + ${result.rewards.xp} XP` : ''}${result.rewards?.lootboxTypeId ? ' + Lootbox' : ''}.`
        );
        await this.authService.refreshUser();
        await this.loadQuests();
      } else {
        this.toastService.error('Claim Failed', result.error || 'Unable to claim reward');
      }
    } catch (err: unknown) {
      this.toastService.error('Claim Failed', err instanceof Error ? err.message : 'Unable to claim reward');
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
        this.toastService.success('All Rewards Claimed', `Claimed ${parts.join(' + ')} from ${result.claimed} quest${result.claimed > 1 ? 's' : ''}.`);
        await this.authService.refreshUser();
        await this.loadQuests();
      } else {
        this.toastService.error('Claim Failed', result.error || 'Unable to claim rewards');
      }
    } catch (err: unknown) {
      this.toastService.error('Claim Failed', err instanceof Error ? err.message : 'Unable to claim rewards');
    } finally {
      this.claimingAll.set(false);
    }
  }

  getProgressPercent(quest: Quest): number {
    if (quest.targetValue <= 0) return 0;
    return Math.min(100, Math.round((quest.currentValue / quest.targetValue) * 100));
  }

  getTimeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - this.now();
    if (diff <= 0) return 'Expired';
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m ${seconds % 60}s`;
  }

  getTimeLeftUrgent(expiresAt: string): boolean {
    const diff = new Date(expiresAt).getTime() - this.now();
    return diff > 0 && diff < 1000 * 60 * 60;
  }

  getQuestMeta(templateId: string): QuestMeta {
    return QUEST_META[templateId] || FALLBACK_META;
  }

  getTemplateIcon(templateId: string): string {
    return this.getQuestMeta(templateId).icon;
  }

  getTemplateColor(templateId: string): string {
    return this.getQuestMeta(templateId).color;
  }

  getFilterChips(): CategoryFilter[] {
    return CATEGORY_FILTERS;
  }

  getTypeFilters(): FilterOption<TypeFilter>[] {
    return TYPE_FILTERS;
  }

  getStatusFilters(): FilterOption<StatusFilter>[] {
    return STATUS_FILTERS;
  }

  getSortOptions(): FilterOption<SortMode>[] {
    return SORT_OPTIONS;
  }

  setFilter(filter: FilterCategory): void {
    this.activeFilter.set(filter);
  }

  setTypeFilter(filter: TypeFilter): void {
    this.typeFilter.set(filter);
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  setSortMode(mode: SortMode): void {
    this.sortMode.set(mode);
  }

  setSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  toggleHistory(): void {
    const next = !this.showHistory();
    this.showHistory.set(next);
    if (next && this.history().length === 0) {
      void this.loadHistory();
    }
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

  getRewardValue(quest: Quest): number {
    return quest.rewardCoins + quest.rewardXP + (quest.rewardLootboxTypeId ? 2500 : 0);
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
      visit_glory: 'Visit another player profile',
      win_minigame: 'Win a mini-game session',
      earn_minigame_coins: 'Earn coins from mini-games',
      complete_10_trades: 'Complete 10 marketplace trades',
    };
    return descriptions[templateId] || 'Complete this quest to earn rewards';
  }
}
