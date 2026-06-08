import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { TradeRow as Trade } from '@shared/model';

export type { Trade };

export interface ExecuteTradeResponse {
  tradeId: number;
  message: string;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TradeService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getAuthHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getAllTrades(): Observable<Trade[]> {
    return this.api.get<Trade[]>('/trades', this.getAuthHeaders());
  }

  getTradeById(id: number): Observable<Trade> {
    return this.api.get<Trade>(`/trades/${id}`, this.getAuthHeaders());
  }

  getTradeByListingId(listingId: number): Observable<Trade> {
    return this.api.get<Trade>(`/listings/${listingId}/trade`, this.getAuthHeaders());
  }

  getTradesByBuyerId(buyerId: number): Observable<Trade[]> {
    return this.api.get<Trade[]>(`/players/${buyerId}/trades`, this.getAuthHeaders());
  }

  executeTrade(listingId: number, buyerId: number): Observable<ExecuteTradeResponse> {
    return this.api.post<ExecuteTradeResponse>('/trades', { listingId, buyerId }, this.getAuthHeaders());
  }

  getRecentTrades(limit?: number): Observable<Trade[]> {
    const path = limit !== undefined ? `/trades/recent?limit=${limit}` : '/trades/recent';
    return this.api.get<Trade[]>(path, this.getAuthHeaders());
  }

  deleteTrade(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/trades/${id}`, this.getAuthHeaders());
  }

  countTrades(): Observable<CountResponse> {
    return this.api.get<CountResponse>('/trades/count', this.getAuthHeaders());
  }

  countTradesByBuyer(buyerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${buyerId}/trades/count`, this.getAuthHeaders());
  }
}
