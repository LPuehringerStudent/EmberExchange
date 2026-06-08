import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { PlayerRow as Player } from '@shared/model';

export type { Player };

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

  lookupPlayerByUsername(username: string): Observable<{ playerId: number; username: string }> {
    return this.api.get<{ playerId: number; username: string }>(`/players/lookup/${encodeURIComponent(username)}`);
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
