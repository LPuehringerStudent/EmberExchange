import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { MiniGameSessionRow as MiniGameSession } from '@shared/model';

export type { MiniGameSession };

export interface CreateMiniGameSessionResponse {
  sessionId: number;
  playerId: number;
  gameType: string;
}

export interface MiniGameStats {
  totalSessions: number;
  totalPayout: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MiniGameSessionService {
  private api = inject(ApiService);

  getAllMiniGameSessions(): Observable<MiniGameSession[]> {
    return this.api.get<MiniGameSession[]>('/mini-game-sessions');
  }

  getMiniGameSessionById(id: number): Observable<MiniGameSession> {
    return this.api.get<MiniGameSession>(`/mini-game-sessions/${id}`);
  }

  getMiniGameSessionsByPlayerId(playerId: number): Observable<MiniGameSession[]> {
    return this.api.get<MiniGameSession[]>(`/players/${playerId}/mini-game-sessions`);
  }

  getMiniGameSessionsByType(gameType: string): Observable<MiniGameSession[]> {
    return this.api.get<MiniGameSession[]>(`/mini-game-sessions/type/${encodeURIComponent(gameType)}`);
  }

  createMiniGameSession(
    playerId: number,
    gameType: string,
    result: string,
    coinPayout: number
  ): Observable<CreateMiniGameSessionResponse> {
    return this.api.post<CreateMiniGameSessionResponse>('/mini-game-sessions', {
      playerId,
      gameType,
      result,
      coinPayout,
    });
  }

  deleteMiniGameSession(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/mini-game-sessions/${id}`);
  }

  getMiniGameStatsByPlayerId(playerId: number): Observable<MiniGameStats> {
    return this.api.get<MiniGameStats>(`/players/${playerId}/mini-game-stats`);
  }
}
