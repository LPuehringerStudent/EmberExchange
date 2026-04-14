import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PlayerStatisticsRow as PlayerStatistics } from '@shared/model';

export type { PlayerStatistics };

export interface CreatePlayerStatisticsResponse {
  statId: number;
  playerId: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PlayerStatisticsService {
  private api = inject(ApiService);

  getAllPlayerStatistics(): Observable<PlayerStatistics[]> {
    return this.api.get<PlayerStatistics[]>('/player-statistics');
  }

  getTopPlayersByActivity(limit: number = 10): Observable<PlayerStatistics[]> {
    return this.api.get<PlayerStatistics[]>(`/player-statistics/leaderboard/activity?limit=${limit}`);
  }

  getTopPlayersByNetWorth(limit: number = 10): Observable<PlayerStatistics[]> {
    return this.api.get<PlayerStatistics[]>(`/player-statistics/leaderboard/wealth?limit=${limit}`);
  }

  getPlayerStatistics(playerId: number): Observable<PlayerStatistics> {
    return this.api.get<PlayerStatistics>(`/players/${playerId}/statistics`);
  }

  createPlayerStatistics(playerId: number): Observable<CreatePlayerStatisticsResponse> {
    return this.api.post<CreatePlayerStatisticsResponse>(`/players/${playerId}/statistics`, {});
  }

  deletePlayerStatistics(playerId: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/players/${playerId}/statistics`);
  }
}
