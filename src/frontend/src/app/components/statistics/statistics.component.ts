import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { getAllPlayerStatistics, getTopPlayersByActivity, getTopPlayersByNetWorth, PlayerStatistics } from '../../fetchers/player-statistics.fetcher';
import { getTodayStatistics, getDailySummary, DailyStatistics } from '../../fetchers/daily-statistics.fetcher';
import { getAllStoveTypeStatistics, getMarketSummary, StoveTypeStatistics } from '../../fetchers/stove-type-statistics.fetcher';

interface StatCard {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './statistics.html',
  styleUrls: ['./statistics.css']
})
export class StatisticsComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  // Data
  playerStats: PlayerStatistics[] = [];
  topActivityPlayers: PlayerStatistics[] = [];
  topWealthPlayers: PlayerStatistics[] = [];
  todayStats: DailyStatistics | null = null;
  dailySummary = { totalLootboxes: 0, totalSales: 0, totalVolume: 0, avgPlayers: 0 };
  stoveTypeStats: StoveTypeStatistics[] = [];
  marketSummary = { totalStoves: 0, totalListed: 0, totalSales: 0, avgListedPercent: 0 };

  // Loading states
  loading = true;
  error: string | null = null;

  // Dashboard stats
  dashboardStats: StatCard[] = [];

  ngOnInit(): void {
    void this.loadAllData();
  }

  async loadAllData() {
    this.loading = true;
    this.error = null;

    console.log('Loading statistics data...');

    // Use Promise.allSettled to load all data concurrently and avoid blocking
    const results = await Promise.allSettled([
      getAllPlayerStatistics(),
      getTopPlayersByActivity(5),
      getTopPlayersByNetWorth(5),
      getTodayStatistics(),
      getDailySummary(7),
      getAllStoveTypeStatistics(),
      getMarketSummary()
    ]);

    // Handle results
    if (results[0].status === 'fulfilled') {
      this.playerStats = results[0].value;
      console.log('Player stats loaded:', this.playerStats.length);
    } else {
      console.error('Failed to load player stats:', results[0].reason);
      this.playerStats = [];
    }

    if (results[1].status === 'fulfilled') {
      this.topActivityPlayers = results[1].value;
      console.log('Top activity loaded:', this.topActivityPlayers.length);
    } else {
      console.error('Failed to load top activity:', results[1].reason);
      this.topActivityPlayers = [];
    }

    if (results[2].status === 'fulfilled') {
      this.topWealthPlayers = results[2].value;
      console.log('Top wealth loaded:', this.topWealthPlayers.length);
    } else {
      console.error('Failed to load top wealth:', results[2].reason);
      this.topWealthPlayers = [];
    }

    if (results[3].status === 'fulfilled') {
      this.todayStats = results[3].value;
      console.log('Today stats loaded:', this.todayStats);
    } else {
      console.error('Failed to load today stats:', results[3].reason);
      this.todayStats = null;
    }

    if (results[4].status === 'fulfilled') {
      this.dailySummary = results[4].value;
      console.log('Daily summary loaded:', this.dailySummary);
    } else {
      console.error('Failed to load daily summary:', results[4].reason);
      this.dailySummary = { totalLootboxes: 0, totalSales: 0, totalVolume: 0, avgPlayers: 0 };
    }

    if (results[5].status === 'fulfilled') {
      this.stoveTypeStats = results[5].value;
      console.log('Stove type stats loaded:', this.stoveTypeStats.length);
    } else {
      console.error('Failed to load stove type stats:', results[5].reason);
      this.stoveTypeStats = [];
    }

    if (results[6].status === 'fulfilled') {
      this.marketSummary = results[6].value;
      console.log('Market summary loaded:', this.marketSummary);
    } else {
      console.error('Failed to load market summary:', results[6].reason);
      this.marketSummary = { totalStoves: 0, totalListed: 0, totalSales: 0, avgListedPercent: 0 };
    }

    // Success state assessment
    const playerStatsSuccess = this.playerStats.length > 0;
    const todayStatsSuccess = this.todayStats !== null;
    const allFailed = results.every(r => r.status === 'rejected');
    const criticalDataMissing = !playerStatsSuccess && !todayStatsSuccess;

    if (allFailed) {
      this.error = 'Unable to load statistics. The server may be restarting or the data has been reset.';
      console.error('All statistics requests failed');
    } else if (criticalDataMissing) {
      this.error = 'Statistics data is unavailable. Please try again later.';
      console.warn('Critical statistics data missing');
    } else {
      this.error = null;
      console.log('Statistics loaded successfully');
    }

    this.updateDashboardStats();
    this.loading = false;
    this.cdr.detectChanges();
    console.log('Loading complete, loading=', this.loading);
  }

  updateDashboardStats() {
    this.dashboardStats = [
      {
        label: 'Total Players',
        value: this.playerStats.length.toString(),
        trend: 'neutral'
      },
      {
        label: 'Active Today',
        value: this.todayStats?.uniquePlayersLoggedIn?.toString() || '0',
        trend: this.todayStats && this.todayStats.uniquePlayersLoggedIn > 10 ? 'up' : 'neutral'
      },
      {
        label: 'Trading Volume',
        value: this.formatNumber(this.dailySummary.totalVolume || 0) + ' Coal',
        trend: this.dailySummary.totalVolume > 10000 ? 'up' : 'neutral'
      },
      {
        label: 'Total Sales',
        value: (this.dailySummary.totalSales || 0).toString(),
        trend: 'up'
      }
    ];
  }

  formatNumber(num: number): string {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatCurrency(amount: number): string {
    if (!amount) return '0 Coal';
    return new Intl.NumberFormat('en-US').format(amount) + ' Coal';
  }
}
