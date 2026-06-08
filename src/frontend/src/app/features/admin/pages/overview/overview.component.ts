import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, type AdminSystemStats } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-6">System Overview</h1>

      @if (loading()) {
        <div class="text-text-secondary">Loading stats...</div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (stats()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Total Players</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.totalPlayers.toLocaleString() }}</div>
          </div>
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Total Stoves</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.totalStoves.toLocaleString() }}</div>
          </div>
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Completed Trades</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.totalTrades.toLocaleString() }}</div>
          </div>
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Coins in Circulation</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.totalCoinsInCirculation.toLocaleString() }}</div>
          </div>
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Lootboxes Opened</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.totalLootboxesOpened.toLocaleString() }}</div>
          </div>
          <div class="bg-surface rounded-xl p-5 border border-[rgba(232,93,4,0.15)]">
            <div class="text-sm text-text-secondary mb-1">Signups (7 days)</div>
            <div class="text-3xl font-bold text-accent">{{ stats()!.recentSignups7d.toLocaleString() }}</div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent implements OnInit {
  private adminService = inject(AdminService);

  stats = signal<AdminSystemStats | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.adminService.getSystemStats();
      this.stats.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      this.loading.set(false);
    }
  }
}
