import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface SalvageResult {
  success: boolean;
  sparksAwarded?: number;
  newBalance?: number;
  error?: string;
}

export interface ReRollResult {
  success: boolean;
  newHeatLevel?: number;
  cost?: number;
  newSparksBalance?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SparksService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getBalance(): Observable<{ sparks: number }> {
    return this.api.get<{ sparks: number }>('/player/sparks', this.getHeaders());
  }

  salvageStove(stoveId: number): Observable<SalvageResult> {
    return this.api.post<SalvageResult>('/sparks/salvage', { stoveId }, this.getHeaders());
  }

  reRollHeat(stoveId: number): Observable<ReRollResult> {
    return this.api.post<ReRollResult>('/sparks/reroll-heat', { stoveId }, this.getHeaders());
  }
}
