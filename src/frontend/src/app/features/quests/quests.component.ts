import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestService, Quest } from '@core/services/quest.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-quests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './quests.component.html',
  styleUrls: ['./quests.component.css']
})
export class QuestsComponent implements OnInit {
  dailyQuests = signal<Quest[]>([]);
  weeklyQuests = signal<Quest[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  claimingId = signal<number | null>(null);

  private questService = inject(QuestService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.loadQuests();
  }

  async loadQuests(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const quests = await firstValueFrom(this.questService.getActiveQuests());
      this.dailyQuests.set(quests.filter(q => q.questType === 'daily'));
      this.weeklyQuests.set(quests.filter(q => q.questType === 'weekly'));
    } catch (err: any) {
      console.error('Failed to load quests:', err);
      this.error.set(err?.message || 'Failed to load quests');
    } finally {
      this.loading.set(false);
    }
  }

  async claimReward(quest: Quest): Promise<void> {
    if (quest.isClaimed || !quest.isCompleted) return;
    this.claimingId.set(quest.questId);
    try {
      const result = await firstValueFrom(this.questService.claimReward(quest.questId));
      if (result.success) {
        this.toastService.success('Reward Claimed', `Claimed ${result.rewards?.coins ?? 0} coins${result.rewards?.xp ? ` + ${result.rewards.xp} XP` : ''}${result.rewards?.lootboxTypeId ? ' + Lootbox' : ''}!`);
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

  getProgressPercent(quest: Quest): number {
    return Math.min(100, Math.round((quest.currentValue / quest.targetValue) * 100));
  }

  getTemplateLabel(templateId: string): string {
    const labels: Record<string, string> = {
      open_lootboxes: 'Open Lootboxes',
      forge_stove: 'Forge a Stove',
      list_item: 'List on Marketplace',
      claim_daily: 'Claim Daily Reward',
      salvage_stove: 'Salvage a Stove',
      send_messages: 'Send Chat Messages',
      visit_glory: 'Visit a Profile',
      win_minigame: 'Win a Mini-game',
      open_20_lootboxes: 'Open 20 Lootboxes',
      forge_5_stoves: 'Forge 5 Stoves',
      complete_10_trades: 'Complete 10 Trades',
      earn_minigame_coins: 'Earn Mini-game Coins',
      salvage_10_stoves: 'Salvage 10 Stoves',
    };
    return labels[templateId] || templateId;
  }

  getTimeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  }
}
