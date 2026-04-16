import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PriceHistoryRow as PriceHistory } from '@shared/model';

export type { PriceHistory };

export interface RecordSaleResponse {
  historyId: number;
  message: string;
}

export interface PriceStatsResponse {
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PriceHistoryService {
  private api = inject(ApiService);

  getAllPriceHistory(): Observable<PriceHistory[]> {
    return this.api.get<PriceHistory[]>('/price-history');
  }

  getPriceHistoryById(id: number): Observable<PriceHistory> {
    return this.api.get<PriceHistory>(`/price-history/${id}`);
  }

  getPriceHistoryByTypeId(typeId: number): Observable<PriceHistory[]> {
    return this.api.get<PriceHistory[]>(`/stove-types/${typeId}/price-history`);
  }

  recordSale(typeId: number, salePrice: number): Observable<RecordSaleResponse> {
    return this.api.post<RecordSaleResponse>('/price-history', { typeId, salePrice });
  }

  getPriceStats(typeId: number): Observable<PriceStatsResponse> {
    return this.api.get<PriceStatsResponse>(`/stove-types/${typeId}/price-stats`);
  }

  getRecentPrices(typeId: number, limit?: number): Observable<PriceHistory[]> {
    const path =
      limit !== undefined
        ? `/stove-types/${typeId}/recent-prices?limit=${limit}`
        : `/stove-types/${typeId}/recent-prices`;
    return this.api.get<PriceHistory[]>(path);
  }

  deletePriceHistory(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/price-history/${id}`);
  }
}
