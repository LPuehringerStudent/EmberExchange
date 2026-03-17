import { Component, OnInit } from '@angular/core';

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

    // Track success/failure for each endpoint
    let playerStatsSuccess = false;
    let topActivitySuccess = false;
    let topWealthSuccess = false;
    let todayStatsSuccess = false;
    let dailySummarySuccess = false;
    let stoveTypeStatsSuccess = false;
    let marketSummarySuccess = false;

    // Load player statistics
    try {
      console.log('Fetching player statistics...');
      this.playerStats = await getAllPlayerStatistics();
      playerStatsSuccess = this.playerStats.length > 0;
      console.log('Player stats loaded:', this.playerStats.length);
    } catch (err) {
      console.error('Failed to load player stats:', err);
      this.playerStats = [];
    }

    // Load top activity players
    try {
      console.log('Fetching top activity players...');
      this.topActivityPlayers = await getTopPlayersByActivity(5);
      topActivitySuccess = this.topActivityPlayers.length > 0;
      console.log('Top activity loaded:', this.topActivityPlayers.length);
    } catch (err) {
      console.error('Failed to load top activity:', err);
      this.topActivityPlayers = [];
    }

    // Load top wealth players
    try {
      console.log('Fetching top wealth players...');
      this.topWealthPlayers = await getTopPlayersByNetWorth(5);
      topWealthSuccess = this.topWealthPlayers.length > 0;
      console.log('Top wealth loaded:', this.topWealthPlayers.length);
    } catch (err) {
      console.error('Failed to load top wealth:', err);
      this.topWealthPlayers = [];
    }

    // Load today's statistics
    try {
      console.log('Fetching today statistics...');
      this.todayStats = await getTodayStatistics();
      todayStatsSuccess = this.todayStats !== null;
      console.log('Today stats loaded:', this.todayStats);
    } catch (err) {
      console.error('Failed to load today stats:', err);
      this.todayStats = null;
    }

    // Load daily summary
    try {
      console.log('Fetching daily summary...');
      this.dailySummary = await getDailySummary(7);
      dailySummarySuccess = true;
      console.log('Daily summary loaded:', this.dailySummary);
    } catch (err) {
      console.error('Failed to load daily summary:', err);
      this.dailySummary = { totalLootboxes: 0, totalSales: 0, totalVolume: 0, avgPlayers: 0 };
    }

    // Load stove type statistics
    try {
      console.log('Fetching stove type statistics...');
      this.stoveTypeStats = await getAllStoveTypeStatistics();
      stoveTypeStatsSuccess = this.stoveTypeStats.length > 0;
      console.log('Stove type stats loaded:', this.stoveTypeStats.length);
    } catch (err) {
      console.error('Failed to load stove type stats:', err);
      this.stoveTypeStats = [];
    }

    // Load market summary
    try {
      console.log('Fetching market summary...');
      this.marketSummary = await getMarketSummary();
      marketSummarySuccess = true;
      console.log('Market summary loaded:', this.marketSummary);
    } catch (err) {
      console.error('Failed to load market summary:', err);
      this.marketSummary = { totalStoves: 0, totalListed: 0, totalSales: 0, avgListedPercent: 0 };
    }

    // Check if all requests failed (indicates server restart or data reset)
    const allFailed = !playerStatsSuccess && !topActivitySuccess && !topWealthSuccess &&
                      !todayStatsSuccess && !dailySummarySuccess && !stoveTypeStatsSuccess && !marketSummarySuccess;

    // Check if critical data is missing (no player stats and no daily stats)
    const criticalDataMissing = !playerStatsSuccess && !todayStatsSuccess;

    console.log('Success states:', {
      playerStatsSuccess, topActivitySuccess, topWealthSuccess,
      todayStatsSuccess, dailySummarySuccess, stoveTypeStatsSuccess, marketSummarySuccess,
      allFailed, criticalDataMissing
    });

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
