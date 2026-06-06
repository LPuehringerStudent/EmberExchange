import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { OwnershipRow as Ownership } from '@shared/model';

export type { Ownership };

export interface CreateOwnershipResponse {
  ownershipId: number;
  message: string;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class OwnershipService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getAllOwnerships(): Observable<Ownership[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Ownership[]>('/ownerships', headers);
  }

  getOwnershipById(id: number): Observable<Ownership> {
    return this.api.get<Ownership>(`/ownerships/${id}`);
  }

  getOwnershipHistoryByStoveId(stoveId: number): Observable<Ownership[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Ownership[]>(`/stoves/${stoveId}/ownership-history`, headers);
  }

  getOwnershipsByPlayerId(playerId: number): Observable<Ownership[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<Ownership[]>(`/players/${playerId}/ownerships`, headers);
  }

  createOwnership(
    stoveId: number,
    playerId: number,
    acquiredHow: 'lootbox' | 'trade' | 'mini-game'
  ): Observable<CreateOwnershipResponse> {
    return this.api.post<CreateOwnershipResponse>('/ownerships', { stoveId, playerId, acquiredHow });
  }

  getCurrentOwner(stoveId: number): Observable<Ownership> {
    return this.api.get<Ownership>(`/stoves/${stoveId}/current-owner`);
  }

  deleteOwnership(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/ownerships/${id}`);
  }

  countOwnershipChanges(stoveId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/stoves/${stoveId}/ownership-changes/count`);
  }

  countStovesAcquiredByPlayer(playerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${playerId}/acquired-stoves/count`);
  }
}
