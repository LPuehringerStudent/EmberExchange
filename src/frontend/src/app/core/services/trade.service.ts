import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getAllTrades(): Observable<Trade[]> {
    return this.api.get<Trade[]>('/trades', this.getHeaders());
  }

  getTradeById(id: number): Observable<Trade> {
    return this.api.get<Trade>(`/trades/${id}`);
  }

  getTradeByListingId(listingId: number): Observable<Trade> {
    return this.api.get<Trade>(`/listings/${listingId}/trade`);
  }

  getTradesByBuyerId(buyerId: number): Observable<Trade[]> {
    return this.api.get<Trade[]>(`/players/${buyerId}/trades`, this.getHeaders());
  }

  executeTrade(listingId: number, buyerId: number): Observable<ExecuteTradeResponse> {
    return this.api.post<ExecuteTradeResponse>('/trades', { listingId, buyerId }, this.getHeaders());
  }

  getRecentTrades(limit?: number): Observable<Trade[]> {
    const path = limit !== undefined ? `/trades/recent?limit=${limit}` : '/trades/recent';
    return this.api.get<Trade[]>(path);
  }

  deleteTrade(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/trades/${id}`, this.getHeaders());
  }

  countTrades(): Observable<CountResponse> {
    return this.api.get<CountResponse>('/trades/count');
  }

  countTradesByBuyer(buyerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${buyerId}/trades/count`, this.getHeaders());
  }
}
