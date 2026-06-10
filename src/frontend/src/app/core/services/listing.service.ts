import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders, HttpParams } from '@angular/common/http';

export interface Listing {
  listingId: number;
  stoveId: number | null;
  lootboxId: number | null;
  stoveName: string | null;
  rarity: string | null;
  heatLevel: number | null;
  collection: string | null;
  imageUrl: string | null;
  price: number;
  sellerName: string;
  sellerId: number;
  status: string;
  listedAt: string;
  createdAt: string;
  typeId: number | null;
  lootboxTypeId: number | null;
  lootboxTypeName: string | null;
}

export interface FilterParams {
  rarity?: string;
  collection?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest';
  itemType?: 'stove' | 'lootbox';
  search?: string;
}

export interface CreateListingRequest {
  sellerId: number;
  price: number;
  stoveId?: number;
  lootboxId?: number;
}

export interface CreateListingResponse {
  listingId: number;
}

@Injectable({ providedIn: 'root' })
export class ListingService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getActiveListings(filter?: FilterParams): Observable<Listing[]> {
    let params = new HttpParams();
    if (filter?.rarity) params = params.set('rarity', filter.rarity);
    if (filter?.collection) params = params.set('collection', filter.collection);
    if (filter?.minPrice !== undefined) params = params.set('minPrice', filter.minPrice.toString());
    if (filter?.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter?.sort) params = params.set('sortBy', filter.sort);
    if (filter?.itemType) params = params.set('itemType', filter.itemType);
    if (filter?.search) params = params.set('search', filter.search);
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Listing[]>('/listings/active', headers, params);
  }

  createListing(sellerId: number, price: number, stoveId?: number, lootboxId?: number): Observable<CreateListingResponse> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.post<CreateListingResponse>('/listings', { sellerId, price, stoveId, lootboxId }, headers);
  }

  getListingsBySellerId(sellerId: number): Observable<Listing[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Listing[]>(`/players/${sellerId}/listings`, headers);
  }

  getActiveListingsBySellerId(sellerId: number): Observable<Listing[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Listing[]>(`/players/${sellerId}/listings/active`, headers);
  }

  cancelListing(listingId: number): Observable<void> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.patch<void>(`/listings/${listingId}/cancel`, {}, headers);
  }
}
