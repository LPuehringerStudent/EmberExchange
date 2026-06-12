import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService, Player } from '@core/services/auth.service';
import { PlayerStatisticsService, PlayerStatistics } from '@core/services/player-statistics.service';
import { firstValueFrom } from 'rxjs';
import { PageBackgroundComponent } from "../../shared/components/page-background/page-background.component";

type RarityKey = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'limited' | 'secret' | null | undefined;

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule, PageBackgroundComponent,
  ],
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

  rarityColorClass(rarity: RarityKey): string {
    if (!rarity) return 'text-text-muted';
    const map: Record<string, string> = {
      common: 'text-rarity-common',
      uncommon: 'text-rarity-uncommon',
      rare: 'text-rarity-rare',
      epic: 'text-rarity-epic',
      legendary: 'text-rarity-legendary',
      limited: 'text-rarity-limited',
      secret: 'text-rarity-secret'
    };
    return map[rarity.toLowerCase()] || 'text-text-muted';
  }

  rarityBgClass(rarity: RarityKey): string {
    if (!rarity) return 'bg-surface-secondary';
    const map: Record<string, string> = {
      common: 'bg-rarity-common/10 text-rarity-common border-rarity-common/30',
      uncommon: 'bg-rarity-uncommon/10 text-rarity-uncommon border-rarity-uncommon/30',
      rare: 'bg-rarity-rare/10 text-rarity-rare border-rarity-rare/30',
      epic: 'bg-rarity-epic/10 text-rarity-epic border-rarity-epic/30',
      legendary: 'bg-rarity-legendary/10 text-rarity-legendary border-rarity-legendary/30',
      limited: 'bg-rarity-limited/10 text-rarity-limited border-rarity-limited/30',
      secret: 'bg-rarity-secret/10 text-rarity-secret border-rarity-secret/30'
    };
    return map[rarity.toLowerCase()] || 'bg-surface-secondary';
  }

  winRate(stats: PlayerStatistics | null): string {
    if (!stats) return '0%';
    const total = stats.totalMiniGameWins + stats.totalMiniGameLosses;
    if (total === 0) return '0%';
    return `${Math.round((stats.totalMiniGameWins / total) * 100)}%`;
  }
}
