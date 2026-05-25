import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface TradeOfferResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TradeOfferService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders() {
    const sessionId = this.auth.getSessionId();
    return new HttpHeaders({ 'session-id': sessionId ?? '' });
  }

  acceptTradeOffer(messageId: number): Observable<TradeOfferResponse> {
    return this.api.post<TradeOfferResponse>(`/trade-offers/${messageId}/accept`, {}, this.getHeaders());
  }

  declineTradeOffer(messageId: number): Observable<TradeOfferResponse> {
    return this.api.post<TradeOfferResponse>(`/trade-offers/${messageId}/decline`, {}, this.getHeaders());
  }
}
