import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { SpinStatus, SpinResult } from '@shared/model';

@Injectable({ providedIn: 'root' })
export class SpinService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  getStatus(): Observable<SpinStatus> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.get<SpinStatus>('/spin/status', headers);
  }

  spin(): Observable<SpinResult> {
    const sessionId = this.auth.getSessionId();
    const headers = sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
    return this.api.post<SpinResult>('/spin', {}, headers);
  }
}
