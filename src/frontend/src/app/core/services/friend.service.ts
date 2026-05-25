import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { FriendRow as Friend, FriendWithUser } from '@shared/model';

export type { Friend };

export interface FriendRequestResponse {
  friendId: number;
  message: string;
}

export interface FriendRespondResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class FriendService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders() {
    const sessionId = this.auth.getSessionId();
    return new HttpHeaders({ 'session-id': sessionId ?? '' });
  }

  getFriends(): Observable<FriendWithUser[]> {
    return this.api.get<FriendWithUser[]>('/friends/list', this.getHeaders());
  }

  getPendingRequests(): Observable<FriendWithUser[]> {
    return this.api.get<FriendWithUser[]>('/friends/pending', this.getHeaders());
  }

  getSentRequests(): Observable<FriendWithUser[]> {
    return this.api.get<FriendWithUser[]>('/friends/sent', this.getHeaders());
  }

  sendRequest(addresseeId: number): Observable<FriendRequestResponse> {
    return this.api.post<FriendRequestResponse>('/friends/request', { addresseeId }, this.getHeaders());
  }

  respondToRequest(friendId: number, accept: boolean): Observable<FriendRespondResponse> {
    return this.api.post<FriendRespondResponse>('/friends/respond', { friendId, accept }, this.getHeaders());
  }

  removeFriend(friendId: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/friends/${friendId}`, this.getHeaders());
  }
}
