import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface SalvageResult {
  success: boolean;
  sparksAwarded?: number;
  newBalance?: number;
  error?: string;
}

export interface ReRollResult {
  success: boolean;
  newHeatLevel?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SparksService {
  private api = inject(ApiService);

  getBalance(): Observable<{ sparks: number }> {
    return this.api.get<{ sparks: number }>('/player/sparks');
  }

  salvageStove(stoveId: number): Observable<SalvageResult> {
    return this.api.post<SalvageResult>('/sparks/salvage', { stoveId });
  }

  reRollHeat(stoveId: number): Observable<ReRollResult> {
    return this.api.post<ReRollResult>('/sparks/reroll-heat', { stoveId });
  }
}
