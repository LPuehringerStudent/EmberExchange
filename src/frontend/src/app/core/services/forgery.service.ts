import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import type { ForgeryRequest, ForgeryResult } from '@shared/model';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ForgeryService {
  private api = inject(ApiService);

  async forge(sessionId: string, stoveIds: number[]): Promise<ForgeryResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'session-id': sessionId
    });
    const body: ForgeryRequest = { stoveIds };
    return firstValueFrom(this.api.post<ForgeryResult>('/forgery', body, headers));
  }
}
