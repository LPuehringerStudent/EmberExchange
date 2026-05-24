import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.component.html',
  styleUrls: ['../../settings.component.css', './notifications.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
  friendRequests = signal<boolean>(true);
  chatMessages = signal<boolean>(true);
  tradeOffers = signal<boolean>(true);
  dailyReward = signal<boolean>(true);

  loading = signal<boolean>(false);
  success = signal<string>('');
  error = signal<string>('');

  private _authService = inject(AuthService);

  ngOnInit(): void {
    void this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    const user = this._authService.getCurrentUser();
    if (!user) return;

    try {
      const settings = await this._authService.getNotificationSettings(user.playerId);
      this.friendRequests.set(settings.notifyFriendRequests);
      this.chatMessages.set(settings.notifyChatMessages);
      this.tradeOffers.set(settings.notifyTradeOffers);
      this.dailyReward.set(settings.notifyDailyReward);
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  }

  async save(): Promise<void> {
    const user = this._authService.getCurrentUser();
    if (!user) return;

    this.success.set('');
    this.error.set('');
    this.loading.set(true);

    try {
      await this._authService.updateNotificationSettings(user.playerId, {
        notifyFriendRequests: this.friendRequests(),
        notifyChatMessages: this.chatMessages(),
        notifyTradeOffers: this.tradeOffers(),
        notifyDailyReward: this.dailyReward()
      });
      this.success.set('Notification preferences saved');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      this.loading.set(false);
    }
  }
}
