import { Injectable, inject } from '@angular/core';
import { map, Observable, Subject, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { StoveRow as Stove, StoveTypeRow as StoveType } from '@shared/model';
import { Rarity } from '@shared/model';

export type { Stove, StoveType };
export { Rarity };

export interface CreateStoveResponse {
  stoveId: number;
  message: string;
}

export interface CreateStoveTypeResponse {
  typeId: number;
  message: string;
}

export interface TotalWeightResponse {
  totalWeight: number;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class StoveService {
  private api = inject(ApiService);
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  // Stove endpoints
  getAllStoves(): Observable<Stove[]> {
    return this.api.get<Stove[]>('/stoves');
  }

  getStoveById(id: number): Observable<Stove> {
    return this.api.get<Stove>(`/stoves/${id}`);
  }

  getStovesByPlayerId(playerId: number): Observable<Stove[]> {
    return this.api.get<Stove[]>(`/players/${playerId}/stoves`);
  }

  getStovesByTypeId(typeId: number): Observable<Stove[]> {
    return this.api.get<Stove[]>(`/stove-types/${typeId}/stoves`);
  }

  createStove(typeId: number, currentOwnerId: number): Observable<CreateStoveResponse> {
    return this.api.post<CreateStoveResponse>('/stoves', { typeId, currentOwnerId }).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  transferStoveOwnership(id: number, newOwnerId: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/stoves/${id}/owner`, { newOwnerId });
  }

  deleteStove(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/stoves/${id}`);
  }

  countStovesByPlayer(playerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${playerId}/stoves/count`);
  }

  countStovesByType(typeId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/stove-types/${typeId}/stoves/count`);
  }

  // StoveType endpoints
  getAllStoveTypes(): Observable<StoveType[]> {
    return this.api.get<StoveType[]>('/stove-types');
  }

  getStoveTypeById(id: number): Observable<StoveType> {
    return this.api.get<StoveType>(`/stove-types/${id}`);
  }

  getStoveTypesByRarity(rarity: Rarity): Observable<StoveType[]> {
    return this.api.get<StoveType[]>(`/stove-types/rarity/${rarity}`);
  }

  createStoveType(name: string, imageUrl: string, rarity: Rarity, lootboxWeight: number): Observable<CreateStoveTypeResponse> {
    return this.api.post<CreateStoveTypeResponse>('/stove-types', { name, imageUrl, rarity, lootboxWeight });
  }

  updateStoveTypeWeight(id: number, lootboxWeight: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/stove-types/${id}/weight`, { lootboxWeight });
  }

  updateStoveTypeImage(id: number, imageUrl: string): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/stove-types/${id}/image`, { imageUrl });
  }

  deleteStoveType(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/stove-types/${id}`);
  }

  getTotalLootboxWeight(): Observable<TotalWeightResponse> {
    return this.api.get<TotalWeightResponse>('/stove-types/weight/total');
  }

  // Legacy helpers from old StoveApiService
  checkRarity(typeId: number): Observable<Rarity> {
    return this.getStoveTypeById(typeId).pipe(map(response => response.rarity));
  }

  getStoveName(typeId: number): Observable<{ name: string }> {
    return this.getStoveTypeById(typeId).pipe(map(response => ({ name: response.name })));
  }
}
