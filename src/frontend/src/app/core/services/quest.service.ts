import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface Quest {
  questId: number;
  questType: string;
  templateId: string;
  label: string;
  targetValue: number;
  currentValue: number;
  rewardCoins: number;
  rewardXP: number;
  rewardLootboxTypeId: number | null;
  isCompleted: number;
  isClaimed: number;
  expiresAt: string;
  createdAt: string;
}

export interface ClaimResult {
  success: boolean;
  error?: string;
  rewards?: { coins: number; xp: number; lootboxTypeId?: number };
}

export interface ClaimAllResult {
  success: boolean;
  error?: string;
  claimed: number;
  totalCoins: number;
  totalXP: number;
  lootboxes: number;
}

export interface QuestStats {
  dailyCompleted: number;
  dailyTotal: number;
  weeklyCompleted: number;
  weeklyTotal: number;
  readyToClaim: number;
  totalCoinsEarned: number;
  totalXPEarned: number;
}

@Injectable({ providedIn: 'root' })
export class QuestService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getActiveQuests(): Observable<Quest[]> {
    return this.api.get<Quest[]>('/quests', this.getHeaders());
  }

  getStats(): Observable<QuestStats> {
    return this.api.get<QuestStats>('/quests/stats', this.getHeaders());
  }

  getHistory(limit = 50): Observable<Quest[]> {
    return this.api.get<Quest[]>(`/quests/history?limit=${limit}`, this.getHeaders());
  }

  claimReward(questId: number): Observable<ClaimResult> {
    return this.api.post<ClaimResult>(`/quests/${questId}/claim`, {}, this.getHeaders());
  }

  claimAll(): Observable<ClaimAllResult> {
    return this.api.post<ClaimAllResult>('/quests/claim-all', {}, this.getHeaders());
  }
}
