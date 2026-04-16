import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  LootboxRow as Lootbox,
  LootboxTypeRow as LootboxType,
  LootboxDropRow as LootboxDrop,
} from '@shared/model';

export type { Lootbox, LootboxType, LootboxDrop };

export interface CreateLootboxResponse {
  lootboxId: number;
  message: string;
}

export interface CreateLootboxDropResponse {
  dropId: number;
  message: string;
}

export interface CreateLootboxTypeResponse {
  lootboxTypeId: number;
  name: string;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class LootboxService {
  private api = inject(ApiService);

  // Lootbox endpoints
  getAllLootboxes(): Observable<Lootbox[]> {
    return this.api.get<Lootbox[]>('/lootboxes');
  }

  getLootboxById(id: number): Observable<Lootbox> {
    return this.api.get<Lootbox>(`/lootboxes/${id}`);
  }

  getLootboxesByPlayerId(playerId: number): Observable<Lootbox[]> {
    return this.api.get<Lootbox[]>(`/players/${playerId}/lootboxes`);
  }

  createLootbox(
    lootboxTypeId: number,
    playerId: number,
    acquiredHow: 'free' | 'purchase' | 'reward'
  ): Observable<CreateLootboxResponse> {
    return this.api.post<CreateLootboxResponse>('/lootboxes', { lootboxTypeId, playerId, acquiredHow });
  }

  deleteLootbox(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/lootboxes/${id}`);
  }

  // LootboxType endpoints
  getAllLootboxTypes(): Observable<LootboxType[]> {
    return this.api.get<LootboxType[]>('/lootbox-types');
  }

  getAvailableLootboxTypes(): Observable<LootboxType[]> {
    return this.api.get<LootboxType[]>('/lootbox-types/available');
  }

  getLootboxTypeById(id: number): Observable<LootboxType> {
    return this.api.get<LootboxType>(`/lootbox-types/${id}`);
  }

  createLootboxType(
    name: string,
    description: string | null,
    costCoins: number,
    costFree: boolean,
    dailyLimit: number | null,
    isAvailable: boolean
  ): Observable<CreateLootboxTypeResponse> {
    return this.api.post<CreateLootboxTypeResponse>('/lootbox-types', {
      name,
      description,
      costCoins,
      costFree,
      dailyLimit,
      isAvailable,
    });
  }

  updateLootboxType(
    id: number,
    updates: Partial<Omit<LootboxType, 'lootboxTypeId'>>
  ): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/lootbox-types/${id}`, updates);
  }

  updateLootboxTypeAvailability(id: number, isAvailable: boolean): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/lootbox-types/${id}/availability`, { isAvailable });
  }

  deleteLootboxType(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/lootbox-types/${id}`);
  }

  getLootboxTypeCount(): Observable<CountResponse> {
    return this.api.get<CountResponse>('/lootbox-types/count');
  }

  // LootboxDrop endpoints
  getAllLootboxDrops(): Observable<LootboxDrop[]> {
    return this.api.get<LootboxDrop[]>('/lootbox-drops');
  }

  getLootboxDropById(id: number): Observable<LootboxDrop> {
    return this.api.get<LootboxDrop>(`/lootbox-drops/${id}`);
  }

  getLootboxDropByLootboxId(lootboxId: number): Observable<LootboxDrop> {
    return this.api.get<LootboxDrop>(`/lootbox-drops/lootbox/${lootboxId}`);
  }

  getLootboxDropByStoveId(stoveId: number): Observable<LootboxDrop> {
    return this.api.get<LootboxDrop>(`/lootbox-drops/stove/${stoveId}`);
  }

  getLootboxDropsByPlayerId(playerId: number): Observable<LootboxDrop[]> {
    return this.api.get<LootboxDrop[]>(`/players/${playerId}/lootbox-drops`);
  }

  getDropsByLootboxId(lootboxId: number): Observable<LootboxDrop[]> {
    return this.api.get<LootboxDrop[]>(`/lootboxes/${lootboxId}/drops`);
  }

  createLootboxDrop(lootboxId: number, stoveId: number): Observable<CreateLootboxDropResponse> {
    return this.api.post<CreateLootboxDropResponse>('/lootbox-drops', { lootboxId, stoveId });
  }

  deleteLootboxDrop(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/lootbox-drops/${id}`);
  }

  getLootboxDropCount(): Observable<CountResponse> {
    return this.api.get<CountResponse>('/lootbox-drops/count');
  }
}
