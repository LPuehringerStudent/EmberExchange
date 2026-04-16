import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService, Player } from '@core/services/auth.service';
import { PlayerStatisticsService, PlayerStatistics } from '@core/services/player-statistics.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  user = signal<Player | null>(null);
  stats = signal<PlayerStatistics | null>(null);
  loading = signal<boolean>(true);
  statsError = signal<string>('');

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _statsService = inject(PlayerStatisticsService);

  ngOnInit(): void {
    const currentUser = this._authService.getCurrentUser();
    if (!currentUser) {
      this._router.navigate(['/login']);
      return;
    }

    this.user.set(currentUser);
    void this.loadStats(currentUser.playerId);
  }

  async loadStats(playerId: number): Promise<void> {
    this.loading.set(true);
    this.statsError.set('');

    try {
      const data = await firstValueFrom(this._statsService.getPlayerStatistics(playerId));
      this.stats.set(data);
    } catch (err) {
      console.error('Failed to load player statistics:', err);
      this.statsError.set('Could not load statistics.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(dateString: Date | string | null): string {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  providerLabel(provider: string | null): string {
    if (!provider) return 'Local Account';
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  }
}
