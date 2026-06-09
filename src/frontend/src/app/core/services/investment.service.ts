import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface InvestableAsset {
  assetId: number;
  ticker: string;
  name: string;
  description: string;
  rarity: string;
  currentPrice: number;
  previousPrice: number;
  basePrice: number;
  imageUrl: string;
  volume30d: number;
  totalMinted: number;
  currentlyListed: number;
}

export interface PortfolioPosition {
  positionId: number;
  assetId: number;
  category: 'stove' | 'lootbox';
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPL: number;
}

export interface LeaderboardEntry {
  playerId: number;
  name: string;
  totalInvested: number;
  totalValue: number;
  totalPL: number;
  plPercent: number;
}

export interface BuyResponse {
  success: boolean;
  positionId?: number;
  error?: string;
}

export interface SellResponse {
  success: boolean;
  coinsReceived?: number;
  fee?: number;
  error?: string;
}

export interface PortfolioResponse {
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  totalPL: number;
}

export interface LeaderboardResponse {
  investors: LeaderboardEntry[];
}

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getAssets(): Observable<{ assets: InvestableAsset[] }> {
    return this.api.get<{ assets: InvestableAsset[] }>('/investments/assets');
  }

  buy(assetId: number, quantity: number): Observable<BuyResponse> {
    return this.api.post<BuyResponse>('/investments/buy', { assetId, quantity }, this.getHeaders());
  }

  sell(assetId: number, quantity: number): Observable<SellResponse> {
    return this.api.post<SellResponse>('/investments/sell', { assetId, quantity }, this.getHeaders());
  }

  getPortfolio(): Observable<PortfolioResponse> {
    return this.api.get<PortfolioResponse>('/investments/portfolio', this.getHeaders());
  }

  getLeaderboard(limit = 10): Observable<LeaderboardResponse> {
    return this.api.get<LeaderboardResponse>(`/investments/leaderboard?limit=${limit}`);
  }

  getPriceHistory(typeId: number, range: '1d' | '1w' | '1m'): Observable<{ prices: { timestamp: string; price: number }[] }> {
    return this.api.get<{ prices: { timestamp: string; price: number }[] }>(`/investments/price-history?typeId=${typeId}&range=${range}`);
  }
}
