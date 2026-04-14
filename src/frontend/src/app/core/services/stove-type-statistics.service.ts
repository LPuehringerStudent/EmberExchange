import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { StoveTypeStatisticsRow as StoveTypeStatistics } from '@shared/model';

export type { StoveTypeStatistics };

export interface CreateStoveTypeStatisticsResponse {
  statId: number;
  stoveTypeId: number;
}

export interface MarketSummary {
  totalStoves: number;
  totalListed: number;
  totalSales: number;
  avgListedPercent: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class StoveTypeStatisticsService {
  private api = inject(ApiService);

  getAllStoveTypeStatistics(): Observable<StoveTypeStatistics[]> {
    return this.api.get<StoveTypeStatistics[]>('/stove-type-statistics');
  }

  getMarketSummary(): Observable<MarketSummary> {
    return this.api.get<MarketSummary>('/stove-type-statistics/market-summary');
  }

  getTopStoveTypesBySales(limit: number = 10): Observable<StoveTypeStatistics[]> {
    return this.api.get<StoveTypeStatistics[]>(`/stove-type-statistics/leaderboard/sales?limit=${limit}`);
  }

  getMostViewedStoveTypes(limit: number = 10): Observable<StoveTypeStatistics[]> {
    return this.api.get<StoveTypeStatistics[]>(`/stove-type-statistics/most-viewed?limit=${limit}`);
  }

  getStoveTypesByTrend(trend: 'increasing' | 'stable' | 'decreasing'): Observable<StoveTypeStatistics[]> {
    return this.api.get<StoveTypeStatistics[]>(`/stove-type-statistics/trend/${trend}`);
  }

  getStoveTypeStatistics(stoveTypeId: number): Observable<StoveTypeStatistics> {
    return this.api.get<StoveTypeStatistics>(`/stove-types/${stoveTypeId}/statistics`);
  }

  createStoveTypeStatistics(
    stoveTypeId: number,
    expectedDropRate: number,
    rarityRank: number
  ): Observable<CreateStoveTypeStatisticsResponse> {
    return this.api.post<CreateStoveTypeStatisticsResponse>(`/stove-types/${stoveTypeId}/statistics`, {
      expectedDropRate,
      rarityRank,
    });
  }

  incrementStoveTypeViews(stoveTypeId: number): Observable<SuccessMessage> {
    return this.api.post<SuccessMessage>(`/stove-types/${stoveTypeId}/statistics/increment-views`, {});
  }

  deleteStoveTypeStatistics(stoveTypeId: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/stove-types/${stoveTypeId}/statistics`);
  }
}
