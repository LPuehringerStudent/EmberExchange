import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface CollectionProgress {
  name: string;
  total: number;
  owned: number;
  completed: boolean;
  bonusDescription: string;
  stoves: CollectionStoveProgress[];
}

export interface CollectionStoveProgress {
  typeId: number;
  name: string;
  imageUrl: string;
  rarity: string;
  discovered: boolean;
  rewardClaimed: boolean;
  rewardCoins: number;
  rewardXP: number;
}

export interface ClaimCollectionRewardResponse {
  success: boolean;
  typeId: number;
  rewardCoins: number;
  rewardXP: number;
  newCoins?: number;
  prestige?: {
    playerId: number;
    totalXP: number;
    currentLevel: number;
    prestigeCount: number;
    updatedAt: string;
  };
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getPlayerCollections(): Observable<CollectionProgress[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<CollectionProgress[]>('/player/collections', headers);
  }

  claimStoveReward(typeId: number): Observable<ClaimCollectionRewardResponse> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.post<ClaimCollectionRewardResponse>(`/player/collections/rewards/${typeId}/claim`, {}, headers);
  }
}
