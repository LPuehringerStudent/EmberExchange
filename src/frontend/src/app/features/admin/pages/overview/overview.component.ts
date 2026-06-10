import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, type AdminSystemStats } from '@core/services/admin.service';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <header class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-text-primary m-0">System Overview</h1>
          <p class="text-sm text-text-muted mt-1">Real-time platform metrics and activity</p>
        </div>
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl font-semibold text-sm text-text-secondary transition-all duration-200 hover:bg-surface-secondary hover:border-accent/30 hover:text-accent"
          (click)="loadStats()"
          [disabled]="loading()">
          @if (loading()) {
            <span class="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>
            Refreshing...
          } @else {
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          }
        </button>
      </header>

      <!-- Error -->
      @if (error()) {
        <div class="bg-red-500/[0.08] border border-red-500/30 rounded-2xl px-5 py-4 mb-6 text-red-500 text-sm font-medium flex items-center gap-3">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error() }}
        </div>
      }

      <!-- Loading skeleton -->
      @if (loading() && !stats()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          @for (_ of [1,2,3,4,5,6,7,8,9,10]; track $index) {
            <div class="bg-surface border border-border rounded-2xl p-5 animate-pulse">
              <div class="w-10 h-10 rounded-xl bg-surface-secondary mb-3"></div>
              <div class="h-3 w-24 bg-surface-secondary rounded mb-2"></div>
              <div class="h-7 w-16 bg-surface-secondary rounded"></div>
            </div>
          }
        </div>
      }

      <!-- Stats Grid -->
      @if (stats(); as s) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          @for (card of statCards(s); track card.label) {
            <div class="stat-card relative bg-surface border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
                 [style.border-color]="card.borderColor"
                 [style.--card-bg]="card.bgColor">
              <!-- Glow on hover -->
              <div class="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                   [style.background]="'linear-gradient(135deg, ' + card.color + '08, transparent)'"></div>

              <div class="relative">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                       [style.background]="'linear-gradient(135deg, ' + card.color + '18, ' + card.color + '08)'"
                       [style.border]="'1px solid ' + card.color + '30'">
                    {{ card.icon }}
                  </div>
                </div>
                <div class="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted mb-1">{{ card.label }}</div>
                <div class="text-2xl font-bold text-text-primary tabular-nums">{{ card.value.toLocaleString() }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Quick Context Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <!-- Engagement Ratio -->
          <div class="bg-surface border border-border rounded-2xl p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">Engagement</div>
            <div class="flex items-end gap-2 mb-2">
              <span class="text-3xl font-bold text-text-primary">{{ pct(s.activePlayers24h, s.totalEligiblePlayers).toFixed(1) }}</span>
              <span class="text-sm text-text-muted font-medium mb-1">%</span>
            </div>
            <div class="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-accent to-[#f48c06] transition-all duration-700"
                   [style.width.%]="pct(s.activePlayers24h, s.totalEligiblePlayers)"></div>
            </div>
            <p class="text-xs text-text-muted mt-2">{{ s.activePlayers24h }} of {{ s.totalEligiblePlayers }} eligible players active in the last 24h</p>
          </div>

          <!-- Signup Momentum -->
          <div class="bg-surface border border-border rounded-2xl p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">Signup Momentum (7d)</div>
            <div class="flex items-end gap-2 mb-2">
              <span class="text-3xl font-bold text-text-primary">{{ s.recentSignups7d }}</span>
              <span class="text-sm font-medium mb-1" [class.text-emerald-500]="s.recentSignups7d > 0" [class.text-text-muted]="s.recentSignups7d === 0">
                {{ s.recentSignups7d > 0 ? '↑ new' : '— flat' }}
              </span>
            </div>
            <div class="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                   [style.width.%]="clampPct(s.recentSignups7d, s.totalPlayers, 5)"></div>
            </div>
            <p class="text-xs text-text-muted mt-2">New registrations this week</p>
          </div>

          <!-- Trust & Safety -->
          <div class="bg-surface border border-border rounded-2xl p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">Trust &amp; Safety</div>
            <div class="flex items-end gap-2 mb-2">
              <span class="text-3xl font-bold text-text-primary">{{ s.bannedPlayers }}</span>
              <span class="text-sm font-medium mb-1" [class.text-red-500]="s.bannedPlayers > 0" [class.text-text-muted]="s.bannedPlayers === 0">
                {{ s.bannedPlayers > 0 ? 'banned' : 'clean' }}
              </span>
            </div>
            <div class="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700"
                   [style.width.%]="pct(s.bannedPlayers, s.totalPlayers)"></div>
            </div>
            <p class="text-xs text-text-muted mt-2">{{ pct(s.bannedPlayers, s.totalPlayers).toFixed(2) }}% of player base</p>
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

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.adminService.getSystemStats();
      this.stats.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      this.loading.set(false);
    }
  }

  pct(part: number, whole: number): number {
    return (part / Math.max(whole, 1)) * 100;
  }

  clampPct(part: number, whole: number, multiplier = 1): number {
    return Math.min((part / Math.max(whole, 1)) * 100 * multiplier, 100);
  }

  statCards(s: AdminSystemStats): StatCard[] {
    return [
      {
        label: 'Total Players',
        value: s.totalPlayers,
        icon: '👥',
        color: '#3b82f6',
        bgColor: '#3b82f608',
        borderColor: 'rgba(59,130,246,0.15)',
      },
      {
        label: 'Active (24h)',
        value: s.activePlayers24h,
        icon: '⚡',
        color: '#10b981',
        bgColor: '#10b98108',
        borderColor: 'rgba(16,185,129,0.15)',
      },
      {
        label: 'Coins in Circulation',
        value: s.totalCoinsInCirculation,
        icon: '🪙',
        color: '#f59e0b',
        bgColor: '#f59e0b08',
        borderColor: 'rgba(245,158,11,0.15)',
      },
      {
        label: 'Total Stoves',
        value: s.totalStoves,
        icon: '🔥',
        color: '#e85d04',
        bgColor: '#e85d0408',
        borderColor: 'rgba(232,93,4,0.15)',
      },
      {
        label: 'Completed Trades',
        value: s.totalTrades,
        icon: '🤝',
        color: '#8b5cf6',
        bgColor: '#8b5cf608',
        borderColor: 'rgba(139,92,246,0.15)',
      },
      {
        label: 'Marketplace Listings',
        value: s.totalListings,
        icon: '🏪',
        color: '#06b6d4',
        bgColor: '#06b6d408',
        borderColor: 'rgba(6,182,212,0.15)',
      },
      {
        label: 'Lootboxes Opened',
        value: s.totalLootboxesOpened,
        icon: '🎁',
        color: '#ec4899',
        bgColor: '#ec489908',
        borderColor: 'rgba(236,72,153,0.15)',
      },
      {
        label: 'Coin Transactions',
        value: s.totalCoinTransactions,
        icon: '💰',
        color: '#14b8a6',
        bgColor: '#14b8a608',
        borderColor: 'rgba(20,184,166,0.15)',
      },
      {
        label: 'New Signups (7d)',
        value: s.recentSignups7d,
        icon: '📈',
        color: '#22c55e',
        bgColor: '#22c55e08',
        borderColor: 'rgba(34,197,94,0.15)',
      },
      {
        label: 'Banned Players',
        value: s.bannedPlayers,
        icon: '🚫',
        color: '#ef4444',
        bgColor: '#ef444408',
        borderColor: 'rgba(239,68,68,0.15)',
      },
    ];
  }
}
