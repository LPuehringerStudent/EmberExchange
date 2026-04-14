import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { DailyStatisticsRow as DailyStatistics } from '@shared/model';

export type { DailyStatistics };

export interface CreateDailyStatisticsResponse {
  statId: number;
  date: string;
}

export interface DailySummary {
  totalLootboxes: number;
  totalSales: number;
  totalVolume: number;
  avgPlayers: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DailyStatisticsService {
  private api = inject(ApiService);

  getAllDailyStatistics(): Observable<DailyStatistics[]> {
    return this.api.get<DailyStatistics[]>('/daily-statistics');
  }

  getTodayStatistics(): Observable<DailyStatistics> {
    return this.api.get<DailyStatistics>('/daily-statistics/today');
  }

  getDailySummary(days: number = 7): Observable<DailySummary> {
    return this.api.get<DailySummary>(`/daily-statistics/summary?days=${days}`);
  }

  getDailyStatisticsByDate(date: string): Observable<DailyStatistics> {
    return this.api.get<DailyStatistics>(`/daily-statistics/${date}`);
  }

  getDailyStatisticsRange(from: string, to: string): Observable<DailyStatistics[]> {
    return this.api.get<DailyStatistics[]>(`/daily-statistics/range?from=${from}&to=${to}`);
  }

  createDailyStatistics(date: string): Observable<CreateDailyStatisticsResponse> {
    return this.api.post<CreateDailyStatisticsResponse>('/daily-statistics', { date });
  }

  deleteDailyStatistics(date: string): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/daily-statistics/${date}`);
  }
}
