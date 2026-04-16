import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ListingRow as Listing } from '@shared/model';

export type { Listing };

export interface CreateListingResponse {
  listingId: number;
  message: string;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ListingService {
  private api = inject(ApiService);

  getAllListings(): Observable<Listing[]> {
    return this.api.get<Listing[]>('/listings');
  }

  getActiveListings(): Observable<Listing[]> {
    return this.api.get<Listing[]>('/listings/active');
  }

  getListingById(id: number): Observable<Listing> {
    return this.api.get<Listing>(`/listings/${id}`);
  }

  getListingsBySellerId(sellerId: number): Observable<Listing[]> {
    return this.api.get<Listing[]>(`/players/${sellerId}/listings`);
  }

  getActiveListingsBySellerId(sellerId: number): Observable<Listing[]> {
    return this.api.get<Listing[]>(`/players/${sellerId}/listings/active`);
  }

  getActiveListingByStoveId(stoveId: number): Observable<Listing> {
    return this.api.get<Listing>(`/stoves/${stoveId}/listing`);
  }

  createListing(sellerId: number, stoveId: number, price: number): Observable<CreateListingResponse> {
    return this.api.post<CreateListingResponse>('/listings', { sellerId, stoveId, price });
  }

  updateListingPrice(id: number, price: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/listings/${id}/price`, { price });
  }

  cancelListing(id: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/listings/${id}/cancel`, {});
  }

  deleteListing(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/listings/${id}`);
  }

  countActiveListingsBySeller(sellerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${sellerId}/active-listings/count`);
  }
}
