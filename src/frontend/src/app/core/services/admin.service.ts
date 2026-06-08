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
  page: number;
  limit: number;
}

export interface PlayerFilters {
  search?: string;
  banned?: 'all' | 'banned' | 'active';
  minCoins?: number;
  maxCoins?: number;
  isAdmin?: 'all' | 'admin' | 'user';
  sortBy?: string;
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
  details?: {
    turnstileToken: "present" | "missing" | "invalid-type";
    turnstileTokenLength: number;
    formStartTime?: number;
    hasRequiredHeader: boolean;
    requiredHeaderValue?: string;
    honeypotTriggered: boolean;
    honeypotFields: Record<string, string>;
    username?: string;
    emailDomain?: string;
    hostHeader: string;
    bodyKeys: string[];
  };
}

export interface BannedIPRecord {
  ip: string;
  reason: string;
  bannedAt: string;
  expiresAt: string | null;
  violationType: string | null;
}

export interface AdminRequestLog {
  logId: number;
  ipAddress: string;
  userAgent: string | null;
  playerId: number | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
}

export interface RedeemCode {
  codeId: number;
  code: string;
  rewardCoins: number;
  rewardLootboxes: number;
  rewardSparks: number;
  rewardSpins: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: number;
  createdAt: string;
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

  async getPlayers(page = 1, limit = 20, filters: PlayerFilters = {}): Promise<AdminPlayerList> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) params.set('search', filters.search);
    if (filters.banned && filters.banned !== 'all') params.set('banned', filters.banned);
    if (filters.minCoins !== undefined) params.set('minCoins', String(filters.minCoins));
    if (filters.maxCoins !== undefined) params.set('maxCoins', String(filters.maxCoins));
    if (filters.isAdmin && filters.isAdmin !== 'all') params.set('isAdmin', filters.isAdmin);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
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

  async deletePlayer(playerId: number): Promise<void> {
    await firstValueFrom(
      this.api.delete<void>(`/admin/players/${playerId}`, this.getHeaders())
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

  async getBannedIPs(): Promise<BannedIPRecord[]> {
    return firstValueFrom(this.api.get<BannedIPRecord[]>('/admin/banned-ips', this.getHeaders()));
  }

  async banIp(ip: string, reason: string, durationHours?: number): Promise<void> {
    await firstValueFrom(
      this.api.post<void>('/admin/banned-ips', { ip, reason, durationHours }, this.getHeaders())
    );
  }

  async unbanIp(ip: string): Promise<void> {
    await firstValueFrom(
      this.api.post<void>('/admin/banned-ips/unban', { ip }, this.getHeaders())
    );
  }

  async getRequestLogs(filters: {
    playerId?: number;
    ipAddress?: string;
    path?: string;
    since?: string;
    until?: string;
    limit?: number;
  } = {}): Promise<AdminRequestLog[]> {
    const params = new URLSearchParams();
    if (filters.playerId !== undefined) params.set('playerId', String(filters.playerId));
    if (filters.ipAddress) params.set('ip', filters.ipAddress);
    if (filters.path) params.set('path', filters.path);
    if (filters.since) params.set('since', filters.since);
    if (filters.until) params.set('until', filters.until);
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return firstValueFrom(
      this.api.get<AdminRequestLog[]>(`/admin/request-logs${query}`, this.getHeaders())
    );
  }

  async getRedeemCodes(): Promise<RedeemCode[]> {
    return firstValueFrom(this.api.get<RedeemCode[]>('/admin/redeem-codes', this.getHeaders()));
  }

  async createRedeemCode(data: Omit<RedeemCode, 'codeId' | 'usedCount' | 'createdAt'>): Promise<{ codeId: number; code: string }> {
    return firstValueFrom(
      this.api.post<{ codeId: number; code: string }>('/admin/redeem-codes', data, this.getHeaders())
    );
  }

  async updateRedeemCode(codeId: number, updates: Partial<Omit<RedeemCode, 'codeId' | 'usedCount' | 'createdAt'>>): Promise<void> {
    await firstValueFrom(
      this.api.patch<void>(`/admin/redeem-codes/${codeId}`, updates, this.getHeaders())
    );
  }

  async deleteRedeemCode(codeId: number): Promise<void> {
    await firstValueFrom(
      this.api.delete<void>(`/admin/redeem-codes/${codeId}`, this.getHeaders())
    );
  }
}
