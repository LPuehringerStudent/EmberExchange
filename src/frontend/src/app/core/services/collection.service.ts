import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface CollectionProgress {
  name: string;
  total: number;
  owned: number;
  completed: boolean;
  bonusDescription: string;
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getPlayerCollections(): Observable<CollectionProgress[]> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<CollectionProgress[]>('/player/collections', headers);
  }
}
