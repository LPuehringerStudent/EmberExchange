import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface PityProgress {
  opens: number;
  epicThreshold: number;
  legendaryThreshold: number;
}

export interface PityCounters {
  standard: PityProgress;
  golden: PityProgress;
  legendary: PityProgress;
  dragon: PityProgress;
  winter: PityProgress;
}

@Injectable({ providedIn: 'root' })
export class PityService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getPityCounters(): Observable<PityCounters> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<PityCounters>('/player/pity', headers);
  }
}
