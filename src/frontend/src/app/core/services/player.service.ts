import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PlayerRow as Player } from '@shared/model';

export type { Player };

export interface CreatePlayerResponse {
  playerId: number;
  username: string;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private api = inject(ApiService);

  getAllPlayers(): Observable<Player[]> {
    return this.api.get<Player[]>('/players');
  }

  getPlayerById(id: number): Observable<Player> {
    return this.api.get<Player>(`/players/${id}`);
  }

  createPlayer(username: string, password?: string, email?: string, coins?: number, lootboxCount?: number): Observable<CreatePlayerResponse> {
    const body: Record<string, unknown> = { username };
    if (password !== undefined) body["password"] = password;
    if (email !== undefined) body["email"] = email;
    if (coins !== undefined) body["coins"] = coins;
    if (lootboxCount !== undefined) body["lootboxCount"] = lootboxCount;
    return this.api.post<CreatePlayerResponse>('/players', body);
  }

  updatePlayerCoins(id: number, coins: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/players/${id}/coins`, { coins });
  }

  updatePlayerLootboxCount(id: number, lootboxCount: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/players/${id}/lootboxes`, { lootboxCount });
  }

  deletePlayer(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/players/${id}`);
  }
}
