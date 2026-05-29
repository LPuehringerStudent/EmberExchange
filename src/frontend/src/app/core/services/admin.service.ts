import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { PlayerRow, StoveTypeRow } from '@shared/model';

export interface AdminSystemStats {
  totalPlayers: number;
  totalStoves: number;
  totalTrades: number;
  totalCoinsInCirculation: number;
  totalLootboxesOpened: number;
  recentSignups7d: number;
}

export interface AdminPlayerList {
  players: PlayerRow[];
  total: number;
}

export interface AdminPlayerDetail {
  player: PlayerRow;
  stats: {
    totalTradesCompleted: number;
    totalCoinsEarned: number;
    totalCoinsSpent: number;
    stovesOwned: number;
  };
  coinHistory: {
    transactionId: number;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }[];
}

export interface BotTrapEvent {
  timestamp: string;
  ip: string;
  endpoint: string;
  reason: string;
  userAgent: string;
  tarPitMs: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return new HttpHeaders({ 'session-id': sessionId });
  }

  async getSystemStats(): Promise<AdminSystemStats> {
    return firstValueFrom(this.api.get<AdminSystemStats>('/admin/stats', this.getHeaders()));
  }

  async getPlayers(page = 1, limit = 20, search = ''): Promise<AdminPlayerList> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return firstValueFrom(
      this.api.get<AdminPlayerList>(`/admin/players?${params.toString()}`, this.getHeaders())
    );
  }

  async getPlayerDetail(playerId: number): Promise<AdminPlayerDetail> {
    return firstValueFrom(
      this.api.get<AdminPlayerDetail>(`/admin/players/${playerId}`, this.getHeaders())
    );
  }

  async adjustPlayerCoins(playerId: number, amount: number, reason: string): Promise<void> {
    await firstValueFrom(
      this.api.post<void>(`/admin/players/${playerId}/coins`, { amount, reason }, this.getHeaders())
    );
  }

  async setPlayerBanStatus(playerId: number, banned: boolean, reason?: string): Promise<void> {
    await firstValueFrom(
      this.api.post<void>(`/admin/players/${playerId}/ban`, { banned, reason }, this.getHeaders())
    );
  }

  async getStoveTypes(): Promise<StoveTypeRow[]> {
    return firstValueFrom(this.api.get<StoveTypeRow[]>('/admin/stove-types', this.getHeaders()));
  }

  async updateStoveType(typeId: number, updates: Partial<StoveTypeRow>): Promise<void> {
    await firstValueFrom(
      this.api.patch<void>(`/admin/stove-types/${typeId}`, updates, this.getHeaders())
    );
  }

  async createStoveType(data: Omit<StoveTypeRow, 'typeId'>): Promise<{ typeId: number; name: string }> {
    return firstValueFrom(
      this.api.post<{ typeId: number; name: string }>('/admin/stove-types', data, this.getHeaders())
    );
  }

  async getBotTrapLog(): Promise<BotTrapEvent[]> {
    return firstValueFrom(this.api.get<BotTrapEvent[]>('/admin/bot-traps', this.getHeaders()));
  }

  async clearBotTrapLog(): Promise<void> {
    await firstValueFrom(this.api.delete<void>('/admin/bot-traps', this.getHeaders()));
  }
}
